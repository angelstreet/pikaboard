import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { execSync } from 'child_process';

function git(cmd: string): string {
  try { return execSync(`git ${cmd}`, { encoding: 'utf-8' }).trim(); }
  catch { return ''; }
}

const branch = git('rev-parse --abbrev-ref HEAD') || 'unknown';
const commit = git('rev-parse --short HEAD') || '?';
const version = '0.1.0';

export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || '/pikaboard/',
  define: {
    'import.meta.env.VITE_VERSION': JSON.stringify(version),
    'import.meta.env.VITE_BRANCH': JSON.stringify(branch),
    'import.meta.env.VITE_COMMIT': JSON.stringify(commit),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: parseInt(process.env.VITE_DEV_PORT || '3001'),
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
      '/pikaboard/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/pikaboard\/api/, '/api'),
      },
      '/pikaboard-dev/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/pikaboard-dev\/api/, '/api'),
      },
      '/widgets': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
      '/openclaw': {
        target: 'http://localhost:18789',
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
