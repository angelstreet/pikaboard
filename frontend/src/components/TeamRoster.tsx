import { useState, useEffect } from 'react';
import { TEAM_ROSTER, TeamMember } from '../config/team';
import { api } from '../api/client';
import LogViewer from './LogViewer';
import AgentAvatar from './AgentAvatar';

interface AgentStatus {
  agentId: string;
  status: 'idle' | 'working' | 'blocked';
  currentTask?: string;
  taskId?: number;
  taskName?: string;
  lastSeen?: string;
  activeSubAgents?: number;
}

interface TeamRosterProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function TeamRoster({ collapsed, onToggle }: TeamRosterProps) {
  const [statuses, setStatuses] = useState<Map<string, AgentStatus>>(new Map());
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [expandedLogs, setExpandedLogs] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeBoardId, setActiveBoardId] = useState<number | null>(null);

  // Listen for board selection from Boards page
  useEffect(() => {
    const handler = (e: Event) => {
      setActiveBoardId((e as CustomEvent<{ boardId: number | null }>).detail.boardId);
    };
    window.addEventListener('board-selected', handler);
    return () => window.removeEventListener('board-selected', handler);
  }, []);

  // Fetch agent statuses based on in_progress tasks and sub-agent counts
  useEffect(() => {
    const fetchStatuses = async () => {
      try {
        // Get tasks and agents data in parallel
        const [allTasks, agentsData] = await Promise.all([
          api.getTasks({}),
          api.getAgents(),
        ]);
        
        const statusMap = new Map<string, AgentStatus>();

        // Initialize all team members with status from API
        for (const member of TEAM_ROSTER) {
          const agentInfo = agentsData.find((a: { id: string; status?: string; activeSubAgents?: number; pendingApproval?: boolean }) => 
            a.id.toLowerCase() === member.id.toLowerCase()
          );
          
          // Use API status (includes 'blocked' for pending proposals)
          let status: AgentStatus['status'] = 'idle';
          if (agentInfo?.status === 'blocked' || agentInfo?.pendingApproval) {
            status = 'blocked';
          }
          
          statusMap.set(member.id, {
            agentId: member.id,
            status,
            activeSubAgents: agentInfo?.activeSubAgents || 0,
          });
        }

        // Find in_progress tasks and map to agents by boardId (overrides blocked)
        const inProgressTasks = allTasks.filter(t => t.status === 'in_progress');
        
        for (const task of inProgressTasks) {
          // Find which agent owns this board
          const member = TEAM_ROSTER.find(m => m.boardId === task.board_id);
          if (member) {
            const existing = statusMap.get(member.id);
            // Working overrides blocked
            statusMap.set(member.id, {
              ...existing,
              agentId: member.id,
              status: 'working',
              taskId: task.id,
              taskName: task.name,
            });
          }
        }

        setStatuses(statusMap);
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch agent statuses:', err);
        setLoading(false);
      }
    };

    fetchStatuses();
    const poller = setInterval(fetchStatuses, 10000);
    return () => clearInterval(poller);
  }, []);

  const getStatusBadge = (status: AgentStatus['status']) => {
    switch (status) {
      case 'working':
        return (
          <span className="px-1.5 py-0.5 text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 rounded-full flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            WORKING
          </span>
        );
      case 'blocked':
        return (
          <span className="px-1.5 py-0.5 text-xs bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 rounded-full">
            BLOCKED
          </span>
        );
      default:
        return (
          <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 rounded-full">
            IDLE
          </span>
        );
    }
  };

  const getRoleBadge = (member: TeamMember) => {
    const colors = member.role === 'captain' 
      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
      : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
    
    return (
      <span className={`px-1.5 py-0.5 text-xs font-bold rounded ${colors}`}>
        {member.roleLabel}
      </span>
    );
  };

  const workingCount = Array.from(statuses.values()).filter(s => s.status === 'working').length;

  // Collapsed view
  if (collapsed) {
    return (
      <div className="w-12 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <button
          onClick={onToggle}
          className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-b border-gray-200 dark:border-gray-700 relative"
          title="Expand team roster"
        >
          <span className="text-lg">👥</span>
          {workingCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          )}
        </button>
        <div className="flex-1 overflow-y-auto py-2">
          {TEAM_ROSTER.map((member) => {
            const status = statuses.get(member.id);
            const isBoardOwner = activeBoardId != null && member.boardId === activeBoardId;
            return (
              <button
                key={member.id}
                onClick={() => {
                  onToggle();
                  setSelectedAgent(member.id);
                }}
                className={`w-full p-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex justify-center relative ${
                  isBoardOwner ? 'ring-2 ring-inset rounded-sm' : ''
                }`}
                style={isBoardOwner ? { '--tw-ring-color': member.color } as React.CSSProperties : undefined}
                title={`${member.name}: ${status?.status || 'idle'}`}
              >
                <AgentAvatar agent={member} size={28} />
                {status?.status === 'working' && (
                  <span className="absolute bottom-1 right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Expanded view
  return (
    <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">👥</span>
          <span className="font-semibold text-gray-900 dark:text-white">Team</span>
          <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 rounded-full">
            {TEAM_ROSTER.length}
          </span>
          {workingCount > 0 && (
            <span className="px-1.5 py-0.5 text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 rounded-full">
              {workingCount} active
            </span>
          )}
        </div>
        <button
          onClick={onToggle}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          title="Collapse panel"
        >
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Team List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            <span className="animate-spin inline-block">⏳</span> Loading...
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {TEAM_ROSTER.map((member) => {
              const status = statuses.get(member.id);
              const isSelected = selectedAgent === member.id;
              const isBoardOwner = activeBoardId != null && member.boardId === activeBoardId;

              return (
                <button
                  key={member.id}
                  onClick={() => setSelectedAgent(isSelected ? null : member.id)}
                  className={`w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all border-l-[3px] ${
                    isBoardOwner
                      ? ''
                      : 'border-l-transparent'
                  } ${
                    isSelected ? 'bg-pika-50 dark:bg-pika-900/20' : ''
                  }`}
                  style={isBoardOwner ? { borderLeftColor: member.color, backgroundColor: `${member.color}12` } : undefined}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <AgentAvatar agent={member} size={40} />

                    {/* Info - 2 lines only */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-medium text-sm text-gray-900 dark:text-white">
                          {member.name}
                        </span>
                        {getRoleBadge(member)}
                        {getStatusBadge(status?.status || 'idle')}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        <span>{member.function}</span>
                        {(status?.activeSubAgents ?? 0) > 0 && (
                          <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded-full font-medium">
                            {status?.activeSubAgents} worker{status?.activeSubAgents !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isSelected && (status?.taskId || status?.taskName) && (
                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-600">
                      <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Current Task
                      </div>
                      <div className="text-sm text-gray-700 dark:text-gray-300 mt-0.5 font-medium">
                        {status.taskName ? (
                          <>#{status.taskId}: {status.taskName}</>
                        ) : status.taskId ? (
                          <>Task #{status.taskId}</>
                        ) : null}
                      </div>
                    </div>
                  )}

                  {/* Log Viewer */}
                  {isSelected && (
                    <LogViewer
                      agentId={member.id}
                      isOpen={expandedLogs === member.id}
                      onToggle={() => setExpandedLogs(expandedLogs === member.id ? null : member.id)}
                    />
                  )}

                  {isSelected && member.boards && member.boards.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-600">
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Boards: {member.boards.join(', ')}
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
