import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Routines from './pages/Routines';
import Skills from './pages/Skills';

// Auth disabled - handled at nginx level
function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="routines" element={<Routines />} />
        <Route path="skills" element={<Skills />} />
      </Route>
    </Routes>
  );
}

export default App;
