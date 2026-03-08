import { Hono } from 'hono';
import { Dex, BattleStreams, Teams, RandomPlayerAI } from '@pkmn/sim';
import { TeamGenerators } from '@pkmn/randoms';
import { db } from '../db/index.js';

// Set up the team generator factory for random battles
Teams.setGeneratorFactory(TeamGenerators);

export const battleRouter = new Hono();

interface TeamPokemon {
  name: string;
  species: string;
  item: string;
  ability: string;
  moves: string[];
  nature: string;
  evs: { hp: number; atk: number; def: number; spa: number; spd: number; spe: number };
  ivs: { hp: number; atk: number; def: number; spa: number; spd: number; spe: number };
  level: number;
  gender: 'M' | 'F' | 'N';
  shiny: boolean;
}

interface BattleRequest {
  format: string;
  p1: TeamPokemon[];
  p2: TeamPokemon[];
}

// Convert team to Showdown export format (pipe-delimited)
function teamToShowdown(team: TeamPokemon[]): string {
  return team.map(pkmn => {
    const parts: string[] = [];
    parts.push(pkmn.species); // Species
    parts.push(pkmn.item || ''); // Item
    parts.push(pkmn.ability || ''); // Ability
    parts.push((pkmn.moves || []).join(', ')); // Moves
    parts.push(pkmn.nature || 'Serious'); // Nature
    // EVs
    const evs = pkmn.evs || { hp: 85, atk: 85, def: 85, spa: 85, spd: 85, spe: 85 };
    parts.push(`${evs.hp}/${evs.atk}/${evs.def}/${evs.spa}/${evs.spd}/${evs.spe}`);
    // IVs
    const ivs = pkmn.ivs || { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };
    parts.push(`${ivs.hp}/${ivs.atk}/${ivs.def}/${ivs.spa}/${ivs.spd}/${ivs.spe}`);
    parts.push(pkmn.gender || 'N'); // Gender
    parts.push(pkmn.shiny ? 'Shiny' : ''); // Shiny
    
    return parts.join('|');
  }).join('\n');
}

// Parse Showdown team format back to team object
function parseShowdownTeam(teamStr: string): TeamPokemon[] {
  return teamStr.split('\n').filter((line: string) => line.trim()).map((line: string) => {
    const parts = line.split('|');
    if (parts.length < 2) return null;
    
    const evs = parts[5] ? (() => {
      const [hp, atk, def, spa, spd, spe] = parts[5].split('/').map(Number);
      return { hp: hp || 85, atk: atk || 85, def: def || 85, spa: spa || 85, spd: spd || 85, spe: spe || 85 };
    })() : { hp: 85, atk: 85, def: 85, spa: 85, spd: 85, spe: 85 };

    const ivs = parts[6] ? (() => {
      const [hp, atk, def, spa, spd, spe] = parts[6].split('/').map(Number);
      return { hp: hp || 31, atk: atk || 31, def: def || 31, spa: spa || 31, spd: spd || 31, spe: spe || 31 };
    })() : { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };

    return {
      name: parts[0],
      species: parts[0],
      item: parts[1] || '',
      ability: parts[2] || '',
      moves: parts[3] ? parts[3].split(', ').filter(m => m) : [],
      nature: parts[4] || 'Serious',
      evs,
      ivs,
      level: 100,
      gender: (parts[7] as 'M' | 'F' | 'N') || 'N',
      shiny: parts[8] === 'Shiny',
    };
  }).filter(Boolean) as TeamPokemon[];
}

