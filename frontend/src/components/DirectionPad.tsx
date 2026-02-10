import type { Direction } from './SpriteAnimator';

/**
 * 8-direction compass pad. Click arrows to change direction.
 * Compact grid layout:
 *   NW  N  NE
 *    W  ·  E
 *   SW  S  SE
 */
export default function DirectionPad({
  direction,
  onChange,
  directions = 8,
  size = 'sm',
}: {
  direction: Direction;
  onChange: (d: Direction) => void;
  directions?: 4 | 8;
  size?: 'sm' | 'md';
}) {
  const isSmall = size === 'sm';
  const btnSize = isSmall ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-sm';

  // Arrow symbols for each direction
  const arrows: Record<string, string> = {
    N: '↑', NE: '↗', E: '→', SE: '↘',
    S: '↓', SW: '↙', W: '←', NW: '↖',
  };

  const is4 = directions === 4;

  function btn(d: Direction | null) {
    if (!d) return <div className={btnSize} />;
    if (is4 && ['NE', 'NW', 'SE', 'SW'].includes(d)) return <div className={btnSize} />;

    const active = direction === d;
    return (
      <button
        onClick={() => onChange(d)}
        className={`${btnSize} rounded font-medium flex items-center justify-center transition-colors ${
          active
            ? 'bg-yellow-500 text-black'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
        }`}
        title={d}
      >
        {arrows[d]}
      </button>
    );
  }

  return (
    <div className="inline-grid grid-cols-3 gap-0.5">
      {btn('NW')}{btn('N')}{btn('NE')}
      {btn('W')}<div className={`${btnSize} flex items-center justify-center text-gray-300 dark:text-gray-600`}>·</div>{btn('E')}
      {btn('SW')}{btn('S')}{btn('SE')}
    </div>
  );
}
