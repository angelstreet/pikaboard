import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

export type ModelKey = 'opus' | 'codex';

export interface ModelInfo {
  id: string;
  alias: string;
  name: string;
  provider: string;
  description: string;
}

export interface ModelConfig {
  current: ModelKey;
  models: Record<ModelKey, ModelInfo>;
  config: {
    primary: string;
    fallbacks: string[];
  };
}

export interface RateLimitInfo {
  limited: boolean;
  provider?: string;
  model?: string;
  retryAfter?: number;
  message?: string;
}

export interface ModelStatus {
  current: ModelKey;
  model: ModelInfo;
  rateLimit: RateLimitInfo | null;
  timestamp: string;
}

// API functions
export async function getModelConfig(): Promise<ModelConfig> {
  return api.get<ModelConfig>('/model');
}

export async function switchModel(model: ModelKey): Promise<{
  success: boolean;
  previous: ModelKey;
  current: ModelKey;
  model: ModelInfo;
  message: string;
}> {
  return api.post('/model/switch', { model });
}

export async function getModelStatus(): Promise<ModelStatus> {
  return api.get<ModelStatus>('/model/status');
}

// Hook for model management
export function useModel() {
  const [config, setConfig] = useState<ModelConfig | null>(null);
  const [status, setStatus] = useState<ModelStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    try {
      const data = await getModelConfig();
      setConfig(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch model config');
    }
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      const data = await getModelStatus();
      setStatus(data);
      setError(null);
    } catch (err) {
      // Don't set error for status fetch - it's not critical
      console.error('Failed to fetch model status:', err);
    }
  }, []);

  const switchToModel = useCallback(async (model: ModelKey) => {
    setLoading(true);
    try {
      const result = await switchModel(model);
      await fetchConfig();
      await fetchStatus();
      setError(null);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to switch model';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchConfig, fetchStatus]);

  // Initial fetch
  useEffect(() => {
    fetchConfig();
    fetchStatus();
  }, [fetchConfig, fetchStatus]);

  // Poll status every 30 seconds for rate limit updates
  useEffect(() => {
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  return {
    config,
    status,
    loading,
    error,
    currentModel: config?.current || 'opus',
    switchToModel,
    refresh: fetchConfig,
  };
}
