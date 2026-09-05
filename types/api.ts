// Shapes shared between a repository and its client component, kept type-only to avoid bundling Prisma.

import type { ItemType, ServerSettings, TrackStatus } from "@prisma/client";

// --- Library ---

export interface LibraryEntry {
  clientId: number;
  name: string | null;
  imageUrl: string | null;
  itemType: ItemType;
  status: string;
  favorite: boolean;
  lastRead: number | null;
  dateAdded: number | null;
  isLikelyNsfw: boolean;
}

export interface LibraryEntryDetail {
  clientId: number;
  name: string | null;
  imageUrl: string | null;
  itemType: ItemType;
  status: string;
  favorite: boolean;
  isLikelyNsfw: boolean;
  description: string | null;
  author: string | null;
  artist: string | null;
  genre: string[];
  source: string | null;
  link: string | null;
  lang: string | null;
  dateAdded: number | null;
  lastRead: number | null;
  totalChapters: number;
  readChapters: number;
}

// --- History ---

export interface HistoryEntry {
  clientId: number;
  mangaName: string | null;
  imageUrl: string | null;
  chapterName: string | null;
  date: number | null;
  readingTimeSeconds: number;
}

// --- Tracking ---

export interface TrackingEntry {
  clientId: number;
  mangaName: string | null;
  imageUrl: string | null;
  title: string | null;
  status: TrackStatus;
  lastChapterRead: number | null;
  totalChapter: number | null;
  score: number | null;
  trackingUrl: string | null;
}

// --- Updates ---

export interface UpdateEntry {
  clientId: number;
  mangaName: string | null;
  imageUrl: string | null;
  chapterName: string | null;
  date: number | null;
}

// --- Admin catalog ---

export interface AdminCatalogEntry {
  id: number;
  name: string | null;
  imageUrl: string | null;
  itemType: ItemType;
  source: string | null;
  genre: string[];
  heuristicNsfw: boolean;
  nsfwOverride: boolean | null;
  isNsfw: boolean;
}

// --- Admin settings ---

// The ServerSettings row minus id and the actual smtpPassword, plus whether one's set at all.
export type AdminSettingsInitial = Omit<
  ServerSettings,
  "id" | "smtpPassword"
> & {
  smtpPasswordSet: boolean;
};

// --- User stats ---

export interface UserStatsDay {
  /** UTC calendar day, as YYYY-MM-DD. */
  day: string;
  seconds: number;
  entries: number;
}

export interface UserStats {
  totalSeconds: number;
  totalEntries: number;
  chaptersRead: number;
  bookmarks: number;
  libraryTitles: number;
  daysActive: number;
  currentStreak: number;
  longestStreak: number;
  byType: { itemType: ItemType; seconds: number; entries: number }[];
  daily: UserStatsDay[];
  topTitles: {
    name: string | null;
    imageUrl: string | null;
    itemType: ItemType;
    seconds: number;
  }[];
}
