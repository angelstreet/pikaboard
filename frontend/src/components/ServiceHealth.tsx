import { useState, useEffect } from 'react';
import { api } from '../api/client';

interface ServiceStatus {
  name: string;
  status: 'up' | 'down';
  latencyMs: number;
  type: string;
}

interface HealthResponse {
  services: ServiceStatus[];
  checkedAt: string;
}

export default function ServiceHealth() {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);

  const fetchHealth = async () => {
    try {
      setLoading(true);
      const res = await api.get<HealthResponse>('/services/health');
      setData(res);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const allUp = data?.services.every(s => s.status === 'up');
  const downCount = data?.services.filter(s => s.status !== 'up').length || 0;

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${expanded ? 'border-b border-gray-200 dark:border-gray-700' : ''}`}
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          🏥 Service Health
        </h3>
        <div className="flex items-center gap-3">
          {data && !expanded && (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              allUp
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
            }`}>
              {allUp ? 'All Healthy' : `${downCount} Down`}
            </span>
          )}
          <span className={`text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </div>
      </button>

      {expanded && (
        <div className="p-4">
          {error ? (
            <p className="text-red-500 text-sm">⚠️ {error}</p>
          ) : !data ? (
            <div className="animate-pulse space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {data.services.map((svc) => (
                <div
                  key={svc.name}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50"
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-2.5 h-2.5 rounded-full ${svc.status === 'up' ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{svc.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {svc.status === 'up' && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">{svc.latencyMs}ms</span>
                    )}
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      svc.status === 'up'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {svc.status === 'up' ? 'Healthy' : 'Down'}
                    </span>
                  </div>
                </div>
              ))}
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 text-right">
                Last checked: {new Date(data.checkedAt).toLocaleTimeString()}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
