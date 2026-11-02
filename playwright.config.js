import { defineConfig } from '@playwright/test';

const launchOptions = process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {};

export default defineConfig({
  testDir: 'tests/e2e',
  use: { viewport: { width: 390, height: 844 }, launchOptions },
  projects: [
    { name: 'local', testMatch: 'app.spec.js', use: { baseURL: 'http://localhost:4173' } },
    { name: 'native', testMatch: 'native.spec.js', use: { baseURL: 'http://localhost:4173' } },
    { name: 'site', testMatch: 'site.spec.js', use: { baseURL: 'http://localhost:4175' } },
    { name: 'cloud', testMatch: 'cloud.spec.js', use: { baseURL: 'http://localhost:4174' } }
  ],
  webServer: [
    {
      // The public website exactly as GitHub Pages serves it: landing page at the root, the app under /app/.
      command: 'node scripts/build-site.mjs && node scripts/serve-site.mjs dist-site 4175 /dairyfarm',
      url: 'http://localhost:4175/dairyfarm/',
      reuseExistingServer: !process.env.CI,
      timeout: 120000
    },
    {
      command: 'npm run build && npx vite preview --port 4173 --strictPort',
      url: 'http://localhost:4173',
      reuseExistingServer: !process.env.CI
    },
    {
      // Same app built against a fake Supabase URL; tests intercept the network calls.
      command:
        'VITE_SUPABASE_URL=http://localhost:54321 VITE_SUPABASE_ANON_KEY=test-anon-key ' +
        'npx vite build --outDir dist-cloud && npx vite preview --outDir dist-cloud --port 4174 --strictPort',
      url: 'http://localhost:4174',
      reuseExistingServer: !process.env.CI
    }
  ]
});
