module.exports = {
  apps : [{
    name: "n8n-manager",
    script: "./backend/index.js",
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '200M',
    node_args: "--max-old-space-size=128",
    env: {
      NODE_ENV: "production",
      PORT: 3030
    }
  }]
};
