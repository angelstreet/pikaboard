import { useState, useEffect, ReactNode } from 'react';

interface AuthGuardProps {
  children: ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const [token, setToken] = useState<string | null>(null);
  const [inputToken, setInputToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('pikaboard_token');
    if (stored) {
      validateToken(stored);
    } else {
      setLoading(false);
    }
  }, []);

  async function validateToken(t: string) {
    try {
      const baseUrl = import.meta.env.PROD ? '/pikaboard/api' : '/api';
      const res = await fetch(`${baseUrl}/tasks?limit=1`, {
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
            Token stored locally in browser • <a href="#" className="underline" onClick={(e) => { e.preventDefault(); alert('Check TOOLS.md for your PikaBoard token'); }}>Where to find token?</a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Logout button in corner */}
      <button
        onClick={handleLogout}
        className="fixed top-4 right-4 text-xs text-gray-400 hover:text-gray-600"
      >
        Logout
      </button>
      {children}
    </div>
  );
}
