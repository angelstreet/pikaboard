import { useEffect, useState } from 'react';
import { useModel, RateLimitInfo } from '../hooks/useModel';

interface RateLimitIndicatorProps {
  variant?: 'badge' | 'banner' | 'compact';
  showWhenClear?: boolean;
}

export default function RateLimitIndicator({ 
  variant = 'badge',
  showWhenClear = false 
}: RateLimitIndicatorProps) {
  const { status, currentModel } = useModel();
  const [dismissed, setDismissed] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const rateLimit = status?.rateLimit;

  // Handle countdown for retry-after
  useEffect(() => {
    if (rateLimit?.retryAfter && rateLimit.limited) {
      setCountdown(rateLimit.retryAfter);
      const interval = setInterval(() => {
        setCountdown(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setCountdown(null);
    }
  }, [rateLimit]);

  // Reset dismissed state when rate limit changes
  useEffect(() => {
    if (rateLimit?.limited) {
      setDismissed(false);
    }
  }, [rateLimit?.limited]);

  // Format countdown time
  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  // Get provider display name
  const getProviderName = (provider?: string): string => {
    if (!provider) return 'Provider';
    const names: Record<string, string> = {
      'anthropic': 'Anthropic',
      'openai-codex': 'OpenAI',
      'openrouter': 'OpenRouter',
    };
    return names[provider] || provider;
  };

  // Get model display name
  const getModelName = (model?: string, provider?: string): string => {
    if (model) return model;
    if (provider === 'anthropic') return 'Claude Opus';
    if (provider === 'openai-codex') return 'Codex';
    return currentModel === 'opus' ? 'Claude Opus' : 'Codex';
  };

  // If no rate limit and showWhenClear is false, don't render
  if (!rateLimit?.limited && !showWhenClear) {
    return null;
  }

  // If dismissed, don't render
  if (dismissed) {
    return null;
  }

  // Compact variant - just a small indicator dot
  if (variant === 'compact') {
    if (!rateLimit?.limited) {
      return (
        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400" title="No rate limits detected">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="hidden sm:inline">API OK</span>
        </div>
      );
    }

    return (
      <div 
        className="flex items-center gap-1 text-xs text-yellow-700 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 px-2 py-0.5 rounded-full cursor-help"
        title={rateLimit.message || `${getProviderName(rateLimit.provider)} rate limit active`}
      >
        <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
        <span>Limited</span>
        {countdown !== null && (
          <span className="font-mono">({formatTime(countdown)})</span>
        )}
      </div>
    );
  }

  // Banner variant - full-width alert
  if (variant === 'banner') {
    if (!rateLimit?.limited) {
      return (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-4 py-2 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-sm text-green-800 dark:text-green-300">All systems operational</span>
        </div>
      );
    }

    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="text-xl">⚠️</div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-yellow-900 dark:text-yellow-100">
                Rate Limit Active
              </span>
              <span className="px-2 py-0.5 bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 text-xs rounded-full">
                {getProviderName(rateLimit.provider)}
              </span>
            </div>
            <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
              {rateLimit.message || 
                `${getModelName(rateLimit.model, rateLimit.provider)} is currently rate-limited. ` +
                `The system will automatically use fallback models.`
              }
            </p>
            {countdown !== null && (
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                Retry after: <span className="font-mono font-medium">{formatTime(countdown)}</span>
              </p>
            )}
          </div>
          <button 
            onClick={() => setDismissed(true)}
            className="text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-200"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  // Badge variant (default) - small pill/badge style
  if (!rateLimit?.limited) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
        <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
        API Healthy
      </span>
    );
  }

  return (
    <span 
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 cursor-help"
      title={rateLimit.message || `${getProviderName(rateLimit.provider)} rate limit detected`}
    >
      <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
      <span>Rate Limited</span>
      {rateLimit.provider && (
        <span className="opacity-75">• {getProviderName(rateLimit.provider)}</span>
      )}
      {countdown !== null && (
        <span className="font-mono">({formatTime(countdown)})</span>
      )}
    </span>
  );
}

// Hook to detect rate limits from API responses
export function useRateLimitDetection() {
  const [rateLimit, setRateLimit] = useState<RateLimitInfo | null>(null);

  // This would be integrated with the API client to detect rate limits from responses
  // For now, it's a placeholder that returns the current state
  const detectRateLimit = (response: Response): RateLimitInfo | null => {
    // Check for 429 status
    if (response.status === 429) {
      const retryAfter = response.headers.get('retry-after');
      const provider = response.headers.get('x-provider') || 'unknown';
      
      return {
        limited: true,
        provider,
        retryAfter: retryAfter ? parseInt(retryAfter, 10) : undefined,
        message: `Rate limit exceeded for ${provider}`,
      };
    }

    // Check for rate limit headers even on successful requests (preemptive detection)
    const rateLimitRemaining = response.headers.get('x-ratelimit-remaining');
    if (rateLimitRemaining && parseInt(rateLimitRemaining, 10) < 5) {
      return {
        limited: false, // Not yet limited, but close
        provider: response.headers.get('x-provider') || 'unknown',
        message: 'Approaching rate limit',
      };
    }

    return null;
  };

  return { rateLimit, detectRateLimit, setRateLimit };
}
