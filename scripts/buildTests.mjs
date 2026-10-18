/**
 * Bundles the field-intelligence unit tests with esbuild so `node --test` can run them.
 * Called by `npm run test:web`; not part of the production build.
 */
import { build } from 'esbuild';
import { mkdirSync } from 'node:fs';

mkdirSync('.smoke/tests', { recursive: true });

await build({
  entryPoints: ['scripts/intelligence.test.ts'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node22',
  outfile: '.smoke/tests/intelligence.test.cjs',
  loader: { '.ts': 'ts', '.tsx': 'tsx' },
  external: ['node:test', 'node:assert/strict'],
  define: {
    'import.meta.env.DEV': 'true',
    'import.meta.env.PROD': 'false',
    'import.meta.env.MODE': '"test"',
    'import.meta.env.BASE_URL': '"/"',
  },
  logLevel: 'warning',
});
