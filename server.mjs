import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import path from 'node:path';
import express from 'express';
import { openDatabase } from './server/db.mjs';
import { createApp } from './server/app.mjs';

if (existsSync('.env')) {
  try {
    loadEnvFile('.env');
  } catch {
    // Ignore .env parsing errors
  }
}

const portArgIndex = process.argv.indexOf('--port');
const cliPort = portArgIndex !== -1 && process.argv[portArgIndex + 1] ? Number(process.argv[portArgIndex + 1]) : null;
const hostArgIndex = process.argv.indexOf('--host');
const cliHost = hostArgIndex !== -1 && process.argv[hostArgIndex + 1] ? process.argv[hostArgIndex + 1] : null;

const port = cliPort || Number(process.env.PORT || 3000);
const host = cliHost || process.env.HOST || '0.0.0.0';

const db = openDatabase();
const apiApp = createApp({ db });

const app = express();

// Route all /api requests through the existing express API application
app.use((req, res, next) => {
  if (req.url.startsWith('/api')) {
    return apiApp(req, res, next);
  }
  next();
});

// In production, serve built frontend assets from dist
if (process.env.NODE_ENV === 'production') {
  const distDir = path.resolve('dist');
  app.use(express.static(distDir));
  // Express 5 (path-to-regexp v8) requires a named catch-all; bare '*' throws at startup
  app.get('/{*splat}', (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
} else {
  // In development, mount Vite dev server in middleware mode
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true, host: '0.0.0.0', hmr: false },
    appType: 'spa',
  });
  app.use(vite.middlewares);
}

const server = app.listen(port, host, () => {
  console.info(
    JSON.stringify({
      service: 'agripulse-unified-server',
      status: 'listening',
      host,
      port,
      environment: process.env.NODE_ENV || 'development',
    })
  );
});

const shutdown = (signal) => {
  console.info(JSON.stringify({ service: 'agripulse-unified-server', status: 'shutting-down', signal }));
  server.close(() => {
    try {
      db.close();
    } catch {
      // Ignore
    }
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
