import { BookOpen, Library, Video } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ItemType } from "@prisma/client";

// Icons mirror the client app types for visual consistency across platforms.
export const ITEM_TYPE_STYLE: Record<
  ItemType,
  { bar: string; icon: LucideIcon }
> = {
  MANGA: { bar: "bg-chart-1", icon: BookOpen },
  ANIME: { bar: "bg-chart-2", icon: Video },
  NOVEL: { bar: "bg-chart-3", icon: Library },
};
