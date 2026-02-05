import { useEffect, useState } from 'react';
import { api, Task } from '../api/client';

const COLUMNS = [
  { id: 'inbox', label: '📥 Inbox', color: 'bg-gray-100' },
  { id: 'up_next', label: '⏳ Up Next', color: 'bg-blue-50' },
  { id: 'in_progress', label: '🚧 In Progress', color: 'bg-yellow-50' },
  { id: 'in_review', label: '👀 In Review', color: 'bg-purple-50' },
  { id: 'done', label: '✅ Done', color: 'bg-green-50' },
];

export default function Dashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTasks();
  }, []);

  async function loadTasks() {
    try {
      setLoading(true);
      const data = await api.getTasks();
      setTasks(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }

  const tasksByStatus = (status: string) => tasks.filter((t) => t.status === status);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading tasks...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        <strong>Error:</strong> {error}
        <button
          onClick={loadTasks}
          className="ml-4 text-sm underline hover:no-underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">📋 Kanban Board</h2>

      <div className="grid grid-cols-5 gap-4">
        {COLUMNS.map((col) => (
          <div key={col.id} className={`${col.color} rounded-lg p-3`}>
            <h3 className="font-semibold text-sm mb-3">{col.label}</h3>
            <div className="space-y-2">
              {tasksByStatus(col.id).map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
              {tasksByStatus(col.id).length === 0 && (
                <div className="text-gray-400 text-sm text-center py-4">
                  No tasks
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TaskCard({ task }: { task: Task }) {
  const priorityColors: Record<string, string> = {
    urgent: 'border-l-red-500',
    high: 'border-l-orange-500',
    medium: 'border-l-blue-500',
    low: 'border-l-gray-400',
  };

  return (
    <div
      className={`bg-white rounded shadow-sm p-3 border-l-4 ${
        priorityColors[task.priority] || 'border-l-gray-300'
      }`}
    >
      <h4 className="font-medium text-sm">{task.name}</h4>
      {task.description && (
        <p className="text-xs text-gray-500 mt-1 line-clamp-2">
          {task.description}
        </p>
      )}
      {task.tags && task.tags.length > 0 && (
        <div className="flex gap-1 mt-2 flex-wrap">
          {task.tags.map((tag) => (
            <span
              key={tag}
              className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
