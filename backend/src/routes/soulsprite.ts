import { Hono } from 'hono';
import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { createWriteStream } from 'fs';
import archiver from 'archiver';

const execAsync = promisify(exec);

// Character output base path (relative to project root)
const CHARACTERS_PATH = join(process.cwd(), '..', 'frontend', 'public', 'characters');
const SKILL_PATH = join(process.env.HOME || '~', '.openclaw', 'workspace', 'skills', 'character-gen');

interface GenerateRequest {
  name: string;
  description: string;
  theme?: 'cute' | 'cool' | 'chibi' | 'realistic' | 'pixel';
  apiKey?: string;
  debug?: boolean;
}

interface CharacterManifest {
  agent: string;
  version: number;
  cellSize: number;
  directions: number;
  directionOrder: string[];
  animations: {
    idle: {
      file: string;
      frames: number;
      fps: number;
    };
    walk: {
      file: string;
      frames: number;
      fps: number;
    };
  };
  groundLine: number;
  safeZone: {
    margin: number;
  };
}

export const soulspriteRouter = new Hono();

// POST /api/soulsprite/generate - Generate a new character
soulspriteRouter.post('/generate', async (c) => {
  try {
    const body = await c.req.json<GenerateRequest>();
    const { name, description, theme = 'cute', apiKey, debug = false } = body;

    if (!name || !description) {
      return c.json({ error: 'Name and description are required' }, 400);
    }

    // Sanitize name for filesystem
    const sanitizedName = name.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    const characterDir = join(CHARACTERS_PATH, sanitizedName);
    const spritesDir = join(characterDir, 'sprites');

    // Check if character already exists
    if (existsSync(characterDir) && !debug) {
      return c.json({ error: `Character "${sanitizedName}" already exists` }, 409);
    }

    // Create directories
    mkdirSync(characterDir, { recursive: true });
    mkdirSync(spritesDir, { recursive: true });

    // Prepare themed description
    const themePrefix: Record<string, string> = {
      cute: 'cute adorable kawaii style, rounded features, soft colors',
      cool: 'cool stylish sleek design, sharp features, modern aesthetic',
      chibi: 'chibi style, big head small body, super deformed, cute miniature',
      realistic: 'realistic 3D render style, detailed textures, lifelike proportions',
      pixel: 'pixel art style, retro 16-bit aesthetic, crisp pixels',
    };

    const fullDescription = `${description}. ${themePrefix[theme] || themePrefix.cute}.`;

    // Set API key in environment if provided
    const env = { ...process.env };
    if (apiKey) {
      env.GOOGLE_API_KEY = apiKey;
    }

    // Run the character generation script
    const scriptPath = join(SKILL_PATH, 'scripts', 'soul_to_iso.py');
    const tempOutputDir = join(characterDir, 'temp_gen');
    
    mkdirSync(tempOutputDir, { recursive: true });

    if (debug) {
      console.log(`[SoulSprite] Generating character: ${sanitizedName}`);
      console.log(`[SoulSprite] Description: ${fullDescription}`);
      console.log(`[SoulSprite] Output: ${characterDir}`);
    }

    // Execute generation using the character-gen skill
    let generationSuccess = false;
    
    try {
      if (existsSync(scriptPath)) {
        // Run the Python generation script
        const pythonCmd = `cd ${SKILL_PATH} && python3 scripts/soul_to_iso.py --desc "${fullDescription.replace(/"/g, '\\"')}" --name "${sanitizedName}" --output "${characterDir}"`;
        
        if (debug) {
          console.log(`[SoulSprite] Executing: ${pythonCmd}`);
        }

        const { stdout, stderr } = await execAsync(pythonCmd, { env, timeout: 120000 });
        
        if (debug) {
          console.log('[SoulSprite] stdout:', stdout);
          if (stderr) console.log('[SoulSprite] stderr:', stderr);
        }

        generationSuccess = true;
      } else {
        console.warn('[SoulSprite] Python script not found, using fallback');
      }
    } catch (execError) {
      console.error('[SoulSprite] Generation script failed:', execError);
      // Continue with fallback
    }

    // Process generated files or use fallback
    const generatedDir = join(characterDir, sanitizedName);
    
    if (generationSuccess && existsSync(generatedDir)) {
      // Move generated files to proper locations
      // The script creates {name}/ directory with outputs
      
      // Copy spritesheets
      const sizes = [64, 128];
      for (const size of sizes) {
        const sourceSheet = join(generatedDir, `spritesheet_idle_${size}.png`);
        if (existsSync(sourceSheet)) {
          // For now, use the 128px version for both idle and walk (placeholder)
          if (size === 128) {
            writeFileSync(join(spritesDir, 'idle.png'), readFileSync(sourceSheet));
            writeFileSync(join(spritesDir, 'walk.png'), readFileSync(sourceSheet));
          }
        }
      }

      // Copy full resolution as avatar
      const fullSheet = join(generatedDir, 'spritesheet_idle_full.png');
      if (existsSync(fullSheet)) {
        // Extract first frame for avatar (512x512)
        // For now, copy full sheet - frontend can crop
        writeFileSync(join(characterDir, 'avatar.png'), readFileSync(fullSheet));
      }

      // Cleanup generated temp directory
      const { rm } = await import('fs/promises');
      await rm(generatedDir, { recursive: true, force: true });
    } else {
      // Fallback: Copy from existing character
      const sourceChar = 'pika';
      const sourceAvatar = join(CHARACTERS_PATH, sourceChar, 'avatar.png');
      const sourceIdle = join(CHARACTERS_PATH, sourceChar, 'sprites', 'idle.png');
      const sourceWalk = join(CHARACTERS_PATH, sourceChar, 'sprites', 'walk.png');

      if (existsSync(sourceAvatar)) {
        writeFileSync(join(characterDir, 'avatar.png'), readFileSync(sourceAvatar));
      }
      if (existsSync(sourceIdle)) {
        writeFileSync(join(spritesDir, 'idle.png'), readFileSync(sourceIdle));
      }
      if (existsSync(sourceWalk)) {
        writeFileSync(join(spritesDir, 'walk.png'), readFileSync(sourceWalk));
      }
    }

    // Create manifest
    const manifest: CharacterManifest = {
      agent: sanitizedName,
      version: 1,
      cellSize: 128,
      directions: 4,
      directionOrder: ['S', 'W', 'N', 'E'],
      animations: {
        idle: {
          file: 'idle.png',
          frames: 4,
          fps: 5,
        },
        walk: {
          file: 'walk.png',
          frames: 4,
          fps: 5,
        },
      },
      groundLine: 110,
      safeZone: {
        margin: 8,
      },
    };

    writeFileSync(
      join(spritesDir, 'manifest.json'),
      JSON.stringify(manifest, null, 2)
    );

    // Cleanup temp dir
    if (existsSync(tempOutputDir)) {
      const { rm } = await import('fs/promises');
      await rm(tempOutputDir, { recursive: true, force: true });
    }

    return c.json({
      success: true,
      character: {
        name: sanitizedName,
        displayName: name,
        path: `/characters/${sanitizedName}`,
        manifest,
      },
      message: `Character "${name}" generated successfully`,
    });

  } catch (error) {
    console.error('[SoulSprite] Generation error:', error);
    return c.json({
      error: 'Failed to generate character',
      details: error instanceof Error ? error.message : String(error),
    }, 500);
  }
});

