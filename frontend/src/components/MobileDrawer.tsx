import { Link } from 'react-router-dom';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileDrawer({ isOpen, onClose }: MobileDrawerProps) {
  if (!isOpen) return null;

  const menuItems = [
    { path: '/', icon: '🏠', label: 'Dashboard' },
    { path: '/boards', icon: '📋', label: 'Boards' },
    { path: '/agents', icon: '🤖', label: 'Agents' },
    { path: '/inbox', icon: '📥', label: 'Inbox' },
    { path: '/insights', icon: '📊', label: 'Insights' },
    { path: '/usage', icon: '💰', label: 'Usage' },
    { path: '/library', icon: '📚', label: 'Library' },
    { path: '/files', icon: '📁', label: 'Files' },
    { path: '/chat', icon: '💬', label: 'Chat' },
    { path: '/apps', icon: '🚀', label: 'Apps' },
    { path: '/settings', icon: '⚙️', label: 'Settings' },
    { path: '#logout', icon: '🚪', label: 'Logout' },
  ];

  return (
    <>
      {/* Backdrop */}
      <div 
        className="lg:hidden fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="lg:hidden fixed right-0 top-0 bottom-0 w-64 bg-white dark:bg-gray-800 z-50 shadow-xl">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="font-semibold text-gray-900 dark:text-white">Menu</h2>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            ✕
          </button>
        </div>
        
        <nav className="p-2">
          {menuItems.map((item) => (
            item.path === '#logout' ? (
              <button
                key={item.path}
                onClick={() => {
                  // PII Cleanup: Clear all PikaBoard localStorage items
                  Object.keys(localStorage).forEach(key => {
                    if (key.startsWith('pikaboard_')) {
                      localStorage.removeItem(key);
                    }
                  });
                  window.location.reload();
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <span className="text-xl">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ) : (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <span className="text-xl">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            )
          ))}
        </nav>
      </div>
    </>
  );
}
