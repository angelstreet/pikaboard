import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task } from '../api/client';

interface TaskCardProps {
  task: Task;
  onClick: (task: Task) => void;
  isDragging?: boolean;
}

const priorityColors: Record<string, { border: string; badge: string; text: string }> = {
  urgent: { border: 'border-l-red-500', badge: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300', text: 'Urgent' },
  high: { border: 'border-l-orange-500', badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300', text: 'High' },
  medium: { border: 'border-l-blue-500', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300', text: 'Medium' },
  low: { border: 'border-l-gray-400', badge: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400', text: 'Low' },
};

const tagColors = [
  'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300',
  'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300',
  'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300',
];

function getTagColor(tag: string): string {
  const index = tag.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return tagColors[index % tagColors.length];
}

export function TaskCard({ task, onClick, isDragging }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: sortableIsDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const priority = priorityColors[task.priority] || priorityColors.medium;
  const dragging = isDragging || sortableIsDragging;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick(task)}
      className={`
        bg-white dark:bg-gray-800 rounded-lg shadow-sm p-3 border-l-4 ${priority.border}
        cursor-pointer hover:shadow-md transition-shadow
        ${dragging ? 'opacity-50 shadow-lg ring-2 ring-blue-400' : ''}
      `}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100 flex-1">{task.name}</h4>
        {task.priority !== 'medium' && (
          <span className={`px-1.5 py-0.5 text-xs rounded font-medium ${priority.badge}`}>
            {priority.text}
          </span>
        )}
      </div>
      
      {task.description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
          {task.description}
        </p>
      )}
      
      {task.deadline && (
        <div className={`text-xs mt-2 flex items-center gap-1 ${
          new Date(task.deadline) < new Date() && task.status !== 'done'
            ? 'text-red-600 dark:text-red-400 font-medium'
            : 'text-gray-500 dark:text-gray-400'
        }`}>
          <span>{new Date(task.deadline) < new Date() && task.status !== 'done' ? '⚠️' : '📅'}</span>
          <span>
            {new Date(task.deadline).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
      )}

      {task.tags && task.tags.length > 0 && (
        <div className="flex gap-1 mt-2 flex-wrap">
          {task.tags.map((tag) => (
            <span
              key={tag}
              className={`px-1.5 py-0.5 text-xs rounded font-medium ${getTagColor(tag)}`}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Rating display for done tasks */}
      {task.status === 'done' && (
        <div className="flex items-center gap-1 mt-2">
          {task.rating ? (
            <div className="flex items-center gap-0.5" title={`Rated ${task.rating}/5`}>
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  className={`text-xs ${star <= task.rating! ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
                >
                  ★
                </span>
              ))}
            </div>
          ) : (
            <span className="text-xs text-gray-400 dark:text-gray-500 italic">Not rated</span>
          )}
        </div>
      )}
    </div>
  );
}

// Simplified card for drag overlay (no sortable hooks)
export function TaskCardOverlay({ task }: { task: Task }) {
  const priority = priorityColors[task.priority] || priorityColors.medium;

  return (
    <div
      className={`
        bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 border-l-4 ${priority.border}
        ring-2 ring-blue-400 rotate-2 scale-105
      `}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100 flex-1">{task.name}</h4>
        {task.priority !== 'medium' && (
          <span className={`px-1.5 py-0.5 text-xs rounded font-medium ${priority.badge}`}>
            {priority.text}
          </span>
        )}
      </div>
      
      {task.description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
          {task.description}
        </p>
      )}
    </div>
  );
}
