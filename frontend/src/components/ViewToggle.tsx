interface ViewToggleProps {
  activeView: 'kanban' | 'focus' | 'blocker';
  onViewChange: (view: 'kanban' | 'focus' | 'blocker') => void;
  blockerCount?: number;
}

export function ViewToggle({ activeView, onViewChange, blockerCount = 0 }: ViewToggleProps) {
  return (
    <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
      <button
        onClick={() => onViewChange('kanban')}
        className={`
          flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-md text-sm font-medium transition-all
          ${activeView === 'kanban'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }
        `}
      >
        <span>📋</span>
        <span className="hidden sm:inline">Kanban</span>
      </button>
      <button
        onClick={() => onViewChange('focus')}
        className={`
          flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-md text-sm font-medium transition-all
          ${activeView === 'focus'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }
        `}
      >
        <span>🎯</span>
        <span className="hidden sm:inline">Focus</span>
      </button>
      <button
        onClick={() => onViewChange('blocker')}
        className={`
          flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-md text-sm font-medium transition-all relative
          ${activeView === 'blocker'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }
        `}
      >
        <span>🚧</span>
        <span className="hidden sm:inline">Blocker</span>
        {blockerCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {blockerCount}
          </span>
        )}
      </button>
    </div>
  );
}
