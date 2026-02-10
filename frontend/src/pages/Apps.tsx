const apps = [
  { name: 'PikaBoard', emoji: '📋', desc: 'Task management for AI teams', url: '/pikaboard/', status: 'live' as const, current: true },
  { name: 'Kozy', emoji: '🏠', desc: 'Property management', url: '/kozy/', status: 'live' as const },
  { name: 'Konto', emoji: '💰', desc: 'AI-powered accounting', url: '/kompta/', status: 'dev' as const },
  { name: 'SoulSprite', emoji: '🎨', desc: 'Sprite & avatar generation', url: '/soulsprite/', status: 'coming soon' as const },
  { name: 'SoulWorld', emoji: '🌍', desc: 'Virtual world explorer', url: '/soulworld/', status: 'coming soon' as const },
  { name: 'SoulFight', emoji: '⚔️', desc: 'AI battle game', url: '#', status: 'coming soon' as const },
];

const statusColors: Record<string, string> = {
  live: 'bg-green-500/20 text-green-400 border-green-500/30',
  dev: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  'coming soon': 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

export default function Apps() {
  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">🚀 Apps</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        {apps.map((app) => (
          <a
            key={app.name}
            href={app.status === 'coming soon' ? undefined : app.url}
            target={app.status !== 'coming soon' ? '_blank' : undefined}
            rel="noopener noreferrer"
            className={`group relative rounded-xl border p-4 sm:p-5 transition-all duration-200
              ${app.current
                ? 'border-yellow-500/50 bg-yellow-500/5 dark:bg-yellow-500/10'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50'}
              ${app.status !== 'coming soon'
                ? 'hover:scale-[1.03] hover:shadow-lg hover:shadow-yellow-500/10 hover:border-yellow-500/40 cursor-pointer'
                : 'opacity-60 cursor-default'}
            `}
          >
            <div className="text-3xl sm:text-4xl mb-3">{app.emoji}</div>
            <div className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base mb-1">
              {app.name}
              {app.current && <span className="ml-1.5 text-[10px] text-yellow-500">● YOU</span>}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">{app.desc}</p>
            <span className={`inline-block text-[10px] sm:text-xs px-2 py-0.5 rounded-full border ${statusColors[app.status]}`}>
              {app.status}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
