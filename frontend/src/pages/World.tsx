import { useState, useEffect, useRef, useMemo, Component, Suspense as RSuspense, type ReactNode } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls, Text, RoundedBox, Grid } from '@react-three/drei';
import * as THREE from 'three';

// Error boundary around Canvas to prevent full-page crashes
class CanvasErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null as string | null };
  static getDerivedStateFromError(err: Error) { return { error: err.message }; }
  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center h-full bg-gray-900 text-white gap-4">
          <p className="text-red-400 text-lg">🌍 World failed to render</p>
          <p className="text-gray-400 text-sm max-w-md text-center">{this.state.error}</p>
          <button onClick={() => this.setState({ error: null })} className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-500 text-sm">
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
import { api, Agent } from '../api/client';

const BASE = import.meta.env.BASE_URL || '/';

const AGENT_COLORS: Record<string, string> = {
  pika: '#FFD700',
  lanturn: '#4FC3F7',
  bulbi: '#4CAF50',
  evoli: '#A1887F',
  psykokwak: '#FFB74D',
  mew: '#CE93D8',
  tortoise: '#5C6BC0',
  sala: '#EF5350',
  porygon: '#26C6DA',
};

function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
      <planeGeometry args={[30, 30]} />
      <meshStandardMaterial color="#1a1a2e" transparent opacity={0.8} />
    </mesh>
  );
}

function Desk({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <RoundedBox args={[1.6, 0.08, 0.8]} position={[0, 0.7, -0.5]} radius={0.02}>
        <meshStandardMaterial color="#2d2d3d" />
      </RoundedBox>
      <RoundedBox args={[0.8, 0.5, 0.05]} position={[0, 1.15, -0.7]} radius={0.02}>
        <meshStandardMaterial color="#1a1a2e" emissive="#3b82f6" emissiveIntensity={0.15} />
      </RoundedBox>
      <mesh position={[0, 0.9, -0.7]}>
        <boxGeometry args={[0.1, 0.2, 0.05]} />
        <meshStandardMaterial color="#333" />
      </mesh>
    </group>
  );
}

// Agents with generated spritesheets
const AGENTS_WITH_SPRITES = ['pika'];

// Separate component for sprite — keeps hooks stable
function SpriteCharacter({ agent, position, index }: { 
  agent: Agent; position: [number, number, number]; index: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const color = AGENT_COLORS[agent.id] || '#888';
  
  const texture = useLoader(THREE.TextureLoader, `${BASE}characters/${agent.id}/spritesheet_idle.png`);
  
  const clonedTexture = useMemo(() => {
    const t = texture.clone();
    t.needsUpdate = true;
    t.repeat.set(1/8, 1);
    t.offset.set(0, 0);
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestFilter;
    return t;
  }, [texture]);

  useFrame((state) => {
    if (groupRef.current) {
      const t = state.clock.elapsedTime + index * 1.5;
      groupRef.current.position.y = position[1] + Math.sin(t * 1.5) * 0.05;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      <mesh position={[0, 1, 0]}>
        <planeGeometry args={[1.5, 1.5]} />
        <meshBasicMaterial map={clonedTexture} transparent alphaTest={0.1} side={THREE.DoubleSide} />
      </mesh>
      <Text position={[0, 2.0, 0]} fontSize={0.18} color="white" anchorX="center" anchorY="middle" font="https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxP.ttf">
        {agent.name || agent.id}
      </Text>
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.3, 0.4, 32]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} transparent opacity={0.4} />
      </mesh>
    </group>
  );
}

function AgentCharacter({ agent, position, index }: { agent: Agent; position: [number, number, number]; index: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const color = AGENT_COLORS[agent.id] || '#888';

  useFrame((state) => {
    if (groupRef.current) {
      const t = state.clock.elapsedTime + index * 1.5;
      groupRef.current.position.y = position[1] + Math.sin(t * 1.5) * 0.05;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Body */}
      <RoundedBox args={[0.5, 0.6, 0.35]} position={[0, 0.5, 0]} radius={0.1}>
        <meshStandardMaterial color={color} />
      </RoundedBox>
      {/* Head */}
      <mesh position={[0, 1.0, 0]}>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Eyes */}
      <mesh position={[-0.08, 1.05, 0.22]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color="white" />
      </mesh>
      <mesh position={[0.08, 1.05, 0.22]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color="white" />
      </mesh>
      <mesh position={[-0.08, 1.05, 0.24]}>
        <sphereGeometry args={[0.02, 8, 8]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[0.08, 1.05, 0.24]}>
        <sphereGeometry args={[0.02, 8, 8]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      {/* Name */}
      <Text position={[0, 1.45, 0]} fontSize={0.18} color="white" anchorX="center" anchorY="middle">
        {agent.name || agent.id}
      </Text>
      {/* Status ring */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.3, 0.4, 32]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} transparent opacity={0.4} />
      </mesh>
    </group>
  );
}

function Scene({ agents, controlsRef }: { agents: Agent[]; controlsRef: React.MutableRefObject<any> }) {
  const positions: [number, number, number][] = agents.map((_, i) => {
    const angle = (i / agents.length) * Math.PI * 2;
    const radius = 5;
    return [Math.cos(angle) * radius, 0, Math.sin(angle) * radius];
  });

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 15, 10]} intensity={0.8} castShadow />
      <pointLight position={[0, 5, 0]} intensity={0.3} color="#4a4aff" />

      <Ground />
      <Grid args={[30, 30]} cellColor="#2a2a4a" sectionColor="#3a3a5a" fadeDistance={25} cellSize={2} sectionSize={6} />

      {agents.map((agent, i) => (
        <group key={agent.id}>
          {AGENTS_WITH_SPRITES.includes(agent.id) ? (
            <RSuspense fallback={<AgentCharacter agent={agent} position={positions[i]} index={i} />}>
              <SpriteCharacter agent={agent} position={positions[i]} index={i} />
            </RSuspense>
          ) : (
            <AgentCharacter agent={agent} position={positions[i]} index={i} />
          )}
          <Desk position={[positions[i][0], 0, positions[i][2] - 0.8]} />
        </group>
      ))}

      <OrbitControls
        ref={controlsRef}
        makeDefault
        minDistance={5}
        maxDistance={25}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI / 4}
        target={[0, 1, 0]}
        enableDamping
        enablePan={false}
      />
    </>
  );
}

