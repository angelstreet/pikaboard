import SystemStats from '../components/SystemStats';

export default function Settings() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">⚙️ Settings</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-1">System monitoring and configuration</p>
      </div>

      {/* System Monitoring */}
      <SystemStats />

      {/* Placeholder for future settings */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          🔧 Configuration
        </h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Additional settings and configuration options coming soon.
        </p>
      </div>
    </div>
  );
}
