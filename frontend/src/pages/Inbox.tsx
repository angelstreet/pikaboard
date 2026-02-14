import { useState, useEffect, useMemo, useRef } from 'react';
import { api, Task } from '../api/client';

type InboxTask = Task & { board_name?: string };

type InboxSection = 'approval' | 'question' | 'blocker' | 'rejected' | 'issue' | 'other';

function getSection(name: string): InboxSection {
  const upper = name.toUpperCase();
  if (upper.startsWith('[APPROVAL]') || upper.startsWith('[APPROVED]')) return 'approval';
  if (upper.startsWith('[QUESTION]') || upper.startsWith('[ANSWERED]')) return 'question';
  if (upper.startsWith('[BLOCKER]') || upper.startsWith('[UNBLOCKED]')) return 'blocker';
  if (upper.startsWith('[REJECTED]') || upper.startsWith('[DENIED]')) return 'rejected';
  if (upper.startsWith('[ISSUE]') || upper.startsWith('[RESOLVED]')) return 'issue';
  return 'other';
}

function isActionable(name: string): boolean {
  const upper = name.toUpperCase();
  return upper.startsWith('[APPROVAL]') || upper.startsWith('[QUESTION]') || upper.startsWith('[BLOCKER]') || upper.startsWith('[ISSUE]');
}

function stripPrefix(name: string): string {
  return name.replace(/^\[(APPROVAL|APPROVED|DENIED|QUESTION|ANSWERED|BLOCKER|UNBLOCKED|ISSUE|RESOLVED|REJECTED)\]\s*/i, '');
}