// Run a battle and capture raw output
async function runBattle(format: string, p1Team: TeamPokemon[], p2Team: TeamPokemon[]): Promise<{ winner: string; rawLog: string }> {
  // Create battle stream
  const playerStreams = BattleStreams.getPlayerStreams(new BattleStreams.BattleStream());
  
  let rawLog = '';

  // Prepare specs - use Teams.pack directly on team objects
  const spec = { formatid: format };
  const p1spec = { name: 'Player 1', team: Teams.pack(p1Team) };
  const p2spec = { name: 'Player 2', team: Teams.pack(p2Team) };

  console.log('[Battle] P1 team:', p1spec.team);
  console.log('[Battle] P2 team:', p2spec.team);

  // Create AI players
  const p1 = new RandomPlayerAI(playerStreams.p1);
  const p2 = new RandomPlayerAI(playerStreams.p2);

  // Start the players
  const p1Promise = p1.start();
  const p2Promise = p2.start();

  // Start the battle
  playerStreams.omniscient.write(`>start ${JSON.stringify(spec)}
>player p1 ${JSON.stringify(p1spec)}
>player p2 ${JSON.stringify(p2spec)}`);

  // Wait for battle to complete (collect all output)
  try {
    // Read until battle ends
    for await (const chunk of playerStreams.omniscient) {
      rawLog += chunk + '\n';
      // Check if battle is over
      if (chunk.includes('|win|') || chunk.includes('|tie|')) {
        break;
      }
    }
  } catch (e) {
    console.error('[Battle] Stream error:', e);
  }

  await Promise.all([p1Promise, p2Promise]);

  // Determine winner from log
  let winner = 'draw';
  const winMatch = rawLog.match(/\|win\|(.+)/);
  if (winMatch) {
    winner = winMatch[1].trim();
  }

  return {
    winner,
    rawLog,
  };
}

// POST /api/battle - Run a Pokemon battle
battleRouter.post('/', async (c) => {
  try {
    const body = await c.req.json<BattleRequest>();
    let { format, p1, p2 } = body;

    // Default to gen9randombattle if format not specified or unsupported
    if (!format) {
      format = 'gen9randombattle';
    }

    // Normalize format to formatid (e.g., "gen9randombattle")
    const formatid = format.toLowerCase().replace(/\s+/g, '').replace('[gen', 'gen');

    if (!p1 || !p2 || !Array.isArray(p1) || !Array.isArray(p2)) {
      return c.json({ error: 'format, p1 (team), and p2 (team) are required' }, 400);
    }

    if (p1.length === 0 || p2.length === 0) {
      return c.json({ error: 'Each team must have at least one Pokemon' }, 400);
    }

    // Run the battle
    const result = await runBattle(formatid, p1, p2);

    // Store teams in packed format (what the sim uses internally)
    const p1TeamPacked = Teams.pack(p1);
    const p2TeamPacked = Teams.pack(p2);

    const insertResult = await db.execute({
      sql: `INSERT INTO moves (format, p1_team, p2_team, winner, raw_battle_log) VALUES (?, ?, ?, ?, ?)`,
      args: [format, p1TeamPacked, p2TeamPacked, result.winner, result.rawLog]
    });

    // Convert BigInt to number for JSON serialization
    const battleId = Number(insertResult.lastInsertRowid);

    return c.json({
      success: true,
      battle: {
        id: battleId,
        format,
        winner: result.winner,
        rawBattleLog: result.rawLog,
      }
    });

  } catch (error) {
    console.error('[Battle] Error:', error);
    return c.json({
      error: 'Failed to run battle',
      details: error instanceof Error ? error.message : String(error),
    }, 500);
  }
});

// GET /api/battle/:id - Get a battle by ID
battleRouter.get('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'), 10);
    
    if (isNaN(id)) {
      return c.json({ error: 'Invalid battle ID' }, 400);
    }

    const result = await db.execute({
      sql: 'SELECT * FROM moves WHERE id = ?',
      args: [id]
    });

    if (result.rows.length === 0) {
      return c.json({ error: 'Battle not found' }, 404);
    }

    const row = result.rows[0] as any;
    return c.json({
      id: row.id,
      format: row.format,
      p1Team: parseShowdownTeam(row.p1_team),
      p2Team: parseShowdownTeam(row.p2_team),
      winner: row.winner,
      rawBattleLog: row.raw_battle_log,
      createdAt: row.created_at,
    });

  } catch (error) {
    console.error('[Battle] Error:', error);
    return c.json({ error: 'Failed to get battle' }, 500);
  }
});

// GET /api/battle - List all battles
battleRouter.get('/', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '20', 10);
    const offset = parseInt(c.req.query('offset') || '0', 10);

    const result = await db.execute({
      sql: 'SELECT id, format, winner, created_at FROM moves ORDER BY created_at DESC LIMIT ? OFFSET ?',
      args: [limit, offset]
    });

    return c.json({
      battles: result.rows.map((row: any) => ({
        id: row.id,
        format: row.format,
        winner: row.winner,
        createdAt: row.created_at,
      })),
      limit,
      offset,
    });

  } catch (error) {
    console.error('[Battle] Error:', error);
    return c.json({ error: 'Failed to list battles' }, 500);
  }
});

