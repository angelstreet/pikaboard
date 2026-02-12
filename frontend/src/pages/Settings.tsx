import { useState, useEffect } from 'react';
import SystemStats from '../components/SystemStats';
import ServiceHealth from '../components/ServiceHealth';
import ModelToggle from '../components/ModelToggle';
import RateLimitIndicator from '../components/RateLimitIndicator';
import { useModel } from '../hooks/useModel';
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

// Model Settings Component
function ModelSettings() {
  const { config, loading, error, currentModel, switchToModel } = useModel();
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${expanded ? 'border-b border-gray-200 dark:border-gray-700' : ''}`}
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          🤖 Model Configuration
        </h3>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Current: <span className="font-medium text-gray-700 dark:text-gray-300">{config?.models?.[currentModel]?.name || currentModel}</span>
          </span>
          <span className={`text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </div>
      </button>

      {expanded && (
        <div className="p-4 space-y-4">
          {/* Rate Limit Banner */}
          <RateLimitIndicator variant="banner" showWhenClear />

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
              ⚠️ {error}
            </div>
          )}

          {/* Current Model Display */}
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Primary Model</h4>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{currentModel === 'opus' ? '🧠' : '💻'}</span>
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {config?.models?.[currentModel]?.name || (currentModel === 'opus' ? 'Opus 4.6' : 'Codex')}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {config?.models?.[currentModel]?.provider || 'anthropic'}
                    </div>
                  </div>
                </div>
              </div>
              <ModelToggle showLabel size="md" variant="default" />
            </div>
          </div>

          {/* Model Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Opus Option */}
            <button
              onClick={() => switchToModel('opus')}
              disabled={loading || currentModel === 'opus'}
              className={`p-4 rounded-lg border-2 text-left transition-all ${
                currentModel === 'opus'
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700'
              } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">🧠</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900 dark:text-white">Opus 4.6</span>
                    {currentModel === 'opus' && (
                      <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Claude Opus 4.6 - Most capable model for complex reasoning and analysis
                  </p>
                  <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                    Provider: Anthropic
                  </p>
                </div>
              </div>
            </button>

            {/* Codex Option */}
            <button
              onClick={() => switchToModel('codex')}
              disabled={loading || currentModel === 'codex'}
              className={`p-4 rounded-lg border-2 text-left transition-all ${
                currentModel === 'codex'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
              } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">💻</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900 dark:text-white">Codex</span>
                    {currentModel === 'codex' && (
                      <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    OpenAI GPT-5.3 Codex - Optimized for coding tasks and development
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    Provider: OpenAI
                  </p>
                </div>
              </div>
            </button>
          </div>

          {/* Implementation Notes */}
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Implementation Notes</h4>
            <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
              <p>
                <strong className="text-gray-700 dark:text-gray-300">Model Configuration:</strong> The primary model is stored in <code className="bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded">openclaw.json</code> under <code className="bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded">agents.defaults.model.primary</code>.
              </p>
              <p>
                <strong className="text-gray-700 dark:text-gray-300">Rate Limit Detection:</strong> Rate limits are detected via HTTP 429 responses from providers. The system checks for:
              </p>
              <ul className="list-disc list-inside ml-2 space-y-1">
                <li><code className="bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded">Retry-After</code> headers for cooldown timing</li>
                <li><code className="bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded">X-Provider</code> headers to identify the affected provider</li>
                <li>Automatic fallback to secondary models when primary is rate-limited</li>
              </ul>
              <p>
                <strong className="text-gray-700 dark:text-gray-300">Fallback Chain:</strong> When a model is rate-limited, the system automatically falls back through the configured fallback models in order.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Settings() {
  const cachedConfig = api.getCached<WorkspaceConfig>('/config');
  const [config, setConfig] = useState<WorkspaceConfig | null>(cachedConfig);
  const [loading, setLoading] = useState(!cachedConfig);
  const [error, setError] = useState<string | null>(null);
  const [configExpanded, setConfigExpanded] = useState(false);
  const [prefsExpanded, setPrefsExpanded] = useState(false);
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
  const [quotesFontSize, setQuotesFontSize] = useState<'small' | 'medium' | 'large'>(() => {
    try {
      const saved = localStorage.getItem('pikaboard_quotes_font_size');
      if (saved === 'medium' || saved === 'large' || saved === 'small') return saved;
      return 'small';
    } catch { return 'small'; }
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

      {/* Model Configuration */}
      <ModelSettings />

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
                  window.dispatchEvent(new CustomEvent('quotes-settings-changed'));
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
                      localStorage.setItem('pikaboard_quotes_duration', String(val)); window.dispatchEvent(new CustomEvent('quotes-settings-changed'));
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
                      localStorage.setItem('pikaboard_quotes_frequency', String(val)); window.dispatchEvent(new CustomEvent('quotes-settings-changed'));
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
                <div className="flex items-center justify-between pl-3">
                  <div>
                    <span className="text-sm text-gray-900 dark:text-white">Font Size</span>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Quote text size</p>
                  </div>
                  <select
                    value={quotesFontSize}
                    onChange={(e) => {
                      const val = e.target.value as 'small' | 'medium' | 'large';
                      setQuotesFontSize(val);
                      localStorage.setItem('pikaboard_quotes_font_size', val);
                      window.dispatchEvent(new CustomEvent('quotes-settings-changed'));
                    }}
                    className="text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-1.5 focus:ring-2 focus:ring-pika-500 focus:border-pika-500"
                  >
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
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
