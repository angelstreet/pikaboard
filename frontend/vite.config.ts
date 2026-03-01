import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { execSync } from 'child_process';
import { VitePWA } from 'vite-plugin-pwa';

function git(cmd: string): string {
  try { return execSync(`git ${cmd}`, { encoding: 'utf-8' }).trim(); }
  catch { return ''; }
}

const branch = git('rev-parse --abbrev-ref HEAD') || 'unknown';
const commit = git('rev-parse --short HEAD') || '?';
const version = '0.1.0';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['pwa-icon-192.png', 'pwa-icon-512.png'],
      manifest: {
        name: 'PikaBoard - Task Management',
        short_name: 'PikaBoard',
        description: 'PikaBoard Task Management',
        theme_color: '#F59E0B',
        background_color: '#F59E0B',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/pikaboard/',
        scope: '/pikaboard/',
        icons: [
          { src: 'pwa-icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /\/api\//,
            handler: 'NetworkFirst',
            options: { cacheName: 'api-cache', expiration: { maxEntries: 50, maxAgeSeconds: 300 } }
          }
        ]
      }
    })
  ],
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
    port: 3001,
      allowedHosts: ["pikaboard.angelstreet.io"],
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
