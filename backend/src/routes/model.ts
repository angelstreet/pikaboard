import { Hono } from 'hono';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

export const modelRouter = new Hono();

const OPENCLAW_CONFIG_PATH = join(homedir(), '.openclaw', 'openclaw.json');

// Built-in model definitions used as safe defaults
const BUILTIN_MODELS = {
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

export type BuiltinModelKey = keyof typeof BUILTIN_MODELS;

export interface ModelInfo {
  id: string;
  alias: string;
  name: string;
  provider: string;
  description: string;
}

interface ProviderModel {
  id: string;
  name?: string;
}

interface OpenClawConfig {
  models?: {
    providers?: Record<string, {
      models?: ProviderModel[];
    }>;
  };
  agents?: {
    defaults?: {
      model?: {
        primary?: string;
        fallbacks?: string[];
      };
      models?: Record<string, {
        alias?: string;
      }>;
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

interface ModelChain {
  primary: string;
  fallbacks: string[];
  source: 'main' | 'defaults' | 'builtin';
}

function readConfig(): OpenClawConfig | null {
  try {
    const content = readFileSync(OPENCLAW_CONFIG_PATH, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Failed to read OpenClaw config:', error);
    return null;
  }
}

function writeConfig(config: OpenClawConfig): boolean {
  try {
    writeFileSync(OPENCLAW_CONFIG_PATH, JSON.stringify(config, null, 2));
    return true;
  } catch (error) {
    console.error('Failed to write OpenClaw config:', error);
    return false;
  }
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function toTitleCase(value: string): string {
  return value
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function humanizeModelId(modelId: string): string {
  const parts = modelId.split('/');
  const tail = parts[parts.length - 1] || modelId;
  return toTitleCase(tail);
}

function inferProvider(modelId: string): string {
  const parts = modelId.split('/');
  return parts[0] || 'unknown';
}

function getAliasMap(config: OpenClawConfig | null): Record<string, string> {
  const configured = config?.agents?.defaults?.models || {};
  const aliases: Record<string, string> = {};

  for (const [modelId, def] of Object.entries(configured)) {
    if (def?.alias) {
      aliases[modelId] = def.alias;
    }
  }

  aliases[BUILTIN_MODELS.opus.id] ||= BUILTIN_MODELS.opus.alias;
  aliases[BUILTIN_MODELS.codex.id] ||= BUILTIN_MODELS.codex.alias;

  return aliases;
}

function getMainModelChain(config: OpenClawConfig | null): ModelChain {
  const mainAgent = config?.agents?.list?.find(agent => agent.id === 'main');
  if (mainAgent?.model?.primary) {
    return {
      primary: mainAgent.model.primary,
      fallbacks: unique(mainAgent.model.fallbacks || []),
      source: 'main',
    };
  }

  const defaults = config?.agents?.defaults?.model;
  if (defaults?.primary) {
    return {
      primary: defaults.primary,
      fallbacks: unique(defaults.fallbacks || []),
      source: 'defaults',
    };
  }

  return {
    primary: BUILTIN_MODELS.opus.id,
    fallbacks: [BUILTIN_MODELS.codex.id],
    source: 'builtin',
  };
}

function buildModelRegistry(config: OpenClawConfig | null): Record<string, ModelInfo> {
  const aliasMap = getAliasMap(config);
  const registry: Record<string, ModelInfo> = {};

  const upsert = (id: string, partial: Partial<ModelInfo> = {}) => {
    const existing = registry[id];
    registry[id] = {
      id,
      alias: partial.alias || existing?.alias || aliasMap[id] || id.split('/').pop() || 'model',
      name: partial.name || existing?.name || humanizeModelId(id),
      provider: partial.provider || existing?.provider || inferProvider(id),
      description: partial.description || existing?.description || `${humanizeModelId(id)} (${inferProvider(id)})`,
    };
  };

  for (const model of Object.values(BUILTIN_MODELS)) {
    upsert(model.id, model);
  }

  const configuredAliases = config?.agents?.defaults?.models || {};
  for (const [modelId, def] of Object.entries(configuredAliases)) {
    upsert(modelId, {
      alias: def.alias,
      provider: inferProvider(modelId),
      name: humanizeModelId(modelId),
    });
  }

  const providers = config?.models?.providers || {};
  for (const [providerKey, providerDef] of Object.entries(providers)) {
    for (const providerModel of providerDef.models || []) {
      const prefixed = `${providerKey}/${providerModel.id}`;
      upsert(prefixed, {
        name: providerModel.name || humanizeModelId(prefixed),
        provider: providerKey,
      });
      if (aliasMap[prefixed]) {
        upsert(prefixed, { alias: aliasMap[prefixed] });
      }
    }
  }

  return registry;
}

function resolveModelInfo(modelId: string, registry: Record<string, ModelInfo>, config: OpenClawConfig | null): ModelInfo {
  if (registry[modelId]) {
    return registry[modelId];
  }

  const alias = getAliasMap(config)[modelId] || modelId.split('/').pop() || 'model';
  return {
    id: modelId,
    alias,
    name: humanizeModelId(modelId),
    provider: inferProvider(modelId),
    description: `${humanizeModelId(modelId)} (${inferProvider(modelId)})`,
  };
}

function resolveTargetModelId(
  input: string,
  registry: Record<string, ModelInfo>,
  config: OpenClawConfig | null,
): string | null {
  const trimmed = input.trim();

  if ((trimmed as BuiltinModelKey) in BUILTIN_MODELS) {
    return BUILTIN_MODELS[trimmed as BuiltinModelKey].id;
  }

  if (registry[trimmed]) {
    return registry[trimmed].id;
  }

  const aliasMap = getAliasMap(config);
  for (const [modelId, alias] of Object.entries(aliasMap)) {
    if (alias.toLowerCase() === trimmed.toLowerCase()) {
      return modelId;
    }
  }

  for (const model of Object.values(registry)) {
    if (model.alias.toLowerCase() === trimmed.toLowerCase()) {
      return model.id;
    }
  }

  if (trimmed.includes('/')) {
    return trimmed;
  }

  return null;
}

// GET /api/model - Get current model configuration
modelRouter.get('/', (c) => {
  const config = readConfig();
  const chain = getMainModelChain(config);
  const registry = buildModelRegistry(config);
  const relevantIds = unique([chain.primary, ...chain.fallbacks]);

  // Return at least the relevant chain + built-ins to keep the UI usable.
  const models: Record<string, ModelInfo> = {};
  for (const modelId of unique([...relevantIds, BUILTIN_MODELS.opus.id, BUILTIN_MODELS.codex.id])) {
    models[modelId] = resolveModelInfo(modelId, registry, config);
  }

  return c.json({
    current: chain.primary,
    models,
    config: {
      primary: chain.primary,
      fallbacks: chain.fallbacks,
      source: chain.source,
    },
  });
});

// POST /api/model/switch - Switch to any configured model id/alias
modelRouter.post('/switch', async (c) => {
  const body = await c.req.json<{ model?: string }>();
  const requestedModel = body?.model;

  if (!requestedModel) {
    return c.json({ error: 'Invalid model. Provide a model alias or id.' }, 400);
  }

  const config = readConfig();
  if (!config) {
    return c.json({ error: 'Failed to read configuration' }, 500);
  }

  const registry = buildModelRegistry(config);
  const currentChain = getMainModelChain(config);
  const targetModelId = resolveTargetModelId(requestedModel, registry, config);

  if (!targetModelId) {
    return c.json({ error: `Unknown model: ${requestedModel}` }, 400);
  }

  // Ensure container objects
  config.agents ||= {};
  config.agents.defaults ||= {};
  config.agents.defaults.model ||= {};
  config.agents.list ||= [];

  let mainAgent = config.agents.list.find(agent => agent.id === 'main');
  if (!mainAgent) {
    mainAgent = { id: 'main', model: {} };
    config.agents.list.push(mainAgent);
  }
  mainAgent.model ||= {};

  const previousPrimary = currentChain.primary;
  const existingFallbacks = unique(currentChain.fallbacks);
  const nextFallbacks = unique([
    previousPrimary,
    ...existingFallbacks,
  ]).filter(modelId => modelId !== targetModelId).slice(0, 5);

  // Keep main and defaults aligned so older codepaths still behave.
  mainAgent.model.primary = targetModelId;
  mainAgent.model.fallbacks = nextFallbacks;
  config.agents.defaults.model.primary = targetModelId;
  config.agents.defaults.model.fallbacks = nextFallbacks;

  if (!writeConfig(config)) {
    return c.json({ error: 'Failed to save configuration' }, 500);
  }

  const updatedRegistry = buildModelRegistry(config);
  const previousInfo = resolveModelInfo(previousPrimary, updatedRegistry, config);
  const currentInfo = resolveModelInfo(targetModelId, updatedRegistry, config);

  return c.json({
    success: true,
    previous: previousPrimary,
    current: targetModelId,
    model: currentInfo,
    message: `Switched primary model from ${previousInfo.name} to ${currentInfo.name}`,
  });
});

// GET /api/model/status - Get model status including rate limit info
modelRouter.get('/status', async (c) => {
  const config = readConfig();
  const chain = getMainModelChain(config);
  const registry = buildModelRegistry(config);

  const rateLimitInfo = await checkRateLimitStatus();

  return c.json({
    current: chain.primary,
    model: resolveModelInfo(chain.primary, registry, config),
    rateLimit: rateLimitInfo,
    timestamp: new Date().toISOString(),
  });
});

async function checkRateLimitStatus(): Promise<{
  limited: boolean;
  provider?: string;
  model?: string;
  retryAfter?: number;
  message?: string;
} | null> {
  try {
    return null;
  } catch {
    return null;
  }
}

export default modelRouter;
