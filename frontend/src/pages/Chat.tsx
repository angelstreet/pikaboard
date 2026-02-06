import { useState } from 'react';

export default function Chat() {
  const [showFullscreen, setShowFullscreen] = useState(false);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">💬 Chat with Pika</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Talk directly to Pika through the OpenClaw gateway
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFullscreen(!showFullscreen)}
            className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-md transition-colors"
            title={showFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {showFullscreen ? '↙ Exit' : '↗ Expand'}
          </button>
          <a
            href="/openclaw/"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 text-sm bg-pika-500 hover:bg-pika-600 text-white rounded-md transition-colors inline-flex items-center gap-1"
          >
            Open Control UI ↗
          </a>
        </div>
      </div>

      {/* Embedded OpenClaw Control UI */}
      <div 
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700 transition-all ${
          showFullscreen 
            ? 'fixed inset-4 z-50' 
            : 'flex-1'
        }`}
        style={{ minHeight: showFullscreen ? undefined : 'calc(100vh - 280px)' }}
      >
        {showFullscreen && (
          <button
            onClick={() => setShowFullscreen(false)}
            className="absolute top-2 right-2 z-10 px-3 py-1 text-sm bg-gray-800 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            ✕ Close
          </button>
        )}
        <iframe
          src="/openclaw/"
          className="w-full h-full border-0"
          title="Pika Chat - OpenClaw Control"
          allow="clipboard-write"
          style={{ minHeight: showFullscreen ? '100%' : 'calc(100vh - 280px)' }}
        />
      </div>

      {/* Footer */}
      <div className="mt-2 text-center text-xs text-gray-500 dark:text-gray-400">
        Powered by OpenClaw Gateway • Chat with Pika using the embedded interface above
      </div>
    </div>
  );
}
