import { useState, useEffect } from 'react';
import { Task } from '../api/client';
import { TaskEventTimeline } from './TaskEventTimeline';

interface TaskModalProps {
  task?: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Partial<Task>) => Promise<void>;
  onDelete?: (id: number) => Promise<void>;
}

const statuses = [
  { value: 'inbox' as const, label: '📥 Inbox' },
  { value: 'up_next' as const, label: '⏳ Up Next' },
  { value: 'in_progress' as const, label: '🚧 In Progress' },
  { value: 'in_review' as const, label: '👀 In Review' },
  { value: 'done' as const, label: '✅ Done' },
  { value: 'solved' as const, label: '🔧 Solved' },
  { value: 'rejected' as const, label: '❌ Rejected' },
];

const priorities = [
  { value: 'low' as const, label: 'Low' },
  { value: 'medium' as const, label: 'Medium' },
  { value: 'high' as const, label: 'High' },
  { value: 'urgent' as const, label: 'Urgent' },
];

const priorityDotColors: Record<Task['priority'], string> = {
  low: 'bg-gray-400',
  medium: 'bg-blue-400',
  high: 'bg-orange-400',
  urgent: 'bg-red-500',
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

export function TaskModal({ task, isOpen, onClose, onSave, onDelete }: TaskModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<Task['status']>('inbox');
  const [priority, setPriority] = useState<Task['priority']>('medium');
  const [assignee, setAssignee] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [deadline, setDeadline] = useState('');
  const [acceptanceTests, setAcceptanceTests] = useState('');
  const [rating, setRating] = useState<number | null>(null);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [descExpanded, setDescExpanded] = useState(true);
  const [testsExpanded, setTestsExpanded] = useState(false);
  const [activityExpanded, setActivityExpanded] = useState(false);

  const isEdit = !!task;

  // Format datetime for input (local timezone)
  const formatDatetimeLocal = (isoString: string | null): string => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  useEffect(() => {
    if (task) {
      setName(task.name);
      setDescription(task.description || '');
      setStatus(task.status);
      setPriority(task.priority);
      setAssignee(task.assignee || '');
      const taskTags = task.tags;
      setTags(Array.isArray(taskTags) ? taskTags.filter(Boolean) : taskTags ? taskTags.split(',').map((t: string) => t.trim()).filter(Boolean) : []);
      setDeadline(formatDatetimeLocal(task.deadline));
      setRating(task.rating ?? null);
      setRejectionReason(task.rejection_reason || '');
      // acceptanceTests not loaded yet
    } else {
      setName('');
      setDescription('');
      setStatus('inbox');
      setPriority('medium');
      setAssignee('');
      setTags([]);
      setNewTagInput('');
      setDeadline('');
      setAcceptanceTests('');
      setRating(null);
      setRejectionReason('');
    }
    setHoverRating(null);
    setShowDeleteConfirm(false);
    setDescExpanded(true);
    setTestsExpanded(false);
    setActivityExpanded(false);
  }, [task, isOpen]);

  const handleSave = async () => {
    if (!name.trim()) return;

    setSaving(true);
    try {
      // Convert local datetime to ISO string for API
      const deadlineValue = deadline ? new Date(deadline).toISOString() : null;

      await onSave({
        ...(task ? { id: task.id } : {}),
        name: name.trim(),
        description: description.trim() || null,
        status,
        priority,
        assignee: assignee.trim() || null,
        tags,
        deadline: deadlineValue,
        rating: (status === 'done' || status === 'solved') ? rating : null,
        rejection_reason: status === 'rejected' ? (rejectionReason.trim() || null) : null,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const addTag = () => {
    const trimmed = newTagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setNewTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      addTag();
    }
  };

  const handleDelete = async () => {
    if (!task || !onDelete) return;

    setDeleting(true);
    try {
      await onDelete(task.id);
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {isEdit ? `#${task!.id} ${name}` : 'New Task'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 text-2xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Inline status/priority/assignee row */}
        <div className="p-4 pt-0 pb-2 flex flex-wrap items-center gap-3 text-sm">
          {/* Status pills */}
          <div className="flex flex-wrap gap-1 min-w-0">
            {statuses.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setStatus(s.value)}
                className={`px-2 py-0.5 rounded-full font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                  status === s.value
                    ? 'bg-blue-500 text-white shadow-sm ring-1 ring-blue-600/50'
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Priority dots */}
          <div className="flex items-center gap-1">
            {priorities.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPriority(p.value)}
                className={`w-2.5 h-2.5 rounded-full border-2 transition-all flex-shrink-0 ${
                  priority === p.value
                    ? `${priorityDotColors[p.value]} border-${p.value === 'low' ? 'gray' : p.value}-400 ring-2 ring-offset-1 ring-current/30 shadow-sm`
                    : 'border-gray-300 bg-transparent hover:border-gray-400 hover:scale-105'
                }`}
                title={p.label}
                aria-label={`Priority ${p.label}`}
              />
            ))}
          </div>

          {/* Assignee */}
          <div className="flex items-center gap-1 ml-auto flex-shrink-0">
            {assignee && (
              <span
                className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs font-bold flex items-center justify-center uppercase flex-shrink-0"
                title={assignee}
              >
                {assignee.charAt(0)}
              </span>
            )}
            <input
              type="text"
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              placeholder="Assignee"
              className="w-20 px-2 py-0.5 text-xs border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 max-sm:w-16"
            />
          </div>
        </div>

        <div className="p-4 space-y-3">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sr-only">
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Task name..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 text-lg"
              autoFocus
            />
          </div>

          {/* Collapsible Description (open by default) */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setDescExpanded(!descExpanded)}
              className="w-full flex justify-between items-center p-3 text-left font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Description
              <span className="ml-2 text-lg">{descExpanded ? '−' : '+'}</span>
            </button>
            {descExpanded && (
              <div className="px-3 pb-3">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add details..."
                  rows={3}
                  className="w-full px-3 py-2 border-0 focus:ring-0 resize-none dark:text-gray-100 dark:placeholder-gray-400"
                />
              </div>
            )}
          </div>

          {/* Collapsible Acceptance Tests (collapsed by default, empty) */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setTestsExpanded(!testsExpanded)}
              className="w-full flex justify-between items-center p-3 text-left font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Acceptance Tests
              <span className="ml-2 text-lg">{testsExpanded ? '−' : '+'}</span>
            </button>
            {testsExpanded && (
              <div className="px-3 pb-3">
                <textarea
                  value={acceptanceTests}
                  onChange={(e) => setAcceptanceTests(e.target.value)}
                  placeholder="Acceptance criteria and tests will go here..."
                  rows={5}
                  className="w-full px-3 py-2 border-0 focus:ring-0 resize-none dark:text-gray-100 dark:placeholder-gray-400"
                />
              </div>
            )}
          </div>

          {/* Deadline */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Deadline
            </label>
            <div className="flex gap-2">
              <input
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
              />
              {deadline && (
                <button
                  type="button"
                  onClick={() => setDeadline('')}
                  className="px-3 py-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 flex-shrink-0"
                  title="Clear deadline"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Tags - chip style with inline add */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tags
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className={`px-2 py-1 text-xs rounded-full font-medium cursor-pointer hover:opacity-75 transition-opacity ${getTagColor(tag)}`}
                  onClick={() => removeTag(tag)}
                >
                  {tag} ✕
                </span>
              ))}
              <div className="flex items-center gap-1 flex-1 min-w-[120px]">
                <input
                  type="text"
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Add tag"
                  className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 px-2"
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="px-2 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors flex-shrink-0"
                  disabled={!newTagInput.trim()}
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Collapsible Activity/Timeline (collapsed by default) */}
          {isEdit && task && (
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setActivityExpanded(!activityExpanded)}
                className="w-full flex justify-between items-center p-3 text-left font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Activity
                <span className="ml-2 text-lg">{activityExpanded ? '−' : '+'}</span>
              </button>
              {activityExpanded && (
                <div className="p-3 border-t border-gray-200 dark:border-gray-700">
                  <TaskEventTimeline taskId={task.id} />
                </div>
              )}
            </div>
          )}

          {/* Rating - only show for done/solved */}
          {(status === 'done' || status === 'solved') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Quality Rating
              </label>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(rating === star ? null : star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(null)}
                      className="text-2xl transition-transform hover:scale-110 focus:outline-none"
                      title={`${star} star${star > 1 ? 's' : ''}`}
                    >
                      <span
                        className={
                          (hoverRating !== null ? star <= hoverRating : star <= (rating || 0))
                            ? 'text-yellow-400'
                            : 'text-gray-300 dark:text-gray-600'
                        }
                      >
                        ★
                      </span>
                    </button>
                  ))}
                </div>
                {rating && (
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {rating}/5
                    <button
                      type="button"
                      onClick={() => setRating(null)}
                      className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      title="Clear rating"
                    >
                      ✕
                    </button>
                  </span>
                )}
                {!rating && (
                  <span className="text-sm text-gray-400 dark:text-gray-500 italic">Click to rate</span>
                )}
              </div>
            </div>
          )}

          {/* Rejection reason - only for rejected */}
          {status === 'rejected' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Rejection Reason *
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Why is this task being rejected?"
                rows={3}
                className="w-full px-3 py-2 border border-red-300 dark:border-red-700 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none bg-red-50 dark:bg-red-900/20 dark:text-gray-100"
                required
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Required when marking as rejected
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-b-lg">
          {isEdit && onDelete ? (
            <div>
              {showDeleteConfirm ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-red-600 dark:text-red-400">Delete this task?</span>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    {deleting ? 'Deleting...' : 'Yes, delete'}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-3 py-1.5 text-gray-600 dark:text-gray-400 text-sm hover:text-gray-800 dark:hover:text-gray-200"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm"
                >
                  Delete task
                </button>
              )}
            </div>
          ) : (
            <div />
          )}

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!name.trim() || saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
