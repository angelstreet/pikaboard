import { useState, useEffect, useRef } from 'react';
import { api, Agent } from '../api/client';

const BASE = import.meta.env.BASE_URL || '/';

// Agent character config - maps agent name to emoji and colors
const AGENT_CONFIG: Record<string, { emoji: string; color: string; element: string; hasAssets: boolean }> = {
  pika: { emoji: '⚡', color: '#FFD700', element: 'Electric', hasAssets: true },
  bulbi: { emoji: '🌱', color: '#78C850', element: 'Grass', hasAssets: false },
  evoli: { emoji: '🦊', color: '#C8A878', element: 'Normal', hasAssets: false },
  psykokwak: { emoji: '🦆', color: '#F8D030', element: 'Water', hasAssets: false },
  tortoise: { emoji: '🐢', color: '#6890F0', element: 'Water', hasAssets: false },
  sala: { emoji: '🔥', color: '#F08030', element: 'Fire', hasAssets: false },
  mew: { emoji: '🐱', color: '#F85888', element: 'Psychic', hasAssets: false },
  lanturn: { emoji: '💡', color: '#98D8D8', element: 'Electric', hasAssets: false },
  porygon: { emoji: '🔷', color: '#F85888', element: 'Digital', hasAssets: false },
};

// Spritesheet config
const CELL = 128; // px per sprite in spritesheet
const DIRS = ['S', 'SW', 'W', 'NW', 'N', 'NE', 'E', 'SE'];
const WALK_FRAMES = 4;

type ViewMode = '2d' | '3d';
type Animation = 'idle' | 'walk';

// Animated sprite component using CSS sprite animation
function AnimatedSprite({ agentName, animation = 'idle', direction = 0, size = 128 }: {
  agentName: string;
  animation?: Animation;
  direction?: number; // 0-7 index into DIRS
  size?: number;
}) {
  const [frame, setFrame] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (animation === 'walk') {
      intervalRef.current = setInterval(() => {
        setFrame(f => (f + 1) % WALK_FRAMES);
      }, 200); // 200ms per frame = 5fps walk
    } else {
      setFrame(0);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [animation]);

  const sheet = animation === 'idle' 
    ? `${BASE}characters/${agentName}/spritesheet_idle.png`
    : `${BASE}characters/${agentName}/spritesheet_walk.png`;

  // Background position: x = direction * cell, y = frame * cell
  const bgX = -(direction * CELL);
  const bgY = -(frame * CELL);

  return (
    <div
      style={{
        width: size,
        height: size,
        backgroundImage: `url(${sheet})`,
        backgroundPosition: `${bgX}px ${bgY}px`,
        backgroundSize: `${CELL * 8}px auto`,
        backgroundRepeat: 'no-repeat',
        imageRendering: 'pixelated',
      }}
    />
  );
}

