import { Task } from '../api/client';

interface StatusConfig {
  id: Task['status'] | 'all';
  label: string;
  dotColor: string;
}

const STATUS_CONFIGS: StatusConfig[] = [
  { id: 'all', label: 'All', dotColor: 'bg-gray-400' },
  { id: 'inbox', label: 'Inbox', dotColor: 'bg-gray-500' },
  { id: 'up_next', label: 'Up Next', dotColor: 'bg-blue-500' },
  { id: 'in_progress', label: 'In Progress', dotColor: 'bg-yellow-500' },
  { id: 'in_review', label: 'Review', dotColor: 'bg-purple-500' },
  { id: 'done', label: 'Done', dotColor: 'bg-green-500' },
];

interface TaskFilterTabsProps {
  tasks: Task[];
  activeFilter: Task['status'] | 'all';
  onFilterChange: (filter: Task['status'] | 'all') => void;
}

export function TaskFilterTabs({ tasks, activeFilter, onFilterChange }: TaskFilterTabsProps) {
  const counts = tasks.reduce<Record<string, number>>(
    (acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    },
    { all: tasks.length }
  );

  return (
    <>
      {/* Mobile: horizontal scrollable tabs */}
      <div className="sm:hidden mb-4 -mx-1">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar px-1 pb-1">
          {STATUS_CONFIGS.map((status) => {
            const count = status.id === 'all' ? tasks.length : (counts[status.id] || 0);
            const isActive = activeFilter === status.id;

            return (
              <button
                key={status.id}
                onClick={() => onFilterChange(status.id)}
                className={`
                  flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap
                  ${isActive
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 active:bg-gray-200 dark:active:bg-gray-600'
                  }
                `}
              >
                {status.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Desktop: tab bar */}
      <div className="hidden sm:flex items-center gap-1 bg-gray-100 p-1 rounded-lg mb-4 dark:bg-gray-700">
        {STATUS_CONFIGS.map((status) => {
          const count = status.id === 'all' ? tasks.length : (counts[status.id] || 0);
          const isActive = activeFilter === status.id;

          return (
            <button
              key={status.id}
              onClick={() => onFilterChange(status.id)}
              className={`
                flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all flex-shrink-0
                ${isActive
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600/50'
                }
              `}
            >
              <span className={`w-2 h-2 rounded-full ${status.dotColor}`} />
              <span>{status.label}</span>
              <span
                className={`
                  text-xs px-1.5 py-0.5 rounded-full
                  ${isActive ? 'bg-gray-100 dark:bg-gray-500 text-gray-700 dark:text-gray-200' : 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400'}
                `}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}
