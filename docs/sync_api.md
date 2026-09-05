# Mangayomi Sync API

This was built from scratch. Neither the app nor any sync server has ever
shipped a stable version, so there's no old install base to stay
compatible with. This document describes the protocol as it works now,
not a path from something older. The old endpoints (`/login`,
`/sync/manga`, `/sync/histories`, `/sync/updates`, `/sync/settings`) are
gone, not kept around next to this one.

## Basic rules

- **Only send what changed.** Every sync sends the changes since the
  client's last successful sync, not the whole library every time.
- **One request does both directions.** The client sends its local
  changes and gets back the server's changes, in the same response. If a
  pull has too much data for one response, it continues over more
  requests (see Pagination below), but each of those still carries both
  directions at once.
- **Newest write wins**, checked per row by `updatedAt`. There is no
  merging beyond that. This matches how the app already worked before
  sync existed.
- **The data sent over the wire is flat.** On the server, manga and
  chapter data is split into shared catalog rows (`CatalogEntry`,
  `CatalogChapter`) and small per-user rows, so the same manga isn't
  stored twice for every user who has it. That split only happens on the
  server. The client always gets back the same flat `Manga`/`Chapter`
  shape it's always used.
- **A deleted row is marked, not just left out.** If a row is missing
  from a pull response, that alone doesn't tell you if it never existed
  on this device, or if it existed and got deleted. So deletions are sent
  as an explicit list.
- **Built to handle a huge library.** Some libraries have millions of
  rows. Pull pagination and the session token rule below exist so that a
  huge library doesn't need special handling, both sides just keep
  calling the same endpoint until they're caught up.

## Versioning

```
GET /api/version
→ 200 { "supported": ["1"] }
```

No login needed, doesn't change anything. The app checks this once when a
sync starts, picks the highest version it understands, and uses that for
every request in that sync. If this fails or the route doesn't exist,
that's a real error and should be shown, not guessed around. This exists
so a future breaking change can be handled cleanly instead of needing
another full rewrite.

## Login

Same as the website already uses:

```
POST /api/login
Body: { "email": "<username>", "password": "<password>" }
→ Set-Cookie: id=<jwt>; HttpOnly; SameSite=Lax
```

The `email` field name is left over from the wire format, the value sent
is actually a username, not a real email. It's kept as-is since there was
no reason to touch working login code while redesigning sync. Every sync
request below logs in the same way, using the `id` cookie, sent
automatically once you have it.

## Sync

```
POST /api/sync/v1
```

One endpoint. One request handles every entity type at once, not a
separate call per entity. A full sync can still take several calls if
either side has more than one page's worth of changes (see Pagination).

### Request body

```jsonc
{
  // The point in time from the client's last fully finished sync. Leave
  // out (or send 0) for a first sync ever, which the server treats as
  // "send me everything."
  "since": 1735500000000,

  // Sent back from a previous response's `sessionToken`. Proves this
  // call is continuing a sync that already passed a check, so it skips
  // the rate limit for starting a new sync (see Rate limiting below).
  // Leave out on the first call of a new sync.
  "sessionToken": "cmt....1735500100000.a1b2c3...",

  // Resume points from a previous response's `cursors`, sent back
  // exactly as received. Leave out entirely on a first call.
  "cursors": {
    "categories": null, "manga": "1735500000000_842", "chapters": null,
    "tracks": null, "histories": null, "updates": null, "tombstones": null
  },

  // Rows the client made or changed since its last sync. Only sent on
  // the first call of a sync, later calls in the same sync are pull only
  // (see Pagination). If one entity has more than 5000 changed rows, the
  // client splits it across more than one call on its own.
  "categories": [ { "clientId": 1, "name": "Reading", "forItemType": "MANGA", ... } ],
  // "categoryClientIds" replaces this manga's whole category membership.
  // Left out entirely (not an empty array) means "don't touch its categories".
  "manga":      [ { "clientId": 42, "link": "...", "name": "...", "categoryClientIds": [1], ... } ],
  "chapters":   [ { "clientId": 501, "mangaClientId": 42, "url": "...", "isRead": true, ... } ],
  "tracks":     [ ... ],
  "histories":  [ ... ],
  "updates":    [ ... ],
  // Always sent, holds the app's reader settings blob. "data" is opaque to the
  // server (whatever object shape the client wants), only "updatedAt" is read.
  "settings": { "data": { /* ...settings fields */ }, "updatedAt": 1735500500000 },

  // Rows deleted locally since the last sync, by clientId.
  "deleted": {
    "categories": [3, 7],
    "manga": [12],
    "chapters": [],
    "tracks": [],
    "histories": [],
    "updates": []
  }
}
```

