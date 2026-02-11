import { useState } from 'react';
import { useModel, ModelKey } from '../hooks/useModel';

interface ModelToggleProps {
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'compact' | 'pill';
}

const MODEL_CONFIG: Record<ModelKey, {
  label: string;
  shortLabel: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  opus: {
    label: 'Claude Opus',
    shortLabel: 'Claude',
    icon: '🧠',
    color: 'text-purple-700 dark:text-purple-300',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    borderColor: 'border-purple-300 dark:border-purple-700',
  },
  codex: {
    label: 'GPT Codex',
    shortLabel: 'Codex',
    icon: '💻',
    color: 'text-blue-700 dark:text-blue-300',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    borderColor: 'border-blue-300 dark:border-blue-700',
  },
};

export default function ModelToggle({
  size = 'md',
  variant = 'default'
}: ModelToggleProps) {
  const { currentModel, switchToModel, loading, config } = useModel();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleSwitch = async (model: ModelKey) => {
    if (model === currentModel || loading) return;
    
    try {
      await switchToModel(model);
      setIsDropdownOpen(false);
    } catch {
      // Error is handled by the hook
    }
  };

  const currentConfig = MODEL_CONFIG[currentModel];
  const otherModel = currentModel === 'opus' ? 'codex' : 'opus';
  const otherConfig = MODEL_CONFIG[otherModel];

  // Size configurations
  const sizeClasses = {
    sm: {
      button: 'px-2 py-1 text-xs',
      icon: 'text-sm',
      dropdown: 'w-48',
    },
    md: {
      button: 'px-3 py-1.5 text-sm',
      icon: 'text-base',
      dropdown: 'w-56',
    },
    lg: {
      button: 'px-4 py-2 text-base',
      icon: 'text-lg',
      dropdown: 'w-64',
    },
  };

  const classes = sizeClasses[size];

  // Variant styles
  if (variant === 'pill') {
    return (
      <div className="relative">
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          disabled={loading}
          className={`
            inline-flex items-center gap-2 rounded-full border transition-all
            ${currentConfig.bgColor}
            ${currentConfig.borderColor}
            ${currentConfig.color}
            ${classes.button}
            ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80 cursor-pointer'}
          `}
          title={`Current: ${currentConfig.label}. Click to switch`}
        >
          <span className="font-medium">{currentConfig.shortLabel}</span>
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
              
              {/* Current model */}
              <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700/50">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {config?.models?.[currentModel]?.name || currentConfig.label}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Currently active</div>
                  </div>
                  <span className="text-xs text-green-600 dark:text-green-400 font-medium">✓</span>
                </div>
              </div>

              {/* Other model option */}
              <button
                onClick={() => handleSwitch(otherModel)}
                disabled={loading}
                className="w-full px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {config?.models?.[otherModel]?.name || otherConfig.label}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {otherModel === 'opus' ? 'More capable, higher cost' : 'Optimized for coding'}
                    </div>
                  </div>
                </div>
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  // Default/compact variant - Simple toggle button
  return (
    <div className="relative">
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        disabled={loading}
        className={`
          inline-flex items-center gap-2 rounded-lg border transition-all
          ${currentConfig.bgColor}
          ${currentConfig.borderColor}
          ${currentConfig.color}
          ${classes.button}
          ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80 cursor-pointer'}
        `}
        title={`Current: ${currentConfig.label}. Click to switch to ${otherConfig.label}`}
      >
        <span className="font-medium">{variant === 'compact' ? currentConfig.shortLabel : currentConfig.label}</span>
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
            
            {(['opus', 'codex'] as ModelKey[]).map((model) => {
              const modelConfig = MODEL_CONFIG[model];
              const isActive = model === currentModel;
              return (
                <button
                  key={model}
                  onClick={() => handleSwitch(model)}
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
                      {config?.models?.[model]?.name || modelConfig.label}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {config?.models?.[model]?.description || (model === 'opus' ? 'Claude Opus' : 'OpenAI GPT Codex')}
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
