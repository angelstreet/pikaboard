import { useState, useEffect } from 'react';
import { Board } from '../api/client';

interface BoardModalProps {
  board?: Board | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (board: Partial<Board>) => Promise<void>;
  onDelete?: (id: number) => Promise<void>;
  boardCount?: number;
}

const iconOptions = [
  '📋', '⚡', '🏠', '💼', '🎯', '🚀', '📚', '💡',
  '🎨', '🔧', '📝', '🌟', '🔥', '💪', '🎮', '🎬',
  '📊', '🗂️', '📁', '🏆', '🎪', '🌈', '❤️', '🧪',
];

const colorOptions = [
  { value: 'blue', bg: 'bg-blue-500', ring: 'ring-blue-400' },
  { value: 'green', bg: 'bg-green-500', ring: 'ring-green-400' },
  { value: 'purple', bg: 'bg-purple-500', ring: 'ring-purple-400' },
  { value: 'orange', bg: 'bg-orange-500', ring: 'ring-orange-400' },
  { value: 'red', bg: 'bg-red-500', ring: 'ring-red-400' },
  { value: 'pink', bg: 'bg-pink-500', ring: 'ring-pink-400' },
  { value: 'teal', bg: 'bg-teal-500', ring: 'ring-teal-400' },
  { value: 'gray', bg: 'bg-gray-500', ring: 'ring-gray-400' },
];

export function BoardModal({ board, isOpen, onClose, onSave, onDelete, boardCount = 1 }: BoardModalProps) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('📋');
  const [color, setColor] = useState('blue');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTasks, setDeleteTasks] = useState(false);

  const isEdit = !!board;
  const canDelete = isEdit && boardCount > 1;

  useEffect(() => {
    if (board) {
      setName(board.name);
      setIcon(board.icon);
      setColor(board.color);
    } else {
      setName('');
      setIcon('📋');
      setColor('blue');
    }
    setShowDeleteConfirm(false);
    setDeleteTasks(false);
  }, [board, isOpen]);

  const handleSave = async () => {
    if (!name.trim()) return;

    setSaving(true);
    try {
      await onSave({
        ...(board ? { id: board.id } : {}),
        name: name.trim(),
        icon,
        color,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!board || !onDelete) return;

    setDeleting(true);
    try {
      await onDelete(board.id);
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">
            {isEdit ? 'Edit Board' : 'New Board'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Preview */}
          <div className="flex items-center justify-center py-4">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg bg-${color}-50 border-2 border-${color}-200`}>
              <span className="text-2xl">{icon}</span>
              <span className="font-semibold text-gray-800">{name || 'Board Name'}</span>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Board name..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              autoFocus
            />
          </div>

          {/* Icon */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Icon
            </label>
            <div className="flex flex-wrap gap-2">
              {iconOptions.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setIcon(emoji)}
                  className={`
                    w-10 h-10 text-xl rounded-lg transition-all
                    ${icon === emoji
                      ? 'bg-blue-100 ring-2 ring-blue-400'
                      : 'bg-gray-50 hover:bg-gray-100'
                    }
                  `}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Color
            </label>
            <div className="flex flex-wrap gap-2">
              {colorOptions.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={`
                    w-10 h-10 rounded-lg ${c.bg} transition-all
                    ${color === c.value ? `ring-2 ring-offset-2 ${c.ring}` : ''}
                  `}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 border-t bg-gray-50 rounded-b-lg">
          {isEdit && onDelete ? (
            <div>
              {!canDelete ? (
                <span className="text-xs text-gray-400">Can't delete the last board</span>
              ) : showDeleteConfirm ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="deleteTasks"
                      checked={deleteTasks}
                      onChange={(e) => setDeleteTasks(e.target.checked)}
                      className="rounded"
                    />
                    <label htmlFor="deleteTasks" className="text-sm text-gray-600">
                      tasks
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                      {deleting ? 'Deleting...' : 'Delete'}
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-3 py-1.5 text-gray-600 text-sm hover:text-gray-800"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-red-600 hover:text-red-700 text-sm"
                >
                  Delete
                </button>
              )}
            </div>
          ) : (
            <div />
          )}

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!name.trim() || saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Board'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
