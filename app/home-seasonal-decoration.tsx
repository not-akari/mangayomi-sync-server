"use client";

import { useSeasonalBackground } from "@/components/layout/seasonal-background-provider";
import {
  currentSeason,
  ACCESSORY_BY_SEASON,
  SeasonalImg,
} from "@/components/layout/seasonal-background";

// Overlays a seasonal accessory on the app icon; render inside a `relative`-positioned wrapper around it.
export function HomeSeasonalDecoration(): React.ReactElement | null {
  const { enabled } = useSeasonalBackground();
  if (!enabled) return null;
  const { src, alt, width, height, className } =
    ACCESSORY_BY_SEASON[currentSeason()];
  return (
    <span aria-hidden className={className}>
      <SeasonalImg src={src} alt={alt} width={width} height={height} />
    </span>
  );
}
