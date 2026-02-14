import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task } from '../api/client';

interface TaskCardProps {
  task: Task & { board_name?: string };
  onClick: (task: Task) => void;
  isDragging?: boolean;
  readOnly?: boolean;
  showBoardName?: boolean;
  boardBadge?: {
    name: string;
    icon: string;
    color: string;
  };
  onArchive?: (task: Task) => void;
}

const priorityColors: Record<string, { border: string; badge: string; text: string }> = {
  urgent: { border: 'border-l-red-500', badge: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300', text: 'Urgent' },
  high: { border: 'border-l-orange-500', badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300', text: 'High' },
  medium: { border: 'border-l-blue-500', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300', text: 'Medium' },
  low: { border: 'border-l-gray-400', badge: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400', text: 'Low' },
};

function getDotColor(priority: string): string {
  const colors: Record<string, string> = {
    urgent: 'bg-red-500',
    high: 'bg-orange-500',
    medium: 'bg-blue-500',
    low: 'bg-gray-500',
  };
  return colors[priority] || 'bg-gray-500';
}

function relativeTime(dateStr: string | null, isDeadline = false): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = Date.now();
  const diffMs = date.getTime() - now;
  const absMins = Math.abs(diffMs) / 60000;
  let prefix = '';
  if (isDeadline) {
    prefix = diffMs > 0 ? 'due in ' : '';
  }
  const mins = Math.max(1, Math.round(absMins));
  const hours = Math.max(1, Math.round(absMins / 60));
  const days = Math.max(1, Math.round(absMins / 1440));
  const unit = absMins < 60 ? `${mins}m` : absMins < 1440 ? `${hours}h` : `${days}d`;
  const overdue = isDeadline && diffMs < 0 ? ' late' : '';
  return `${prefix}${unit}${overdue}`;
}

const priorityDotColors: Record<string, string> = {
  urgent: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-blue-400',
  low: 'bg-gray-400',
};

const boardBadgeColors: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  green: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  red: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  pink: 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
  teal: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  gray: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
};

function getRelativeDeadline(deadline: string | null, status: string): { text: string; isOverdue: boolean } | null {
  if (!deadline) return null;
  const targetTime = new Date(deadline).getTime();
  const nowTime = Date.now();
  const diffMs = targetTime - nowTime;
  const absMs = Math.abs(diffMs);
  let amount = 0;
  let unit = '';
  if (absMs < 60000) {
    amount = Math.ceil(absMs / 1000);
    unit = 's';
  } else if (absMs < 3600000) {
    amount = Math.ceil(absMs / 60000);
    unit = 'm';
  } else if (absMs < 86400000) {
    amount = Math.ceil(absMs / 3600000);
    unit = 'h';
  } else if (absMs < 604800000) {
    amount = Math.ceil(absMs / 86400000);
    unit = 'd';
  } else {
    amount = Math.ceil(absMs / 604800000);
    unit = 'w';
  }
  const relTime = `${amount}${unit}`;
  const text = diffMs > 0 ? `due in ${relTime}` : `${relTime} ago`;
  const isOverdue = diffMs < 0 && !['done', 'solved'].includes(status);
  return { text, isOverdue };
}

export function TaskCard({ task, onClick, isDragging, readOnly, showBoardName, boardBadge }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: sortableIsDragging,
  } = useSortable({ id: task.id, disabled: !!readOnly });

  const style = readOnly
    ? undefined
    : {
        transform: CSS.Transform.toString(transform),
        transition,
      };

  const priority = priorityColors[task.priority] || priorityColors.medium;
  const dragging = isDragging || sortableIsDragging;
  const deadlineInfo = getRelativeDeadline(task.deadline, task.status);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(!readOnly ? attributes : {})}
      {...(!readOnly ? listeners : {})}
      onClick={() => onClick(task)}
      className={`
        bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-3 border-l-4 ${priority.border}
        cursor-pointer hover:shadow-lg dark:hover:shadow-2xl transition-shadow
        ${dragging ? 'opacity-50 shadow-lg ring-2 ring-blue-400' : ''}
      `}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100 flex-1 min-w-0 pr-2">
          <span className="text-gray-400 dark:text-gray-500">#{task.id}</span> {task.name}
          {(() => {
            const parsedTags = Array.isArray(task.tags) ? task.tags : (task.tags ? String(task.tags).split(',').map((t: string) => t.trim()) : []);
            return (
              <>
                {parsedTags.includes('recurring') && <span className="ml-1" title="Recurring task">🔁</span>}
                {parsedTags.includes('notify') && <span className="ml-0.5" title="Notifies on completion">📢</span>}
              </>
            );
          })()}
        </h4>
        <div className="flex items-center gap-1 flex-shrink-0">
          {task.assignee && (
            <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center uppercase flex-shrink-0" title={task.assignee}>
              {task.assignee.charAt(0)}
            </span>
          )}
          <span 
            className={`w-2 h-2 rounded-full ${priorityDotColors[task.priority] || priorityDotColors.medium} flex-shrink-0`} 
            title={priority.text}
          />
        </div>
      </div>
      
      {deadlineInfo && (
        <div className={`text-xs mt-1 flex items-center gap-1 ${deadlineInfo.isOverdue ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
          <span>{deadlineInfo.isOverdue ? '⚠️' : '📅'}</span>
          <span>{deadlineInfo.text}</span>
        </div>
      )}
      
      {/* Board name - shown in Main view */}
      {showBoardName && (boardBadge || task.board_name) && (
        <div className="text-xs mt-1 flex items-center gap-1">
          <span className={`px-1.5 py-0.5 rounded font-medium inline-flex items-center gap-1 ${
            boardBadge ? (boardBadgeColors[boardBadge.color] || boardBadgeColors.gray) : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
          }`}>
            {boardBadge?.icon && <span aria-hidden="true">{boardBadge.icon}</span>}
            {boardBadge?.name || task.board_name}
          </span>
        </div>
      )}

      {/* Rejection reason display for rejected tasks */}
      {task.status === 'rejected' && task.rejection_reason && (
        <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded">
          <p className="text-xs text-red-700 dark:text-red-300 font-medium">Rejection reason:</p>
          <p className="text-xs text-red-600 dark:text-red-400 mt-0.5 line-clamp-2">
            {task.rejection_reason}
          </p>
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
        bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-3 border-l-4 ${priority.border}
        ring-2 ring-blue-400 rotate-2 scale-105
      `}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100 flex-1">
          <span className="text-gray-400 dark:text-gray-500">#{task.id}</span> {task.name}
        </h4>
        <div className="flex items-center gap-1">
          {task.assignee && (
            <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center uppercase" title={task.assignee}>
              {task.assignee.charAt(0)}
            </span>
          )}
          <span className={`w-2 h-2 rounded-full ${priorityDotColors[task.priority] || priorityDotColors.medium}`} title={priority.text} />
        </div>
      </div>
    </div>
  );
}