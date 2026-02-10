import { useState, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, RoundedBox, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { api, Agent } from '../api/client';

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

function Scene({ agents }: { agents: Agent[] }) {
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
          <AgentCharacter agent={agent} position={positions[i]} index={i} />
          <Desk position={[positions[i][0], 0, positions[i][2] - 0.8]} />
        </group>
      ))}

      <OrbitControls
        makeDefault
        minDistance={5}
        maxDistance={25}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 3}
        target={[0, 1, 0]}
        enableDamping
      />
    </>
  );
}

export default function World() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="h-[calc(100vh-4rem)] w-full relative">
      <div className="absolute top-4 left-4 z-10">
        <h1 className="text-xl font-bold text-white">🌍 Agent World</h1>
        <p className="text-sm text-gray-400">{agents.length} agents • drag to orbit</p>
      </div>
      <Canvas
        shadows
        camera={{ position: [12, 10, 12], fov: 45 }}
        style={{ background: 'linear-gradient(180deg, #0a0a1a 0%, #1a1a2e 100%)' }}
      >
        <Scene agents={agents} />
      </Canvas>
    </div>
  );
}
