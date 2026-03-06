module.exports = {
  apps: [
    {
      name: 'pikaboard-backend',
      script: 'npm',
      args: 'start',
      cwd: '/home/jndoye/shared/projects/pikaboard/backend',
      interpreter: 'none',
      env: {
        NODE_ENV: 'production',
        PORT: 5001
      },
      watch: false,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 1000
    },
    {
      name: 'pikaboard-frontend',
      script: 'npm',
      args: 'run dev',
      cwd: '/home/jndoye/shared/projects/pikaboard/frontend',
      interpreter: 'none',
      env: {
        NODE_ENV: 'production',
        VITE_BASE_PATH: '/pikaboard/',
        VITE_API_URL: '/api',
        VITE_PORT: 3001
      },
      watch: false,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 1000
    }
  ]
};
