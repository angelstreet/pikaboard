import { useMemo, useState } from 'react';
import { useModel, ModelKey, ModelInfo } from '../hooks/useModel';

interface ModelToggleProps {
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'compact' | 'pill';
}

type StyleConfig = {
  color: string;
  bgColor: string;
  borderColor: string;
};

const PROVIDER_STYLES: Record<string, StyleConfig> = {
  anthropic: {
    color: 'text-purple-700 dark:text-purple-300',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    borderColor: 'border-purple-300 dark:border-purple-700',
  },
  'openai-codex': {
    color: 'text-blue-700 dark:text-blue-300',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    borderColor: 'border-blue-300 dark:border-blue-700',
  },
  openrouter: {
    color: 'text-emerald-700 dark:text-emerald-300',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    borderColor: 'border-emerald-300 dark:border-emerald-700',
  },
  default: {
    color: 'text-gray-700 dark:text-gray-300',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    borderColor: 'border-gray-300 dark:border-gray-700',
  },
};

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function shortName(name: string): string {
  const firstWord = name.split(' ')[0];
  return firstWord || name;
}

function displayLabel(model?: ModelInfo): string {
  if (!model) return 'model';
  return model.alias || shortName(model.name);
}

function getStyle(model?: ModelInfo): StyleConfig {
  if (!model) return PROVIDER_STYLES.default;
  return PROVIDER_STYLES[model.provider] || PROVIDER_STYLES.default;
}

export default function ModelToggle({
  size = 'md',
  variant = 'default',
}: ModelToggleProps) {
  const { currentModel, switchToModel, loading, config } = useModel();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const modelIds = useMemo(() => {
    const fromChain = unique([
      config?.config?.primary || '',
      ...(config?.config?.fallbacks || []),
    ]);

    if (fromChain.length > 0) {
      return fromChain;
    }

    return unique([
      'anthropic/claude-opus-4-6',
      'openai-codex/gpt-5.3-codex',
    ]);
  }, [config]);

  const currentModelId = currentModel || modelIds[0];

  const getModelInfo = (modelId: string): ModelInfo => {
    const fromConfig = config?.models?.[modelId];
    if (fromConfig) return fromConfig;

    return {
      id: modelId,
      alias: modelId.split('/').pop() || 'model',
      name: modelId,
      provider: modelId.split('/')[0] || 'unknown',
      description: modelId,
    };
  };

  const currentInfo = getModelInfo(currentModelId);
  const currentStyle = getStyle(currentInfo);

  const handleSwitch = async (model: ModelKey) => {
    if (model === currentModelId || loading) return;

    try {
      await switchToModel(model);
      setIsDropdownOpen(false);
    } catch {
      // Error is handled by the hook
    }
  };

  const sizeClasses = {
    sm: {
      button: 'px-2 py-1 text-xs',
      dropdown: 'w-56',
    },
    md: {
      button: 'px-3 py-1.5 text-sm',
      dropdown: 'w-64',
    },
    lg: {
      button: 'px-4 py-2 text-base',
      dropdown: 'w-72',
    },
  };

  const classes = sizeClasses[size];

  if (variant === 'pill') {
    return (
      <div className="relative">
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          disabled={loading}
          className={`
            inline-flex items-center gap-2 rounded-full border transition-all
            ${currentStyle.bgColor}
            ${currentStyle.borderColor}
            ${currentStyle.color}
            ${classes.button}
            ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80 cursor-pointer'}
          `}
          title={`Current: ${displayLabel(currentInfo)}. Click to switch`}
        >
          <span className="font-medium">{displayLabel(currentInfo)}</span>
          <svg className={`w-3 h-3 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isDropdownOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsDropdownOpen(false)}
            />
            <div className={`absolute right-0 mt-2 ${classes.dropdown} bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 py-1`}>
              <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Switch Model</span>
              </div>

              {modelIds.map((modelId) => {
                const info = getModelInfo(modelId);
                const isActive = modelId === currentModelId;

                return (
                  <button
                    key={modelId}
                    onClick={() => handleSwitch(modelId)}
                    disabled={loading || isActive}
                    className={`
                      w-full px-3 py-2 transition-colors text-left flex items-center gap-2
                      ${isActive
                        ? 'bg-gray-50 dark:bg-gray-700/50 cursor-default'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                      }
                    `}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {displayLabel(info)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {info.id}
                        </div>
                      </div>
                      {isActive && (
                      <span className="text-xs text-green-600 dark:text-green-400 font-medium">✓</span>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        disabled={loading}
        className={`
          inline-flex items-center gap-2 rounded-lg border transition-all
          ${currentStyle.bgColor}
          ${currentStyle.borderColor}
          ${currentStyle.color}
          ${classes.button}
          ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80 cursor-pointer'}
        `}
        title={`Current: ${displayLabel(currentInfo)}. Click to switch model`}
      >
        <span className="font-medium">{displayLabel(currentInfo)}</span>
        {loading && (
          <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
      </button>

      {isDropdownOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsDropdownOpen(false)}
          />
          <div className={`absolute right-0 mt-2 ${classes.dropdown} bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 py-1`}>
            <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Switch Model</span>
            </div>

            {modelIds.map((modelId) => {
              const info = getModelInfo(modelId);
              const isActive = modelId === currentModelId;

              return (
                <button
                  key={modelId}
                  onClick={() => handleSwitch(modelId)}
                  disabled={loading || isActive}
                  className={`
                    w-full px-3 py-2 transition-colors text-left flex items-center gap-2
                    ${isActive
                      ? 'bg-gray-50 dark:bg-gray-700/50 cursor-default'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                    }
                  `}
                >
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {displayLabel(info)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {info.id}
                    </div>
                  </div>
                  {isActive && (
                    <span className="text-xs text-green-600 dark:text-green-400 font-medium">✓ Active</span>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
