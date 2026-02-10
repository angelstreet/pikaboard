import { useState, useEffect, useRef } from 'react';

const BASE = import.meta.env.BASE_URL || '/';

// v1 Sprite Spec: 4 cols (frames) × N rows (directions)
// Cell: 128×128, transparent PNG
const CELL = 128;
const DEFAULT_FPS = 5;

// Direction indices for v1 layout
const DIR_INDEX_8: Record<string, number> = {
  S: 0, W: 1, N: 2, E: 3, SW: 4, NW: 5, NE: 6, SE: 7,
};
const DIR_INDEX_4: Record<string, number> = {
  S: 0, W: 1, N: 2, E: 3,
};

export const DIRS_8 = ['S', 'W', 'N', 'E', 'SW', 'NW', 'NE', 'SE'] as const;
export const DIRS_4 = ['S', 'W', 'N', 'E'] as const;

export type Direction = (typeof DIRS_8)[number];
export type Animation = 'idle' | 'walk';

interface SpriteAnimatorProps {
  /** Agent name (lowercase), used to find assets at /characters/{agent}/ */
  agent: string;
  /** Which animation to play */
  animation?: Animation;
  /** Direction to face */
  direction?: Direction;
  /** Number of directions: 4 or 8 */
  directions?: 4 | 8;
  /** Number of frames per animation */
  frames?: number;
  /** Frames per second */
  fps?: number;
  /** Fixed size in px (ignored if fill=true) */
  size?: number;
  /** Fill parent container */
  fill?: boolean;
  /** Additional CSS class */
  className?: string;
  /** Additional inline styles */
  style?: React.CSSProperties;
}

/**
 * Reusable sprite animator component.
 * 
 * Expects spritesheets at: /characters/{agent}/{animation}.png
 * Layout: 4 columns (frames) × N rows (directions)
 * Cell size: 128×128px, transparent background
 * 
 * Can be used as overlay on any element — just position the parent.
 */
/**
 * Hook to detect direction count from spritesheet dimensions.
 * 4 cols × 4 rows = iso4, 4 cols × 8 rows = iso8
 */
export function useSpriteInfo(agent: string, animation: Animation = 'idle') {
  const [directions, setDirections] = useState<4 | 8>(8);
  const sheet = `${BASE}characters/${agent}/${animation}.png`;

  useEffect(() => {
    const img = new window.Image();
    img.onload = () => {
      const rows = Math.round(img.naturalHeight / CELL);
      setDirections(rows <= 4 ? 4 : 8);
    };
    img.src = sheet;
  }, [sheet]);

  return { directions };
}

export default function SpriteAnimator({
  agent,
  animation = 'idle',
  direction = 'S',
  directions = 8,
  frames = 4,
  fps = DEFAULT_FPS,
  size,
  fill = false,
  className = '',
  style = {},
}: SpriteAnimatorProps) {
  const [frame, setFrame] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState(0);

  // Animate frames
  useEffect(() => {
    setFrame(0);
    if (frames > 1) {
      intervalRef.current = setInterval(() => {
        setFrame(f => (f + 1) % frames);
      }, 1000 / fps);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [animation, frames, fps]);

  // Measure container for fill mode
  useEffect(() => {
    if (fill && containerRef.current) {
      const ro = new ResizeObserver(entries => {
        const { width, height } = entries[0].contentRect;
        setContainerSize(Math.min(width, height));
      });
      ro.observe(containerRef.current);
      return () => ro.disconnect();
    }
  }, [fill]);

  const sheet = `${BASE}characters/${agent}/${animation}.png`;
  const dirIndex = directions === 4 ? DIR_INDEX_4 : DIR_INDEX_8;
  const row = dirIndex[direction] ?? 0;

  // Scale cell to display size
  const displaySize = fill ? Math.floor(containerSize * 0.9) : (size || CELL);
  const scale = displaySize / CELL;

  // v1 layout: col = frame, row = direction
  const bgX = -(frame * displaySize);
  const bgY = -(row * displaySize);

  const spriteStyle: React.CSSProperties = {
    width: displaySize,
    height: displaySize,
    backgroundImage: `url(${sheet})`,
    backgroundPosition: `${bgX}px ${bgY}px`,
    backgroundSize: `${CELL * frames * scale}px ${CELL * (directions === 4 ? 4 : 8) * scale}px`,
    backgroundRepeat: 'no-repeat',
    imageRendering: 'pixelated' as const,
    ...style,
  };

  if (fill) {
    return (
      <div
        ref={containerRef}
        className={className}
        style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        {containerSize > 0 && <div style={spriteStyle} />}
      </div>
    );
  }

  return <div className={className} style={spriteStyle} />;
}
