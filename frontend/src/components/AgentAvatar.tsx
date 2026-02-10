import { useState } from 'react';
import { TeamMember, getTeamMember } from '../config/team';

interface AgentAvatarProps {
  /** Team member object or agent ID string */
  agent: TeamMember | string;
  /** Size in pixels (default 40) */
  size?: number;
  className?: string;
}

/**
 * Renders an agent's avatar image with emoji fallback.
 * Uses extracted sprite frame for Pika, colored circle + emoji SVGs for others.
 */
export default function AgentAvatar({ agent, size = 40, className = '' }: AgentAvatarProps) {
  const member = typeof agent === 'string' ? getTeamMember(agent) : agent;
  const [imgError, setImgError] = useState(false);

  if (!member) {
    return (
      <div
        className={`rounded-full flex items-center justify-center bg-gray-200 dark:bg-gray-700 ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.5 }}
      >
        🤖
      </div>
    );
  }

  if (imgError || !member.avatarImg) {
    return (
      <div
        className={`rounded-full flex items-center justify-center ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.5, backgroundColor: `${member.color}20` }}
      >
        {member.avatar}
      </div>
    );
  }

  const base = import.meta.env.BASE_URL || '/';
  const src = member.avatarImg.startsWith('/') ? `${base}${member.avatarImg.slice(1)}` : member.avatarImg;

  return (
    <img
      src={src}
      alt={member.name}
      onError={() => setImgError(true)}
      className={`rounded-full object-cover ${className}`}
      style={{ width: size, height: size, backgroundColor: `${member.color}15`, border: `2px solid ${member.color}` }}
    />
  );
}
