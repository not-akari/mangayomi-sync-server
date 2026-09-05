-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "AdminScope" AS ENUM ('MANAGE_INVITES', 'MANAGE_USERS', 'VIEW_LOGS', 'MANAGE_SETTINGS', 'MANAGE_REPORTS');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('USER_REGISTERED', 'USER_LOGIN', 'INVITE_CREATED', 'INVITE_REVOKED', 'ROLE_CHANGED', 'SETTINGS_CHANGED', 'PASSWORD_CHANGED', 'ACCOUNT_DELETED', 'ACCOUNT_SUSPENDED', 'ACCOUNT_REINSTATED', 'PASSWORD_RESET_LINK_CREATED', 'PASSWORD_RESET_REQUESTED', 'PASSWORD_RESET_COMPLETED', 'EMAIL_CHANGED', 'AVATAR_CHANGED', 'REPORT_CREATED', 'REPORT_STATUS_CHANGED', 'SESSION_REVOKED', 'CATALOG_NSFW_OVERRIDE_SET', 'CATALOG_NSFW_BULK_OVERRIDE_SET');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETE', 'REJECTED');

-- CreateEnum
CREATE TYPE "RegistrationMode" AS ENUM ('OPEN', 'INVITE_ONLY');

-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('MANGA', 'ANIME', 'NOVEL');

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('ONGOING', 'COMPLETED', 'CANCELED', 'UNKNOWN', 'ON_HIATUS', 'PUBLISHING_FINISHED');

-- CreateEnum
CREATE TYPE "TrackStatus" AS ENUM ('READING', 'COMPLETED', 'ON_HOLD', 'DROPPED', 'PLAN_TO_READ', 'RE_READING', 'WATCHING', 'PLAN_TO_WATCH', 'RE_WATCHING');