`clientId` is picked by whichever device first makes a row. It stays the
same for that row on every future sync, and is never reused for anything
else on that device. It's a number big enough (up to 2^52) that two
devices making rows on their own, before ever syncing with each other,
almost never end up with the same one by accident. It stays a plain JSON
number the whole way, never turned into a string, since it fits inside
`Number.MAX_SAFE_INTEGER`. It has nothing to do with the row's local
database id, which stays on the device and is never sent.

### Response body

```jsonc
{
  // The new `since` value to save for next time. Only sent once every
  // entity is fully caught up (`hasMore: false`). Still mid pagination?
  // This is null, keep paging using the same `since` from the request.
  "syncedAt": 1735510000000 | null,

  // True if any entity below still has more to pull. Keep calling with
  // the `cursors` and `sessionToken` from this same response until this
  // is false.
  "hasMore": false,

  // Sent back on every response. Send this on the next call, whether
  // that's another pull page or the next batch of uploads. See Rate
  // limiting.
  "sessionToken": "cmt....1735500100000.a1b2c3...",

  // A resume point per entity, present when that entity still has more
  // to pull, null once it's done. Each entity paginates on its own.
  "cursors": {
    "categories": null, "manga": "1735500050000_910", "chapters": null,
    "tracks": null, "histories": null, "updates": null, "tombstones": null
  },

  // The total row count for an entity, only sent on that entity's first
  // page of a fresh pull (left out on later pages since it doesn't
  // change mid pull). Lets the client show real progress, like "page 3
  // of 8", without another request.
  "totalCounts": {
    "categories": 12, "manga": 4300, "chapters": 88000,
    "tracks": 40, "histories": 900, "updates": 12000, "tombstones": 0
  },

  // Rows changed on the server since the request's `since`, not
  // counting anything the request itself just uploaded (no point
  // sending it right back). Each array holds at most one page of rows
  // for that entity.
  "categories": [ ... ],
  "manga": [ ... ],
  "chapters": [ ... ],
  "tracks": [ ... ],
  "histories": [ ... ],
  "updates": [ ... ],
  "settings": { ... } | null,

  // Deleted on the server (by another device, or an admin) since the
  // request's `since`. The client deletes these locally too.
  "tombstones": {
    "categories": [5],
    "manga": [],
    "chapters": [9, 10],
    "tracks": [],
    "histories": [],
    "updates": []
  },

  // Only present when a manga upload matched a title that already
  // existed under a different clientId (another device added the same
  // title first, before either device ever synced with the other). Maps
  // the clientId this device just sent to the one it should use from now
  // on. The client must rewrite its local row's clientId to match, or it
  // will keep uploading the same manga as a new duplicate on every sync.
  "mangaClientIdRemap": { "42": 99 },

  // Same idea as mangaClientIdRemap, but for a chapter this device tracked
  // independently before ever syncing with whichever device added it first.
  "chapterClientIdRemap": { "501": 777 }
}
```

### Pagination

Only the pull side pages. Upload batching is a separate thing the client
does on its own (see the note on the request body's `categories` field
above). Each entity pages on its own, capped at 2000 rows per page on the
server:

1. First call of a sync: `since` is set, no `cursors` sent.
2. If a response's `hasMore` is `true`, call again with the same `since`,
   sending back the `cursors` and `sessionToken` from that response.
   Leave out the upload data entirely on these follow-up calls, since
   that was already applied on the first call.
3. Keep going until `hasMore` is `false`. Only then does the response
   include a real `syncedAt`. Save that as the new `since`.

If a client stops mid pagination and starts again later, it should keep
using the same `since` it started with (not the last response's, since
that stays `null` until fully caught up), and can drop its `cursors` and
start each entity's pagination over from the top. This is safe because
applying an already-applied row a second time does nothing, it has the
same `clientId` and the same or an older `updatedAt`.

### Rate limits

