import { Link, useLocation } from 'react-router-dom';

interface MobileNavProps {
  onMenuClick: () => void;
}

export default function MobileNav({ onMenuClick }: MobileNavProps) {
  const location = useLocation();
  
  const navItems = [
    { path: '/', icon: '🏠', label: 'Home' },
    { path: '/boards', icon: '📋', label: 'Boards' },
    { path: '/agents', icon: '🤖', label: 'Agents' },
    { path: '/inbox', icon: '📥', label: 'Inbox' },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-40">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || 
            (item.path !== '/' && location.pathname.startsWith(item.path));
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center flex-1 h-full ${
                isActive 
                  ? 'text-orange-500' 
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-xs mt-1">{item.label}</span>
            </Link>
          );
        })}
        <button
          onClick={onMenuClick}
          className="flex flex-col items-center justify-center flex-1 h-full text-gray-500 dark:text-gray-400"
        >
          <span className="text-xl">☰</span>
          <span className="text-xs mt-1">More</span>
        </button>
      </div>
    </nav>
  );
}
