import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type EnvironmentMode = 'local' | 'prod';

interface EnvironmentContextType {
  mode: EnvironmentMode;
  toggleMode: () => void;
  isProduction: boolean;
}

const EnvironmentContext = createContext<EnvironmentContextType | null>(null);

export function EnvironmentProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<EnvironmentMode>(() => {
    const saved = localStorage.getItem('pikaboard-env-mode');
    // Default to prod if on vercel, local if on localhost
    if (!saved) {
      return window.location.hostname.includes('vercel.app') ? 'prod' : 'local';
    }
    return saved === 'prod' ? 'prod' : 'local';
  });

  useEffect(() => {
    localStorage.setItem('pikaboard-env-mode', mode);
    // Dispatch event for other components to listen
    window.dispatchEvent(new CustomEvent('env-mode-change', { detail: mode }));
  }, [mode]);

  const toggleMode = () => {
    setMode(prev => prev === 'local' ? 'prod' : 'local');
  };

  return (
    <EnvironmentContext.Provider value={{ mode, toggleMode, isProduction: mode === 'prod' }}>
      {children}
    </EnvironmentContext.Provider>
  );
}

export function useEnvironment() {
  const context = useContext(EnvironmentContext);
  if (!context) {
    throw new Error('useEnvironment must be used within EnvironmentProvider');
  }
  return context;
}

// Get production URLs from apps.md data
export const PROD_URLS = {
  pikaboard: 'https://pikaboard-angelstreets-projects.vercel.app',
  konto: 'https://kompta-frontend.vercel.app',
  kozy: 'https://kozy-steel.vercel.app',
  // Add other apps as needed
} as const;
