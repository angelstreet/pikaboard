import { useState, useEffect } from 'react';
import SystemStats from '../components/SystemStats';
import ServiceHealth from '../components/ServiceHealth';
import { api, WorkspaceConfig } from '../api/client';

const getToken = (): string => {
  return localStorage.getItem('pikaboard_token') || '';
};

function ConfigRow({ label, value, mono = false }: { label: string; value: string | number; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
      <span className={`text-sm text-gray-900 dark:text-white ${mono ? 'font-mono bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded' : ''}`}>
        {value}
      </span>
    </div>
  );
}

function TokenDisplay({ masked }: { masked: string }) {
  const [copied, setCopied] = useState(false);
  const fullToken = getToken();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <code className="text-sm font-mono bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-gray-800 dark:text-gray-200">
        {masked}
      </code>
      <button
        onClick={handleCopy}
        className="text-xs px-2 py-1 rounded bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 transition-colors"
        title="Copy full token to clipboard"
      >
        {copied ? '✓ Copied' : '📋 Copy'}
      </button>
    </div>
  );
}

export default function Settings() {
  const cachedConfig = api.getCached<WorkspaceConfig>('/config');
  const [config, setConfig] = useState<WorkspaceConfig | null>(cachedConfig);
  const [loading, setLoading] = useState(!cachedConfig);
  const [error, setError] = useState<string | null>(null);
  const [configExpanded, setConfigExpanded] = useState(true);
  const [prefsExpanded, setPrefsExpanded] = useState(true);
  const [quotesEnabled, setQuotesEnabled] = useState(() => {
    try { return localStorage.getItem('pikaboard_quotes_enabled') === 'true'; }
    catch { return false; }
  });
  const [quotesDuration, setQuotesDuration] = useState(() => {
    try { return parseInt(localStorage.getItem('pikaboard_quotes_duration') || '8', 10); }
    catch { return 8; }
  });
  const [quotesFrequency, setQuotesFrequency] = useState(() => {
    try { return parseInt(localStorage.getItem('pikaboard_quotes_frequency') || '45', 10); }
    catch { return 45; }
  });

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        if (!config) setLoading(true);
        const data = await api.getConfig();
        setConfig(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load config');
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">⚙️ Settings</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-1">System configuration and monitoring</p>
      </div>

      {/* Service Health Dashboard */}
      <ServiceHealth />

      {/* System Monitoring */}
      <SystemStats />

      {/* Workspace Configuration */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <button
          onClick={() => setConfigExpanded(!configExpanded)}
          className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${configExpanded ? 'border-b border-gray-200 dark:border-gray-700' : ''}`}
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            📁 Workspace Configuration
            <span className="text-xs font-normal text-gray-500 dark:text-gray-400">(read-only)</span>
          </h3>
          <span className={`text-gray-400 transition-transform ${configExpanded ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </button>

        {configExpanded && (
          <>
            {loading ? (
              <div className="p-4">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                </div>
              </div>
            ) : error ? (
              <div className="p-4 text-red-500 dark:text-red-400 flex items-center gap-2">
                <span>⚠️</span>
                <span className="text-sm">{error}</span>
              </div>
            ) : config ? (
              <div className="p-4 space-y-4">
                {/* Workspace */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Workspace</h4>
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                    <ConfigRow label="Path" value={config.workspace.path} mono />
                    <ConfigRow
                      label="Status"
                      value={config.workspace.exists ? '✓ Exists' : '✗ Missing'}
                    />
                  </div>
                </div>

                {/* API */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">API</h4>
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                    <ConfigRow label="Base URL" value={config.api.baseUrl} mono />
                    <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Token</span>
                      <TokenDisplay masked={config.api.tokenMasked} />
                    </div>
                  </div>
                </div>

                {/* Gateway */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">OpenClaw Gateway</h4>
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                    <ConfigRow label="URL" value={config.gateway.url} mono />
                  </div>
                </div>

                {/* Environment */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Environment</h4>
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                    <ConfigRow label="Node Environment" value={config.environment.nodeEnv} />
                    <ConfigRow label="Platform" value={config.environment.platform} />
                    <ConfigRow label="Hostname" value={config.environment.hostname} mono />
                    <ConfigRow label="User" value={config.environment.user} />
                  </div>
                </div>

                {/* PikaBoard */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">PikaBoard</h4>
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                    <ConfigRow label="Version" value={`v${config.pikaboard.version}`} />
                    <ConfigRow label="Port" value={config.pikaboard.port} mono />
                  </div>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>

      {/* Preferences */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <button
          onClick={() => setPrefsExpanded(!prefsExpanded)}
          className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${prefsExpanded ? 'border-b border-gray-200 dark:border-gray-700' : ''}`}
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            🎨 Preferences
          </h3>
          <span className={`text-gray-400 transition-transform ${prefsExpanded ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </button>
        {prefsExpanded && (
          <div className="p-4 space-y-4">
            {/* Quotes toggle */}
            <div className="flex items-center justify-between py-2">
              <div>
                <span className="text-sm text-gray-900 dark:text-white">Inspirational Quotes</span>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Show floating quotes periodically</p>
              </div>
              <button
                onClick={() => {
                  const next = !quotesEnabled;
                  setQuotesEnabled(next);
                  localStorage.setItem('pikaboard_quotes_enabled', String(next));
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${quotesEnabled ? 'bg-pika-600' : 'bg-gray-300 dark:bg-gray-600'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${quotesEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            {/* Quotes duration & frequency (only when enabled) */}
            {quotesEnabled && (
              <div className="space-y-3 pl-1 border-l-2 border-pika-200 dark:border-pika-800 ml-1">
                <div className="flex items-center justify-between pl-3">
                  <div>
                    <span className="text-sm text-gray-900 dark:text-white">Display Duration</span>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">How long each quote stays visible</p>
                  </div>
                  <select
                    value={quotesDuration}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setQuotesDuration(val);
                      localStorage.setItem('pikaboard_quotes_duration', String(val));
                    }}
                    className="text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-1.5 focus:ring-2 focus:ring-pika-500 focus:border-pika-500"
                  >
                    <option value={5}>5 seconds</option>
                    <option value={8}>8 seconds</option>
                    <option value={12}>12 seconds</option>
                    <option value={15}>15 seconds</option>
                  </select>
                </div>
                <div className="flex items-center justify-between pl-3">
                  <div>
                    <span className="text-sm text-gray-900 dark:text-white">Frequency</span>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">How often a new quote appears</p>
                  </div>
                  <select
                    value={quotesFrequency}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setQuotesFrequency(val);
                      localStorage.setItem('pikaboard_quotes_frequency', String(val));
                    }}
                    className="text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-1.5 focus:ring-2 focus:ring-pika-500 focus:border-pika-500"
                  >
                    <option value={30}>Every 30s</option>
                    <option value={45}>Every 45s</option>
                    <option value={60}>Every 1 min</option>
                    <option value={90}>Every 1.5 min</option>
                    <option value={120}>Every 2 min</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
