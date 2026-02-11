import { useState } from 'react';

const apps = [
  { name: 'PikaBoard', emoji: '📋', desc: 'Task management for AI teams', url: '/pikaboard/', status: 'live' as const },
  { name: 'Kozy', emoji: '🏠', desc: 'Property management', url: '/kozy/', status: 'live' as const },
  { name: 'Konto', emoji: '💰', desc: 'AI-powered accounting', url: '/kompta/', status: 'dev' as const },
  { name: 'SoulSprite', emoji: '🎨', desc: 'Sprite & avatar generation', url: 'https://65.108.14.251:8080/soulsprite', status: 'live' as const },
  { name: 'SoulWorld', emoji: '🌍', desc: 'Virtual world explorer', url: '/soulworld/', status: 'live' as const },
  { name: 'SoulFight', emoji: '⚔️', desc: 'AI battle game', url: '#', status: 'coming soon' as const },
];

// Hook for coming soon alert
function useComingSoonAlert() {
  const [showAlert, setShowAlert] = useState(false);

  const showComingSoon = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowAlert(true);
  };

  const ComingSoonModal = () => {
    if (!showAlert) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowAlert(false)}>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4 border border-gray-200 dark:border-gray-700" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-3 mb-4">
            <div className="text-3xl">🚀</div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Coming Soon!</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">This feature is under development.</p>
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => setShowAlert(false)}
              className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    );
  };

  return { showComingSoon, ComingSoonModal };
}

const statusColors: Record<string, string> = {
  live: 'bg-green-500/20 text-green-400 border-green-500/30',
  dev: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  'coming soon': 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

// Detect if we're running in a specific app context
function getCurrentAppName(): string | null {
  const pathname = window.location.pathname;
  for (const app of apps) {
    // Match /appname/ or starts with /appname
    const appPath = app.url.replace(/\/$/, '');
    if (appPath && pathname.startsWith(appPath)) {
      return app.name;
    }
  }
  return null;
}

export default function Apps() {
  const currentAppName = getCurrentAppName();
  const { showComingSoon, ComingSoonModal } = useComingSoonAlert();

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-8">
      {/* Apps Section */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">🚀 Apps</h1>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          {apps.map((app) => {
            const isCurrent = app.name === currentAppName;
            const isComingSoon = app.status === 'coming soon';
            const isDisabled = isComingSoon;

            return (
              <a
                key={app.name}
                href={isDisabled ? undefined : app.url}
                target={!isDisabled ? '_blank' : undefined}
                rel="noopener noreferrer"
                onClick={isCurrent ? (e) => e.preventDefault() : isComingSoon ? showComingSoon : undefined}
                className={`group relative rounded-xl border p-4 sm:p-5 transition-all duration-200
                  ${isCurrent
                    ? 'border-yellow-500/50 bg-yellow-500/5 dark:bg-yellow-500/10 cursor-default'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50'}
                  ${!isDisabled
                    ? 'hover:scale-[1.03] hover:shadow-lg hover:shadow-yellow-500/10 hover:border-yellow-500/40 cursor-pointer'
                    : ''}
                  ${isComingSoon ? 'opacity-85 cursor-pointer' : ''}
                `}
              >
                {isCurrent && (
                  <div className="absolute top-2 right-2 flex items-center gap-1 bg-yellow-500/90 dark:bg-yellow-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                    ✓ You are here
                  </div>
                )}
                <div className="text-3xl sm:text-4xl mb-3">{app.emoji}</div>
                <div className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base mb-1">
                  {app.name}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">{app.desc}</p>
                <span className={`inline-block text-[10px] sm:text-xs px-2 py-0.5 rounded-full border ${statusColors[app.status]}`}>
                  {isCurrent ? 'current' : app.status}
                </span>
              </a>
            );
          })}
        </div>
      </div>

      {/* Coming Soon Modal */}
      <ComingSoonModal />
    </div>
  );
}
