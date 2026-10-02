import { defineConfig } from '@playwright/test';
import config from './playwright.config';

const deployedURL = process.env.CHONKY_DEMO_URL;

export default defineConfig({
  ...config,
  use: {
    ...config.use,
    baseURL: deployedURL ?? 'http://127.0.0.1:4174/Chonky/',
  },
  webServer: deployedURL
    ? undefined
    : {
        command:
          'pnpm --filter @samuelncui/chonky-example exec vite preview --base=/Chonky/ --host 127.0.0.1 --port 4174 --strictPort',
        url: 'http://127.0.0.1:4174/Chonky/',
        reuseExistingServer: false,
      },
});
