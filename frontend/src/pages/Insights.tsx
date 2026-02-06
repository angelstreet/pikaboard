export default function Insights() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">📊 Insights</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Analytics and productivity metrics</p>
      </div>

      {/* Coming Soon */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-8 text-center">
        <div className="text-6xl mb-4">📈</div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Insights Coming Soon
        </h3>
        <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
          Track your productivity trends, task completion rates, and agent performance metrics.
        </p>
      </div>
    </div>
  );
}
