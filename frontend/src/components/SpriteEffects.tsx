import { useMemo } from 'react';
import './SpriteEffects.css';

export type EffectType = 'rain' | 'snow' | 'hearts' | 'sparkles' | 'none';
export type Intensity = 'light' | 'medium' | 'heavy';

interface SpriteEffectsProps {
  effect: EffectType;
  intensity?: Intensity;
  color?: string;
  children: React.ReactNode;
}

const COUNTS: Record<Intensity, number> = { light: 10, medium: 20, heavy: 35 };

function seededRandom(i: number) {
  // deterministic pseudo-random for consistent SSR/hydration
  const x = Math.sin(i * 9301 + 4927) * 49297;
  return x - Math.floor(x);
}

/**
 * SpriteEffects — Pure CSS overlay effects for SpriteAnimator.
 * 
 * Proof of concept: rain, snow, hearts, sparkles.
 * Zero dependencies. GPU-composited animations only.
 */
export default function SpriteEffects({
  effect,
  intensity = 'medium',
  color,
  children,
}: SpriteEffectsProps) {
  const count = COUNTS[intensity];

  const particles = useMemo(() => {
    if (effect === 'none') return null;
    return Array.from({ length: count }, (_, i) => {
      const r = seededRandom(i);
      const r2 = seededRandom(i + 100);
      const r3 = seededRandom(i + 200);
      const style: React.CSSProperties = {
        left: `${r * 100}%`,
        animationDelay: `${r2 * 3}s`,
        animationDuration: `${1 + r3 * 2}s`,
        ...(color ? { color, borderColor: color, backgroundColor: color } : {}),
      };

      if (effect === 'rain') {
        style.animationDuration = `${0.4 + r3 * 0.6}s`;
        style.height = `${10 + r3 * 12}px`;
      }
      if (effect === 'snow') {
        const size = 3 + r3 * 5;
        style.width = size;
        style.height = size;
        style.animationDuration = `${2 + r3 * 3}s`;
      }
      if (effect === 'hearts') {
        style.animationDuration = `${1.5 + r3 * 2}s`;
        style.fontSize = `${8 + r3 * 14}px`;
      }
      if (effect === 'sparkles') {
        style.animationDuration = `${0.6 + r3 * 1.4}s`;
        style.top = `${r2 * 100}%`;
        style.fontSize = `${6 + r3 * 12}px`;
      }

      return (
        <span
          key={i}
          className={`se-particle se-${effect}`}
          style={style}
        >
          {effect === 'hearts' && '❤️'}
          {effect === 'sparkles' && '✨'}
        </span>
      );
    });
  }, [effect, count, color]);

  if (effect === 'none') return <>{children}</>;

  return (
    <div className="se-wrapper">
      {children}
      <div className="se-layer" aria-hidden="true">
        {particles}
      </div>
    </div>
  );
}
