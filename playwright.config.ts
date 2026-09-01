import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: '.',
  timeout: 300000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 2,
  workers: process.env.CI ? 1 : 2,

  reporter: [
    ['html', { open: 'never' }],
    ['list'],
    ['json', { outputFile: 'test-results/results.json' }]
  ],

  use: {
    baseURL: process.env.BASE_URL || 'https://stg.fleetrabbit.com',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 30000,
    navigationTimeout: 60000,
  },

  projects: [
    // 1) Setup: log in once with the stored test account, save state
    {
      name: 'setup',
      testMatch: 'e2e/setup/auth.setup.ts',
      use: { ...devices['Desktop Chrome'] },
    },

    // 2) Auth tests: run WITHOUT saved state (signup/login flows themselves)
    {
      name: 'auth-tests',
      testMatch: ['tests/**/*.spec.ts'],
      testIgnore: ['**/*.setup.ts'],
      use: { ...devices['Desktop Chrome'] },
    },

    // 3) Module tests: run WITH saved auth state (skip login)
    {
      name: 'chromium',
      testMatch: ['tests/**/*.spec.ts'],
      testIgnore: ['**/*.setup.ts'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],
})
