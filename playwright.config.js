import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],

  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry'
  },

  // Um projeto por viewport: a regressão visual precisa das três larguras que
  // os critérios de aceite nomeiam, e o teste de comportamento roda em todas.
  projects: [
    {
      name: 'mobile',
      use: { ...devices['Desktop Chrome'], viewport: { width: 375, height: 812 } }
    },
    {
      name: 'tablet',
      use: { ...devices['Desktop Chrome'], viewport: { width: 768, height: 1024 } }
    },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } }
    }
  ],

  webServer: {
    command: `node scripts/serve.mjs ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    stdout: 'ignore'
  },

  expect: {
    toHaveScreenshot: {
      // Antialiasing de fonte varia entre máquinas; um piso pequeno evita
      // falso positivo sem esconder mudança real de layout.
      maxDiffPixelRatio: 0.01
    }
  }
});
