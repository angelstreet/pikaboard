export interface RankingData {
  rank: number;
  previousRank?: number;
  name: string;
  score: number;
  avatar?: string;
  trend?: 'up' | 'down' | 'stable';
  metric?: string;
  change?: number;
}

interface RankingBadgeProps {
  data: RankingData;
  variant?: 'compact' | 'full' | 'minimal';
  showTrend?: boolean;
  onClick?: (data: RankingData) => void;
}

// Inline SVG icons
const TrophyIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
  </svg>
);

const MedalIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15" />
    <path d="M11 12 5.12 2.2" />
    <path d="m13 12 5.88-9.8" />
    <path d="M8 7h8" />
    <circle cx="12" cy="17" r="5" />
    <path d="M12 18v-2h-.5" />
  </svg>
);

const AwardIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="6" />
    <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
  </svg>
);

const StarIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const TrendUpIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
    <polyline points="16 7 22 7 22 13" />
  </svg>
);

const TrendDownIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 17 13.5 8.5 8.5 13.5 2 7" />
    <polyline points="16 17 22 17 22 11" />
  </svg>
);

const MinusIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const rankConfig: Record<number, { icon: typeof TrophyIcon; color: string; bg: string; label: string }> = {
  1: { icon: TrophyIcon, color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-950', label: '1st' },
  2: { icon: MedalIcon, color: 'text-gray-400', bg: 'bg-gray-50 dark:bg-gray-900', label: '2nd' },
  3: { icon: AwardIcon, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950', label: '3rd' },
};

const getRankStyle = (rank: number) => {
  if (rank <= 3) return rankConfig[rank];
  return {
    icon: StarIcon,
    color: 'text-indigo-500 dark:text-indigo-400',
    bg: 'bg-indigo-50 dark:bg-indigo-950/50',
    label: `${rank}th`,
  };
};

const getTrendIcon = (trend?: string) => {
  const baseClass = "w-3 h-3";
  switch (trend) {
    case 'up': return <TrendUpIcon className={`${baseClass} text-green-500`} />;
    case 'down': return <TrendDownIcon className={`${baseClass} text-red-500`} />;
    default: return <MinusIcon className={`${baseClass} text-gray-400`} />;
  }
};

const getTrendColor = (trend?: string) => {
  switch (trend) {
    case 'up': return 'text-green-600 dark:text-green-400';
    case 'down': return 'text-red-600 dark:text-red-400';
    default: return 'text-gray-500 dark:text-gray-400';
  }
};

export function RankingBadge({ data, variant = 'compact', showTrend = true, onClick }: RankingBadgeProps) {
  const rankStyle = getRankStyle(data.rank);
  const RankIcon = rankStyle.icon;

  if (variant === 'minimal') {
    return (
      <div
        onClick={() => onClick?.(data)}
        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full ${rankStyle.bg} ${
          onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''
        }`}
      >
        <RankIcon className={`w-3.5 h-3.5 ${rankStyle.color}`} />
        <span className={`text-xs font-semibold ${rankStyle.color}`}>#{data.rank}</span>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div
        onClick={() => onClick?.(data)}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${rankStyle.bg} border border-gray-200 dark:border-gray-700 ${
          onClick ? 'cursor-pointer hover:shadow-sm transition-shadow' : ''
        }`}
      >
        <div className={`flex items-center gap-1 ${rankStyle.color}`}>
          <RankIcon className="w-4 h-4" />
          <span className="text-sm font-bold">{rankStyle.label}</span>
        </div>
        <div className="w-px h-4 bg-gray-300 dark:bg-gray-600" />
        <span className="text-xs text-gray-700 dark:text-gray-300 truncate max-w-[100px]">
          {data.name}
        </span>
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
          {data.score.toLocaleString()}
        </span>
        {showTrend && data.trend && (
          <div className="flex items-center gap-0.5">
            {getTrendIcon(data.trend)}
            {data.change !== undefined && (
              <span className={`text-xs ${getTrendColor(data.trend)}`}>
                {data.change > 0 ? '+' : ''}{data.change}
              </span>
            )}
          </div>
        )}
      </div>
    );
  }

  // Full variant
  const rankChange = data.previousRank ? data.previousRank - data.rank : 0;
  
  return (
    <div
      onClick={() => onClick?.(data)}
      className={`flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm ${
        onClick ? 'cursor-pointer hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all' : ''
      }`}
    >
      {/* Rank Badge */}
      <div className={`flex items-center justify-center w-12 h-12 rounded-xl ${rankStyle.bg} shrink-0`}>
        <RankIcon className={`w-6 h-6 ${rankStyle.color}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-gray-900 dark:text-gray-100 truncate">
            #{data.rank} {data.name}
          </span>
          {rankChange !== 0 && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              rankChange > 0 
                ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' 
                : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
            }`}>
              {rankChange > 0 ? '↑' : '↓'} {Math.abs(rankChange)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {data.score.toLocaleString()}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {data.metric || 'points'}
          </span>
        </div>
      </div>

      {/* Trend Indicator */}
      {showTrend && (
        <div className="text-right shrink-0">
          <div className={`flex items-center justify-end gap-1 ${getTrendColor(data.trend)}`}>
            {getTrendIcon(data.trend)}
            {data.change !== undefined && (
              <span className="text-sm font-medium">
                {data.change > 0 ? '+' : ''}{data.change}%
              </span>
            )}
          </div>
          <span className="text-xs text-gray-400 dark:text-gray-500">vs last period</span>
        </div>
      )}
    </div>
  );
}

interface RankingLeaderboardProps {
  rankings: RankingData[];
  title?: string;
  showHeader?: boolean;
  maxDisplay?: number;
  onItemClick?: (data: RankingData) => void;
}

export function RankingLeaderboard({ 
  rankings, 
  title = 'Leaderboard', 
  showHeader = true,
  maxDisplay = 10,
  onItemClick 
}: RankingLeaderboardProps) {
  const displayData = rankings.slice(0, maxDisplay);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      {showHeader && (
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <TrophyIcon className="w-4 h-4 text-yellow-500" />
            {title}
          </h3>
        </div>
      )}
      <div className="p-2 space-y-1">
        {displayData.map((data, index) => (
          <RankingBadge
            key={`${data.name}-${index}`}
            data={data}
            variant="full"
            showTrend
            onClick={onItemClick}
          />
        ))}
      </div>
      {rankings.length > maxDisplay && (
        <div className="px-4 py-2 text-center border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            +{rankings.length - maxDisplay} more
          </span>
        </div>
      )}
    </div>
  );
}

export default RankingBadge;
