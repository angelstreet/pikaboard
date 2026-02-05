import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import AuthGuard from './components/AuthGuard';
import Dashboard from './pages/Dashboard';
import Routines from './pages/Routines';
import Skills from './pages/Skills';

function App() {
  return (
    <AuthGuard>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="routines" element={<Routines />} />
          <Route path="skills" element={<Skills />} />
        </Route>
      </Routes>
    </AuthGuard>
  );
}

export default App;
