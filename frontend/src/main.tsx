import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ClerkProvider } from '@clerk/clerk-react';
import App from './App';
import { ThemeProvider } from './context/ThemeContext';
import { EnvironmentProvider } from './contexts/EnvironmentContext';
import './index.css';

// Use base path from vite config (set via VITE_BASE_PATH env)
const basename = import.meta.env.BASE_URL || '/';
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const app = (
  <React.StrictMode>
    <EnvironmentProvider>
      <ThemeProvider>
        <BrowserRouter basename={basename} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <App />
        </BrowserRouter>
      </ThemeProvider>
    </EnvironmentProvider>
  </React.StrictMode>
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  clerkPubKey
    ? <ClerkProvider publishableKey={clerkPubKey}>{app}</ClerkProvider>
    : app
);