-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('CATEGORY', 'MANGA', 'CHAPTER', 'TRACK', 'HISTORY', 'UPDATE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "scopes" "AdminScope"[],
    "isPrimaryAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "avatarUrl" TEXT,
    "suspended" BOOLEAN NOT NULL DEFAULT false,
    "suspendedReason" TEXT,
    "registeredIp" TEXT,
    "maxLibraryBytesOverride" INTEGER,
    "blurNsfw" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimitAttempt" (
    "key" TEXT NOT NULL,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RateLimitAttempt_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "actorUsername" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "targetId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InviteCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdById" TEXT,
    "maxUses" INTEGER DEFAULT 1,
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "label" TEXT,
    "grantedRole" "Role" NOT NULL DEFAULT 'USER',
    "grantedScopes" "AdminScope"[],
    "maxLibraryBytesOverride" INTEGER,

    CONSTRAINT "InviteCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvitePreset" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "maxUses" INTEGER DEFAULT 1,
    "expiresInDays" INTEGER,
    "grantedRole" "Role" NOT NULL DEFAULT 'USER',
    "grantedScopes" "AdminScope"[],
    "maxLibraryBytesOverride" INTEGER,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvitePreset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InviteRedemption" (
    "id" TEXT NOT NULL,
    "inviteCodeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InviteRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "contactUsername" TEXT,
    "contactInfo" TEXT,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settings" (
    "userId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "updatedAt" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "ServerSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "registrationMode" "RegistrationMode" NOT NULL DEFAULT 'INVITE_ONLY',
    "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    "sessionDurationDays" INTEGER NOT NULL DEFAULT 30,
    "siteName" TEXT,
    "avatarsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "maxAvatarBytes" INTEGER NOT NULL DEFAULT 2097152,
    "allowAvatarUrl" BOOLEAN NOT NULL DEFAULT true,
    "minPasswordLength" INTEGER NOT NULL DEFAULT 8,
    "defaultMaxLibraryBytes" INTEGER,
    "publicAppUrl" TEXT,
    "allowedOrigins" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "nsfwGenreTags" TEXT[] DEFAULT ARRAY['Hentai', 'Ecchi', 'Adult', 'Mature', 'Smut', 'Erotica', 'NSFW', 'Pornographic', 'Explicit Sex', 'Sexual Content', 'Nudity', 'Rape', 'Incest', 'MILF', 'Doujinshi', 'Borderline H', 'M18Scan', 'Uncensored', 'Prostitution', 'Sexual Abuse', 'Ahegao', 'Anal', 'Ball Sucking', 'Blowjob', 'Bondage', 'Breast Expansion', 'Breast Feeding', 'Bukkake', 'Cervix Penetration', 'Cosplay Ero', 'Cosplay Nude', 'Cumflation', 'Deepthroat', 'Double Penetration', 'Enema', 'Exhibitionism', 'Femdom', 'Threesome', 'Gaping', 'Gokkun', 'Handjob', 'Huge Breasts', 'Huge Penis', 'Impregnation', 'Inflation', 'Lactation', 'Masturbation', 'Milking', 'Mind Break', 'Mosaic Censorship', 'Nakadashi', 'Netorare', 'Nipple Fuck', 'Orgasm Denial', 'Paizuri', 'Piss Drinking', 'Prolapse', 'Rimjob', 'Scat', 'Smegma', 'Squirting', 'Tailjob', 'Vaginal Birth', 'Big Areolae', 'Big Ass', 'Big Clit', 'Big Nipples', 'Big Penis', 'Fetish', 'Urination', 'Loli', 'Futanari', 'Bestiality', 'Guro', 'BDSM', 'Tentacle', 'Yiff', 'Voyeur']::TEXT[],
    "nsfwSymbols" TEXT[] DEFAULT ARRAY['♀']::TEXT[],
    "nsfwKeywords" TEXT[] DEFAULT ARRAY['hentai', 'ecchi', 'adult', 'mature', 'smut', 'erotica', 'nsfw', 'pornographic', 'explicit sex', 'sexual content', 'nudity', 'sex', 'rape', 'incest', 'milf', 'doujinshi', 'borderline h', 'm18scan', 'uncensored', 'prostitution', 'sexual abuse', 'ahegao', 'anal', 'ball sucking', 'blowjob', 'bondage', 'breast expansion', 'breast feeding', 'bukkake', 'cervix penetration', 'cosplay ero', 'cosplay nude', 'cumflation', 'deepthroat', 'double penetration', 'enema', 'exhibitionism', 'femdom', 'threesome', 'gaping', 'gokkun', 'handjob', 'huge breasts', 'huge penis', 'impregnation', 'inflation', 'lactation', 'masturbation', 'milking', 'mind break', 'mosaic censorship', 'nakadashi', 'netorare', 'nipple fuck', 'orgasm denial', 'paizuri', 'piss drinking', 'prolapse', 'rimjob', 'scat', 'smegma', 'squirting', 'tailjob', 'vaginal birth', 'big areolae', 'big ass', 'big clit', 'big nipples', 'big penis', 'fetish', 'urination', 'loli', 'futanari', 'bestiality', 'guro', 'bdsm', 'tentacle', 'yiff', 'voyeur']::TEXT[],
    "smtpHost" TEXT,
    "smtpPort" INTEGER,
    "smtpSecure" BOOLEAN NOT NULL DEFAULT false,
    "smtpUser" TEXT,
    "smtpPassword" TEXT,
    "smtpFrom" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServerSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogEntry" (
    "id" BIGSERIAL NOT NULL,
    "source" TEXT,
    "sourceId" INTEGER,
    "link" TEXT,
    "itemType" "ItemType" NOT NULL,
    "name" TEXT,
    "imageUrl" TEXT,
    "description" TEXT,
    "author" TEXT,
    "artist" TEXT,
    "status" "Status" NOT NULL DEFAULT 'UNKNOWN',
    "genre" TEXT[],
    "lang" TEXT,
    "lastUpdate" BIGINT,
    "updatedAt" BIGINT NOT NULL DEFAULT 0,
    "nsfwOverride" BOOLEAN,

    CONSTRAINT "CatalogEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" BIGSERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "clientId" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "forItemType" "ItemType" NOT NULL,
    "pos" INTEGER,
    "hide" BOOLEAN NOT NULL DEFAULT false,
    "shouldUpdate" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Manga" (
    "id" BIGSERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "clientId" BIGINT NOT NULL,
    "catalogEntryId" BIGINT NOT NULL,
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "dateAdded" BIGINT,
    "lastRead" BIGINT,
    "isLocalArchive" BOOLEAN NOT NULL DEFAULT false,
    "customCoverFromTracker" TEXT,
    "smartUpdateDays" INTEGER,
    "updatedAt" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "Manga_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MangaCategory" (
    "mangaId" BIGINT NOT NULL,
    "categoryId" BIGINT NOT NULL,

    CONSTRAINT "MangaCategory_pkey" PRIMARY KEY ("mangaId","categoryId")
);

-- CreateTable
CREATE TABLE "CatalogChapter" (
    "id" BIGSERIAL NOT NULL,
    "catalogEntryId" BIGINT NOT NULL,
    "name" TEXT,
    "url" TEXT,
    "scanlator" TEXT,
    "dateUpload" BIGINT,
    "isFiller" BOOLEAN NOT NULL DEFAULT false,
    "thumbnailUrl" TEXT,
    "description" TEXT,
    "downloadSize" INTEGER,
    "duration" INTEGER,
    "updatedAt" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "CatalogChapter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChapterState" (
    "id" BIGSERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "clientId" BIGINT NOT NULL,
    "mangaId" BIGINT NOT NULL,
    "catalogChapterId" BIGINT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isBookmarked" BOOLEAN NOT NULL DEFAULT false,
    "lastPageRead" TEXT,
    "updatedAt" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "ChapterState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Track" (
    "id" BIGSERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "clientId" BIGINT NOT NULL,
    "mangaId" BIGINT NOT NULL,
    "syncId" INTEGER,
    "mediaId" INTEGER,
    "libraryId" INTEGER,
    "title" TEXT,
    "lastChapterRead" DOUBLE PRECISION,
    "totalChapter" INTEGER,
    "score" DOUBLE PRECISION,
    "status" "TrackStatus" NOT NULL DEFAULT 'READING',
    "startedReadingDate" TEXT,
    "finishedReadingDate" TEXT,
    "trackingUrl" TEXT,
    "itemType" "ItemType" NOT NULL,
    "updatedAt" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "Track_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "History" (
    "id" BIGSERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "clientId" BIGINT NOT NULL,
    "mangaId" BIGINT NOT NULL,
    "chapterStateId" BIGINT NOT NULL,
    "itemType" "ItemType" NOT NULL,
    "date" BIGINT,
    "readingTimeSeconds" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "History_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Update" (
    "id" BIGSERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "clientId" BIGINT NOT NULL,
    "mangaId" BIGINT NOT NULL,
    "chapterName" TEXT,
    "chapterId" BIGINT,
    "date" BIGINT,
    "updatedAt" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "Update_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tombstone" (
    "id" BIGSERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "entityType" "EntityType" NOT NULL,
    "clientId" BIGINT NOT NULL,
    "deletedAt" BIGINT NOT NULL,

    CONSTRAINT "Tombstone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_username_idx" ON "User"("username");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "RateLimitAttempt_lastAttemptAt_idx" ON "RateLimitAttempt"("lastAttemptAt");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "InviteCode_code_key" ON "InviteCode"("code");

-- CreateIndex
CREATE INDEX "InviteCode_code_idx" ON "InviteCode"("code");

-- CreateIndex
CREATE UNIQUE INDEX "InvitePreset_name_key" ON "InvitePreset"("name");

-- CreateIndex
CREATE UNIQUE INDEX "InviteRedemption_userId_key" ON "InviteRedemption"("userId");

-- CreateIndex
CREATE INDEX "Report_status_createdAt_idx" ON "Report"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE INDEX "CatalogEntry_itemType_idx" ON "CatalogEntry"("itemType");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogEntry_source_link_key" ON "CatalogEntry"("source", "link");

-- CreateIndex
CREATE INDEX "Category_userId_updatedAt_idx" ON "Category"("userId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Category_userId_clientId_key" ON "Category"("userId", "clientId");

-- CreateIndex
CREATE INDEX "Manga_userId_updatedAt_idx" ON "Manga"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "Manga_catalogEntryId_idx" ON "Manga"("catalogEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "Manga_userId_clientId_key" ON "Manga"("userId", "clientId");

-- CreateIndex
CREATE INDEX "CatalogChapter_catalogEntryId_updatedAt_idx" ON "CatalogChapter"("catalogEntryId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogChapter_catalogEntryId_url_key" ON "CatalogChapter"("catalogEntryId", "url");

-- CreateIndex
CREATE INDEX "ChapterState_userId_updatedAt_idx" ON "ChapterState"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "ChapterState_userId_mangaId_idx" ON "ChapterState"("userId", "mangaId");

-- CreateIndex
CREATE INDEX "ChapterState_catalogChapterId_idx" ON "ChapterState"("catalogChapterId");

-- CreateIndex
CREATE UNIQUE INDEX "ChapterState_userId_clientId_key" ON "ChapterState"("userId", "clientId");

-- CreateIndex
CREATE INDEX "Track_userId_updatedAt_idx" ON "Track"("userId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Track_userId_clientId_key" ON "Track"("userId", "clientId");

-- CreateIndex
CREATE INDEX "History_userId_updatedAt_idx" ON "History"("userId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "History_userId_clientId_key" ON "History"("userId", "clientId");

-- CreateIndex
CREATE INDEX "Update_userId_updatedAt_idx" ON "Update"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "Update_userId_mangaId_chapterName_idx" ON "Update"("userId", "mangaId", "chapterName");

-- CreateIndex
CREATE UNIQUE INDEX "Update_userId_clientId_key" ON "Update"("userId", "clientId");

-- CreateIndex
CREATE INDEX "Tombstone_userId_entityType_deletedAt_idx" ON "Tombstone"("userId", "entityType", "deletedAt");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InviteCode" ADD CONSTRAINT "InviteCode_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvitePreset" ADD CONSTRAINT "InvitePreset_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InviteRedemption" ADD CONSTRAINT "InviteRedemption_inviteCodeId_fkey" FOREIGN KEY ("inviteCodeId") REFERENCES "InviteCode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InviteRedemption" ADD CONSTRAINT "InviteRedemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settings" ADD CONSTRAINT "Settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Manga" ADD CONSTRAINT "Manga_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Manga" ADD CONSTRAINT "Manga_catalogEntryId_fkey" FOREIGN KEY ("catalogEntryId") REFERENCES "CatalogEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MangaCategory" ADD CONSTRAINT "MangaCategory_mangaId_fkey" FOREIGN KEY ("mangaId") REFERENCES "Manga"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MangaCategory" ADD CONSTRAINT "MangaCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogChapter" ADD CONSTRAINT "CatalogChapter_catalogEntryId_fkey" FOREIGN KEY ("catalogEntryId") REFERENCES "CatalogEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChapterState" ADD CONSTRAINT "ChapterState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChapterState" ADD CONSTRAINT "ChapterState_mangaId_fkey" FOREIGN KEY ("mangaId") REFERENCES "Manga"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChapterState" ADD CONSTRAINT "ChapterState_catalogChapterId_fkey" FOREIGN KEY ("catalogChapterId") REFERENCES "CatalogChapter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Track" ADD CONSTRAINT "Track_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Track" ADD CONSTRAINT "Track_mangaId_fkey" FOREIGN KEY ("mangaId") REFERENCES "Manga"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "History" ADD CONSTRAINT "History_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "History" ADD CONSTRAINT "History_mangaId_fkey" FOREIGN KEY ("mangaId") REFERENCES "Manga"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "History" ADD CONSTRAINT "History_chapterStateId_fkey" FOREIGN KEY ("chapterStateId") REFERENCES "ChapterState"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Update" ADD CONSTRAINT "Update_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Update" ADD CONSTRAINT "Update_mangaId_fkey" FOREIGN KEY ("mangaId") REFERENCES "Manga"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Update" ADD CONSTRAINT "Update_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "CatalogChapter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tombstone" ADD CONSTRAINT "Tombstone_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