export default function World() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const controlsRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);

  useEffect(() => {
    api.getAgents()
      .then(setAgents)
      .catch(() => {
        setAgents([
          { id: 'pika', name: 'Pika', role: 'Captain' },
          { id: 'lanturn', name: 'Lanturn', role: 'Dispatcher' },
          { id: 'bulbi', name: 'Bulbi', role: 'Developer' },
          { id: 'evoli', name: 'Évoli', role: 'Developer' },
          { id: 'psykokwak', name: 'Psykokwak', role: 'Developer' },
          { id: 'mew', name: 'Mew', role: 'Product' },
          { id: 'tortoise', name: 'Tortoise', role: 'Assistant' },
          { id: 'sala', name: 'Sala', role: 'Developer' },
          { id: 'porygon', name: 'Porygon', role: 'Ops' },
        ] as Agent[]);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-gray-400">Loading world...</div>
      </div>
    );
  }

  function handleRecenter() {
    if (controlsRef.current && cameraRef.current) {
      cameraRef.current.position.set(12, 10, 12);
      controlsRef.current.target.set(0, 1, 0);
      controlsRef.current.update();
    }
  }

  function handleZoom(dir: number) {
    if (cameraRef.current) {
      const pos = cameraRef.current.position;
      const target = new THREE.Vector3(0, 1, 0);
      const direction = pos.clone().sub(target).normalize();
      const newPos = pos.clone().add(direction.multiplyScalar(dir * 2));
      const dist = newPos.distanceTo(target);
      if (dist >= 5 && dist <= 25) {
        cameraRef.current.position.copy(newPos);
      }
    }
  }

  return (
    <div className="h-[calc(100vh-4rem)] w-full relative">
      <div className="absolute top-4 left-4 z-10">
        <h1 className="text-xl font-bold text-white">🌍 Agent World</h1>
        <p className="text-sm text-gray-400">{agents.length} agents • drag to rotate</p>
      </div>
      {/* Zoom & recenter controls */}
      <div className="absolute bottom-6 right-4 z-10 flex flex-col gap-2">
        <button onClick={() => handleZoom(-1)} className="w-10 h-10 rounded-lg bg-gray-800/80 hover:bg-gray-700 text-white text-xl font-bold flex items-center justify-center backdrop-blur-sm border border-gray-600/50">+</button>
        <button onClick={() => handleZoom(1)} className="w-10 h-10 rounded-lg bg-gray-800/80 hover:bg-gray-700 text-white text-xl font-bold flex items-center justify-center backdrop-blur-sm border border-gray-600/50">−</button>
        <button onClick={handleRecenter} className="w-10 h-10 rounded-lg bg-gray-800/80 hover:bg-gray-700 text-white text-sm flex items-center justify-center backdrop-blur-sm border border-gray-600/50" title="Recenter">⌂</button>
      </div>
      <CanvasErrorBoundary>
        <Canvas
          shadows
          camera={{ position: [12, 10, 12], fov: 45 }}
          style={{ background: 'linear-gradient(180deg, #0a0a1a 0%, #1a1a2e 100%)' }}
          onCreated={({ camera }) => { cameraRef.current = camera; }}
        >
          <Scene agents={agents} controlsRef={controlsRef} />
        </Canvas>
      </CanvasErrorBoundary>
    </div>
  );
}
