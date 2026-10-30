import { defineConfig } from '@playwright/test'
import { existsSync } from 'node:fs'

// Prefer the system Chromium when present so tests don't depend on a browser download.
const executablePath = process.env.CHROMIUM_PATH ?? (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined)

export default defineConfig({
  testDir: 'e2e',
  timeout: 90_000,
  workers: 2,
  use: {
    baseURL: 'http://localhost:21314',
    launchOptions: executablePath ? { executablePath } : {},
    colorScheme: 'dark',
  },
  webServer: {
    command: 'pnpm vite build && pnpm vite preview',
    url: 'http://localhost:21314',
    reuseExistingServer: true,
    timeout: 180_000,
  },
})
