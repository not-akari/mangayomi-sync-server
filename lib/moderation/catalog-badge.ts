export interface CatalogBadgeEntry {
  nsfwOverride: boolean | null;
  heuristicNsfw: boolean;
}

export interface CatalogBadgeLabels {
  manual: string;
  falsePositive: string;
  auto: string;
}

export interface CatalogBadge {
  label: string;
  tone: string;
}

export function catalogNsfwBadge(
  entry: CatalogBadgeEntry,
  labels: CatalogBadgeLabels,
): CatalogBadge | null {
  if (entry.nsfwOverride === true) {
    return { label: labels.manual, tone: "bg-red-500/80 text-white" };
  }
  if (entry.nsfwOverride === false && entry.heuristicNsfw) {
    return { label: labels.falsePositive, tone: "bg-amber-500/80 text-white" };
  }
  if (entry.nsfwOverride === null && entry.heuristicNsfw) {
    return { label: labels.auto, tone: "bg-red-500/80 text-white" };
  }
  return null;
}
