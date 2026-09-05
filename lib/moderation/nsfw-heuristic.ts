function containsAny(value: string, words: string[]): boolean {
  const lower = value.toLowerCase();
  return words.some((word) => lower.includes(word.toLowerCase()));
}

export interface NsfwCandidateEntry {
  name: string | null;
  genre: string[];
  source: string | null;
  description: string | null;
}

export interface NsfwHeuristicSettings {
  nsfwGenreTags: string[];
  nsfwKeywords: string[];
  nsfwSymbols: string[];
}

// Object params instead of 7 positionals - several are `string | null`, an order-dependent footgun.
export function isLikelyNsfw(
  entry: NsfwCandidateEntry,
  settings: NsfwHeuristicSettings,
): boolean {
  const { name, genre, source, description } = entry;
  const { nsfwGenreTags, nsfwKeywords, nsfwSymbols } = settings;

  if (genre.some((tag) => nsfwSymbols.some((symbol) => tag.includes(symbol)))) {
    return true;
  }
  if (genre.some((tag) => containsAny(tag, nsfwGenreTags))) return true;
  if (name !== null && containsAny(name, nsfwGenreTags)) return true;

  if (genre.length === 0) {
    return (
      (name !== null && containsAny(name, nsfwKeywords)) ||
      (source !== null && containsAny(source, nsfwKeywords)) ||
      (description !== null && containsAny(description, nsfwKeywords))
    );
  }
  return false;
}
