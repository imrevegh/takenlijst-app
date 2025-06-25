module.exports = {
  apps: [{
    name: 'takenlijst',
    script: 'server.js',
    instances: 1,
    exec_mode: 'fork',
    
    // Performance optimizations for inactivity
    autorestart: true,
    watch: false,
    max_memory_restart: '200M',
    
    // Prevent sleep/idle issues
    min_uptime: '10s',
    max_restarts: 5,
    
    // Environment variables
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    
    // Logging
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // Keep alive to prevent sleep mode issues
    node_args: '--max-old-space-size=256',
    
    // Auto-restart on crash
    restart_delay: 1000,
    
    // Heartbeat to keep process active
    kill_timeout: 5000,
    
    // Faster startup
    listen_timeout: 8000,
    
    // Keep process warm
    ignore_watch: ['node_modules', 'logs', 'data'],
    
    // Prevent memory leaks
    merge_logs: true,
    
    // Health check
    health_check_grace_period: 3000
  }]
};