import { BYTES_PER_MB } from "@/lib/config";

type Parsed<T> = { value: T } | null;

interface FieldCodec<T> {
  format: (value: T) => string;
  parse: (text: string) => Parsed<T>;
}

/** Trimmed text, with empty meaning null. */
export const nullableText = {
  format: (value: string | null): string => value ?? "",
  parse: (text: string): Parsed<string | null> => ({
    value: text.trim() || null,
  }),
};

/** A whole number at or above `min`. */
export function boundedInt(min: number, max?: number): FieldCodec<number> {
  return {
    format: (value: number): string => String(value),
    parse: (text: string): Parsed<number> => {
      const parsed = Number(text.trim());
      if (!Number.isInteger(parsed) || parsed < min) return null;
      if (max !== undefined && parsed > max) return null;
      return { value: parsed };
    },
  };
}

/** A whole number at or above `min`, where empty means null. */
export function nullableBoundedInt(
  min: number,
  max: number,
): FieldCodec<number | null> {
  return {
    format: (value: number | null): string =>
      value === null ? "" : String(value),
    parse: (text: string): Parsed<number | null> => {
      const trimmed = text.trim();
      if (trimmed === "") return { value: null };
      const parsed = Number(trimmed);
      if (!Number.isInteger(parsed) || parsed < min || parsed > max) return null;
      return { value: parsed };
    },
  };
}

/** Bytes stored server-side, shown and typed as megabytes. */
export const megabytes = {
  format: (bytes: number): string => String(bytes / BYTES_PER_MB),
  parse: (text: string): Parsed<number> => {
    const mb = Number(text.trim());
    if (!Number.isFinite(mb) || mb <= 0) return null;
    return { value: Math.round(mb * BYTES_PER_MB) };
  },
};

/** Bytes stored server-side, shown as megabytes, where empty means unlimited. */
export const nullableMegabytes = {
  format: (bytes: number | null): string =>
    bytes === null ? "" : String(bytes / BYTES_PER_MB),
  parse: (text: string): Parsed<number | null> => {
    const trimmed = text.trim();
    if (trimmed === "") return { value: null };
    const mb = Number(trimmed);
    if (!Number.isFinite(mb) || mb <= 0) return null;
    return { value: Math.round(mb * BYTES_PER_MB) };
  },
};

/** A comma-separated list, blanks dropped. Always parses, so it never rejects input. */
export const commaList = {
  format: (values: string[]): string => values.join(", "),
  parse: (text: string): { value: string[] } => ({
    value: text
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  }),
};
