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
  urgent: { dot: 'bg-red-500', label: 'text-red-700 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/30' },
  high: { dot: 'bg-orange-500', label: 'text-orange-700 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/30' },
  medium: { dot: 'bg-yellow-500', label: 'text-yellow-700 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-900/30' },
  low: { dot: 'bg-green-500', label: 'text-green-700 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/30' },
};

const tagColors = [
  'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300',
  'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300',
  'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300',
];

const STATUS_LABELS: Record<Task['status'], { label: string; color: string }> = {
  inbox: { label: '📥 Inbox', color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
  up_next: { label: '⏳ Up Next', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
  in_progress: { label: '🚧 Progress', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' },
  in_review: { label: '👀 Review', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' },
  done: { label: '✅ Done', color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
};

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
    <div className="w-full max-w-full overflow-hidden">
      {/* Header with dropdown */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          Showing top {limit} of {activeCount} active tasks
        </span>
        <select
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value) as 5 | 10)}
          className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value={5}>Top 5</option>
          <option value={10}>Top 10</option>
        </select>
      </div>

      {/* Task List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden max-w-full">
        {focusTasks.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <span className="text-4xl mb-2 block">🎉</span>
            <p>No active tasks! You&apos;re all caught up.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {focusTasks.map((task, index) => {
              const priority = PRIORITY_COLORS[task.priority];
              const rank = index + 1;

              return (
                <div
                  key={task.id}
                  onClick={() => onTaskClick(task)}
                  className={`
                    flex items-center gap-4 px-4 py-3 cursor-pointer
                    hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors
                    max-w-full overflow-hidden
                    ${rank <= 3 ? priority.bg : ''}
                  `}
                >
                  {/* Rank */}
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                    ${rank === 1 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' : ''}
                    ${rank === 2 ? 'bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-200' : ''}
                    ${rank === 3 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300' : ''}
                    ${rank > 3 ? 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400' : ''}
                  `}>
                    {rank}
                  </div>

                  {/* Priority dot */}
                  <div className={`w-3 h-3 rounded-full ${priority.dot} flex-shrink-0`} />

                  {/* Task info */}
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                        <span className="text-gray-400 dark:text-gray-500">#{task.id}</span> {task.name}
                      </span>
                    </div>
                    
                    {/* Tags */}
                    {(() => {
                      const tagsArr = !task.tags ? [] : (Array.isArray(task.tags) ? task.tags : task.tags.split(',').map(t => t.trim()).filter(Boolean));
                      if (tagsArr.length === 0) return null;
                      return (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {tagsArr.slice(0, 3).map((tag: string) => (
                            <span
                              key={tag}
                              className={`px-1.5 py-0.5 text-xs rounded font-medium ${getTagColor(tag)}`}
                            >
                              {tag}
                            </span>
                          ))}
                          {tagsArr.length > 3 && (
                            <span className="px-1.5 py-0.5 text-xs rounded font-medium bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                              +{tagsArr.length - 3}
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Status - hidden on small screens */}
                  <div className="hidden sm:block flex-shrink-0">
                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${STATUS_LABELS[task.status].color}`}>
                      {STATUS_LABELS[task.status].label}
                    </span>
                  </div>

                  {/* Priority + Age - simplified on mobile */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-0 sm:gap-2 text-xs sm:text-sm flex-shrink-0">
                    <span className={`font-medium capitalize ${priority.label}`}>
                      {task.priority}
                    </span>
                    <span className="hidden sm:inline text-gray-400 dark:text-gray-500">•</span>
                    <span className="text-gray-500 dark:text-gray-400">
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
      <p className="mt-3 text-xs text-gray-400 dark:text-gray-500 text-center">
        Sorted by priority (urgent → low), then oldest first
      </p>
    </div>
  );
}
