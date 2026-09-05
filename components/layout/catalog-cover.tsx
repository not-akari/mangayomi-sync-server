"use client";

import { useState } from "react";
import { ImageOff } from "lucide-react";

export function CatalogCover({
  src,
  alt,
  className,
}: {
  src: string | null;
  alt: string;
  className?: string;
}): React.ReactElement {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex items-center justify-center bg-muted text-muted-foreground ${className ?? ""}`}
      >
        <ImageOff className="size-6" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- covers come from arbitrary source hosts, next/image would need every host allowlisted
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
