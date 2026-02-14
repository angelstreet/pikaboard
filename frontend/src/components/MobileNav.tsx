import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { api } from '../api/client';

interface MobileNavProps {
  onMenuClick: () => void;
}

export default function MobileNav({ onMenuClick }: MobileNavProps) {
  const location = useLocation();
  const [inboxCount, setInboxCount] = useState(0);
  
  // Fetch inbox count (only actionable tasks: approvals, questions, blockers, issues)
  useEffect(() => {
    const loadInboxCount = async () => {
      try {
        const tasks = await api.getTasks({ status: 'inbox' });
        const actionable = tasks.filter((t: { name: string }) => {
          const upper = t.name.toUpperCase();
          return (
            upper.startsWith('[APPROVAL]') ||
            upper.startsWith('[QUESTION]') ||
            upper.startsWith('[BLOCKER]') ||
            upper.startsWith('[ISSUE]')
          );
        });
        setInboxCount(actionable.length);
      } catch {
        // Ignore errors
      }
    };
    loadInboxCount();
    // Poll every 30 seconds
    const interval = setInterval(loadInboxCount, 30000);
    return () => clearInterval(interval);
  }, []);
  
  const navItems = [
    { path: '/', icon: '🏠', label: 'Home' },
    { path: '/boards', icon: '📋', label: 'Boards' },
    { path: '/agents', icon: '🤖', label: 'Agents' },
    { path: '/inbox', icon: '📥', label: 'Inbox', badge: inboxCount },
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
              className={`flex flex-col items-center justify-center flex-1 h-full relative ${
                isActive 
                  ? 'text-orange-500' 
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              <span className="text-xl relative">
                {item.icon}
                {item.badge && item.badge > 0 && (
                  <span className="absolute -top-1 -right-3 bg-red-500 text-white text-[10px] font-bold min-w-[16px] h-4 flex items-center justify-center rounded-full px-1">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </span>
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
