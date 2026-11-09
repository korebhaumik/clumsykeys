import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 45000,
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:4193', channel: 'chrome', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  webServer: [
    { command: 'npm run dev -- --host 127.0.0.1 --port 4193 --strictPort', url: 'http://127.0.0.1:4193', env: { VITE_SERVER_URL: 'http://127.0.0.1:15442' } },
    { command: 'npm run dev:server', url: 'http://127.0.0.1:15442/rooms', env: { PORT: '15442', FRONTEND_ORIGINS: 'http://127.0.0.1:4193' } },
  ],
});
