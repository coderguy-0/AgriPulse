/**
 * Bundles the render smoke test (scripts/ssrSmoke.tsx) with esbuild so it can run under Node.
 * Called by `npm run test:render`; not part of the production build.
 */
import { build } from 'esbuild';

await build({
  entryPoints: ['scripts/ssrSmoke.tsx'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node22',
  outfile: '.smoke/ssrSmoke.cjs',
  banner: { js: "const __importMetaEnv = { DEV: true, PROD: false, MODE: 'test', BASE_URL: '/' }; if (typeof import_meta === 'undefined') {}" },
  jsx: 'automatic',
  loader: { '.tsx': 'tsx', '.ts': 'ts' },
  define: {
    'import.meta.env.DEV': 'true',
    'import.meta.env.PROD': 'false',
    'import.meta.env.MODE': '"test"',
    'import.meta.env.VITE_AI_BACKEND_ENDPOINT': '""',
    'import.meta.env.VITE_NEWS_API_ENDPOINT': '""',
    'import.meta.env.VITE_WEATHER_API_URL': '""',
    'import.meta.env.VITE_WEATHER_API_KEY': '""',
    'import.meta.env.VITE_SUPABASE_URL': '""',
    'import.meta.env.VITE_SUPABASE_ANON_KEY': '""',
    'import.meta.env.BASE_URL': '"/"',
  },
  logLevel: 'warning',
});
