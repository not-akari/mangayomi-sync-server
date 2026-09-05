"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// Turns camelCase into words ("appUiScale" -> "App Ui Scale") - not a real label dictionary for ~200 fields.
function humanizeKey(key: string): string {
  if (/^\d+$/.test(key)) return `Item ${Number(key) + 1}`;
  const spaced = key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

// Only fields whose int-enum meaning was actually verified get translated; everything else stays a plain number.
const LIBRARY_FILTER_TYPE_VALUES: Record<number, string> = {
  0: "Off",
  1: "Only",
  2: "Exclude",
};

function formatValue(rawKey: string, value: string | number | boolean): string {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (
    typeof value === "number" &&
    rawKey.startsWith("libraryFilter") &&
    rawKey.endsWith("Type")
  ) {
    return LIBRARY_FILTER_TYPE_VALUES[value] ?? String(value);
  }
  return String(value);
}

// Renders key/value pairs directly with no wrapping "object" node, for a caller that shows its own group heading.
export function JsonEntries({
  entries,
}: {
  entries: [key: string, value: unknown][];
}): React.ReactElement {
  return (
    <div>
      {entries.map(([key, value], index) => (
        <JsonNode
          key={key}
          rawKey={key}
          value={value}
          depth={1}
          index={index}
        />
      ))}
    </div>
  );
}

function JsonNode({
  rawKey,
  value,
  depth,
  index,
}: {
  rawKey: string | null;
  value: unknown;
  depth: number;
  index: number;
}): React.ReactElement {
  const [open, setOpen] = useState(false);
  const label = rawKey === null ? null : humanizeKey(rawKey);
  const striped = index % 2 === 1;

  if (value === null || value === undefined) {
    return <Leaf label={label} value="empty" striped={striped} />;
  }
  if (typeof value === "string") {
    return (
      <Leaf
        label={label}
        value={value === "" ? "empty" : value}
        striped={striped}
      />
    );
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return (
      <Leaf
        label={label}
        value={formatValue(rawKey ?? "", value)}
        striped={striped}
      />
    );
  }

  const isArray = Array.isArray(value);
  const entries = isArray
    ? (value as unknown[]).map((v, i) => [String(i), v] as const)
    : Object.entries(value as Record<string, unknown>);

  return (
    <div className={depth > 0 ? "ml-2" : ""}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-left text-base",
          striped ? "bg-muted/40" : "",
          "hover:bg-accent",
        )}
      >
        <ChevronRight
          className={cn(
            "size-4 shrink-0 transition-transform",
            open && "rotate-90",
          )}
        />
        <span>
          {label ?? "Item"}{" "}
          <span className="text-muted-foreground">({entries.length})</span>
        </span>
      </button>
      {open && (
        <div className="ml-2">
          {entries.length === 0 && (
            <div className="text-muted-foreground px-3 py-2 text-base">
              Nothing here.
            </div>
          )}
          {entries.map(([key, child], i) => (
            <JsonNode
              key={key}
              rawKey={key}
              value={child}
              depth={depth + 1}
              index={i}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Leaf({
  label,
  value,
  striped,
}: {
  label: string | null;
  value: string;
  striped: boolean;
}): React.ReactElement {
  return (
    <div
      className={cn(
        "ml-2 flex items-baseline justify-between gap-4 rounded-md px-3 py-2.5 text-base",
        striped ? "bg-muted/40" : "",
      )}
    >
      {label !== null && <span>{label}</span>}
      <span className="text-muted-foreground text-right break-words">
        {value}
      </span>
    </div>
  );
}
