import { useEffect, useState } from 'react';
import { api, Cron } from '../api/client';

type TimeRange = 'today' | 'week' | 'month';

export default function Routines() {
  const [crons, setCrons] = useState<Cron[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('today');

  useEffect(() => {
    loadCrons();
  }, []);

  async function loadCrons() {
    try {
      setLoading(true);
      const data = await api.getCrons();
      setCrons(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load routines');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading routines...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">🔄 Routines</h2>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {(['today', 'week', 'month'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                timeRange === range
                  ? 'bg-white shadow text-gray-900'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-700 mb-4">
          <strong>Warning:</strong> {error}
        </div>
      )}

      {crons.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          <p className="text-4xl mb-2">🔄</p>
          <p>No cron jobs configured</p>
          <p className="text-sm mt-1">
            Configure crons in OpenClaw to see them here
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow divide-y">
          {crons.map((cron, idx) => (
            <div key={idx} className="p-4 flex items-center justify-between">
              <div>
                <h3 className="font-medium">{cron.name || cron.schedule}</h3>
                <p className="text-sm text-gray-500 font-mono">{cron.schedule}</p>
              </div>
              <div className="text-sm text-gray-400">
                {cron.lastRun ? `Last: ${cron.lastRun}` : 'Never run'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