export default function Characters() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('2d');
  const [selectedAnim, setSelectedAnim] = useState<Animation>('idle');
  const [selectedDir, setSelectedDir] = useState(0);

  useEffect(() => {
    loadAgents();
  }, []);

  async function loadAgents() {
    try {
      setLoading(true);
      const data = await api.getAgents();
      setAgents(data);
      // TODO: Load actual character assets from API
      // For now, check if assets exist at known paths
    } catch (err) {
      console.error('Failed to load agents:', err);
    } finally {
      setLoading(false);
    }
  }

  function getConfig(agent: Agent) {
    const name = (agent.name || agent.id || '').toLowerCase();
    return AGENT_CONFIG[name] || { emoji: '🤖', color: '#888', element: 'Unknown' };
  }

  function getStatus(_agent: Agent): 'idle' | 'working' | 'review' | 'offline' {
    // TODO: Get real status from agent heartbeat/session
    return 'idle';
  }

  const statusColors: Record<string, string> = {
    idle: 'bg-green-500',
    working: 'bg-blue-500',
    review: 'bg-yellow-500',
    offline: 'bg-gray-500',
  };

  const statusLabels: Record<string, string> = {
    idle: 'Idle',
    working: 'Working',
    review: 'In Review',
    offline: 'Offline',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">🎮 Team Characters</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Your Pokemon team — generated from their souls
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-1 flex">
            <button
              onClick={() => setViewMode('2d')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === '2d'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              2D Sprites
            </button>
            <button
              onClick={() => setViewMode('3d')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === '3d'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              3D Models
            </button>
          </div>
        </div>
      </div>

      {/* Character Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {agents.map((agent) => {
          const config = getConfig(agent);
          const status = getStatus(agent);
          
          return (
            <div
              key={agent.id}
              onClick={() => setSelectedAgent(agent)}
              className="relative group cursor-pointer rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 hover:border-yellow-500/50 dark:hover:border-yellow-500/50 hover:shadow-lg transition-all duration-200"
            >
              {/* Status dot */}
              <div className={`absolute top-3 right-3 w-2.5 h-2.5 rounded-full ${statusColors[status]}`} 
                   title={statusLabels[status]} />
              
              {/* Character display */}
              <div 
                className="w-full aspect-square rounded-lg mb-3 flex items-center justify-center text-6xl relative overflow-hidden"
                style={{ backgroundColor: config.color + '15' }}
              >
                {config.hasAssets && viewMode === '2d' ? (
                  <AnimatedSprite 
                    agentName={(agent.name || agent.id).toLowerCase()} 
                    animation="idle"
                    direction={0}
                    size={96}
                  />
                ) : (
                  <span className="group-hover:scale-110 transition-transform duration-200 select-none"
                        style={{ filter: `drop-shadow(0 0 8px ${config.color}40)` }}>
                    {config.emoji}
                  </span>
                )}
              </div>
              
              {/* Info */}
              <div className="text-center">
                <h3 className="font-semibold dark:text-white capitalize">
                  {agent.name || agent.id}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {config.element} type
                </p>
                <span className={`inline-block mt-1.5 px-2 py-0.5 rounded-full text-xs ${
                  status === 'idle' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                  status === 'working' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                  status === 'review' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                  'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
                }`}>
                  {statusLabels[status]}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail Modal */}
      {selectedAgent && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
             onClick={() => setSelectedAgent(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-lg w-full p-6"
               onClick={(e) => e.stopPropagation()}>
            {(() => {
              const config = getConfig(selectedAgent);
              const status = getStatus(selectedAgent);
              return (
                <>
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{config.emoji}</span>
                      <div>
                        <h2 className="text-xl font-bold dark:text-white capitalize">
                          {selectedAgent.name || selectedAgent.id}
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {config.element} type
                        </p>
                      </div>
                    </div>
                    <button onClick={() => setSelectedAgent(null)}
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                      <span className="text-gray-500">✕</span>
                    </button>
                  </div>

                  {/* View toggle */}
                  <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-1 flex mb-4">
                    <button
                      onClick={() => setViewMode('2d')}
                      className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        viewMode === '2d'
                          ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                          : 'text-gray-500'
                      }`}
                    >
                      2D Sprite
                    </button>
                    <button
                      onClick={() => setViewMode('3d')}
                      className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        viewMode === '3d'
                          ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                          : 'text-gray-500'
                      }`}
                    >
                      3D Model
                    </button>
                  </div>

                  {/* Animation & Direction controls */}
                  {config.hasAssets && (
                    <div className="space-y-2 mb-4">
                      <div className="flex gap-2">
                        <label className="text-xs text-gray-500 dark:text-gray-400 w-16 pt-1">Anim:</label>
                        <div className="flex gap-1">
                          {(['idle', 'walk'] as Animation[]).map(a => (
                            <button key={a} onClick={() => setSelectedAnim(a)}
                              className={`px-3 py-1 rounded text-xs font-medium ${
                                selectedAnim === a 
                                  ? 'bg-yellow-500 text-black' 
                                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                              }`}>{a}</button>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <label className="text-xs text-gray-500 dark:text-gray-400 w-16 pt-1">Dir:</label>
                        <div className="flex gap-1 flex-wrap">
                          {DIRS.map((d, i) => (
                            <button key={d} onClick={() => setSelectedDir(i)}
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                selectedDir === i
                                  ? 'bg-yellow-500 text-black'
                                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                              }`}>{d}</button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Character viewer */}
                  <div 
                    className="w-full aspect-square rounded-xl mb-4 flex items-center justify-center text-8xl"
                    style={{ backgroundColor: config.color + '10' }}
                  >
                    {config.hasAssets && viewMode === '2d' ? (
                      <AnimatedSprite
                        agentName={(selectedAgent.name || selectedAgent.id).toLowerCase()}
                        animation={selectedAnim}
                        direction={selectedDir}
                        size={200}
                      />
                    ) : (
                      <span style={{ filter: `drop-shadow(0 0 16px ${config.color}60)` }}>
                        {config.emoji}
                      </span>
                    )}
                  </div>

                  {/* Status */}
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Status</span>
                      <span className={`font-medium ${
                        status === 'idle' ? 'text-green-600' :
                        status === 'working' ? 'text-blue-600' :
                        'text-gray-600'
                      }`}>{statusLabels[status]}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Assets</span>
                      <span className="text-gray-600 dark:text-gray-300">
                        {config.hasAssets ? '2D Sprites' : 'Not generated'}
                      </span>
                    </div>
                  </div>

                  {/* Full spritesheet preview */}
                  {config.hasAssets && (
                    <div className="mb-4">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Full Spritesheet (idle + walk)</p>
                      <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-900">
                        <img 
                          src={`${BASE}characters/${(selectedAgent.name || selectedAgent.id).toLowerCase()}/spritesheet_full.png`}
                          alt="Full spritesheet"
                          className="w-full"
                          style={{ imageRendering: 'pixelated' }}
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        8 directions × 5 rows (idle + 4 walk frames) • 128px per cell
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button className="flex-1 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black font-medium rounded-lg transition-colors text-sm">
                      Generate Character
                    </button>
                    <button className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      View Board
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

// Declare model-viewer for TypeScript
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        src?: string;
        'auto-rotate'?: boolean;
        'camera-controls'?: boolean;
      }, HTMLElement>;
    }
  }
}
