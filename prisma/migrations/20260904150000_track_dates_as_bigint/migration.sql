-- Track.startedReadingDate/finishedReadingDate were String, holding epoch-ms
-- as text - the only two date-ish fields in the whole schema not stored as
-- BigInt. Every other timestamp (Manga.dateAdded, History.date, etc.) is
-- BigInt, and the Dart client has always held these as int locally, so the
-- string encoding was a mismatch introduced when this table was first
-- written, not a deliberate choice. Fixed now, before any real client speaks
-- this protocol.
ALTER TABLE "Track"
  ALTER COLUMN "startedReadingDate" TYPE BIGINT USING NULLIF("startedReadingDate", '')::bigint,
  ALTER COLUMN "finishedReadingDate" TYPE BIGINT USING NULLIF("finishedReadingDate", '')::bigint;
