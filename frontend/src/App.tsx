import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
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

// Auth disabled - handled at nginx level
function App() {
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
      </Route>
    </Routes>
    </>
  );
}

export default App;
