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
      // Duas tolerâncias com papéis distintos.
      //
      // `threshold` é a diferença de cor aceita POR PIXEL — é ela que absorve
      // antialiasing de fonte, e é o valor padrão do Playwright.
      //
      // `maxDiffPixelRatio` é a fração da imagem que pode mudar. Aqui precisa
      // ser severa: as capturas de página inteira têm milhares de pixels de
      // altura, e 1% delas é área suficiente para esconder a mudança de cor
      // de um bloco inteiro — foi o que aconteceu na etapa 1, quando a
      // correção de contraste do figcaption passou sem ser detectada.
      threshold: 0.2,
      maxDiffPixelRatio: 0.0005
    }
  }
});
