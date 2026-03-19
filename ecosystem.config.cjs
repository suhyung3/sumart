module.exports = {
  apps: [
    {
      name: 'sumart-backend',
      cwd: './backend',
      script: 'src/server.js',
      env: {
        NODE_ENV: 'production',
        PORT: 4100,
      },
    },
  ],
};