Two separate limits, both tied to the account, not the IP address, since
every request here needs a login already:

- **Starting a new sync**: a generous per-minute limit on calls that
  don't carry a valid `sessionToken`, meaning calls starting a sync from
  scratch. Normal use never gets close to this.
- **A daily cap**: a very high per-day limit on every call, no matter the
  `sessionToken`, just to stop a client that's stuck in a loop. A real
  sync, even of a library with millions of rows, finishes in a few
  hundred calls at most, far under this cap.

The `sessionToken` is what makes pagination and upload batching practical
for a big library. Once the first call of a sync succeeds, every later
call in that same sync (pull pages, upload batches, either one) skips the
new-sync limit, since holding a valid token already proves it passed that
check once. It's signed by the server and stops working after 30 minutes
of no activity.

### Handling conflicts

Checked per row, by `updatedAt`, in both directions:

- When the client uploads a row, the server writes it only if the
  incoming `updatedAt` is newer than what's stored (or the row doesn't
  exist yet). An older incoming row is dropped without an error, the
  server's copy already wins, and the newer version comes back to the
  client on its own in the same response's pull data.
- If a row was uploaded by the client and also changed on the server
  since `since`, that's sorted out once, on the server, before the
  response is built. The client never has to sort out a conflict itself.
- The client follows the same rule going the other way: a pulled row only
  replaces the local copy if its `updatedAt` is newer than what's stored
  locally, or there's no local copy yet.

### Same manga added on two devices (server side)

Not part of the wire format, but explains why one manga upload doesn't
always turn into one new database row. The server checks the incoming
`(source, link)` against `CatalogEntry`. If it's new, it makes one. If it
already exists (another user has it, or this same user added it on
another device), it reuses that one. The per-user `Manga` row then just
points at that entry's id. Chapters work the same way against
`CatalogChapter`, matched by `(catalogEntryId, url)`.

If the manga the client just uploaded turns out to already exist under a
different clientId (a different device added it first, and the two
devices never synced with each other before now), the server doesn't
create a second copy. It keeps the existing row and tells the uploading
client about it through `mangaClientIdRemap` in the response, so that
device can fix its own local copy instead of creating a duplicate every
sync from then on.

## How the Dart client actually does this

For anyone touching `lib/services/sync_server.dart` or the six synced
models:

- **Changes are tracked by timestamp**, matching the server. Every write
  path across the six repositories (`Category`, `Manga`, `Chapter`,
  `Track`, `History`, `Update`) sets `updatedAt`, and an upload just asks
  each repository for "everything with `updatedAt` at or after `since`."
  There's no separate log of edits kept alongside the actual rows.
- **This check must include rows equal to `since`, not just rows after
  it.** A brand new row still sitting at the default `updatedAt` of 0
  would never show up if `since = 0` (a first sync, or a forced full
  upload) only matched rows strictly after 0.
- **`since` is one value for the whole account**, stored on
  `SyncPreference.since`, not one per entity, matching the single
  endpoint. `sessionToken` is saved next to it so a sync that gets
  interrupted mid pagination (app closed, connection dropped) can pick
  back up cleanly next time.
- **Deletions are tracked through `ChangedPart`**, a local list of
  pending deletions, since a deleted row has no `updatedAt` left to check
  once it's gone. Every place that deletes a row saves its `clientId`
  (not its local database id, which means nothing to the server or other
  devices) into `ChangedPart` before removing the row. This only needs a
  sync account to exist, it isn't turned off by pausing sync, or a
  deletion made while paused would never reach the server once sync is
  turned back on. It's cleared once a sync confirms the deletions were
  uploaded.
- **`clientId` is a field on each of the six models**, made once when the
  row is created (see `lib/utils/client_id.dart`), and otherwise not
  looked at beyond comparing it. It's separate from Isar's own local id,
  which is different on every device. Rows from before this field
  existed get one filled in by a one-time step when the app starts
  (`storage_provider.dart`).
- **A manga pulled from the server is matched to a local row two ways.**
  First by `clientId`, if this device already knows that row. If not, by
  `(link, itemType)` against the local library, in case this device
  added the same title on its own before ever syncing (this covers
  "Download only" syncs too, which never upload anything and so never
  get a `mangaClientIdRemap` from the server). If either match is found,
  the pulled data is written into that existing row instead of making a
  new one.
