// Spreadable where-fragment shared by history/tracking/updates queries; {} for an empty search.
export function catalogNameSearchWhere(search: string): object {
  return search
    ? {
        manga: {
          catalogEntry: {
            name: { contains: search, mode: "insensitive" as const },
          },
        },
      }
    : {};
}