export default function Inbox() {
  const [tasks, setTasks] = useState<InboxTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<Record<number, string>>({});
  const [comments, setComments] = useState<Record<number, string>>({});

  const [approvalsOpen, setApprovalsOpen] = useState(true);
  const [questionsOpen, setQuestionsOpen] = useState(true);
  const [blockersOpen, setBlockersOpen] = useState(true);
  const [rejectedOpen, setRejectedOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'flagged'>('flagged');
  const [issuesOpen, setIssuesOpen] = useState(true);
  const [otherOpen, setOtherOpen] = useState(true);

  const approvalsTouched = useRef(false);
  const questionsTouched = useRef(false);
  const blockersTouched = useRef(false);
  const rejectedTouched = useRef(false);
  const issuesTouched = useRef(false);
  const otherTouched = useRef(false);

  const loadData = async () => {
    try {
      const result = await api.getTasks({ status: 'inbox' });
      setTasks(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load inbox');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  // Categorize tasks
  const approvals = useMemo(() => tasks.filter(t => getSection(t.name) === 'approval' && isActionable(t.name)), [tasks]);
  const questions = useMemo(() => tasks.filter(t => getSection(t.name) === 'question' && isActionable(t.name)), [tasks]);
  const blockers = useMemo(() => tasks.filter(t => getSection(t.name) === 'blocker' && isActionable(t.name)), [tasks]);
  const rejected = useMemo(() => tasks.filter(t => getSection(t.name) === 'rejected'), [tasks]);
  const issues = useMemo(() => tasks.filter(t => getSection(t.name) === 'issue' && isActionable(t.name)), [tasks]);
  const historyTasks = useMemo(() => {
    const handled = new Set([...approvals, ...questions, ...blockers, ...rejected, ...issues].map(t => t.id));
    return tasks.filter(t => !handled.has(t.id))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);
  }, [tasks, approvals, questions, blockers, issues]);

  // Auto-open sections with items
  useEffect(() => { if (!approvalsTouched.current) setApprovalsOpen(approvals.length > 0); }, [approvals.length]);
  useEffect(() => { if (!questionsTouched.current) setQuestionsOpen(questions.length > 0); }, [questions.length]);
  useEffect(() => { if (!blockersTouched.current) setBlockersOpen(blockers.length > 0); }, [blockers.length]);
  useEffect(() => { if (!issuesTouched.current) setIssuesOpen(issues.length > 0); }, [issues.length]);
  useEffect(() => { if (!rejectedTouched.current) setRejectedOpen(rejected.length > 0); }, [rejected.length]);
  useEffect(() => { if (!otherTouched.current) setOtherOpen(historyTasks.length > 0); }, [historyTasks.length]);

  const totalItems = approvals.length + questions.length + blockers.length + rejected.length + issues.length;
  const flaggedCount = approvals.length + questions.length + blockers.length + rejected.length;

  const getAgentEmoji = (name: string): string => {
    const emojis: Record<string, string> = { pika: '⚡', bulbi: '🌱', tortoise: '🐢', sala: '🦎', evoli: '🦊', psykokwak: '🦆', mew: '✨' };
    // Try to extract agent from description "**From:** agentname"
    return emojis[name.toLowerCase()] || '🤖';
  };

  const extractAgent = (task: InboxTask): string | null => {
    if (!task.description) return null;
    const match = task.description.match(/\*\*From:\*\*\s*(\w+)/);
    return match ? match[1] : null;
  };

  // Actions
  const handleApprove = async (task: InboxTask) => {
    const key = `approve-${task.id}`;
    setActionLoading(key);
    try {
      const comment = comments[task.id] || '';
      const newName = task.name.replace(/^\[APPROVAL\]/i, '[APPROVED]');
      const appendText = comment ? `\n\n---\n**Approved:** ${comment}` : '\n\n---\n**Approved**';
      await api.updateTask(task.id, {
        name: newName,
        description: (task.description || '') + appendText,
      });
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, name: newName } : t));
      setComments(prev => { const n = { ...prev }; delete n[task.id]; return n; });
    } catch (err) {
      console.error('Failed to approve:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeny = async (task: InboxTask) => {
    const key = `deny-${task.id}`;
    setActionLoading(key);
    try {
      const comment = comments[task.id] || '';
      const newName = task.name.replace(/^\[APPROVAL\]/i, '[DENIED]');
      const appendText = comment ? `\n\n---\n**Denied:** ${comment}` : '\n\n---\n**Denied**';
      await api.updateTask(task.id, {
        name: newName,
        description: (task.description || '') + appendText,
      });
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, name: newName } : t));
      setComments(prev => { const n = { ...prev }; delete n[task.id]; return n; });
    } catch (err) {
      console.error('Failed to deny:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReply = async (task: InboxTask) => {
    const reply = replyText[task.id]?.trim();
    if (!reply) return;
    const key = `reply-${task.id}`;
    setActionLoading(key);
    try {
      const newName = task.name.replace(/^\[QUESTION\]/i, '[ANSWERED]');
      const appendText = `\n\n---\n**Answer:** ${reply}`;
      await api.updateTask(task.id, {
        name: newName,
        description: (task.description || '') + appendText,
      });
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, name: newName } : t));
      setReplyText(prev => { const n = { ...prev }; delete n[task.id]; return n; });
    } catch (err) {
      console.error('Failed to reply:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleResolveIssue = async (task: InboxTask) => {
    const key = `resolve-${task.id}`;
    setActionLoading(key);
    try {
      const comment = comments[task.id] || '';
      const newName = task.name.replace(/^\[ISSUE\]/i, '[RESOLVED]');
      const appendText = comment ? `\n\n---\n**Resolved:** ${comment}` : '\n\n---\n**Resolved**';
      await api.updateTask(task.id, {
        name: newName,
        description: (task.description || '') + appendText,
      });
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, name: newName } : t));
      setComments(prev => { const n = { ...prev }; delete n[task.id]; return n; });
    } catch (err) {
      console.error('Failed to resolve issue:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnblock = async (task: InboxTask) => {
    const key = `unblock-${task.id}`;
    setActionLoading(key);
    try {
      const comment = comments[task.id] || '';
      const newName = task.name.replace(/^\[BLOCKER\]/i, '[UNBLOCKED]');
      const appendText = comment ? `\n\n---\n**Resolved:** ${comment}` : '\n\n---\n**Resolved**';
      await api.updateTask(task.id, {
        name: newName,
        description: (task.description || '') + appendText,
      });
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, name: newName } : t));
      setComments(prev => { const n = { ...prev }; delete n[task.id]; return n; });
    } catch (err) {
      console.error('Failed to unblock:', err);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading && tasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">Loading inbox...</div>
      </div>
    );
  }

  const SectionToggle = ({ open, onToggle, icon, label, count }: { open: boolean; onToggle: () => void; icon: string; label: string; count: number }) => (
    <button
      onClick={onToggle}
      className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
    >
      <span className={`inline-block transition-transform ${open ? 'rotate-90' : ''}`}>▶</span>
      {icon} {label}
      {count > 0 && (
        <span className="text-sm font-normal text-gray-500 dark:text-gray-400">({count})</span>
      )}
    </button>
  );

  const EmptyState = ({ icon, text, sub }: { icon: string; text: string; sub?: string }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 sm:p-8 text-center">
      <span className="text-3xl sm:text-4xl mb-3 sm:mb-4 block">{icon}</span>
      <p className="text-gray-600 dark:text-gray-400">{text}</p>
      {sub && <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">{sub}</p>}
    </div>
  );

  const getDescriptionPreview = (task: InboxTask): string | null => {
    if (!task.description) return null;
    const section = getSection(task.name);
    // For approvals/questions, try to extract the actual question line
    if (section === 'approval' || section === 'question') {
      const lines = task.description.split('\n').map(l => l.trim()).filter(Boolean);
      // Skip metadata lines like "**From:** agent"
      const contentLine = lines.find(l => !l.startsWith('**From:') && !l.startsWith('---'));
      if (contentLine) {
        const clean = contentLine.replace(/\*\*/g, '');
        return clean.length > 80 ? clean.slice(0, 80) + '…' : clean;
      }
    }
    // Default: first line truncated
    const firstLine = task.description.split('\n')[0].trim();
    if (!firstLine) return null;
    return firstLine.length > 80 ? firstLine.slice(0, 80) + '…' : firstLine;
  };

  const TaskRow = ({ task, actions }: { task: InboxTask; actions: React.ReactNode }) => {
    const agent = extractAgent(task);
    const preview = getDescriptionPreview(task);
    return (
      <div className="px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {agent && <span className="text-lg">{getAgentEmoji(agent)}</span>}
              <p className="font-medium text-gray-900 dark:text-white">
                #{task.id} {stripPrefix(task.name)}
              </p>
            </div>
            {preview && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 ml-7 truncate max-w-md">
                {preview}
              </p>
            )}
            {agent && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 ml-7">
                from {agent.charAt(0).toUpperCase() + agent.slice(1)}
              </p>
            )}
            {task.board_name && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 ml-7">
                Board: {task.board_name}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {actions}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            📥 Inbox
            {(activeTab === 'all' ? totalItems : flaggedCount) > 0 && (
              <span className="bg-red-500 text-white text-xs sm:text-sm font-medium px-2 py-0.5 rounded-full">
                {activeTab === 'all' ? totalItems : flaggedCount}
              </span>
            )}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm hidden sm:block">
            {activeTab === 'all' ? 'Review agent approvals, questions, blockers, rejected, issues, history' : 'Dedicated tab: ONLY flagged (approval/blocker/rejected/questions)'}
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
        <SectionToggle
          open={approvalsOpen}
          onToggle={() => { approvalsTouched.current = true; setApprovalsOpen(v => !v); }}
          icon="✅" label="Pending Approvals" count={approvals.length}
        />
        {approvalsOpen && (approvals.length === 0 ? (
          <EmptyState icon="✨" text="No pending approvals" sub="All agents are unblocked" />
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden divide-y divide-gray-100 dark:divide-gray-700">
            {approvals.map(task => (
              <TaskRow key={task.id} task={task} actions={
                <>
                  <button
                    onClick={() => handleApprove(task)}
                    disabled={actionLoading === `approve-${task.id}`}
                    className="px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    {actionLoading === `approve-${task.id}` ? '...' : '✓ Accept'}
                  </button>
                  <button
                    onClick={() => handleDeny(task)}
                    disabled={actionLoading === `deny-${task.id}`}
                    className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
                  >
                    ✗ Deny
                  </button>
                </>
              } />
            ))}
            {approvals.map(task => (
              <div key={`comment-${task.id}`} className="px-4 py-2 bg-gray-50 dark:bg-gray-900/30" style={{ display: 'none' }} />
            ))}
          </div>
        ))}
      </section>

      {/* Questions Section */}
      <section>
        <SectionToggle
          open={questionsOpen}
          onToggle={() => { questionsTouched.current = true; setQuestionsOpen(v => !v); }}
          icon="❓" label="Questions" count={questions.length}
        />
        {questionsOpen && (questions.length === 0 ? (
          <EmptyState icon="💬" text="No pending questions" sub="Agents will ask when they need help" />
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden divide-y divide-gray-100 dark:divide-gray-700">
            {questions.map(task => {
              const preview = getDescriptionPreview(task);
              const agent = extractAgent(task);
              return (
              <div key={task.id} className="px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {agent && <span className="text-lg">{getAgentEmoji(agent)}</span>}
                      <p className="font-medium text-gray-900 dark:text-white">
                        #{task.id} {stripPrefix(task.name)}
                      </p>
                    </div>
                    {preview && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 ml-7 truncate max-w-md">
                        {preview}
                      </p>
                    )}
                    {agent && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 ml-7">
                        from {agent.charAt(0).toUpperCase() + agent.slice(1)}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {new Date(task.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="mt-3 flex gap-2">
                  <input
                    type="text"
                    value={replyText[task.id] || ''}
                    onChange={e => setReplyText(prev => ({ ...prev, [task.id]: e.target.value }))}
                    placeholder="Type your reply..."
                    className="flex-1 text-sm px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyDown={e => e.key === 'Enter' && handleReply(task)}
                  />
                  <button
                    onClick={() => handleReply(task)}
                    disabled={actionLoading === `reply-${task.id}` || !replyText[task.id]?.trim()}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {actionLoading === `reply-${task.id}` ? '...' : 'Send'}
                  </button>
                </div>
              </div>
            );
            })}
          </div>
        ))}
      </section>

      {/* Blockers Section */}
      <section>
        <SectionToggle
          open={blockersOpen}
          onToggle={() => { blockersTouched.current = true; setBlockersOpen(v => !v); }}
          icon="🚧" label="Blockers" count={blockers.length}
        />
        {blockersOpen && (blockers.length === 0 ? (
          <EmptyState icon="✅" text="No pending blockers" sub="All agents are unblocked" />
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden divide-y divide-gray-100 dark:divide-gray-700">
            {blockers.map(task => (
              <div key={task.id} className="px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <TaskRow task={task} actions={
                  <button
                    onClick={() => handleUnblock(task)}
                    disabled={actionLoading === `unblock-${task.id}`}
                    className="px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    {actionLoading === `unblock-${task.id}` ? '...' : '✓ Resolve'}
                  </button>
                } />
                <div className="px-4 pb-3">
                  <input
                    type="text"
                    value={comments[task.id] || ''}
                    onChange={e => setComments(prev => ({ ...prev, [task.id]: e.target.value }))}
                    placeholder="Add resolution note (optional)..."
                    className="w-full text-sm px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
            ))}
          </div>
        ))}
      </section>

      {/* Issues Section */}
      <section>
        <SectionToggle
          open={issuesOpen}
          onToggle={() => { issuesTouched.current = true; setIssuesOpen(v => !v); }}
          icon="🚨" label="Issues" count={issues.length}
        />
        {issuesOpen && (issues.length === 0 ? (
          <EmptyState icon="✅" text="No open issues" sub="All clear across all boards" />
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden divide-y divide-gray-100 dark:divide-gray-700">
            {issues.map(task => (
              <div key={task.id} className="px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <TaskRow task={task} actions={
                  <button
                    onClick={() => handleResolveIssue(task)}
                    disabled={actionLoading === `resolve-${task.id}`}
                    className="px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    {actionLoading === `resolve-${task.id}` ? '...' : '✓ Resolve'}
                  </button>
                } />
                <div className="px-4 pb-3">
                  <input
                    type="text"
                    value={comments[task.id] || ''}
                    onChange={e => setComments(prev => ({ ...prev, [task.id]: e.target.value }))}
                    placeholder="Add resolution note (optional)..."
                    className="w-full text-sm px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>
            ))}
          </div>
        ))}
      </section>

      {/* History */}
      <section>
        <SectionToggle
          open={otherOpen}
          onToggle={() => { otherTouched.current = true; setOtherOpen(v => !v); }}
          icon="🕘" label="History" count={historyTasks.length}
        />
        {otherOpen && (historyTasks.length === 0 ? (
          <EmptyState icon="📭" text="No recent history" />
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden divide-y divide-gray-100 dark:divide-gray-700">
            {historyTasks.map(task => (
              <div key={task.id} className="px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
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
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-4">Board: {task.board_name}</p>
                    )}
                    {task.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 ml-4 line-clamp-2">
                        {task.description.slice(0, 150)}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {new Date(task.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ))}
      </section>
    </div>
  );
}
