"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { SeasonalBackground } from "./seasonal-background";

const STORAGE_KEY = "seasonal-bg-enabled";

interface SeasonalBackgroundValue {
  enabled: boolean;
  toggle: () => void;
}

const SeasonalBackgroundContext = createContext<SeasonalBackgroundValue | null>(
  null,
);

export function useSeasonalBackground(): SeasonalBackgroundValue {
  const value = useContext(SeasonalBackgroundContext);
  if (!value)
    throw new Error(
      "useSeasonalBackground must be used within SeasonalBackgroundProvider",
    );
  return value;
}

export function useSeasonalBackgroundToggle(): () => void {
  return useSeasonalBackground().toggle;
}

export function SeasonalBackgroundProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reading in useState would mismatch SSR
      setEnabled(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {}
  }, []);

  function toggle(): void {
    setEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {}
      return next;
    });
  }

  return (
    <SeasonalBackgroundContext.Provider value={{ enabled, toggle }}>
      {enabled && <SeasonalBackground />}
      {children}
    </SeasonalBackgroundContext.Provider>
  );
}
