"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Season = "winter" | "spring" | "summer" | "fall";

const SEASON_BY_MONTH: Season[] = [
  "winter", // Jan
  "winter", // Feb
  "spring", // Mar
  "spring", // Apr
  "spring", // May
  "summer", // Jun
  "summer", // Jul
  "summer", // Aug
  "fall", // Sep
  "fall", // Oct
  "fall", // Nov
  "winter", // Dec
];

// Set to null to go back to picking the season from the calendar month.
const FORCE_SEASON: Season | null = null;

export function currentSeason(): Season {
  return FORCE_SEASON ?? SEASON_BY_MONTH[new Date().getMonth()] ?? "winter";
}

// Renders one of the pre-rasterized PNGs from public/seasonal/, shared by the accessory overlay and particles.
export function SeasonalImg({
  src,
  alt,
  width,
  height,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
}): React.ReactElement {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- local PNG, sized per-instance
    <img src={src} alt={alt} width={width} height={height} draggable={false} />
  );
}

// One accessory per season, rendered on the app icon. Pre-rasterized to PNG via scripts/generate-seasonal-pngs.mjs.
export const ACCESSORY_BY_SEASON: Record<
  Season,
  { src: string; alt: string; width: number; height: number; className: string }
> = {
  winter: {
    src: "/seasonal/accessory-santa-hat.png",
    alt: "Santa hat",
    width: 34,
    height: 26,
    className: "absolute -top-3 -left-3 -rotate-12",
  },
  spring: {
    src: "/seasonal/accessory-flower-crown.png",
    alt: "Flower crown",
    width: 44,
    height: 20,
    className: "absolute -top-3 left-1/2 -translate-x-1/2",
  },
  summer: {
    src: "/seasonal/accessory-sunglasses.png",
    alt: "Sunglasses",
    width: 36,
    height: 14,
    className: "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
  },
  fall: {
    src: "/seasonal/accessory-acorn.png",
    alt: "Acorn",
    width: 26,
    height: 22,
    className: "absolute -top-3 -right-2 rotate-6",
  },
};

// Particles, rendered many times at once and continuously animated. Also pre-rasterized to PNG.
const PARTICLE_SRC: Record<Season, string> = {
  winter: "/seasonal/particle-snowflake.png",
  spring: "/seasonal/particle-sakura.png",
  fall: "/seasonal/particle-leaf.png",
  summer: "/seasonal/particle-firefly.png",
};

const PARTICLE_ALT: Record<Season, string> = {
  winter: "Snowflake",
  spring: "Sakura petal",
  fall: "Leaf",
  summer: "Firefly",
};

const PARTICLE_MODE: Record<Season, "fall" | "float"> = {
  winter: "fall",
  spring: "fall",
  fall: "fall",
  summer: "float",
};

// Three depth layers (far/mid/near): farther ones are smaller, dimmer, blurred, drift slower, and shift less on pointer move.
const LAYERS = [
  {
    count: 4,
    scale: 0.55,
    opacity: 0.35,
    blurPx: 1,
    durationMult: 1.6,
    parallax: 10,
  },
  {
    count: 4,
    scale: 0.8,
    opacity: 0.65,
    blurPx: 0,
    durationMult: 1.2,
    parallax: 22,
  },
  {
    count: 4,
    scale: 1.15,
    opacity: 1,
    blurPx: 0,
    durationMult: 0.85,
    parallax: 40,
  },
] as const;

interface Particle {
  id: number;
  layerIndex: number;
  left: number;
  top?: number;
  phase: number;
  duration: number;
  size: number;
  drift: number;
}

let nextParticleId = 0;

// `phase` becomes a negative delay so a freshly toggled-on scene looks already mid-snowfall, not empty.
function spawnParticle(
  mode: "fall" | "float",
  layerIndex: number,
  phase: number,
): Particle {
  return {
    id: nextParticleId++,
    layerIndex,
    left: Math.random() * 100,
    top: mode === "float" ? Math.random() * 80 : undefined,
    phase,
    duration: 10 + Math.random() * 10,
    size: 12 + Math.random() * 14,
    drift: (Math.random() - 0.5) * 140,
  };
}

// Snow reads better with a denser fall than the other seasons, so it gets a few extra per layer.
const EXTRA_COUNT_BY_SEASON: Partial<Record<Season, number>> = { winter: 5 };

function buildParticles(mode: "fall" | "float", season: Season): Particle[] {
  const particles: Particle[] = [];
  const extra = EXTRA_COUNT_BY_SEASON[season] ?? 0;
  LAYERS.forEach((layer, layerIndex) => {
    const layerExtra =
      Math.floor(extra / LAYERS.length) +
      (layerIndex < extra % LAYERS.length ? 1 : 0);
    for (let i = 0; i < layer.count + layerExtra; i++) {
      particles.push(spawnParticle(mode, layerIndex, Math.random()));
    }
  });
  return particles;
}

