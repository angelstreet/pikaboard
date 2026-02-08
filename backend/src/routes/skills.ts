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
  source?: string;
}

// Scan a directory for skills
function scanSkillsDir(dirPath: string, source: string): Skill[] {
  if (!existsSync(dirPath)) return [];
  const entries = readdirSync(dirPath, { withFileTypes: true });
  const skills: Skill[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith('.')) continue;

    const skillDir = join(dirPath, entry.name);
    const readmePath = join(skillDir, 'README.md');
    const skillMdPath = join(skillDir, 'SKILL.md');

    const skill: Skill = {
      name: entry.name,
      path: skillDir,
      hasReadme: existsSync(readmePath),
      hasSkillMd: existsSync(skillMdPath),
      source,
    };

    if (skill.hasSkillMd) {
      try {
        const content = readFileSync(skillMdPath, 'utf-8');
        const firstLine = content.split('\n').find((l) => l.trim() && !l.startsWith('#'));
        if (firstLine) skill.description = firstLine.trim().slice(0, 200);
      } catch {}
    } else if (skill.hasReadme) {
      try {
        const content = readFileSync(readmePath, 'utf-8');
        const descLine = content.split('\n').find((l, i) => i > 0 && l.trim() && !l.startsWith('#'));
        if (descLine) skill.description = descLine.trim().slice(0, 200);
      } catch {}
    }

    skills.push(skill);
  }
  return skills;
}

// GET /api/skills - List all skills (workspace + built-in)
skillsRouter.get('/', (c) => {
  const page = parseInt(c.req.query('page') || '1', 10);
  const perPage = parseInt(c.req.query('per_page') || '50', 10);
  const search = c.req.query('search')?.toLowerCase();

  try {
    const workspacePath = process.env.OPENCLAW_SKILLS_PATH || `${process.env.HOME || '~'}/.openclaw/workspace/skills`;
    
    // Find built-in skills path (node_modules/openclaw/skills)
    const builtinPaths = [
      join(process.env.HOME || '~', '.nvm/versions/node/v22.22.0/lib/node_modules/openclaw/skills'),
      '/usr/local/lib/node_modules/openclaw/skills',
      '/usr/lib/node_modules/openclaw/skills',
    ];
    
    const workspaceSkills = scanSkillsDir(workspacePath, 'workspace');
    const workspaceNames = new Set(workspaceSkills.map(s => s.name));
    
    let builtinSkills: Skill[] = [];
    for (const bp of builtinPaths) {
      if (existsSync(bp)) {
        builtinSkills = scanSkillsDir(bp, 'built-in').filter(s => !workspaceNames.has(s.name));
        break;
      }
    }

    let allSkills = [...workspaceSkills, ...builtinSkills];
    
    // Search filter
    if (search) {
      allSkills = allSkills.filter(s => 
        s.name.toLowerCase().includes(search) || 
        (s.description || '').toLowerCase().includes(search)
      );
    }

    allSkills.sort((a, b) => a.name.localeCompare(b.name));

    const total = allSkills.length;
    const start = (page - 1) * perPage;
    const paginated = allSkills.slice(start, start + perPage);

    return c.json({ skills: paginated, total, page, perPage, totalPages: Math.ceil(total / perPage) });
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
