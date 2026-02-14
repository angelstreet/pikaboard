import { useState, useEffect, ReactNode } from 'react';
import { API_BASE_URL } from '../api/client';

interface AuthGuardProps {
  children: ReactNode;
}

// Hook for info alert
function useInfoAlert() {
  const [showAlert, setShowAlert] = useState(false);

  const showInfo = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowAlert(true);
  };

  const InfoModal = () => {
    if (!showAlert) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowAlert(false)}>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4 border border-gray-200 dark:border-gray-700" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-3 mb-4">
            <div className="text-3xl">🔑</div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Where to Find Token</h3>
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Check TOOLS.md for your PikaBoard token. The token is stored locally in your browser.
          </p>
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

  return { showInfo, InfoModal };
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const [token, setToken] = useState<string | null>(null);
  const [inputToken, setInputToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const { showInfo, InfoModal } = useInfoAlert();

  useEffect(() => {
    // Check URL ?token= param first
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    if (urlToken) {
      // Clean the URL (remove token from address bar)
      const url = new URL(window.location.href);
      url.searchParams.delete('token');
      window.history.replaceState({}, '', url.toString());
      validateToken(urlToken);
      return;
    }

    const stored = localStorage.getItem('pikaboard_token');
    if (stored) {
      validateToken(stored);
    } else {
      setLoading(false);
    }
  }, []);

  async function validateToken(t: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/tasks`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (res.ok) {
        setToken(t);
        localStorage.setItem('pikaboard_token', t);
        setError('');
      } else {
        setError('Invalid token');
        localStorage.removeItem('pikaboard_token');
      }
    } catch {
      setError('Failed to connect to API');
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (inputToken.trim()) {
      setLoading(true);
      validateToken(inputToken.trim());
    }
  }

  function handleLogout() {
    localStorage.removeItem('pikaboard_token');
    setToken(null);
    setInputToken('');
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold">⚡ PikaBoard</h1>
            <p className="text-gray-500 mt-2">Agent Dashboard</p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-yellow-800 text-sm">
              <strong>🔑 Token Required</strong><br />
              Enter your PikaBoard API token to access the dashboard.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              API Token
            </label>
            <input
              type="password"
              value={inputToken}
              onChange={(e) => setInputToken(e.target.value)}
              placeholder="Paste your token here..."
              className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              autoFocus
            />

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-3">
                <p className="text-red-700 text-sm">❌ {error}</p>
              </div>
            )}

            {!inputToken.trim() && (
              <p className="text-gray-400 text-xs mt-2">
                Token cannot be empty
              </p>
            )}

            <button
              type="submit"
              disabled={!inputToken.trim() || loading}
              className="w-full mt-4 bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
            >
              {loading ? 'Verifying...' : 'Login'}
            </button>
          </form>

          <p className="text-xs text-gray-400 mt-6 text-center">
            Token stored locally in browser • <a href="#" className="underline" onClick={showInfo}>Where to find token?</a>
          </p>

          {/* Info Modal */}
          <InfoModal />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
