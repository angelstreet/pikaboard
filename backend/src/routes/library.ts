import { Hono } from 'hono';
import { readdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

export const libraryRouter = new Hono();

interface Skill {
  name: string;
  description?: string;
  version?: string;
  hasSkillMd: boolean;
}

interface Plugin {
  name: string;
  enabled: boolean;
  connected?: boolean;
  config?: Record<string, unknown>;
}

// GET /api/library/skills - List installed skills
libraryRouter.get('/skills', (c) => {
  const skillsPath = process.env.OPENCLAW_SKILLS_PATH || '/home/jndoye/.openclaw/workspace/skills';

  if (!existsSync(skillsPath)) {
    return c.json({ skills: [], warning: 'Skills directory not found' });
  }

  try {
    const entries = readdirSync(skillsPath, { withFileTypes: true });
    const skills: Skill[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.')) continue;

      const skillDir = join(skillsPath, entry.name);
      const skillMdPath = join(skillDir, 'SKILL.md');
      const packagePath = join(skillDir, 'package.json');

      const skill: Skill = {
        name: entry.name,
        hasSkillMd: existsSync(skillMdPath),
      };

      // Get version from package.json if exists
      if (existsSync(packagePath)) {
        try {
          const pkg = JSON.parse(readFileSync(packagePath, 'utf-8'));
          skill.version = pkg.version;
        } catch {
          // Ignore
        }
      }

      // Get description from SKILL.md
      if (skill.hasSkillMd) {
        try {
          const content = readFileSync(skillMdPath, 'utf-8');
          const lines = content.split('\n');
          // Find first non-empty, non-header line
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#')) {
              skill.description = trimmed.slice(0, 150);
              break;
            }
          }
        } catch {
          // Ignore
        }
      }

      skills.push(skill);
    }

    skills.sort((a, b) => a.name.localeCompare(b.name));
    return c.json({ skills });
  } catch (error) {
    console.error('Error scanning skills:', error);
    return c.json({ skills: [], error: 'Failed to scan skills' }, 500);
  }
});

// GET /api/library/plugins - List channel plugins
libraryRouter.get('/plugins', (c) => {
  const configPath = process.env.OPENCLAW_CONFIG_PATH || '/home/jndoye/.openclaw/openclaw.json';

  if (!existsSync(configPath)) {
    return c.json({ plugins: [], warning: 'OpenClaw config not found' });
  }

  try {
    const config = JSON.parse(readFileSync(configPath, 'utf-8'));
    const channels = config.channels || {};
    const pluginEntries = config.plugins?.entries || {};

    const plugins: Plugin[] = [];

    // Known channel plugins
    const knownPlugins = ['slack', 'telegram', 'discord', 'whatsapp', 'signal', 'googlechat', 'imessage'];

    for (const name of knownPlugins) {
      const channelConfig = channels[name];
      const pluginConfig = pluginEntries[name];

      // Skip if not configured at all
      if (!channelConfig && !pluginConfig) continue;

      const plugin: Plugin = {
        name,
        enabled: channelConfig?.enabled ?? pluginConfig?.enabled ?? false,
        connected: channelConfig?.enabled ?? false,
      };

      // Add sanitized config (no tokens)
      if (channelConfig) {
        plugin.config = {
          mode: channelConfig.mode,
          groupPolicy: channelConfig.groupPolicy,
        };
      }

      plugins.push(plugin);
    }

    return c.json({ plugins });
  } catch (error) {
    console.error('Error reading plugins:', error);
    return c.json({ plugins: [], error: 'Failed to read config' }, 500);
  }
});
