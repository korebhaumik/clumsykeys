import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 45000,
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:4193', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'chrome', use: { browserName: 'chromium', channel: 'chrome' } },
    { name: 'webkit-keyboard', testMatch: ['mobile-practice.spec.ts', 'practice-reset.spec.ts', 'keyboard-navigation.spec.ts', 'keyboard-focus.spec.ts', 'dropdowns.spec.ts', 'seo.spec.ts', 'interactive-elements.spec.ts'], use: { browserName: 'webkit' } },
  ],
  webServer: [
    { command: 'node postman/mocks/supabase/default.cjs', url: 'http://127.0.0.1:15443/health', env: { PORT: '15443' } },
    { command: 'npm run dev -- --host 127.0.0.1 --port 4193 --strictPort', url: 'http://127.0.0.1:4193', env: {
      SITE_URL: 'https://clumsykeys.vercel.app',
      VITE_SERVER_URL: 'http://127.0.0.1:15442', VITE_SUPABASE_URL: 'http://127.0.0.1:15443', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
    } },
    { command: 'npm run dev:server', url: 'http://127.0.0.1:15442/rooms', env: { PORT: '15442', FRONTEND_ORIGINS: 'http://127.0.0.1:4193',
      SUPABASE_URL: 'http://127.0.0.1:15443', SUPABASE_SECRET_KEY: 'sb_secret_test',
    } },
  ],
});
