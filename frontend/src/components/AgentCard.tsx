import { useState, useEffect } from 'react';
import { Agent } from '../api/client';
import SpriteAnimator, { useSpriteInfo } from './SpriteAnimator';
import AgentAvatar from './AgentAvatar';

interface AgentCardProps {
  agent: Agent;
  onClick?: (agent: Agent) => void;
}

const statusConfig: Record<
  string,
  { color: string; bg: string; label: string; pulse?: boolean }
> = {
  busy: {
    color: 'text-purple-700 dark:text-purple-300',
    bg: 'bg-purple-100 dark:bg-purple-900',
    label: 'Working',
    pulse: true,
  },
  active: {
    color: 'text-green-700 dark:text-green-300',
    bg: 'bg-green-100 dark:bg-green-900',
    label: 'Active',
  },
  idle: {
    color: 'text-yellow-700 dark:text-yellow-300',
    bg: 'bg-yellow-100 dark:bg-yellow-900',
    label: 'Idle',
  },
  offline: {
    color: 'text-gray-500 dark:text-gray-400',
    bg: 'bg-gray-100 dark:bg-gray-700',
    label: 'Offline',
  },
};

// Map agent IDs to sprite folder names
const agentSpriteNames: Record<string, string> = {
  pika: 'pika',
  bulbi: 'bulbi',
  evoli: 'evoli',
  psykokwak: 'psykokwak',
  sala: 'sala',
  tortoise: 'tortoise',
  mew: 'mew',
  porygon: 'porygon',
  lanturn: 'lanturn',
  main: 'pika',
};

function useSpriteExists(agent: string): boolean {
  const [exists, setExists] = useState(false);

  useEffect(() => {
    const base = import.meta.env.BASE_URL || '/';
    const candidates = [
      `${base}characters/${agent}/idle.png`,
      `${base}characters/${agent}/sprites/idle.png`,
    ];

    let cancelled = false;
    let idx = 0;

    const img = new window.Image();
    const tryNext = () => {
      if (cancelled) return;
      idx += 1;
      if (idx >= candidates.length) {
        setExists(false);
        return;
      }
      img.src = candidates[idx];
    };

    img.onload = () => !cancelled && setExists(true);
    img.onerror = tryNext;
    img.src = candidates[0];

    return () => {
      cancelled = true;
    };
  }, [agent]);

  return exists;
}

export function AgentCard({ agent, onClick }: AgentCardProps) {
  const status = statusConfig[agent.status] || statusConfig.offline;
  const spriteName = agentSpriteNames[agent.id.toLowerCase()];
  const spriteExists = useSpriteExists(spriteName || '');
  const { directions } = useSpriteInfo(spriteName || '', 'idle');
  const showSprite = !!spriteName && spriteExists;

  return (
    <div
      onClick={() => onClick?.(agent)}
      className={`
        relative overflow-hidden min-h-[150px] flex flex-col
        bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700
        p-3 cursor-pointer hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600
        transition-all duration-200
        ${agent.status === 'offline' ? 'opacity-75' : ''}
      `}
    >
      {/* Header: Avatar + Name + Status */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <AgentAvatar agent={agent.id} size={40} />
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {agent.name}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {agent.role}
            </p>
          </div>
        </div>
        <div
          className={`
            px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1.5
            ${status.bg} ${status.color}
          `}
        >
          {status.pulse && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
            </span>
          )}
          {status.label}
          {agent.inProgressTasks > 0 && (
            <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded-full text-xs font-medium min-w-[1.25rem] text-center" title={`${agent.inProgressTasks} in-progress task${agent.inProgressTasks !== 1 ? 's' : ''}`}>
              {agent.inProgressTasks}
            </span>
          )}
        </div>
      </div>

      {/* Purpose */}
      {agent.purpose && (
        <p className="mt-2 text-xs text-gray-600 dark:text-gray-300 line-clamp-1">
          {agent.purpose}
        </p>
      )}

      {/* Current Task */}
      {agent.currentTask && (
        <div className="mt-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg p-1.5">
          <p className="text-[10px] text-purple-700 dark:text-purple-300 font-medium">
            Working on:
          </p>
          <p className="text-xs text-purple-900 dark:text-purple-200 truncate">
            {agent.currentTask}
          </p>
        </div>
      )}

      {/* KPIs */}
      {(agent.kpis.tasksCompleted > 0 || agent.kpis.tasksActive > 0) && (
        <div className="mt-2 flex gap-3 text-[10px] text-gray-500 dark:text-gray-400">
          {agent.kpis.tasksCompleted > 0 && (
            <span>✅ {agent.kpis.tasksCompleted} done</span>
          )}
          {agent.kpis.tasksActive > 0 && (
            <span>📋 {agent.kpis.tasksActive} active</span>
          )}
        </div>
      )}

      {/* Last Seen */}
      {agent.status !== 'busy' && agent.status !== 'active' && agent.lastSeen && (
        <p className="mt-1.5 text-[10px] text-gray-400 dark:text-gray-500">
          Last seen: {formatLastSeen(agent.lastSeen)}
        </p>
      )}

      {/* Sprite Avatar - Idle Only */}
      {showSprite && (
        <div
          className="absolute bottom-0 right-0 pointer-events-none"
          style={{ transform: 'scale(0.35)', transformOrigin: 'bottom right' }}
        >
          <SpriteAnimator
            agent={spriteName}
            animation="idle"
            direction="S"
            directions={directions}
          />
        </div>
      )}
    </div>
  );
}

function formatLastSeen(dateStr: string): string {
  // Handle date strings like "2025-02-05" or ISO format
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return dateStr;
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}

// Compact variant for dashboard or sidebar
export function AgentCardCompact({ agent }: { agent: Agent }) {
  const status = statusConfig[agent.status] || statusConfig.offline;

  return (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
      <AgentAvatar agent={agent.id} size={32} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
          {agent.name}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
          {agent.currentTask || agent.role}
        </p>
      </div>
      <div
        className={`w-2 h-2 rounded-full ${
          status.pulse ? 'animate-pulse bg-purple-500' : ''
        } ${
          agent.status === 'active'
            ? 'bg-green-500'
            : agent.status === 'idle'
            ? 'bg-yellow-500'
            : agent.status === 'busy'
            ? 'bg-purple-500'
            : 'bg-gray-400'
        }`}
      />
    </div>
  );
}
