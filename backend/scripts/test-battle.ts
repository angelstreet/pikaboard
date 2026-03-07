#!/usr/bin/env node
/**
 * Integration test for battle system
 * Tests: run battle, verify stored in Showdown format, verify live streaming, verify replay
 */

const API_URL = 'http://localhost:3001';
const TOKEN = process.env.PIKABOARD_TOKEN || '41e4b640e51f9f5efa2529c5f609b141ff20515e864bd6e404efefd50840692d';

async function api(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(`API error: ${res.status} - ${error}`);
  }
  return res;
}

async function testBattle() {
  console.log('🧪 Running battle system integration tests...\n');
  let passed = 0;
  let failed = 0;

  // Test 1: Run a new battle
  console.log('📋 Test 1: Run a new battle');
  try {
    const battleRequest = {
      format: 'gen9randombattle',
      p1: [
        { species: 'Pikachu', item: 'Light Ball', ability: 'Lightning Rod', moves: ['Thunderbolt', 'Quick Attack', 'Iron Tail', 'Protect'] },
        { species: 'Charizard', item: 'Choice Scarf', ability: 'Blaze', moves: ['Flamethrower', 'Dragon Claw', 'Roost', 'Earthquake'] },
      ],
      p2: [
        { species: 'Blastoise', item: 'Leftovers', ability: 'Torrent', moves: ['Hydro Pump', 'Ice Beam', 'Rest', 'Sleep Talk'] },
        { species: 'Venusaur', item: 'Big Root', ability: 'Chlorophyll', moves: ['Sleep Powder', 'Leech Seed', 'Sludge Bomb', 'Giga Drain'] },
      ],
    };

    const battleRes = await api('/api/battle', {
      method: 'POST',
      body: JSON.stringify(battleRequest),
    });
    const battleData = await battleRes.json();
    
    if (!battleData.success || !battleData.battle.id) {
      throw new Error('Battle did not return success with ID');
    }
    
    const battleId = battleData.battle.id;
    console.log(`  ✅ Battle created: #${battleId}`);
    console.log(`     Winner: ${battleData.battle.winner}`);
    passed++;
  } catch (err) {
    console.log(`  ❌ Failed: ${err.message}`);
    failed++;
  }

  // Test 2: Verify raw battle log is in Showdown format
  console.log('\n📋 Test 2: Verify raw battle log in Showdown format');
  try {
    const battleId = 2; // We just created battle #2
    const logRes = await api(`/api/battle/${battleId}/log`);
    const logText = await logRes.text();
    
    // Check for Showdown format markers
    const hasStart = logText.includes('|start');
    const hasTurn = logText.includes('|turn|');
    const hasSwitch = logText.includes('|switch|');
    const hasGen = logText.includes('|gen|');
    
    if (!hasStart || (!hasTurn && !hasSwitch) || !hasGen) {
      throw new Error('Log not in Showdown format');
    }
    
    console.log(`  ✅ Raw battle log is in Showdown format`);
    console.log(`     Contains: |start, |gen, |switch/|turn`);
    passed++;
  } catch (err) {
    console.log(`  ❌ Failed: ${err.message}`);
    failed++;
  }

  // Test 3: Test SSE streaming
  console.log('\n📋 Test 3: Test SSE live streaming');
  try {
    const battleId = 1; // Use existing battle
    const streamRes = await fetch(`${API_URL}/api/battle/${battleId}/stream`, {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
      },
    });
    
    if (!streamRes.ok) {
      throw new Error(`SSE request failed: ${streamRes.status}`);
    }
    
    let eventCount = 0;
    let hasConnected = false;
    let hasComplete = false;
    
    const reader = streamRes.body?.getReader();
    const decoder = new TextDecoder();
    
    if (!reader) {
      throw new Error('No response body');
    }
    
    // Read first few events
    while (eventCount < 5) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'connected') hasConnected = true;
            if (data.type === 'complete') hasComplete = true;
            eventCount++;
          } catch (e) {
            // Ignore parse errors for incomplete chunks
          }
        }
      }
    }
    
    reader.cancel();
    
    if (!hasConnected) {
      throw new Error('Did not receive connected event');
    }
    
    console.log(`  ✅ SSE streaming works`);
    console.log(`     Received ${eventCount} events`);
    passed++;
  } catch (err) {
    console.log(`  ❌ Failed: ${err.message}`);
    failed++;
  }

  // Test 4: Verify battle replay (GET /api/battle/:id)
  console.log('\n📋 Test 4: Verify battle replay data');
  try {
    const battleRes = await api('/api/battle/1');
    const battle = await battleRes.json();
    
    if (!battle.id || !battle.format || !battle.rawBattleLog) {
      throw new Error('Battle data incomplete');
    }
    
    console.log(`  ✅ Battle replay data available`);
    console.log(`     Format: ${battle.format}`);
    console.log(`     Winner: ${battle.winner}`);
    console.log(`     Log lines: ${battle.rawBattleLog.split('\n').length}`);
    passed++;
  } catch (err) {
    console.log(`  ❌ Failed: ${err.message}`);
    failed++;
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log(`📊 Results: ${passed} passed, ${failed} failed`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

testBattle().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
