import { useState } from 'react';

type Environment = 'prod' | 'dev';

const ENV_CONFIG: Record<Environment, { path: string; label: string; color: string; hoverColor: string }> = {
  prod: {
    path: '/pikaboard/',
    label: 'PROD',
    color: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
    hoverColor: 'hover:bg-green-200 dark:hover:bg-green-800/50',
  },
  dev: {
    path: '/pikaboard-dev/',
    label: 'DEV',
    color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300',
    hoverColor: 'hover:bg-orange-200 dark:hover:bg-orange-800/50',
  },
};

function getCurrentEnv(): Environment {
  const path = window.location.pathname;
  if (path.startsWith('/pikaboard-dev')) return 'dev';
  return 'prod';
}

export default function EnvToggle() {
  const [isOpen, setIsOpen] = useState(false);
  const currentEnv = getCurrentEnv();
  const current = ENV_CONFIG[currentEnv];
  
  const otherEnvs = (Object.keys(ENV_CONFIG) as Environment[]).filter(e => e !== currentEnv);

  const handleNavigate = (env: Environment) => {
    const config = ENV_CONFIG[env];
    // Use full URL to avoid issues with base path
    const url = `${window.location.origin}${config.path}`;
    window.location.href = url;
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`px-2 py-1 rounded text-xs font-bold transition-colors ${current.color} ${current.hoverColor}`}
      >
        {current.label} ▾
      </button>
      
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 mt-1 z-50 bg-white dark:bg-gray-800 rounded shadow-lg border border-gray-200 dark:border-gray-700 py-1 min-w-[80px]">
            {otherEnvs.map((env) => {
              const config = ENV_CONFIG[env];
              return (
                <button
                  key={env}
                  onClick={() => handleNavigate(env)}
                  className={`w-full px-3 py-1.5 text-xs font-bold text-left transition-colors ${config.color} ${config.hoverColor}`}
                >
                  {config.label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
