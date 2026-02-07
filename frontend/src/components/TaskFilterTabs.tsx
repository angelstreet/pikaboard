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
  // Calculate counts by status
  const counts = tasks.reduce<Record<string, number>>(
    (acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    },
    { all: tasks.length }
  );

  return (
    <>
      {/* Mobile: dropdown */}
      <div className="sm:hidden mb-4">
        <div className="relative">
          <select
            value={activeFilter}
            onChange={(e) => onFilterChange(e.target.value as Task['status'] | 'all')}
            className="w-full appearance-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 pr-10 text-sm font-medium text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {STATUS_CONFIGS.map((status) => {
              const count = status.id === 'all' ? tasks.length : (counts[status.id] || 0);
              return (
                <option key={status.id} value={status.id}>
                  {status.label} ({count})
                </option>
              );
            })}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
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
