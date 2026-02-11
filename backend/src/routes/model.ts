import { Hono } from 'hono';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

export const modelRouter = new Hono();

const OPENCLAW_CONFIG_PATH = join(homedir(), '.openclaw', 'openclaw.json');

// Model definitions
export const MODELS = {
  opus: {
    id: 'anthropic/claude-opus-4-6',
    alias: 'opus',
    name: 'Opus 4.6',
    provider: 'anthropic',
    description: 'Claude Opus 4.6 - Most capable model for complex tasks',
  },
  codex: {
    id: 'openai-codex/gpt-5.3-codex',
    alias: 'codex',
    name: 'Codex',
    provider: 'openai-codex',
    description: 'OpenAI Codex - GPT-5.3 optimized for coding',
  },
} as const;

export type ModelKey = keyof typeof MODELS;

interface OpenClawConfig {
  agents?: {
    defaults?: {
      model?: {
        primary?: string;
        fallbacks?: string[];
      };
    };
    list?: Array<{
      id: string;
      model?: {
        primary?: string;
        fallbacks?: string[];
      };
    }>;
  };
}

// Read the OpenClaw config file
function readConfig(): OpenClawConfig | null {
  try {
    const content = readFileSync(OPENCLAW_CONFIG_PATH, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Failed to read OpenClaw config:', error);
    return null;
  }
}

// Write the OpenClaw config file
function writeConfig(config: OpenClawConfig): boolean {
  try {
    writeFileSync(OPENCLAW_CONFIG_PATH, JSON.stringify(config, null, 2));
    return true;
  } catch (error) {
    console.error('Failed to write OpenClaw config:', error);
    return false;
  }
}

// Get the current primary model for the main agent
function getCurrentModel(config: OpenClawConfig | null): ModelKey {
  if (!config?.agents?.defaults?.model?.primary) {
    return 'opus';
  }
  
  const primary = config.agents.defaults.model.primary;
  
  // Check if it matches any known model
  if (primary.includes('opus') || primary === MODELS.opus.id) {
    return 'opus';
  }
  if (primary.includes('codex') || primary === MODELS.codex.id) {
    return 'codex';
  }
  
  // Default to opus if unknown
  return 'opus';
}

// GET /api/model - Get current model configuration
modelRouter.get('/', (c) => {
  const config = readConfig();
  const currentModel = getCurrentModel(config);
  
  return c.json({
    current: currentModel,
    models: MODELS,
    config: {
      primary: config?.agents?.defaults?.model?.primary || MODELS.opus.id,
      fallbacks: config?.agents?.defaults?.model?.fallbacks || [],
    },
  });
});

// POST /api/model/switch - Switch between Opus and Codex
modelRouter.post('/switch', async (c) => {
  const body = await c.req.json<{ model?: ModelKey }>();
  const targetModel = body?.model;
  
  if (!targetModel || !(targetModel in MODELS)) {
    return c.json({ error: 'Invalid model. Use "opus" or "codex"' }, 400);
  }
  
  const config = readConfig();
  if (!config) {
    return c.json({ error: 'Failed to read configuration' }, 500);
  }
  
  // Ensure agents.defaults exists
  if (!config.agents) {
    config.agents = {};
  }
  if (!config.agents.defaults) {
    config.agents.defaults = {};
  }
  if (!config.agents.defaults.model) {
    config.agents.defaults.model = {};
  }
  
  const newModelId = MODELS[targetModel].id;
  const oldModel = getCurrentModel(config);
  
  // Update the primary model
  config.agents.defaults.model.primary = newModelId;
  
  // Update fallbacks to include the other model
  const otherModel = targetModel === 'opus' ? MODELS.codex.id : MODELS.opus.id;
  const currentFallbacks = config.agents.defaults.model.fallbacks || [];
  
  // Remove the new primary from fallbacks and add the other model
  config.agents.defaults.model.fallbacks = [
    otherModel,
    ...currentFallbacks.filter(m => m !== newModelId && m !== otherModel),
  ].slice(0, 3); // Keep max 3 fallbacks
  
  // Also update the main agent (Pika) if it exists
  if (config.agents.list) {
    const mainAgent = config.agents.list.find(a => a.id === 'main');
    if (mainAgent) {
      if (!mainAgent.model) {
        mainAgent.model = {};
      }
      mainAgent.model.primary = newModelId;
      mainAgent.model.fallbacks = config.agents.defaults.model.fallbacks;
    }
  }
  
  if (!writeConfig(config)) {
    return c.json({ error: 'Failed to save configuration' }, 500);
  }
  
  return c.json({
    success: true,
    previous: oldModel,
    current: targetModel,
    model: MODELS[targetModel],
    message: `Switched primary model from ${MODELS[oldModel].name} to ${MODELS[targetModel].name}`,
  });
});

// GET /api/model/status - Get model status including rate limit info
modelRouter.get('/status', async (c) => {
  const config = readConfig();
  const currentModel = getCurrentModel(config);
  
  // Check for rate limit info from session files
  // This is a simplified check - in production you'd want more robust detection
  const rateLimitInfo = await checkRateLimitStatus();
  
  return c.json({
    current: currentModel,
    model: MODELS[currentModel],
    rateLimit: rateLimitInfo,
    timestamp: new Date().toISOString(),
  });
});

// Check rate limit status by looking at recent session errors
async function checkRateLimitStatus(): Promise<{
  limited: boolean;
  provider?: string;
  model?: string;
  retryAfter?: number;
  message?: string;
} | null> {
  try {
    // Look for rate limit indicators in recent sessions
    // This is a placeholder - real implementation would check:
    // 1. Session error logs for 429 errors
    // 2. Provider-specific rate limit headers
    // 3. Gateway rate limit state
    
    // For now, return null (no rate limit detected)
    // The frontend will handle this gracefully
    return null;
  } catch {
    return null;
  }
}

export default modelRouter;
