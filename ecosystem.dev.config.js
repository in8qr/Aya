// Use this in the dev app directory (AyaDev branch) to run alongside production.
// Production: ecosystem.config.js (port 3001). Dev: this file (port 3002).
// Both use the same DATABASE_URL in .env.
module.exports = {
  apps: [
    {
      name: 'aya-eye-dev',
      script: 'npm',
      args: 'start',
      cwd: process.cwd(),
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3002,
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_memory_restart: '1G',
      watch: false,
      ignore_watch: ['node_modules', '.next', 'logs'],
    },
  ],
};
