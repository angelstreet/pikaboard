import { useState, useEffect, useRef } from 'react';
import { api, BattleStreamEvent } from '../api/client';

interface BattleLogProps {
  battleId: number;
  isLive?: boolean;
}

export default function BattleLog({ battleId, isLive = false }: BattleLogProps) {
  const [log, setLog] = useState<string>('');
  const [lines, setLines] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [winner, setWinner] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Parse Showdown log line and render appropriately
  const renderLine = (line: string) => {
    // Skip empty lines
    if (!line.trim()) return null;

    // Parse Showdown message format: |type|data|
    const parts = line.split('|').filter(p => p);
    if (parts.length < 2) {
      return <div className="text-gray-400 text-xs font-mono">{line}</div>;
    }

    const type = parts[1];
    
    switch (type) {
      case 't':
        // Time message
        const timestamp = new Date(parseInt(parts[2]) * 1000);
        return (
          <div className="text-blue-400 text-xs font-mono py-1">
            {timestamp.toLocaleTimeString()}
          </div>
        );
      
      case 'start':
        return (
          <div className="text-yellow-400 font-bold font-mono py-2">
            ⚔️ Battle Started!
          </div>
        );
      
      case 'gametype':
        return (
          <div className="text-purple-400 text-sm font-mono">
            Game Type: {parts[2]}
          </div>
        );
      
      case 'player':
        // Player info: |player|p1|Player 1||
        return (
          <div className="text-green-400 text-sm font-mono py-1">
            👤 {parts[3] || `Player ${parts[2]}`}
          </div>
        );
      
      case 'teamsize':
        return (
          <div className="text-gray-500 text-xs font-mono">
            Team size: {parts[3]}
          </div>
        );
      
      case 'switch':
      case 'drag':
        // Pokemon switched in: |switch|p1a: Pikachu|Pikachu|100/100|
        const pokemon = parts[2].split(': ')[1] || parts[2];
        const hp = parts[3] || '';
        return (
          <div className="text-orange-300 font-mono py-1">
            🔄 <span className="text-white">{pokemon}</span> enters battle ({hp})
          </div>
        );
      
      case 'move':
        // Move used: |move|p1a: Pikachu|Thunderbolt|p2a: Raichu|
        const attacker = parts[2].split(': ')[1] || parts[2];
        const move = parts[3];
        const defender = parts[4]?.split(': ')[1] || '';
        return (
          <div className="text-white font-mono py-1">
            ⚡ <span className="text-yellow-300">{attacker}</span> used <span className="text-cyan-300">{move}</span>
            {defender ? ` on ${defender}` : ''}
          </div>
        );
      
      case 'damage':
      case 'hp':
        // HP change: |damage|p2a: Raichu|25/100
        const damagedPkmn = parts[2].split(': ')[1] || parts[2];
        const hpRemaining = parts[3] || '';
        // Parse percentage
        const hpPercent = hpRemaining.includes('/') 
          ? Math.round((parseInt(hpRemaining.split('/')[0]) / parseInt(hpRemaining.split('/')[1])) * 100)
          : hpRemaining;
        const hpColor = typeof hpPercent === 'number' 
          ? hpPercent > 50 ? 'text-green-400' : hpPercent > 20 ? 'text-yellow-400' : 'text-red-400'
          : 'text-white';
        return (
          <div className={`text-xs font-mono py-0.5`}>
            {damagedPkmn}: <span className={hpColor}>{hpRemaining}</span>
          </div>
        );
      
      case 'faint':
        const fainted = parts[2].split(': ')[1] || parts[2];
        return (
          <div className="text-red-500 font-mono py-1">
            💀 {fainted} fainted!
          </div>
        );
      
      case 'win':
        const winPlayer = parts[2];
        return (
          <div className="text-yellow-400 font-bold font-mono py-3 text-lg">
            🏆 {winPlayer} wins!
          </div>
        );
      
      case 'tie':
        return (
          <div className="text-gray-400 font-bold font-mono py-3 text-lg">
            🤝 It's a draw!
          </div>
        );
      
      case 'turn':
        return (
          <div className="text-purple-400 font-bold font-mono py-2 border-t border-purple-800">
            === Turn {parts[2]} ===
          </div>
        );
      
      case 'gen':
      case 'tier':
      case 'rule':
        // Skip meta info
        return null;
      
      default:
        // Default: show as gray text
        return (
          <div className="text-gray-500 text-xs font-mono">
            {line.replace(/\|/g, ' ').trim()}
          </div>
        );
    }
  };

  // Load initial log (for non-live mode)
  useEffect(() => {
    if (isLive) return;
    
    const fetchLog = async () => {
      setLoading(true);
      setError(null);
      try {
        const logText = await api.getBattleLog(battleId);
        setLog(logText);
        setLines(logText.split('\n').filter(l => l.trim()));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load battle log');
      } finally {
        setLoading(false);
      }
    };

    fetchLog();
  }, [battleId, isLive]);

  // Live streaming mode
  useEffect(() => {
    if (!isLive) return;

    // Cleanup previous connection
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [isLive]);

  // Start streaming when isLive becomes true
  useEffect(() => {
    if (!isLive || !battleId) return;

    setLines([]);
    setLoading(true);
    setError(null);

    const eventSource = api.createBattleStream(battleId);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const data: BattleStreamEvent = JSON.parse(event.data);
        
        if (data.type === 'connected') {
          console.log('Battle stream connected:', data.battleId);
        } else if (data.type === 'line') {
          setLines(prev => [...prev, data.content || '']);
        } else if (data.type === 'complete') {
          setWinner(data.winner || null);
          setLoading(false);
          eventSource.close();
        }
      } catch (err) {
        console.error('Failed to parse stream event:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('SSE error:', err);
      setError('Connection lost');
      setLoading(false);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [isLive, battleId]);

  // Auto-scroll to bottom when new lines arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  if (loading && lines.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-900 rounded-lg">
        <div className="text-gray-400">Loading battle...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-900 rounded-lg">
        <div className="text-red-400">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gray-800 px-4 py-2 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">⚔️</span>
          <span className="font-semibold text-white">Battle #{battleId}</span>
          {isLive && (
            <span className="flex items-center gap-1 text-xs bg-red-600 text-white px-2 py-0.5 rounded-full animate-pulse">
              <span className="w-2 h-2 bg-white rounded-full"></span>
              LIVE
            </span>
          )}
        </div>
        {winner && (
          <div className="text-yellow-400 font-bold">
            🏆 {winner}
          </div>
        )}
      </div>

      {/* Log content */}
      <div 
        ref={scrollRef}
        className="h-96 overflow-y-auto p-4 font-mono text-sm"
      >
        {lines.length === 0 ? (
          <div className="text-gray-500 text-center py-8">
            No battle log available
          </div>
        ) : (
          lines.map((line, index) => (
            <div key={index} className="leading-relaxed">
              {renderLine(line)}
            </div>
          ))
        )}
        
        {loading && (
          <div className="text-blue-400 animate-pulse py-2">
            Waiting for battle...
          </div>
        )}
      </div>
    </div>
  );
}
