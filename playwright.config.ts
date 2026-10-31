import { defineConfig } from '@playwright/test'
import { existsSync } from 'node:fs'

// Prefer the system Chromium when present so tests don't depend on a browser download.
const executablePath = process.env.CHROMIUM_PATH ?? (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined)
// E2E_PORT lets a worktree test its own build while another checkout's preview holds the default port.
const port = process.env.E2E_PORT ?? '21314'

export default defineConfig({
  testDir: 'e2e',
  timeout: 90_000,
  workers: 2,
  use: {
    baseURL: `http://localhost:${port}`,
    launchOptions: executablePath ? { executablePath } : {},
    colorScheme: 'dark',
  },
  webServer: {
    command: `pnpm vite build && pnpm vite preview --port ${port}`,
    url: `http://localhost:${port}`,
    reuseExistingServer: true,
    timeout: 180_000,
  },
})
