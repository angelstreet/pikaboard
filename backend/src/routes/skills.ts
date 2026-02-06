import { Hono } from 'hono';
import { readdirSync, readFileSync, existsSync, statSync } from 'fs';
import { join } from 'path';

export const skillsRouter = new Hono();

interface Skill {
  name: string;
  path: string;
  hasReadme: boolean;
  hasSkillMd: boolean;
  description?: string;
}

// GET /api/skills - List installed skills
skillsRouter.get('/', (c) => {
  const skillsPath = process.env.OPENCLAW_SKILLS_PATH || `${process.env.HOME || '~'}/.openclaw/workspace/skills`;

  if (!existsSync(skillsPath)) {
    return c.json({
      skills: [],
      warning: `Skills directory not found: ${skillsPath}`,
    });
  }

  try {
    const entries = readdirSync(skillsPath, { withFileTypes: true });
    const skills: Skill[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith('.')) continue;

      const skillDir = join(skillsPath, entry.name);
      const readmePath = join(skillDir, 'README.md');
      const skillMdPath = join(skillDir, 'SKILL.md');

      const skill: Skill = {
        name: entry.name,
        path: skillDir,
        hasReadme: existsSync(readmePath),
        hasSkillMd: existsSync(skillMdPath),
      };

      // Try to extract description from SKILL.md or README.md
      if (skill.hasSkillMd) {
        try {
          const content = readFileSync(skillMdPath, 'utf-8');
          const firstLine = content.split('\n').find((l) => l.trim() && !l.startsWith('#'));
          if (firstLine) {
            skill.description = firstLine.trim().slice(0, 200);
          }
        } catch {
          // Ignore read errors
        }
      } else if (skill.hasReadme) {
        try {
          const content = readFileSync(readmePath, 'utf-8');
          const lines = content.split('\n');
          const descLine = lines.find((l, i) => i > 0 && l.trim() && !l.startsWith('#'));
          if (descLine) {
            skill.description = descLine.trim().slice(0, 200);
          }
        } catch {
          // Ignore read errors
        }
      }

      skills.push(skill);
    }

    // Sort alphabetically
    skills.sort((a, b) => a.name.localeCompare(b.name));

    return c.json({ skills });
  } catch (error) {
    console.error('Error scanning skills:', error);
    return c.json({ skills: [], error: 'Failed to scan skills directory' }, 500);
  }
});

// GET /api/skills/:name - Get skill details
skillsRouter.get('/:name', (c) => {
  const name = c.req.param('name');
  const skillsPath = process.env.OPENCLAW_SKILLS_PATH || `${process.env.HOME || '~'}/.openclaw/workspace/skills`;
  const skillDir = join(skillsPath, name);

  if (!existsSync(skillDir) || !statSync(skillDir).isDirectory()) {
    return c.json({ error: 'Skill not found' }, 404);
  }

  const readmePath = join(skillDir, 'README.md');
  const skillMdPath = join(skillDir, 'SKILL.md');

  const skill: Record<string, unknown> = {
    name,
    path: skillDir,
    hasReadme: existsSync(readmePath),
    hasSkillMd: existsSync(skillMdPath),
  };

  // Include file contents if they exist
  if (skill.hasSkillMd) {
    try {
      skill.skillMd = readFileSync(skillMdPath, 'utf-8');
    } catch {
      // Ignore
    }
  }

  if (skill.hasReadme) {
    try {
      skill.readme = readFileSync(readmePath, 'utf-8');
    } catch {
      // Ignore
    }
  }

  // List files in skill directory
  try {
    skill.files = readdirSync(skillDir);
  } catch {
    skill.files = [];
  }

  return c.json(skill);
});
