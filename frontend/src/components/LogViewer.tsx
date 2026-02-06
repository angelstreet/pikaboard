import { useState, useEffect, useRef } from 'react';
import { api, AgentLogEntry } from '../api/client';

interface LogViewerProps {
  agentId: string;
  isOpen: boolean;
  onToggle: () => void;
}

export default function LogViewer({ agentId, isOpen, onToggle }: LogViewerProps) {
  const [logs, setLogs] = useState<AgentLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedLog, setExpandedLog] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const fetchLogs = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.getAgentLogs(agentId, 100);
        setLogs(data.logs);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load logs');
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
    // Auto-refresh every 10 seconds when open
    const interval = setInterval(fetchLogs, 10000);
    return () => clearInterval(interval);
  }, [agentId, isOpen]);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (scrollRef.current && isOpen) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isOpen]);

  const getLogIcon = (type: AgentLogEntry['type']) => {
    switch (type) {
      case 'error':
        return '❌';
      case 'tool':
        return '🔧';
      case 'message':
        return '💬';
      default:
        return '📄';
    }
  };

  const getLogColor = (type: AgentLogEntry['type']) => {
    switch (type) {
      case 'error':
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
      case 'tool':
        return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20';
      case 'message':
        return 'text-gray-700 dark:text-gray-300';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <div className="mt-3 border-t border-gray-100 dark:border-gray-600">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <span>📋</span>
          Session Logs
          {logs.length > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-full">
              {logs.length}
            </span>
          )}
        </span>
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expandable Content */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        {isOpen && (
          <div className="pt-1">
            {loading && logs.length === 0 ? (
              <div className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                <span className="animate-spin inline-block mr-2">⏳</span>
                Loading logs...
              </div>
            ) : error ? (
              <div className="py-3 px-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded">
                {error}
              </div>
            ) : logs.length === 0 ? (
              <div className="py-4 text-center text-sm text-gray-400 dark:text-gray-500">
                No recent logs found
              </div>
            ) : (
              <div
                ref={scrollRef}
                className="max-h-[360px] overflow-y-auto space-y-1 pr-1 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600"
              >
                {logs.map((log, index) => (
                  <div
                    key={index}
                    className={`text-xs rounded px-2 py-1.5 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                      expandedLog === index ? 'bg-gray-50 dark:bg-gray-700/50' : ''
                    }`}
                    onClick={() => setExpandedLog(expandedLog === index ? null : index)}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500 whitespace-nowrap mt-0.5">
                        [{log.time}]
                      </span>
                      <span className="flex-shrink-0">{getLogIcon(log.type)}</span>
                      <span
                        className={`flex-1 break-words ${getLogColor(log.type)} ${
                          expandedLog !== index ? 'line-clamp-2' : ''
                        }`}
                      >
                        {log.summary}
                      </span>
                    </div>
                    {/* Expanded full content */}
                    {expandedLog === index && log.fullContent && (
                      <div className="mt-2 pl-[52px] pr-2">
                        <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded text-gray-600 dark:text-gray-400 whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
                          {log.fullContent}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
