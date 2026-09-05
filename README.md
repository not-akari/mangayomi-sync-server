# sync-mangayomi

A self-hostable sync server for [Mangayomi](https://github.com/kodjodevf/mangayomi): accounts, invite-gated registration, and the website that goes with it. Not the official hosted instance; anyone can run their own copy of this.

## Stack

- Next.js (App Router) + TypeScript
- PostgreSQL, via Prisma
- JWT sessions (HttpOnly cookie, revocable server-side)
- Tailwind v4 + shadcn/ui
- next-intl for i18n

## Getting started (Docker, recommended)

1. **Configure environment**: copy `.env.example` to `.env`, fill in `SESSION_SECRET` (`openssl rand -base64 48`) and `DATABASE_URL`. If Postgres runs on the same host machine, use `host.docker.internal` in the connection string instead of `localhost`, since `localhost` inside a container means the container itself.

2. **One-time setup** (also run again after pulling an update that changed `prisma/schema.prisma`):

   ```bash
   docker compose --profile init run --rm migrate
   ```

3. **Build and start**:

   ```bash
   docker compose up -d --build
   ```

   Open [http://localhost:3000](http://localhost:3000). The first visit walks you through creating the initial admin account, no invite code needed for that one.

## Getting started (without Docker)

1. **Configure environment**: same `.env` as above, `DATABASE_URL` can just point at `localhost` here.
2. **Install dependencies and apply migrations**: `npm install && npm run db:migrate`
3. **Run the dev server**: `npm run dev` (or `npm run build && npm run start` for production)

## Scripts

| Command               | What it does                                       |
| --------------------- | -------------------------------------------------- |
| `npm run dev`         | Start the dev server                               |
| `npm run build`       | Production build                                   |
| `npm run start`       | Run a production build                             |
| `npm run check`       | Type-check + lint, no build (fast local check)     |
| `npm run lint`        | ESLint only                                        |
| `npm run typecheck`   | `tsc --noEmit` only                                |
| `npm run db:migrate`  | Apply Prisma migrations (dev, no Docker)           |
| `npm run db:generate` | Regenerate the Prisma client after a schema change |
| `npm run db:studio`   | Open Prisma Studio                                 |

## Architecture notes

- **Repository pattern, no exceptions**: every database access goes through `lib/repositories/*`, nothing outside that folder touches `db.*` directly.
- **Catalog split**: manga/anime/novel titles and their chapters are stored once per title (`CatalogEntry`/`CatalogChapter`), not duplicated per user. Each account's library is a thin row (`Manga`/`ChapterState`) pointing at the shared catalog data, so the same title tracked by 500 accounts is still one row, not 500.
- **Permission scopes**: admin accounts have granular `AdminScope`s (`MANAGE_INVITES`, `MANAGE_USERS`, `VIEW_LOGS`, `MANAGE_SETTINGS`) rather than a single all-or-nothing admin flag.
- **Audit log**: security-relevant actions (logins, role changes, invite creation, suspensions, settings changes) are recorded and viewable from the admin panel.
- **Sync API**: `POST /api/sync/v1` is the single endpoint the Mangayomi app talks to for library/history/tracking sync. Cursor-paginated on the pull side so libraries of any size sync in bounded pages. See `docs/sync_api.md` in the main [mangayomi](https://github.com/kodjodevf/mangayomi) repo for the protocol design.
- **Background cleanup**: `lib/gc.ts` runs in-process on server boot and every 8 hours after, clearing expired rate limit rows, revoked sessions, and dead password reset tokens - no external cron needed, Docker or not.

## Deploying

`docker compose --profile init run --rm migrate` then `docker compose up -d --build`, same as local Docker use above, just with real `.env` values. Avatar uploads persist in the `avatar_storage` volume across rebuilds automatically. Run it behind a reverse proxy (Cloudflare Tunnel, nginx, Traefik, Caddy all work, see `TRUST_PROXY_HEADERS` in `.env.example`).

Without Docker: `npm run build`, run it directly, point `DATABASE_URL` at a real Postgres instance, and set `AVATAR_STORAGE_DIR` to a path that survives redeploys.
