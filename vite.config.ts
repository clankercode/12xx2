import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Plugin } from 'vite'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// CSP is injected only into production builds: dev needs inline HMR + websockets.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ')

function csp(): Plugin {
  return {
    name: 'inject-csp',
    apply: 'build',
    transformIndexHtml: html =>
      html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`),
  }
}

/**
 * Dev server only: COMMITMENTS_FIXTURE=tests/fixtures/commitments.json swaps in a hand-made
 * commitments file for screenshots. Never applies to builds.
 */
function commitmentsFixture(): Plugin | null {
  const fixture = process.env.COMMITMENTS_FIXTURE
  if (!fixture) return null
  return {
    name: 'commitments-fixture',
    apply: 'serve',
    enforce: 'pre',
    load: id => (id.split('?')[0]!.endsWith('/content/archetypes/commitments.json') ? readFileSync(resolve(fixture), 'utf8') : null),
  }
}

export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), csp(), commitmentsFixture()],
  server: { port: 21313, strictPort: true },
  preview: { port: 21314, strictPort: true },
  build: { assetsInlineLimit: 0, sourcemap: false },
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
})
