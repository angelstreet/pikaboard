import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import DashboardHome from './pages/DashboardHome';
import Boards from './pages/Boards';
import Agents from './pages/Agents';
import Insights from './pages/Insights';
import Settings from './pages/Settings';
import Library from './pages/Library';
import Files from './pages/Files';
import Chat from './pages/Chat';

// Auth disabled - handled at nginx level
function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<DashboardHome />} />
        <Route path="boards" element={<Boards />} />
        <Route path="agents" element={<Agents />} />
        <Route path="chat" element={<Chat />} />
        <Route path="files" element={<Files />} />
        <Route path="insights" element={<Insights />} />
        <Route path="library" element={<Library />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}

export default App;
