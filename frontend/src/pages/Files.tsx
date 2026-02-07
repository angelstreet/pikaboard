import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { API_BASE_URL } from '../api/client';

interface FileEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modified?: string;
}

interface RootDir {
  path: string;
  label: string;
  exists: boolean;
}

const getToken = (): string => {
  return localStorage.getItem('pikaboard_token') || '';
};

const headers = {
  Authorization: `Bearer ${getToken()}`,
  'Content-Type': 'application/json',
};

function formatSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function Files() {
  const [roots, setRoots] = useState<RootDir[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [parentPath, setParentPath] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<{ path: string; name: string; content: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch roots on mount
  useEffect(() => {
    fetchRoots();
  }, []);

  const fetchRoots = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/files/roots`, { headers });
      if (res.ok) {
        const data = await res.json();
        setRoots(data.roots || []);
        // Auto-select first root
        if (data.roots?.length > 0) {
          navigateTo(data.roots[0].path);
        }
      }
    } catch (e) {
      console.error('Failed to fetch roots:', e);
    }
  };

  const navigateTo = async (path: string) => {
    setLoading(true);
    setError(null);
    setSelectedFile(null);
    
    try {
      const res = await fetch(`${API_BASE_URL}/files?path=${encodeURIComponent(path)}`, { headers });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to load directory');
      }
      const data = await res.json();
      setCurrentPath(data.path);
      setParentPath(data.parent);
      setEntries(data.entries || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load directory');
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  const openFile = async (path: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch(`${API_BASE_URL}/files/content?path=${encodeURIComponent(path)}`, { headers });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to read file');
      }
      const data = await res.json();
      setSelectedFile({ path: data.path, name: data.name, content: data.content });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to read file');
    } finally {
      setLoading(false);
    }
  };

  const handleEntryClick = (entry: FileEntry) => {
    if (entry.type === 'directory') {
      navigateTo(entry.path);
    } else {
      openFile(entry.path);
    }
  };

  const canGoUp = currentPath && parentPath && roots.some(r => currentPath.startsWith(r.path) && currentPath !== r.path);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">📁 Files</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Browse research, docs, and agent memory
          </p>
        </div>
      </div>

      {/* Root tabs */}
      <div className="flex gap-2 flex-wrap">
        {roots.map((root) => (
          <button
            key={root.path}
            onClick={() => navigateTo(root.path)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              currentPath.startsWith(root.path)
                ? 'bg-pika-100 text-pika-700 dark:bg-pika-900 dark:text-pika-300'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            {root.label}
          </button>
        ))}
      </div>

      {/* Breadcrumb / path */}
      <div className="flex items-center gap-2 text-sm">
        {canGoUp && (
          <button
            onClick={() => navigateTo(parentPath)}
            className="text-pika-600 hover:text-pika-700 dark:text-pika-400 flex items-center gap-1"
          >
            ← Back
          </button>
        )}
        <span className="text-gray-500 dark:text-gray-400 font-mono text-xs">
          {currentPath}
        </span>
      </div>

      {/* Main content */}
      <div className="flex gap-4 min-h-[400px]">
        {/* File list */}
        <div className="w-1/3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading && !selectedFile ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">Loading...</div>
          ) : error && !selectedFile ? (
            <div className="p-4 text-center text-red-500">{error}</div>
          ) : entries.length === 0 ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">Empty directory</div>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
              {entries.map((entry) => (
                <li key={entry.path}>
                  <button
                    onClick={() => handleEntryClick(entry)}
                    className={`w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 ${
                      selectedFile?.path === entry.path ? 'bg-pika-50 dark:bg-pika-900/30' : ''
                    }`}
                  >
                    <span className="text-lg">
                      {entry.type === 'directory' ? '📁' : entry.name.endsWith('.md') ? '📝' : '📄'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 dark:text-white truncate">
                        {entry.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {entry.type === 'file' && formatSize(entry.size)}
                        {entry.modified && ` • ${formatDate(entry.modified)}`}
                      </div>
                    </div>
                    {entry.type === 'directory' && (
                      <span className="text-gray-400">→</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* File content viewer */}
        <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
          {selectedFile ? (
            <>
              <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <h3 className="font-medium text-gray-900 dark:text-white">{selectedFile.name}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">{selectedFile.path}</p>
              </div>
              <div className="flex-1 p-4 overflow-auto">
                {selectedFile.name.endsWith('.md') ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {selectedFile.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <pre className="text-sm font-mono text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {selectedFile.content}
                  </pre>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-gray-500">
              Select a file to view its contents
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
