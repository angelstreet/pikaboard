import { useState, useEffect } from 'react';
import { api, AgentProposals, Task } from '../api/client';

interface BlockerViewProps {
  onTaskCreated?: (task: Task) => void;
}

export function BlockerView({ onTaskCreated }: BlockerViewProps) {
  const [proposals, setProposals] = useState<AgentProposals[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, string>>({});

  const loadProposals = async () => {
    try {
      setLoading(true);
      const data = await api.getProposals();
      setProposals(data.proposals);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load proposals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProposals();
  }, []);

  const getCommentKey = (agentId: string, index: number) => `${agentId}-${index}`;

  const handleCommentChange = (agentId: string, index: number, value: string) => {
    const key = getCommentKey(agentId, index);
    setComments((prev) => ({ ...prev, [key]: value }));
  };

  const handleApprove = async (agentId: string, index: number) => {
    const key = `${agentId}-${index}`;
    const comment = comments[key];
    setActionLoading(key);
    try {
      const result = await api.approveProposal(agentId, index, { comment });
      // Update local state
      setProposals((prev) =>
        prev
          .map((p) => {
            if (p.agentId === agentId) {
              const newItems = [...p.items];
              newItems.splice(index, 1);
              return { ...p, items: newItems };
            }
            return p;
          })
          .filter((p) => p.items.length > 0)
      );
      // Clear comment
      setComments((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      if (result.task && onTaskCreated) {
        onTaskCreated(result.task);
      }
    } catch (err) {
      console.error('Failed to approve:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (agentId: string, index: number) => {
    const key = `${agentId}-${index}`;
    const comment = comments[key];
    setActionLoading(key);
    try {
      await api.rejectProposal(agentId, index, comment);
      // Update local state
      setProposals((prev) =>
        prev
          .map((p) => {
            if (p.agentId === agentId) {
              const newItems = [...p.items];
              newItems.splice(index, 1);
              return { ...p, items: newItems };
            }
            return p;
          })
          .filter((p) => p.items.length > 0)
      );
      // Clear comment
      setComments((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    } catch (err) {
      console.error('Failed to reject:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectAll = async (agentId: string) => {
    const key = `${agentId}-all`;
    setActionLoading(key);
    try {
      await api.rejectAllProposals(agentId);
      setProposals((prev) => prev.filter((p) => p.agentId !== agentId));
      // Clear all comments for this agent
      setComments((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((k) => {
          if (k.startsWith(`${agentId}-`)) delete next[k];
        });
        return next;
      });
    } catch (err) {
      console.error('Failed to reject all:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const getAgentEmoji = (agentId: string): string => {
    const emojis: Record<string, string> = {
      pika: '⚡',
      bulbi: '🌱',
      tortoise: '🐢',
      sala: '🦎',
      evoli: '🦊',
      psykokwak: '🦆',
      mew: '✨',
    };
    return emojis[agentId.toLowerCase()] || '🤖';
  };

  const getAgentName = (agentId: string): string => {
    return agentId.charAt(0).toUpperCase() + agentId.slice(1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading proposals...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        <strong>Error:</strong> {error}
        <button
          onClick={loadProposals}
          className="ml-4 text-sm underline hover:no-underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (proposals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <span className="text-4xl mb-4">✅</span>
        <p className="text-lg font-medium">No pending proposals</p>
        <p className="text-sm mt-1">All agents are unblocked</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-sm text-gray-600 mb-4">
        {proposals.length} agent{proposals.length > 1 ? 's' : ''} waiting for approval
      </div>

      {proposals.map((agentProposal) => (
        <div
          key={agentProposal.agentId}
          className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden"
        >
          {/* Agent Header */}
          <div className="bg-gradient-to-r from-orange-50 to-yellow-50 px-4 py-3 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{getAgentEmoji(agentProposal.agentId)}</span>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {getAgentName(agentProposal.agentId)}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {agentProposal.items.length} proposal{agentProposal.items.length > 1 ? 's' : ''} pending
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleRejectAll(agentProposal.agentId)}
                disabled={actionLoading === `${agentProposal.agentId}-all`}
                className="text-sm text-red-600 hover:text-red-700 hover:underline disabled:opacity-50"
              >
                Reject all
              </button>
            </div>
          </div>

          {/* Proposals List */}
          <div className="divide-y divide-gray-100">
            {agentProposal.items.map((item, index) => {
              const key = `${agentProposal.agentId}-${index}`;
              const isLoading = actionLoading === key;
              const comment = comments[key] || '';

              return (
                <div
                  key={index}
                  className="px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">{item.name}</p>
                      {item.description && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                          {item.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleApprove(agentProposal.agentId, index)}
                        disabled={isLoading}
                        className="px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isLoading ? '...' : '✓ Approve'}
                      </button>
                      <button
                        onClick={() => handleReject(agentProposal.agentId, index)}
                        disabled={isLoading}
                        className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        ✗ Reject
                      </button>
                    </div>
                  </div>
                  {/* Comment field */}
                  <div className="mt-2">
                    <input
                      type="text"
                      placeholder="Add note (optional)..."
                      value={comment}
                      onChange={(e) => handleCommentChange(agentProposal.agentId, index, e.target.value)}
                      disabled={isLoading}
                      className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:bg-gray-50"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