// GET /api/battle/:id/log - Get raw battle log
battleRouter.get('/:id/log', async (c) => {
  try {
    const id = parseInt(c.req.param('id'), 10);
    
    if (isNaN(id)) {
      return c.json({ error: 'Invalid battle ID' }, 400);
    }

    const result = await db.execute({
      sql: 'SELECT raw_battle_log, winner, format, p1_team, p2_team FROM moves WHERE id = ?',
      args: [id]
    });

    if (result.rows.length === 0) {
      return c.json({ error: 'Battle not found' }, 404);
    }

    const row = result.rows[0] as any;
    
    // Return raw log in Showdown format
    return c.text(row.raw_battle_log || '');

  } catch (error) {
    console.error('[Battle] Error:', error);
    return c.json({ error: 'Failed to get battle log' }, 500);
  }
});

// SSE endpoint for live battle streaming
battleRouter.get('/:id/stream', async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  
  if (isNaN(id)) {
    return c.json({ error: 'Invalid battle ID' }, 400);
  }

  // Get existing battle
  const result = await db.execute({
    sql: 'SELECT raw_battle_log, winner, format, p1_team, p2_team FROM moves WHERE id = ?',
    args: [id]
  });

  if (result.rows.length === 0) {
    return c.json({ error: 'Battle not found' }, 404);
  }

  const row = result.rows[0] as any;
  const rawLog = row.raw_battle_log || '';
  
  // Split log into lines and stream them
  const lines = rawLog.split('\n').filter((line: string) => line.trim());
  
  // Create a streaming response with SSE
  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connection message
      controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ type: 'connected', battleId: id })}\n\n`));
      
      // Stream each line with a small delay to simulate live viewing
      for (let i = 0; i < lines.length; i++) {
        const data = JSON.stringify({
          type: 'line',
          index: i,
          content: lines[i]
        });
        controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
        
        // Small delay between lines (50ms)
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      // Send completion message
      controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ type: 'complete', winner: row.winner })}\n\n`));
      controller.close();
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
});

// POST /api/battle/run - Run a new battle with live streaming option
battleRouter.post('/run', async (c) => {
  try {
    const body = await c.req.json<BattleRequest & { stream?: boolean }>();
    let { format, p1, p2, stream } = body;

    // Default to gen9randombattle if format not specified or unsupported
    if (!format) {
      format = 'gen9randombattle';
    }

    // Normalize format to formatid (e.g., "gen9randombattle")
    const formatid = format.toLowerCase().replace(/\s+/g, '').replace('[gen', 'gen');

    if (!p1 || !p2 || !Array.isArray(p1) || !Array.isArray(p2)) {
      return c.json({ error: 'format, p1 (team), and p2 (team) are required' }, 400);
    }

    if (p1.length === 0 || p2.length === 0) {
      return c.json({ error: 'Each team must have at least one Pokemon' }, 400);
    }

    // If streaming requested, run battle and return battle ID (frontend will stream from /:id/stream)
    // For now, run synchronously and return the result
    const result = await runBattle(formatid, p1, p2);

    // Store in database
    const p1TeamStr = teamToShowdown(p1);
    const p2TeamStr = teamToShowdown(p2);

    const insertResult = await db.execute({
      sql: `INSERT INTO moves (format, p1_team, p2_team, winner, raw_battle_log) VALUES (?, ?, ?, ?, ?)`,
      args: [format, p1TeamStr, p2TeamStr, result.winner, result.rawLog]
    });

    // Convert BigInt to number for JSON serialization
    const battleId = Number(insertResult.lastInsertRowid);

    return c.json({
      success: true,
      battle: {
        id: battleId,
        format,
        winner: result.winner,
        rawBattleLog: result.rawLog,
      }
    });

  } catch (error) {
    console.error('[Battle] Error:', error);
    return c.json({
      error: 'Failed to run battle',
      details: error instanceof Error ? error.message : String(error),
    }, 500);
  }
});
