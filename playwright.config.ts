import { defineConfig } from '@playwright/test'
import { existsSync } from 'node:fs'

// Prefer the system Chromium when present so tests don't depend on a browser download.
const executablePath = process.env.CHROMIUM_PATH ?? (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined)
// Own port (not the 21314 preview) so a running preview is never what gets tested; E2E_PORT overrides.
const port = process.env.E2E_PORT ?? '21315'

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
    command: `pnpm vite build && pnpm vite preview --port ${port} --strictPort`,
    url: `http://localhost:${port}`,
    // Never reuse: a server already on the port is some other checkout's build, not this one's.
    reuseExistingServer: false,
    timeout: 180_000,
  },
})
