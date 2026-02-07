// Pokemon Team - Agent Roster Configuration
// These are the persistent team members, not run instances

export interface TeamMember {
  id: string;
  name: string;
  role: 'captain' | 'specialist';
  roleLabel: string;
  function: string;
  avatar: string;
  color: string;
  boardId?: number; // Primary board ID this agent owns
  boards?: string[]; // Board names (legacy, for display)
}

export const TEAM_ROSTER: TeamMember[] = [
  {
    id: 'pika',
    name: 'Pika',
    role: 'captain',
    roleLabel: 'CPT',
    function: 'Main Agent',
    avatar: '⚡',
    color: '#FACC15', // yellow
    boardId: 1, // Main
    boards: [],
  },
  {
    id: 'bulbi',
    name: 'Bulbi',
    role: 'specialist',
    roleLabel: 'SPC',
    function: 'PikaBoard Dev',
    avatar: '🌱',
    color: '#22C55E', // green
    boardId: 6, // PikaBoard
    boards: ['pikaboard'],
  },
  {
    id: 'tortoise',
    name: 'Tortoise',
    role: 'specialist',
    roleLabel: 'SPC',
    function: 'Personal Assistant',
    avatar: '🐢',
    color: '#3B82F6', // blue
    boardId: 2, // Personal
    boards: ['personal'],
  },
  {
    id: 'sala',
    name: 'Sala',
    role: 'specialist',
    roleLabel: 'SPC',
    function: 'Work Projects',
    avatar: '🔥',
    color: '#EF4444', // red
    boardId: 3, // Work Projects
    boards: ['work'],
  },
  {
    id: 'evoli',
    name: 'Evoli',
    role: 'specialist',
    roleLabel: 'SPC',
    function: 'VirtualPyTest Dev',
    avatar: '🦊',
    color: '#A855F7', // purple
    boardId: 4, // VirtualPyTest
    boards: ['virtualpytest'],
  },
  {
    id: 'psykokwak',
    name: 'Psykokwak',
    role: 'specialist',
    roleLabel: 'SPC',
    function: 'EZPlanning Dev',
    avatar: '🦆',
    color: '#F97316', // orange
    boardId: 5, // AIIT/EZPlanning
    boards: ['ezplanning'],
  },
  {
    id: 'mew',
    name: 'Mew',
    role: 'specialist',
    roleLabel: 'SPC',
    function: 'Ideas & Product',
    avatar: '✨',
    color: '#EC4899', // pink
    boardId: 7, // Ideas Lab
    boards: ['ideas'],
  },
  {
    id: 'porygon',
    name: 'Porygon',
    role: 'specialist',
    roleLabel: 'SPC',
    function: 'Ops & Infra',
    avatar: '🔷',
    color: '#06B6D4', // cyan
    boardId: 12, // Ops
    boards: ['ops'],
  },
  {
    id: 'lanturn',
    name: 'Lanturn',
    role: 'specialist',
    roleLabel: 'QA',
    function: 'Operations & QA',
    avatar: '🔦',
    color: '#0EA5E9', // sky blue
    boardId: undefined, // No own board - works across all
    boards: [],
  },
];

export function getTeamMember(id: string): TeamMember | undefined {
  return TEAM_ROSTER.find(m => m.id === id);
}
