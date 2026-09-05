import { useEffect, useState } from "react";

export function usePaginatedList<T>(
  endpoint: string,
  page: number,
  search: string,
  extraParams: Record<string, string | null | undefined> = {},
): { result: T | null; error: boolean } {
  const [result, setResult] = useState<T | null>(null);
  const [error, setError] = useState(false);
  const extraParamsKey = JSON.stringify(extraParams);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ page: String(page) });
    if (search) params.set("search", search);
    for (const [key, value] of Object.entries(extraParams)) {
      if (value) params.set(key, value);
    }

    fetch(`${endpoint}?${params}`)
      .then((response) => {
        if (!response.ok) throw new Error(`Request failed: ${response.status}`);
        return response.json() as Promise<T>;
      })
      .then((data) => {
        if (!cancelled) setResult(data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, page, search, extraParamsKey]);

  return { result, error };
}
