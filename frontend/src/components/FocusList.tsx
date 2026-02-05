import { useState, useMemo } from 'react';
import { Task } from '../api/client';

interface FocusListProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

const PRIORITY_ORDER: Record<Task['priority'], number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const PRIORITY_COLORS: Record<Task['priority'], { dot: string; label: string; bg: string }> = {
  urgent: { dot: 'bg-red-500', label: 'text-red-700', bg: 'bg-red-50' },
  high: { dot: 'bg-orange-500', label: 'text-orange-700', bg: 'bg-orange-50' },
  medium: { dot: 'bg-yellow-500', label: 'text-yellow-700', bg: 'bg-yellow-50' },
  low: { dot: 'bg-green-500', label: 'text-green-700', bg: 'bg-green-50' },
};

const tagColors = [
  'bg-purple-100 text-purple-700',
  'bg-green-100 text-green-700',
  'bg-pink-100 text-pink-700',
  'bg-blue-100 text-blue-700',
  'bg-indigo-100 text-indigo-700',
  'bg-teal-100 text-teal-700',
];

function getTagColor(tag: string): string {
  const index = tag.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return tagColors[index % tagColors.length];
}

function formatAge(dateStr: string): string {
  const created = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

export function FocusList({ tasks, onTaskClick }: FocusListProps) {
  const [limit, setLimit] = useState<5 | 10>(5);

  // Filter out done tasks, sort by priority then age, take top N
  const focusTasks = useMemo(() => {
    return tasks
      .filter((task) => task.status !== 'done')
      .sort((a, b) => {
        // First by priority (urgent first)
        const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        // Then by created_at (oldest first)
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      })
      .slice(0, limit);
  }, [tasks, limit]);

  const activeCount = tasks.filter((t) => t.status !== 'done').length;

  return (
    <div>
      {/* Header with dropdown */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-900">
            🎯 Focus List
          </h3>
          <span className="text-sm text-gray-500">
            Showing top {limit} of {activeCount} active tasks
          </span>
        </div>
        <select
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value) as 5 | 10)}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value={5}>Top 5</option>
          <option value={10}>Top 10</option>
        </select>
      </div>

      {/* Task List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {focusTasks.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <span className="text-4xl mb-2 block">🎉</span>
            <p>No active tasks! You&apos;re all caught up.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {focusTasks.map((task, index) => {
              const priority = PRIORITY_COLORS[task.priority];
              const rank = index + 1;

              return (
                <div
                  key={task.id}
                  onClick={() => onTaskClick(task)}
                  className={`
                    flex items-center gap-4 px-4 py-3 cursor-pointer
                    hover:bg-gray-50 transition-colors
                    ${rank <= 3 ? priority.bg : ''}
                  `}
                >
                  {/* Rank */}
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                    ${rank === 1 ? 'bg-amber-100 text-amber-700' : ''}
                    ${rank === 2 ? 'bg-gray-200 text-gray-700' : ''}
                    ${rank === 3 ? 'bg-orange-100 text-orange-700' : ''}
                    ${rank > 3 ? 'bg-gray-100 text-gray-500' : ''}
                  `}>
                    {rank}
                  </div>

                  {/* Priority dot */}
                  <div className={`w-3 h-3 rounded-full ${priority.dot} flex-shrink-0`} />

                  {/* Task info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 truncate">
                        {task.name}
                      </span>
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        #{task.id}
                      </span>
                    </div>
                    
                    {/* Tags */}
                    {task.tags && task.tags.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {task.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className={`px-1.5 py-0.5 text-xs rounded font-medium ${getTagColor(tag)}`}
                          >
                            {tag}
                          </span>
                        ))}
                        {task.tags.length > 3 && (
                          <span className="px-1.5 py-0.5 text-xs rounded font-medium bg-gray-100 text-gray-500">
                            +{task.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Priority + Age */}
                  <div className="flex items-center gap-2 text-sm flex-shrink-0">
                    <span className={`font-medium capitalize ${priority.label}`}>
                      {task.priority}
                    </span>
                    <span className="text-gray-400">•</span>
                    <span className="text-gray-500">
                      {formatAge(task.created_at)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer hint */}
      <p className="mt-3 text-xs text-gray-400 text-center">
        Sorted by priority (urgent → low), then oldest first
      </p>
    </div>
  );
}
