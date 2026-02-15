import { useEnvironment } from '../contexts/EnvironmentContext';

export default function GlobalEnvToggle() {
  const { mode, toggleMode, isProduction } = useEnvironment();

  return (
    <button
      onClick={toggleMode}
      className="flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-all duration-200
        bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600
        hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-sm"
      title={`Switch to ${isProduction ? 'Local' : 'Production'} mode`}
    >
      <span className={`transition-opacity ${isProduction ? 'opacity-100' : 'opacity-40'}`}>🌐</span>
      <span className="text-gray-700 dark:text-gray-300">
        {isProduction ? 'Prod' : 'Local'}
      </span>
      <div className={`w-7 h-3.5 rounded-full relative transition-colors ${isProduction ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
        <div className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-transform ${isProduction ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
      </div>
    </button>
  );
}
