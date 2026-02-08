import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, Task } from '../api/client';

type TaskWithBoard = Task & { board_name?: string; board_icon?: string };

const SECTIONS = [
  { key: 'up_next', label: 'Up Next', emoji: '📋' },
  { key: 'in_progress', label: 'In Progress', emoji: '⚡' },
  { key: 'in_review', label: 'In Review', emoji: '👀' },
] as const;

const priorityBadge: Record<string, { cls: string; label: string }> = {
  urgent: { cls: 'bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-300', label: '🔴 urgent' },
  high: { cls: 'bg-orange-100 dark:bg-orange-900/60 text-orange-700 dark:text-orange-300', label: '🟠 high' },
  medium: { cls: 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300', label: '🔵 med' },
  low: { cls: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400', label: '⚪ low' },
};

function age(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

function Section({ label, emoji, tasks }: { status: string; label: string; emoji: string; tasks: TaskWithBoard[] }) {
  const [open, setOpen] = useState(true);
  const navigate = useNavigate();

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 dark:bg-gray-800/60 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <span className="flex items-center gap-2 font-semibold text-sm text-gray-900 dark:text-white">
          {emoji} {label}
          <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-medium">
            {tasks.length}
          </span>
        </span>
        <span className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {open && (
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {tasks.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-400 dark:text-gray-500 text-center">No tasks</div>
          ) : (
            tasks.map((t) => (
              <button
                key={t.id}
                onClick={() => navigate('/boards')}
                className="w-full flex items-center gap-2 px-4 py-2 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors text-left min-w-0"
              >
                <span className="shrink-0 text-sm" title={t.board_name || 'No board'}>
                  {t.board_icon || '📌'}
                </span>
                <span className="flex-1 min-w-0 text-sm text-gray-900 dark:text-gray-100 truncate">
                  {t.name}
                </span>
                <span className={`shrink-0 px-1.5 py-0.5 text-[10px] font-semibold rounded ${priorityBadge[t.priority]?.cls}`}>
                  {priorityBadge[t.priority]?.label}
                </span>
                <span className="shrink-0 text-[11px] text-gray-400 dark:text-gray-500 tabular-nums w-8 text-right" title={`Created ${t.created_at}`}>
                  {age(t.created_at)}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function CompactTaskLists() {
  const [tasksByStatus, setTasksByStatus] = useState<Record<string, TaskWithBoard[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const results = await Promise.all(
          SECTIONS.map((s) => api.getTasks({ status: s.key }))
        );
        const map: Record<string, TaskWithBoard[]> = {};
        SECTIONS.forEach((s, i) => { map[s.key] = results[i] as TaskWithBoard[]; });
        setTasksByStatus(map);
      } catch (e) {
        console.error('Failed to load compact task lists', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {SECTIONS.map((s) => (
          <div key={s.key} className="h-10 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {SECTIONS.map((s) => (
        <Section
          key={s.key}
          status={s.key}
          label={s.label}
          emoji={s.emoji}
          tasks={tasksByStatus[s.key] || []}
        />
      ))}
    </div>
  );
}
