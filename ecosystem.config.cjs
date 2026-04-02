module.exports = {
  apps: [
    {
      name: "paychainx-api",
      cwd: "./apps/api",
      script: "dist/server.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 8080
      }
    }
  ]
};
