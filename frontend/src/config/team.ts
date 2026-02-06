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
  boards?: string[]; // Which boards this agent owns
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
    boards: [], // Oversees all
  },
  {
    id: 'bulbi',
    name: 'Bulbi',
    role: 'specialist',
    roleLabel: 'SPC',
    function: 'PikaBoard Dev',
    avatar: '🌱',
    color: '#22C55E', // green
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
    boards: ['work'],
  },
  {
    id: 'evoli',
    name: 'Évoli',
    role: 'specialist',
    roleLabel: 'SPC',
    function: 'VirtualPyTest Dev',
    avatar: '🦊',
    color: '#A855F7', // purple
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
    boards: ['ideas'],
  },
];

export function getTeamMember(id: string): TeamMember | undefined {
  return TEAM_ROSTER.find(m => m.id === id);
}
