import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { createServer } from 'node:http';
import { openDatabase } from './db.mjs';
import { createApp } from './app.mjs';

if (existsSync('.env')) loadEnvFile('.env');

const port = Number(process.env.API_PORT || 4000);
const host = process.env.API_HOST || '0.0.0.0';
const db = openDatabase();
const app = createApp({ db });
const server = createServer(app);

server.listen(port, host, () => {
  console.info(JSON.stringify({ service: 'agripulse-api', status: 'listening', host, port, environment: process.env.NODE_ENV || 'development' }));
});

const shutdown = (signal) => {
  console.info(JSON.stringify({ service: 'agripulse-api', status: 'shutting-down', signal }));
  server.close(() => {
    db.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
