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

  const getCount = (id: string) => id === 'all' ? tasks.length : (counts[id] || 0);
  const activeConfig = STATUS_CONFIGS.find(s => s.id === activeFilter) || STATUS_CONFIGS[0];

  return (
    <>
      {/* Mobile: dropdown */}
      <div className="sm:hidden mb-4">
        <select
          value={activeFilter}
          onChange={(e) => onFilterChange(e.target.value as Task['status'] | 'all')}
          className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-900 dark:text-white appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg%20xmlns%3d%22http%3a%2f%2fwww.w3.org%2f2000%2fsvg%22%20viewBox%3d%220%200%2020%2020%22%20fill%3d%22%236B7280%22%3e%3cpath%20fill-rule%3d%22evenodd%22%20d%3d%22M5.23%207.21a.75.75%200%20011.06.02L10%2011.168l3.71-3.938a.75.75%200%20111.08%201.04l-4.25%204.5a.75.75%200%2001-1.08%200l-4.25-4.5a.75.75%200%2001.02-1.06z%22%20clip-rule%3d%22evenodd%22%20%2f%3e%3c%2fsvg%3e')] bg-no-repeat bg-[right_0.5rem_center] bg-[length:1.5em_1.5em] pr-10"
        >
          {STATUS_CONFIGS.map((status) => (
            <option key={status.id} value={status.id}>
              {status.label} ({getCount(status.id)})
            </option>
          ))}
        </select>
      </div>

      {/* Desktop: tab bar */}
      <div className="hidden sm:flex items-center gap-1 bg-gray-100 p-1 rounded-lg mb-4 dark:bg-gray-700">
        {STATUS_CONFIGS.map((status) => {
          const count = getCount(status.id);
          const isActive = activeFilter === status.id;

          return (
            <button
              key={status.id}
              onClick={() => onFilterChange(status.id)}
              className={`
                flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all
                ${isActive
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }
              `}
            >
              <span className={`w-2 h-2 rounded-full ${status.dotColor}`} />
              <span>{status.label}</span>
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full ${isActive ? 'bg-gray-100 text-gray-700' : 'bg-gray-200 text-gray-500'}`}
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
