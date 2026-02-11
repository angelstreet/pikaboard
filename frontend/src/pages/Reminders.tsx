import { useEffect, useState } from 'react';
import { api, Reminder } from '../api/client';
import { useConfirmModal } from '../components/ConfirmModal';

type ReminderCategory = 'all' | 'personal' | 'work' | 'project';

const CATEGORIES: { value: ReminderCategory; label: string; emoji: string }[] = [
  { value: 'all', label: 'All', emoji: '📋' },
  { value: 'personal', label: 'Personal', emoji: '🏠' },
  { value: 'work', label: 'Work', emoji: '💼' },
  { value: 'project', label: 'Project', emoji: '🚀' },
];

function getCategoryFromReminder(r: Reminder): ReminderCategory {
  const text = `${r.name || ''} ${r.text}`.toLowerCase();
  if (text.includes('[personal]') || text.includes('🏠')) return 'personal';
  if (text.includes('[work]') || text.includes('💼')) return 'work';
  if (text.includes('[project]') || text.includes('🚀')) return 'project';
  return 'personal'; // default
}

function formatSchedule(schedule: Reminder['schedule']): string {
  if (schedule.kind === 'at' && schedule.atMs) {
    return `Once at ${new Date(schedule.atMs).toLocaleString()}`;
  }
  if (schedule.kind === 'every' && schedule.everyMs) {
    const minutes = schedule.everyMs / 60000;
    if (minutes >= 1440) return `Every ${Math.round(minutes / 1440)} day(s)`;
    if (minutes >= 60) return `Every ${Math.round(minutes / 60)} hour(s)`;
    return `Every ${minutes} min`;
  }
  if (schedule.kind === 'cron' && schedule.expr) {
    return `Cron: ${schedule.expr}`;
  }
  return 'Unknown';
}

function formatTimeUntil(ms: number): string {
  const now = Date.now();
  const diff = ms - now;
  if (diff < 0) return 'Past';
  if (diff < 60000) return 'Less than 1 min';
  if (diff < 3600000) return `${Math.round(diff / 60000)} min`;
  if (diff < 86400000) return `${Math.round(diff / 3600000)} hours`;
  return `${Math.round(diff / 86400000)} days`;
}

