import { useState, useEffect, useMemo, useRef } from 'react';
import { api, AgentProposals, ProposalsResponse, Question, Task } from '../api/client';

interface GroupedQuestions {
  agentId: string;
  items: Question[];
}

export default function Inbox() {
  const cachedApprovals = api.getCached<{ questions: Question[] }>('/questions?status=pending&type=approval');
  const cachedQuestions = api.getCached<{ questions: Question[] }>('/questions?status=pending&type=question');
  const cachedProposals = api.getCached<ProposalsResponse>('/proposals');

  const [approvals, setApprovals] = useState<Question[]>(cachedApprovals?.questions ?? []);
  const [questions, setQuestions] = useState<Question[]>(cachedQuestions?.questions ?? []);
  const [proposals, setProposals] = useState<AgentProposals[]>(cachedProposals?.proposals ?? []);
  const [inboxTasks, setInboxTasks] = useState<(Task & { board_name?: string })[]>([]);

  const hasAnyCached = Boolean(cachedApprovals || cachedQuestions || cachedProposals);
  const [loading, setLoading] = useState(!hasAnyCached);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [comment, setComment] = useState<Record<string, string>>({});
  const [proposalActionLoading, setProposalActionLoading] = useState<string | null>(null);
  const [proposalComments, setProposalComments] = useState<Record<string, string>>({});
  const [proposalsOpen, setProposalsOpen] = useState(true);
  const [approvalsOpen, setApprovalsOpen] = useState(true);
  const [questionsOpen, setQuestionsOpen] = useState(true);
  const [inboxTasksOpen, setInboxTasksOpen] = useState(true);

  // If a section is empty, keep it collapsed by default. If it has items, open it by default.
  // Once the user toggles a section, stop auto-managing that section's open state.
  const proposalsTouchedRef = useRef(false);
  const approvalsTouchedRef = useRef(false);
  const questionsTouchedRef = useRef(false);
  const inboxTasksTouchedRef = useRef(false);

  const loadData = async () => {
    try {
      if (!approvals.length && !questions.length && !proposals.length) setLoading(true);

      const results = await Promise.allSettled([
        api.getProposals(),
        api.getQuestions('pending', 'approval'),
        api.getQuestions('pending', 'question'),
        api.getTasks({ status: 'inbox' }),
      ]);

      const proposalsRes = results[0];
      const approvalsRes = results[1];
      const questionsRes = results[2];
      const inboxTasksRes = results[3];

      if (proposalsRes.status === 'fulfilled') {
        setProposals(proposalsRes.value.proposals);
      }
      if (approvalsRes.status === 'fulfilled') {
        setApprovals(approvalsRes.value);
      }
      if (questionsRes.status === 'fulfilled') {
        setQuestions(questionsRes.value);
      }
      if (inboxTasksRes.status === 'fulfilled') {
        setInboxTasks(inboxTasksRes.value);
      }

      const errors: string[] = [];
      if (proposalsRes.status === 'rejected') errors.push('proposals');
      if (approvalsRes.status === 'rejected') errors.push('approvals');
      if (questionsRes.status === 'rejected') errors.push('questions');
      if (inboxTasksRes.status === 'rejected') errors.push('inbox tasks');
      setError(errors.length ? `Failed to load: ${errors.join(', ')}` : null);
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

  const proposalItemCount = useMemo(() => {
    return proposals.reduce((sum, p) => sum + p.items.length, 0);
  }, [proposals]);

  useEffect(() => {
    if (!proposalsTouchedRef.current) setProposalsOpen(proposalItemCount > 0);
  }, [proposalItemCount]);

  useEffect(() => {
    if (!approvalsTouchedRef.current) setApprovalsOpen(approvals.length > 0);
  }, [approvals.length]);

  useEffect(() => {
    if (!questionsTouchedRef.current) setQuestionsOpen(questions.length > 0);
  }, [questions.length]);

  useEffect(() => {
    if (!inboxTasksTouchedRef.current) setInboxTasksOpen(inboxTasks.length > 0);
  }, [inboxTasks.length]);

  const handleProposalCommentChange = (agentId: string, index: number, value: string) => {
    const key = `proposal-${agentId}-${index}`;
    setProposalComments((prev) => ({ ...prev, [key]: value }));
  };

  const handleProposalApprove = async (agentId: string, index: number) => {
    const key = `proposal-${agentId}-${index}`;
    const proposalComment = proposalComments[key];
    setProposalActionLoading(key);
    try {
      await api.approveProposal(agentId, index, { comment: proposalComment?.trim() || undefined });
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
      setProposalComments((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    } catch (err) {
      console.error('Failed to approve proposal:', err);
    } finally {
      setProposalActionLoading(null);
    }
  };

  const handleProposalReject = async (agentId: string, index: number) => {
    const key = `proposal-${agentId}-${index}`;
    const proposalComment = proposalComments[key];
    setProposalActionLoading(key);
    try {
      await api.rejectProposal(agentId, index, proposalComment?.trim() || undefined);
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
      setProposalComments((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    } catch (err) {
      console.error('Failed to reject proposal:', err);
    } finally {
      setProposalActionLoading(null);
    }
  };

  const handleProposalRejectAll = async (agentId: string) => {
    const key = `proposal-${agentId}-all`;
    setProposalActionLoading(key);
    try {
      await api.rejectAllProposals(agentId);
      setProposals((prev) => prev.filter((p) => p.agentId !== agentId));
      setProposalComments((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((k) => {
          if (k.startsWith(`proposal-${agentId}-`)) delete next[k];
        });
        return next;
      });
    } catch (err) {
      console.error('Failed to reject all proposals:', err);
    } finally {
      setProposalActionLoading(null);
    }
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

  const totalItems = proposalItemCount + approvals.length + questions.length + inboxTasks.length;

  if (loading && proposals.length === 0 && approvals.length === 0 && questions.length === 0 && inboxTasks.length === 0) {
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

      {/* Inbox Tasks Section */}
      <section>
        <button
          onClick={() => {
            inboxTasksTouchedRef.current = true;
            setInboxTasksOpen((v) => !v);
          }}
          className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          <span className={`inline-block transition-transform ${inboxTasksOpen ? 'rotate-90' : ''}`}>▶</span>
          📋 Tasks
          {inboxTasks.length > 0 && (
            <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
              ({inboxTasks.length})
            </span>
          )}
        </button>

        {!inboxTasksOpen ? null : inboxTasks.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 sm:p-8 text-center">
            <span className="text-3xl sm:text-4xl mb-3 sm:mb-4 block">📭</span>
            <p className="text-gray-600 dark:text-gray-400">No tasks in inbox</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden divide-y divide-gray-100 dark:divide-gray-700">
            {inboxTasks.map((task) => (
              <div
                key={task.id}
                className="px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${
                        task.priority === 'urgent' ? 'bg-red-500' :
                        task.priority === 'high' ? 'bg-orange-500' :
                        task.priority === 'medium' ? 'bg-yellow-500' : 'bg-gray-400'
                      }`} />
                      <p className="font-medium text-gray-900 dark:text-white">
                        #{task.id} {task.name}
                      </p>
                    </div>
                    {task.board_name && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-4">
                        Board: {task.board_name}
                      </p>
                    )}
                    {task.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 ml-4 line-clamp-2">
                        {task.description.slice(0, 150)}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                    {new Date(task.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Blockers Section */}
      <section>
        <button
          onClick={() => {
            proposalsTouchedRef.current = true;
            setProposalsOpen((v) => !v);
          }}
          className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          <span className={`inline-block transition-transform ${proposalsOpen ? 'rotate-90' : ''}`}>▶</span>
          🚧 Blockers
          {proposalItemCount > 0 && (
            <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
              ({proposalItemCount} items)
            </span>
          )}
        </button>

        {!proposalsOpen ? null : proposalItemCount === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 sm:p-8 text-center">
            <span className="text-3xl sm:text-4xl mb-3 sm:mb-4 block">✅</span>
            <p className="text-gray-600 dark:text-gray-400">No pending blockers</p>
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
                <div className="bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
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
                      onClick={() => handleProposalRejectAll(agentProposal.agentId)}
                      disabled={proposalActionLoading === `proposal-${agentProposal.agentId}-all`}
                      className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:underline disabled:opacity-50"
                    >
                      Reject all
                    </button>
                  </div>
                </div>

                {/* Proposals List */}
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {agentProposal.items.map((item, index) => {
                    const key = `proposal-${agentProposal.agentId}-${index}`;
                    const isLoading = proposalActionLoading === key;
                    const proposalComment = proposalComments[key] || '';

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
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              onClick={() => handleProposalApprove(agentProposal.agentId, index)}
                              disabled={isLoading}
                              className="px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              {isLoading ? '...' : '✓ Approve'}
                            </button>
                            <button
                              onClick={() => handleProposalReject(agentProposal.agentId, index)}
                              disabled={isLoading}
                              className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              ✗ Reject
                            </button>
                          </div>
                        </div>
                        {/* Comment field */}
                        <div className="mt-3">
                          <textarea
                            placeholder="Add comment (optional)..."
                            rows={2}
                            value={proposalComment}
                            onChange={(e) => handleProposalCommentChange(agentProposal.agentId, index, e.target.value)}
                            disabled={isLoading}
                            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:bg-gray-50 dark:bg-gray-900 dark:text-white resize-none"
                          />
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

      {/* Approvals Section */}
      <section>
        <button
          onClick={() => {
            approvalsTouchedRef.current = true;
            setApprovalsOpen((v) => !v);
          }}
          className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          <span className={`inline-block transition-transform ${approvalsOpen ? 'rotate-90' : ''}`}>▶</span>
          ✅ Pending Approvals
          {approvals.length > 0 && (
            <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
              ({approvals.length} items)
            </span>
          )}
        </button>

        {!approvalsOpen ? null : approvals.length === 0 ? (
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
        <button
          onClick={() => {
            questionsTouchedRef.current = true;
            setQuestionsOpen((v) => !v);
          }}
          className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          <span className={`inline-block transition-transform ${questionsOpen ? 'rotate-90' : ''}`}>▶</span>
          ❓ Questions
          {questions.length > 0 && (
            <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
              ({questions.length})
            </span>
          )}
        </button>

        {!questionsOpen ? null : questions.length === 0 ? (
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
