import { useState, useEffect, useMemo } from 'react';
import { api, Question } from '../api/client';

interface GroupedQuestions {
  agentId: string;
  items: Question[];
}

export default function Inbox() {
  const cachedApprovals = api.getCached<{ questions: Question[] }>('/questions?status=pending&type=approval');
  const cachedQuestions = api.getCached<{ questions: Question[] }>('/questions?status=pending&type=question');

  const [approvals, setApprovals] = useState<Question[]>(cachedApprovals?.questions ?? []);
  const [questions, setQuestions] = useState<Question[]>(cachedQuestions?.questions ?? []);
  const [loading, setLoading] = useState(!cachedApprovals);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [comment, setComment] = useState<Record<string, string>>({});

  const loadData = async () => {
    try {
      if (!approvals.length && !questions.length) setLoading(true);
      const [approvalsData, questionsData] = await Promise.all([
        api.getQuestions('pending', 'approval'),
        api.getQuestions('pending', 'question'),
      ]);
      setApprovals(approvalsData);
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

  const handleApprove = async (id: number) => {
    const key = `approval-${id}`;
    const itemComment = comment[key] || '';
    setActionLoading(key);
    try {
      await api.approveQuestion(id, itemComment.trim() || undefined);
      // Update local state
      setApprovals((prev) => prev.filter((a) => a.id !== id));
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

  const handleReject = async (id: number) => {
    const key = `approval-${id}`;
    const itemComment = comment[key] || '';
    setActionLoading(key);
    try {
      await api.rejectQuestion(id, itemComment.trim() || undefined);
      // Update local state
      setApprovals((prev) => prev.filter((a) => a.id !== id));
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

  // Group approvals by agent
  const approvalsByAgent = useMemo<GroupedQuestions[]>(() => {
    const grouped = approvals.reduce((acc, a) => {
      const agentId = a.agent.toLowerCase();
      if (!acc[agentId]) {
        acc[agentId] = [];
      }
      acc[agentId].push(a);
      return acc;
    }, {} as Record<string, Question[]>);

    return Object.entries(grouped).map(([agentId, items]) => ({
      agentId,
      items: items.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    }));
  }, [approvals]);

  // Group questions by agent
  const questionsByAgent = useMemo<GroupedQuestions[]>(() => {
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

  const totalItems = approvals.length + questions.length;

  if (loading && approvals.length === 0 && questions.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">Loading inbox...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            📥 Inbox
            {totalItems > 0 && (
              <span className="bg-red-500 text-white text-xs sm:text-sm font-medium px-2 py-0.5 rounded-full">
                {totalItems}
              </span>
            )}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm hidden sm:block">
            Review agent approvals and answer questions
          </p>
        </div>
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
          {approvals.length > 0 && (
            <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
              ({approvals.length} items)
            </span>
          )}
        </h2>

        {approvals.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 sm:p-8 text-center">
            <span className="text-3xl sm:text-4xl mb-3 sm:mb-4 block">✨</span>
            <p className="text-gray-600 dark:text-gray-400">No pending approvals</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">All agents are unblocked</p>
          </div>
        ) : (
          <div className="space-y-4">
            {approvalsByAgent.map((agentApproval) => (
              <div
                key={agentApproval.agentId}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden"
              >
                {/* Agent Header */}
                <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getAgentEmoji(agentApproval.agentId)}</span>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {getAgentName(agentApproval.agentId)}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {agentApproval.items.length} approval{agentApproval.items.length > 1 ? 's' : ''} pending
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Approvals List */}
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {agentApproval.items.map((item) => {
                    const key = `approval-${item.id}`;
                    const isLoading = actionLoading === key;
                    const itemComment = comment[key] || '';

                    return (
                      <div
                        key={item.id}
                        className="px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white">{item.question}</p>
                            {item.context && (
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                                {item.context}
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
                              onClick={() => handleApprove(item.id)}
                              disabled={isLoading}
                              className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              {isLoading ? '...' : '✓ Accept'}
                            </button>
                            <button
                              onClick={() => handleReject(item.id)}
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