export default function Reminders() {
  const cachedReminders = api.getCached<{ reminders: Reminder[] }>('/reminders');

  const [reminders, setReminders] = useState<Reminder[]>(cachedReminders?.reminders ?? []);
  const [loading, setLoading] = useState(!cachedReminders);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<ReminderCategory>('all');

  // Create form state
  const [newText, setNewText] = useState('');
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<ReminderCategory>('personal');
  const [scheduleType, setScheduleType] = useState<'at' | 'every' | 'cron'>('at');
  const [scheduleValue, setScheduleValue] = useState('');
  const [creating, setCreating] = useState(false);

  // Confirm modal
  const { confirm, ConfirmModalComponent } = useConfirmModal();

  // Filtered reminders
  const filteredReminders = categoryFilter === 'all'
    ? reminders
    : reminders.filter(r => getCategoryFromReminder(r) === categoryFilter);

  useEffect(() => {
    loadReminders();
  }, []);

  const loadReminders = async () => {
    try {
      if (!reminders.length) setLoading(true);
      const data = await api.getReminders();
      setReminders(data.reminders || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reminders');
    } finally {
      setLoading(false);
    }
  };

  const createReminder = async () => {
    if (!newText.trim()) return;

    setCreating(true);
    const categoryTag = newCategory !== 'personal' ? `[${newCategory}] ` : '';
    try {
      await api.createReminder({
        text: `${categoryTag}${newText}`,
        name: newName || undefined,
        scheduleType,
        scheduleValue,
      });
      setNewText('');
      setNewName('');
      setNewCategory('personal');
      setScheduleValue('');
      setShowCreate(false);
      loadReminders();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create reminder');
    } finally {
      setCreating(false);
    }
  };

  const deleteReminder = async (id: string) => {
    const confirmed = await confirm({
      title: 'Delete Reminder?',
      message: 'Are you sure you want to delete this reminder? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger',
    });
    if (!confirmed) return;

    try {
      await api.deleteReminder(id);
      loadReminders();
    } catch (err) {
      setError('Failed to delete reminder');
    }
  };

  const toggleReminder = async (id: string, enabled: boolean) => {
    try {
      await api.updateReminder(id, { enabled });
      loadReminders();
    } catch (err) {
      setError('Failed to update reminder');
    }
  };

  const triggerReminder = async (id: string) => {
    try {
      await api.triggerReminder(id);
      loadReminders();
    } catch (err) {
      setError('Failed to trigger reminder');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-500 dark:text-gray-400">Loading reminders...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            🔔 Reminders
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Scheduled notifications via OpenClaw cron
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium flex items-center gap-2"
        >
          <span>+</span> New Reminder
        </button>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
        {CATEGORIES.map((cat) => {
          const count = cat.value === 'all' 
            ? reminders.length 
            : reminders.filter(r => getCategoryFromReminder(r) === cat.value).length;
          return (
            <button
              key={cat.value}
              onClick={() => setCategoryFilter(cat.value)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                categoryFilter === cat.value
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <span>{cat.emoji}</span>
              <span>{cat.label}</span>
              <span className="text-xs text-gray-400 dark:text-gray-500">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-300">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
        </div>
      )}

      {/* Create Form */}
      {showCreate && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 space-y-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">Create Reminder</h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Reminder text *
            </label>
            <textarea
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="What do you want to be reminded about?"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Name (optional)
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Short name for this reminder"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Category
            </label>
            <div className="flex gap-2">
              {CATEGORIES.filter(c => c.value !== 'all').map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setNewCategory(cat.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 border ${
                    newCategory === cat.value
                      ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                      : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <span>{cat.emoji}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Schedule type
              </label>
              <select
                value={scheduleType}
                onChange={(e) => setScheduleType(e.target.value as 'at' | 'every' | 'cron')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="at">One-time (at specific date/time)</option>
                <option value="every">Recurring (every X minutes)</option>
                <option value="cron">Cron expression</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {scheduleType === 'at' ? 'Date & Time' : scheduleType === 'every' ? 'Minutes' : 'Cron Expression'}
              </label>
              {scheduleType === 'at' ? (
                <input
                  type="datetime-local"
                  value={scheduleValue}
                  onChange={(e) => setScheduleValue(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              ) : scheduleType === 'every' ? (
                <input
                  type="number"
                  value={scheduleValue}
                  onChange={(e) => setScheduleValue(e.target.value)}
                  placeholder="e.g. 30 for every 30 minutes"
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              ) : (
                <input
                  type="text"
                  value={scheduleValue}
                  onChange={(e) => setScheduleValue(e.target.value)}
                  placeholder="e.g. 0 9 * * MON (9am every Monday)"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={createReminder}
              disabled={creating || !newText.trim() || !scheduleValue}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-lg font-medium"
            >
              {creating ? 'Creating...' : 'Create Reminder'}
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Reminders List */}
      {filteredReminders.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
          <span className="text-4xl mb-4 block">🔔</span>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
            No reminders yet
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Create your first reminder to get started
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReminders.map((reminder) => (
            <div
              key={reminder.id}
              className={`bg-white dark:bg-gray-800 border rounded-xl p-4 ${
                reminder.enabled
                  ? 'border-gray-200 dark:border-gray-700'
                  : 'border-gray-200 dark:border-gray-700 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">🔔</span>
                    <h3 className="font-medium text-gray-900 dark:text-white truncate">
                      {reminder.name || 'Reminder'}
                    </h3>
                    {!reminder.enabled && (
                      <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 rounded">
                        Paused
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {reminder.text}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-500">
                    <span>📅 {formatSchedule(reminder.schedule)}</span>
                    {reminder.nextRun && (
                      <span>⏰ Next: {formatTimeUntil(reminder.nextRun)}</span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => triggerReminder(reminder.id)}
                    className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
                    title="Trigger now"
                  >
                    ▶️
                  </button>
                  <button
                    onClick={() => toggleReminder(reminder.id, !reminder.enabled)}
                    className="p-2 text-gray-400 hover:text-yellow-500 transition-colors"
                    title={reminder.enabled ? 'Pause' : 'Resume'}
                  >
                    {reminder.enabled ? '⏸️' : '▶️'}
                  </button>
                  <button
                    onClick={() => deleteReminder(reminder.id)}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                    title="Delete"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Custom Confirm Modal */}
      <ConfirmModalComponent />
    </div>
  );
}