// A wandering descent (alternating sideways sway) instead of one straight diagonal line, closer to how snow/petals/leaves actually drift down.
function fallFrames(drift: number): Keyframe[] {
  return [
    {
      transform: "translate3d(0, -10vh, 0) rotate(0deg)",
      opacity: 0,
      offset: 0,
    },
    { opacity: 1, offset: 0.08 },
    {
      transform: `translate3d(${drift * 0.35}px, 15vh, 0) rotate(20deg)`,
      offset: 0.25,
    },
    {
      transform: `translate3d(${drift * -0.3}px, 40vh, 0) rotate(-15deg)`,
      offset: 0.5,
    },
    {
      transform: `translate3d(${drift * 0.45}px, 65vh, 0) rotate(25deg)`,
      offset: 0.75,
    },
    { opacity: 1, offset: 0.92 },
    {
      transform: `translate3d(${drift}px, 110vh, 0) rotate(10deg)`,
      opacity: 0,
      offset: 1,
    },
  ];
}

function floatFrames(drift: number): Keyframe[] {
  return [
    { transform: "translate3d(0, 0, 0)", opacity: 0.15 },
    {
      transform: `translate3d(${drift}px, -40px, 0)`,
      opacity: 0.9,
      offset: 0.5,
    },
    { transform: "translate3d(0, 0, 0)", opacity: 0.15 },
  ];
}

// Takes the ref object, not .current, since .current must only be read inside the returned callback.
function trackRef(
  ref: React.RefObject<Map<number, HTMLSpanElement>>,
  id: number,
): (el: HTMLSpanElement | null) => void {
  return (el) => {
    if (el) ref.current.set(id, el);
    else ref.current.delete(id);
  };
}

export function SeasonalBackground(): React.ReactElement | null {
  const season = useMemo(() => currentSeason(), []);
  const mode = PARTICLE_MODE[season];
  const particleSrc = PARTICLE_SRC[season];
  const particleAlt = PARTICLE_ALT[season];
  const particles = useMemo(() => buildParticles(mode, season), [mode, season]);
  const outerRefs = useRef<Map<number, HTMLSpanElement>>(new Map());
  const innerRefs = useRef<Map<number, HTMLSpanElement>>(new Map());
  const fallAnimations = useRef<Map<number, Animation>>(new Map());
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- window is unavailable during SSR
    setReducedMotion(
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
  }, []);

  // Only starts an animation for a particle that doesn't already have one running.
  useEffect(() => {
    if (reducedMotion) return;
    particles.forEach((p) => {
      if (fallAnimations.current.has(p.id)) return;
      const el = innerRefs.current.get(p.id);
      const layer = LAYERS[p.layerIndex];
      if (!el || !layer) return;
      const frames =
        mode === "fall" ? fallFrames(p.drift) : floatFrames(p.drift);
      const durationMs = p.duration * layer.durationMult * 1000;
      const anim = el.animate(frames, {
        duration: durationMs,
        delay: -p.phase * durationMs,
        iterations: Infinity,
        easing: "ease-in-out",
        // Shows the first keyframe during any remaining delay, instead of the plain resting style.
        fill: "backwards",
      });
      fallAnimations.current.set(p.id, anim);
    });
  }, [particles, mode, reducedMotion]);

  useEffect(() => {
    const animations = fallAnimations.current;
    return () => {
      animations.forEach((a) => a.cancel());
      animations.clear();
    };
  }, []);

  // Parallax on `translate` (independent from `transform`, which the fall/float animation owns); the rAF loop stops once it catches up.
  useEffect(() => {
    if (reducedMotion || window.matchMedia("(pointer: coarse)").matches) return;

    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let frame = 0;
    let running = false;

    function tick(): void {
      currentX += (targetX - currentX) * 0.06;
      currentY += (targetY - currentY) * 0.06;
      particles.forEach((p) => {
        const el = outerRefs.current.get(p.id);
        const strength = LAYERS[p.layerIndex]?.parallax ?? 0;
        if (el) {
          el.style.translate = `${currentX * strength}px ${currentY * strength}px`;
        }
      });
      if (
        Math.abs(targetX - currentX) < 0.001 &&
        Math.abs(targetY - currentY) < 0.001
      ) {
        running = false;
        return;
      }
      frame = requestAnimationFrame(tick);
    }

    function onPointerMove(event: PointerEvent): void {
      targetX = event.clientX / window.innerWidth - 0.5;
      targetY = event.clientY / window.innerHeight - 0.5;
      if (!running) {
        running = true;
        frame = requestAnimationFrame(tick);
      }
    }

    window.addEventListener("pointermove", onPointerMove);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      cancelAnimationFrame(frame);
    };
  }, [particles, reducedMotion]);

  if (reducedMotion) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {particles.map((p) => {
        const layer = LAYERS[p.layerIndex];
        if (!layer) return null;
        return (
          <span
            key={p.id}
            ref={trackRef(outerRefs, p.id)}
            className="absolute"
            style={{
              left: `${p.left}%`,
              top:
                p.top !== undefined
                  ? `${p.top}%`
                  : mode === "fall"
                    ? 0
                    : undefined,
            }}
          >
            <span
              ref={trackRef(innerRefs, p.id)}
              style={{
                display: "inline-block",
                opacity: layer.opacity,
                filter: layer.blurPx ? `blur(${layer.blurPx}px)` : undefined,
              }}
            >
              <SeasonalImg
                src={particleSrc}
                alt={particleAlt}
                width={p.size * layer.scale}
                height={p.size * layer.scale}
              />
            </span>
          </span>
        );
      })}
    </div>
  );
}
