import { useState, useEffect, useMemo } from 'react';
import { api, AgentProposals, Question } from '../api/client';

interface AgentQuestions {
  agentId: string;
  items: Question[];
}

export default function Inbox() {
  const [proposals, setProposals] = useState<AgentProposals[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [comment, setComment] = useState<Record<string, string>>({});

  const loadData = async () => {
    try {
      setLoading(true);
      const [proposalsData, questionsData] = await Promise.all([
        api.getProposals(),
        api.getQuestions('pending'),
      ]);
      setProposals(proposalsData.proposals);
      setQuestions(questionsData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load inbox');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Poll every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleApprove = async (agentId: string, index: number) => {
    const key = `${agentId}-${index}`;
    setActionLoading(key);
    try {
      await api.approveProposal(agentId, index);
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
      // Clear comment for this item
      setComment((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    } catch (err) {
      console.error('Failed to approve:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (agentId: string, index: number) => {
    const key = `${agentId}-${index}`;
    setActionLoading(key);
    try {
      await api.rejectProposal(agentId, index);
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
      setComment((prev) => {
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
    } catch (err) {
      console.error('Failed to reject all:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReply = async (questionId: number) => {
    if (!replyText.trim()) return;
    
    const key = `question-${questionId}`;
    setActionLoading(key);
    try {
      await api.answerQuestion(questionId, replyText.trim());
      // Remove the answered question from the list
      setQuestions((prev) => prev.filter((q) => q.id !== questionId));
      setReplyingTo(null);
      setReplyText('');
    } catch (err) {
      console.error('Failed to answer question:', err);
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

  // Group questions by agent
  const questionsByAgent = useMemo<AgentQuestions[]>(() => {
    const grouped = questions.reduce((acc, q) => {
      const agentId = q.agent.toLowerCase();
      if (!acc[agentId]) {
        acc[agentId] = [];
      }
      acc[agentId].push(q);
      return acc;
    }, {} as Record<string, Question[]>);

    return Object.entries(grouped).map(([agentId, items]) => ({
      agentId,
      items: items.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    }));
  }, [questions]);

  const totalItems = proposals.reduce((sum, p) => sum + p.items.length, 0) + questions.length;

  if (loading && proposals.length === 0 && questions.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">Loading inbox...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            📥 Inbox
            {totalItems > 0 && (
              <span className="bg-red-500 text-white text-sm font-medium px-2.5 py-0.5 rounded-full">
                {totalItems}
              </span>
            )}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Review agent proposals and answer questions
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="px-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          {loading ? 'Refreshing...' : '🔄 Refresh'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Approvals Section */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          ✅ Pending Approvals
          {proposals.length > 0 && (
            <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
              ({proposals.reduce((sum, p) => sum + p.items.length, 0)} items)
            </span>
          )}
        </h2>

        {proposals.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 sm:p-8 text-center">
            <span className="text-3xl sm:text-4xl mb-3 sm:mb-4 block">✨</span>
            <p className="text-gray-600 dark:text-gray-400">No pending approvals</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">All agents are unblocked</p>
          </div>
        ) : (
          <div className="space-y-4">
            {proposals.map((agentProposal) => (
              <div
                key={agentProposal.agentId}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden"
              >
                {/* Agent Header */}
                <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getAgentEmoji(agentProposal.agentId)}</span>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {getAgentName(agentProposal.agentId)}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {agentProposal.items.length} proposal{agentProposal.items.length > 1 ? 's' : ''} pending
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRejectAll(agentProposal.agentId)}
                      disabled={actionLoading === `${agentProposal.agentId}-all`}
                      className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:underline disabled:opacity-50"
                    >
                      Reject all
                    </button>
                  </div>
                </div>

                {/* Proposals List */}
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {agentProposal.items.map((item, index) => {
                    const key = `${agentProposal.agentId}-${index}`;
                    const isLoading = actionLoading === key;
                    const itemComment = comment[key] || '';

                    return (
                      <div
                        key={index}
                        className="px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white">{item.name}</p>
                            {item.description && (
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                                {item.description}
                              </p>
                            )}
                            {/* Comment Field */}
                            <div className="mt-3">
                              <input
                                type="text"
                                value={itemComment}
                                onChange={(e) => setComment((prev) => ({ ...prev, [key]: e.target.value }))}
                                placeholder="Add a note (optional)..."
                                className="w-full text-sm px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              onClick={() => handleApprove(agentProposal.agentId, index)}
                              disabled={isLoading}
                              className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              {isLoading ? '...' : '✓ Accept'}
                            </button>
                            <button
                              onClick={() => handleReject(agentProposal.agentId, index)}
                              disabled={isLoading}
                              className="px-4 py-2 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              ✗ Decline
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Questions Section */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          ❓ Questions
          {questions.length > 0 && (
            <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
              ({questions.length})
            </span>
          )}
        </h2>

        {questions.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 sm:p-8 text-center">
            <span className="text-3xl sm:text-4xl mb-3 sm:mb-4 block">💬</span>
            <p className="text-gray-600 dark:text-gray-400">No pending questions</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">Agents will ask when they need help</p>
          </div>
        ) : (
          <div className="space-y-4">
            {questionsByAgent.map((agentQuestions) => (
              <div
                key={agentQuestions.agentId}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden"
              >
                {/* Agent Header */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getAgentEmoji(agentQuestions.agentId)}</span>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {getAgentName(agentQuestions.agentId)}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {agentQuestions.items.length} question{agentQuestions.items.length > 1 ? 's' : ''} waiting
                      </p>
                    </div>
                  </div>
                </div>

                {/* Questions List */}
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {agentQuestions.items.map((q) => {
                    const isLoading = actionLoading === `question-${q.id}`;
                    return (
                      <div
                        key={q.id}
                        className="px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="text-gray-900 dark:text-white font-medium">{q.question}</p>
                            {q.context && (
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 italic">
                                Context: {q.context}
                              </p>
                            )}
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                              {new Date(q.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        
                        {/* Reply Section */}
                        <div className="mt-3">
                          {replyingTo === q.id ? (
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder="Type your reply..."
                                className="flex-1 text-sm px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                autoFocus
                                onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleReply(q.id)}
                              />
                              <button
                                onClick={() => handleReply(q.id)}
                                disabled={isLoading}
                                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                              >
                                {isLoading ? '...' : 'Send'}
                              </button>
                              <button
                                onClick={() => {
                                  setReplyingTo(null);
                                  setReplyText('');
                                }}
                                disabled={isLoading}
                                className="px-4 py-2 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-500 disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setReplyingTo(q.id)}
                              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              Reply →
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