// GET /api/soulsprite/characters - List all generated characters
soulspriteRouter.get('/characters', async (c) => {
  try {
    if (!existsSync(CHARACTERS_PATH)) {
      return c.json({ characters: [] });
    }

    const entries = readdirSync(CHARACTERS_PATH, { withFileTypes: true });
    const characters = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const charDir = join(CHARACTERS_PATH, entry.name);
      const manifestPath = join(charDir, 'sprites', 'manifest.json');
      const avatarPath = join(charDir, 'avatar.png');

      let manifest = null;
      if (existsSync(manifestPath)) {
        try {
          manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
        } catch {
          // Invalid manifest
        }
      }

      characters.push({
        name: entry.name,
        hasAvatar: existsSync(avatarPath),
        hasManifest: !!manifest,
        manifest,
        path: `/characters/${entry.name}`,
      });
    }

    return c.json({ characters });

  } catch (error) {
    console.error('[SoulSprite] List error:', error);
    return c.json({ error: 'Failed to list characters' }, 500);
  }
});

// GET /api/soulsprite/download/:name - Download character as zip
soulspriteRouter.get('/download/:name', async (c) => {
  try {
    const name = c.req.param('name');
    const sanitizedName = name.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    const characterDir = join(CHARACTERS_PATH, sanitizedName);

    if (!existsSync(characterDir)) {
      return c.json({ error: 'Character not found' }, 404);
    }

    // Create zip archive
    const zipPath = join(characterDir, `${sanitizedName}.zip`);
    const output = createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    await new Promise<void>((resolve, reject) => {
      output.on('close', () => resolve());
      archive.on('error', reject);
      archive.on('warning', (err) => {
        if (err.code === 'ENOENT') {
          console.warn('Archive warning:', err);
        } else {
          reject(err);
        }
      });

      archive.pipe(output);
      archive.directory(characterDir, sanitizedName);
      archive.finalize();
    });

    // Read zip file and return
    const zipData = readFileSync(zipPath);
    
    // Clean up zip file after reading
    const { unlink } = await import('fs/promises');
    await unlink(zipPath);

    return new Response(zipData, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${sanitizedName}.zip"`,
      },
    });

  } catch (error) {
    console.error('[SoulSprite] Download error:', error);
    return c.json({ error: 'Failed to create download' }, 500);
  }
});

// DELETE /api/soulsprite/characters/:name - Delete a character
soulspriteRouter.delete('/characters/:name', async (c) => {
  try {
    const name = c.req.param('name');
    const sanitizedName = name.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    const characterDir = join(CHARACTERS_PATH, sanitizedName);

    if (!existsSync(characterDir)) {
      return c.json({ error: 'Character not found' }, 404);
    }

    const { rm } = await import('fs/promises');
    await rm(characterDir, { recursive: true, force: true });

    return c.json({
      success: true,
      message: `Character "${name}" deleted successfully`,
    });

  } catch (error) {
    console.error('[SoulSprite] Delete error:', error);
    return c.json({ error: 'Failed to delete character' }, 500);
  }
});
