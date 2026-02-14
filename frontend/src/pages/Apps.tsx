import { useState, useEffect } from 'react';

interface AppInfo {
  name: string;
  slug: string;
  emoji: string;
  desc: string;
  localUrl: string;
  vercelUrl: string | null;
  repo: string | null;
  status: 'live' | 'dev' | 'coming soon';
  hasDb: boolean;
  hasAuth: boolean;
  ports: { frontend: number; backend: number };
}

const statusColors: Record<string, string> = {
  live: 'bg-green-500/20 text-green-400 border-green-500/30',
  dev: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  'coming soon': 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

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
            <button onClick={() => setShowAlert(false)} className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">OK</button>
          </div>
        </div>
      </div>
    );
  };

  return { showComingSoon, ComingSoonModal };
}

export default function Apps() {
  const [apps, setApps] = useState<AppInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const { showComingSoon, ComingSoonModal } = useComingSoonAlert();

  useEffect(() => {
    fetch('/api/apps')
      .then((r) => r.json())
      .then((data) => {
        setApps(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const currentAppName = (() => {
    const pathname = window.location.pathname;
    for (const app of apps) {
      const appPath = app.localUrl?.replace(/\/$/, '');
      if (appPath && pathname.startsWith(appPath)) return app.name;
    }
    return null;
  })();

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">🚀 Apps</h1>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="rounded-xl border border-gray-200 dark:border-gray-700 p-5 animate-pulse">
              <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded mb-3" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-2" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">🚀 Apps</h1>
          <span className="text-xs text-gray-400">{apps.length} apps</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          {apps.map((app) => {
            const isCurrent = app.name === currentAppName;
            const isComingSoon = app.status === 'coming soon';

            return (
              <a
                key={app.slug}
                href={isComingSoon ? undefined : app.localUrl}
                target={!isComingSoon && !isCurrent ? '_blank' : undefined}
                rel="noopener noreferrer"
                onClick={isCurrent ? (e) => e.preventDefault() : isComingSoon ? showComingSoon : undefined}
                className={`group relative rounded-xl border p-4 sm:p-5 transition-all duration-200
                  ${isCurrent
                    ? 'border-yellow-500/50 bg-yellow-500/5 dark:bg-yellow-500/10 cursor-default'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50'}
                  ${!isComingSoon && !isCurrent
                    ? 'hover:scale-[1.03] hover:shadow-lg hover:shadow-yellow-500/10 hover:border-yellow-500/40 cursor-pointer'
                    : ''}
                  ${isComingSoon ? 'opacity-85 cursor-pointer' : ''}
                `}
              >
                {isCurrent && (
                  <div className="absolute top-2 right-2 flex items-center gap-1 bg-yellow-500/90 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                    ✓ You are here
                  </div>
                )}
                <div className="text-3xl sm:text-4xl mb-3">{app.emoji}</div>
                <div className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base mb-1">{app.name}</div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">{app.desc}</p>
                <div className="flex items-center gap-2">
                  <span className={`inline-block text-[10px] sm:text-xs px-2 py-0.5 rounded-full border ${statusColors[app.status]}`}>
                    {isCurrent ? 'current' : app.status}
                  </span>
                  {app.hasDb && <span className="text-[10px] text-gray-400" title="Has database">🗄️</span>}
                  {app.hasAuth && <span className="text-[10px] text-gray-400" title="Has auth">🔐</span>}
                </div>
              </a>
            );
          })}
        </div>
      </div>
      <ComingSoonModal />
    </div>
  );
}
