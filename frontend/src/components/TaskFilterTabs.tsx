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
  { id: 'testing', label: 'Testing', dotColor: 'bg-orange-500' },
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
    <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg mb-4">
      {STATUS_CONFIGS.map((status) => {
        const count = status.id === 'all' ? tasks.length : (counts[status.id] || 0);
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
              className={`
                text-xs px-1.5 py-0.5 rounded-full
                ${isActive ? 'bg-gray-100 text-gray-700' : 'bg-gray-200 text-gray-500'}
              `}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
