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
            <h1 className="text-2xl font-bold">⚡ PikaBoard</h1>
            <p className="text-gray-500 mt-2">Enter your API token to continue</p>
          </div>

          <form onSubmit={handleSubmit}>
            <input
              type="password"
              value={inputToken}
              onChange={(e) => setInputToken(e.target.value)}
              placeholder="API Token"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />

            {error && (
              <p className="text-red-500 text-sm mt-2">{error}</p>
            )}

            <button
              type="submit"
              className="w-full mt-4 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition"
            >
              Login
            </button>
          </form>

          <p className="text-xs text-gray-400 mt-4 text-center">
            Token is stored in localStorage
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
