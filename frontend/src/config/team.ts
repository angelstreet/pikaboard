// Pokemon Team - Agent Roster Configuration
// UI defaults for team members - actual roster fetched dynamically from API

export interface TeamMember {
  id: string;
  name: string;
  role: 'captain' | 'specialist';
  roleLabel: string;
  function: string;
  avatar: string;       // Emoji fallback
  avatarImg: string;    // Image path (png or svg)
  color: string;
  boardId?: number; // Primary board ID this agent owns
  boards?: string[]; // Board names (legacy, for display)
}

interface UIDefaults {
  name: string;
  role: 'captain' | 'specialist';
  roleLabel: string;
  function: string;
  avatarImg: string;
  color: string;
  boardId?: number;
  boards?: string[];
}

// UI defaults for each agent - colors, avatars, roles, etc.
const AGENT_UI_DEFAULTS: Record<string, UIDefaults> = {
  main: {
    name: 'Pika',
    role: 'captain',
    roleLabel: 'CPT',
    function: 'Main Agent',
    avatarImg: '/characters/pika/avatar.png',
    color: '#FACC15', // yellow
    boardId: 1,
    boards: [],
  },
  bulbi: {
    name: 'Bulbi',
    role: 'specialist',
    roleLabel: 'SPC',
    function: 'PikaBoard Dev',
    avatarImg: '/characters/bulbi/avatar.png',
    color: '#22C55E', // green
    boardId: 6,
    boards: ['pikaboard'],
  },
  tortoise: {
    name: 'Tortoise',
    role: 'specialist',
    roleLabel: 'SPC',
    function: 'Personal Assistant',
    avatarImg: '/characters/tortoise/avatar.png',
    color: '#3B82F6', // blue
    boardId: 2,
    boards: ['personal'],
  },
  sala: {
    name: 'Sala',
    role: 'specialist',
    roleLabel: 'SPC',
    function: 'Work Projects',
    avatarImg: '/characters/sala/avatar.png',
    color: '#EF4444', // red
    boardId: 3,
    boards: ['work'],
  },
  evoli: {
    name: 'Evoli',
    role: 'specialist',
    roleLabel: 'SPC',
    function: 'VirtualPyTest Dev',
    avatarImg: '/characters/evoli/avatar.png',
    color: '#A855F7', // purple
    boardId: 4,
    boards: ['virtualpytest'],
  },
  psycho: {
    name: 'Psykokwak',
    role: 'specialist',
    roleLabel: 'SPC',
    function: 'EZPlanning Dev',
    avatarImg: '/characters/psykokwak/avatar.png',
    color: '#F97316', // orange
    boardId: 5,
    boards: ['ezplanning'],
  },
  mew: {
    name: 'Mew',
    role: 'specialist',
    roleLabel: 'SPC',
    function: 'Ideas & Product',
    avatarImg: '/characters/mew/avatar.png',
    color: '#EC4899', // pink
    boardId: 7,
    boards: ['ideas'],
  },
  porygon: {
    name: 'Porygon',
    role: 'specialist',
    roleLabel: 'SPC',
    function: 'Ops & Infra',
    avatarImg: '/characters/porygon/avatar.png',
    color: '#06B6D4', // cyan
    boardId: 12,
    boards: ['ops'],
  },
  lanturn: {
    name: 'Lanturn',
    role: 'specialist',
    roleLabel: 'QA',
    function: 'Operations & QA',
    avatarImg: '/characters/lanturn/avatar.png',
    color: '#0EA5E9', // sky blue
    boardId: undefined,
    boards: [],
  },
};

// Build TeamMember from API data + UI defaults
export function buildTeamMember(agentId: string, emoji: string): TeamMember {
  const defaults = AGENT_UI_DEFAULTS[agentId] || {
    name: agentId.charAt(0).toUpperCase() + agentId.slice(1),
    role: 'specialist' as const,
    roleLabel: 'SPC',
    function: 'Agent',
    avatarImg: '/characters/default/avatar.png',
    color: '#6B7280', // gray
    boardId: undefined,
    boards: [],
  };

  return {
    id: agentId,
    name: defaults.name,
    role: defaults.role,
    roleLabel: defaults.roleLabel,
    function: defaults.function,
    avatar: emoji,
    avatarImg: defaults.avatarImg,
    color: defaults.color,
    boardId: defaults.boardId,
    boards: defaults.boards,
  };
}

// Legacy hardcoded roster - DEPRECATED, use API instead
export const TEAM_ROSTER: TeamMember[] = [
  {
    id: 'main',
    name: 'Pika',
    role: 'captain',
    roleLabel: 'CPT',
    function: 'Main Agent',
    avatar: '⚡',
    avatarImg: '/characters/pika/avatar.png',
    color: '#FACC15', // yellow
    boardId: 1, // Main
    boards: [],
  },
  {
    // NOTE: OpenClaw agent id is currently `pika-ops`, but we want to present it as Mewtwo in the UI.
    // If/when the agent is renamed to `mewtwo`, update this id (and keep an alias in getTeamMember).
    id: 'pika-ops',
    name: 'Mewtwo',
    role: 'specialist',
    roleLabel: 'OPS',
    function: 'Operations Agent',
    avatar: '🧬',
    avatarImg: '/characters/mewtwo/avatar.png',
    color: '#9333EA', // psychic purple (distinct from yellow Pika)
    boardId: undefined,
    boards: [],
  },
  {
    id: 'bulbi',
    name: 'Bulbi',
    role: 'specialist',
    roleLabel: 'SPC',
    function: 'PikaBoard Dev',
    avatar: '🌱',
    avatarImg: '/characters/bulbi/avatar.png',
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
    avatarImg: '/characters/tortoise/avatar.png',
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
    avatarImg: '/characters/sala/avatar.png',
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
    avatarImg: '/characters/evoli/avatar.png',
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
    avatarImg: '/characters/psykokwak/avatar.png',
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
    avatarImg: '/characters/mew/avatar.png',
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
    avatarImg: '/characters/porygon/avatar.png',
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
    avatarImg: '/characters/lanturn/avatar.png',
    color: '#0EA5E9', // sky blue
    boardId: undefined, // No own board - works across all
    boards: [],
  },
];

export function getTeamMember(id: string): TeamMember | undefined {
  // Lightweight aliasing so the UI keeps working across agent renames.
  const normalized = id.toLowerCase();
  if (normalized === 'mewtwo') return TEAM_ROSTER.find(m => m.id === 'pika-ops');
  if (normalized === 'pika') return TEAM_ROSTER.find(m => m.id === 'main');
  return TEAM_ROSTER.find(m => m.id === id);
}
