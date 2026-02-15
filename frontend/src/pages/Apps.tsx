import { useState, useEffect } from 'react';
import { useEnvironment } from '../contexts/EnvironmentContext';

interface AppInfo {
  name: string;
  slug: string;
  emoji: string;
  desc: string;
  localUrl?: string;
  vercelUrl?: string | null;
  repo?: string | null;
  status: string;
  dev?: boolean;
  location?: string;
  hasDb?: boolean;
  hasAuth?: boolean;
  ports?: Partial<{ frontend: number; backend: number }>;
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
  const { mode, toggleMode, isProductionuction } = useEnvironment();
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
      <div className="p-4 max-w-6xl mx-auto">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-4">🚀 Apps</h1>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 animate-pulse">
              <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-1" />
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">🚀 Apps</h1>
        <div className="flex items-center gap-3">
          {/* Environment Toggle */}
          <button
            onClick={toggleMode}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all duration-200
              bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600
              hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-sm"
          >
            <span className={`transition-opacity ${isProduction ? 'opacity-100' : 'opacity-40'}`}>🌐</span>
            <span className="text-gray-700 dark:text-gray-300">
              {isProduction ? 'Production' : 'Local'}
            </span>
            <div className={`w-8 h-4 rounded-full relative transition-colors ${isProduction ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
              <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${isProduction ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </div>
          </button>
          <span className="text-xs text-gray-400">{apps.length} apps</span>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        {apps.map((app) => {
          const isCurrent = app.name === currentAppName;
          const isComingSoon = app.status === 'coming soon';
          const targetUrl = isProduction ? app.vercelUrl : app.localUrl;
          const isExternal = isProduction && app.vercelUrl;

          return (
            <a
              key={app.slug}
              href={isComingSoon ? undefined : targetUrl || undefined}
              target={isExternal || (!isComingSoon && !isCurrent && isProduction) ? '_blank' : undefined}
              rel="noopener noreferrer"
              onClick={isCurrent && !isProduction ? (e) => e.preventDefault() : isComingSoon ? showComingSoon : undefined}
              className={`group relative flex flex-col rounded-lg border p-3 transition-all duration-200
                ${isCurrent && !isProduction
                  ? 'border-yellow-500/50 bg-yellow-500/5 dark:bg-yellow-500/10 cursor-default'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50'}
                ${!isComingSoon && !(isCurrent && !isProduction)
                  ? 'hover:scale-[1.02] hover:shadow-lg hover:shadow-yellow-500/10 hover:border-yellow-500/40 cursor-pointer'
                  : ''}
                ${isComingSoon ? 'opacity-85 cursor-pointer' : ''}
                ${!targetUrl && !isComingSoon ? 'opacity-60 cursor-not-allowed' : ''}
              `}
            >
              {isCurrent && !isProduction && (
                <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 bg-yellow-500/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                  ✓ Here
                </div>
              )}
              {isProduction && !app.vercelUrl && app.status !== 'coming soon' && (
                <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 bg-gray-500/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                  No prod
                </div>
              )}
              <div className="flex items-center gap-2 mb-2">
                <div className="text-2xl">{app.emoji}</div>
                <div className="font-semibold text-gray-900 dark:text-white text-sm leading-tight">{app.name}</div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 line-clamp-2 flex-1">{app.desc}</p>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded-full border ${statusColors[app.status]}`}>
                  {isCurrent && !isProduction ? 'current' : app.status}
                </span>
                {isProduction && <span className="text-[10px] text-blue-600 dark:text-blue-400" title="Production mode">🌐</span>}
                {!isProduction && <span className="text-[10px] text-green-600 dark:text-green-400" title="Local mode">💻</span>}
                {app.hasDb && <span className="text-[10px] text-gray-400" title="Has database">🗄️</span>}
                {app.hasAuth && <span className="text-[10px] text-gray-400" title="Has auth">🔐</span>}
                {app.dev === false && <span className="text-[10px] text-purple-600 dark:text-purple-400" title="External tool">🔧</span>}
              </div>
            </a>
          );
        })}
      </div>
      <ComingSoonModal />
    </div>
  );
}
