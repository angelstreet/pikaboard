import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth, useUser, SignIn } from '@clerk/clerk-react';
import { dark as clerkDark } from '@clerk/themes';
import Layout from './components/Layout';
import DashboardHome from './pages/DashboardHome';
import Boards from './pages/Boards';
import Agents from './pages/Agents';
import Inbox from './pages/Inbox';
import Insights from './pages/Insights';
import Settings from './pages/Settings';
import Library from './pages/Library';
import Files from './pages/Files';
import Chat from './pages/Chat';
import Usage from './pages/Usage';
import Goals from './pages/Goals';
import Reminders from './pages/Reminders';
const Apps = lazy(() => import('./pages/Apps'));
import { QuoteWidget } from './components/QuoteWidget';
import { setClerkTokenProvider } from './api/client';

const clerkEnabled = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// Read ?token= from URL and store in localStorage
(() => {
  const params = new URLSearchParams(window.location.search);
  const urlToken = params.get('token');
  if (urlToken) {
    localStorage.setItem('pikaboard_token', urlToken);
    const url = new URL(window.location.href);
    url.searchParams.delete('token');
    window.history.replaceState({}, '', url.toString());
  }
})();

/** Hook Clerk token into API client */
function ClerkTokenSync() {
  const { getToken } = useAuth();
  useEffect(() => {
    setClerkTokenProvider(getToken);
    return () => setClerkTokenProvider(() => Promise.resolve(null));
  }, [getToken]);
  return null;
}

/** Clerk auth gate */
function ClerkGate({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useUser();

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2 text-yellow-400">⚡ PikaBoard</h1>
          <p className="text-gray-400 text-sm mb-8">AI Agent Management</p>
          <SignIn routing="hash" appearance={{ baseTheme: clerkDark }} />
        </div>
      </div>
    );
  }

  return (
    <>
      <ClerkTokenSync />
      {children}
    </>
  );
}

function AppContent() {
  return (
    <>
      <Toaster position="top-right" toastOptions={{
        duration: 4000,
        style: {
          background: '#363636',
          color: '#fff',
        },
        success: {
          duration: 3000,
          iconTheme: {
            primary: '#4ade80',
            secondary: '#fff',
          },
        },
      }} />
      <QuoteWidget />
      <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<DashboardHome />} />
        <Route path="inbox" element={<Inbox />} />
        <Route path="boards" element={<Boards />} />
        <Route path="goals" element={<Goals />} />
        <Route path="reminders" element={<Reminders />} />
        <Route path="agents" element={<Agents />} />
        <Route path="chat" element={<Chat />} />
        <Route path="files" element={<Files />} />
        <Route path="insights" element={<Insights />} />
        <Route path="usage" element={<Usage />} />
        <Route path="library" element={<Library />} />
        <Route path="settings" element={<Settings />} />
        <Route path="apps" element={<Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div></div>}><Apps /></Suspense>} />
      </Route>
    </Routes>
    </>
  );
}

function App() {
  if (clerkEnabled) {
    return (
      <ClerkGate>
        <AppContent />
      </ClerkGate>
    );
  }
  return <AppContent />;
}

export default App;
