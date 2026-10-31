/**
 * Link previews (spec §6.6). Runs after `vite build`:
 *
 * - writes one 1200×630 PNG per archetype plus a default to dist/og/;
 * - writes stub pages dist/p/<slug>/ (both frames fit exactly that ideology) and dist/p/<ideal>/<now>/
 *   (a split whose frames each fit exactly one), each a 200 copy of the app shell with its own Open
 *   Graph tags. Fit sets of two or more get no stub (src/ui/ShareSheet previewPath), so the set stays finite;
 * - adds default Open Graph tags to dist/index.html.
 *
 * Sensitive archetypes never get stubs (the app never offers a preview link for them).
 *
 *   SITE_ORIGIN=https://example.org BASE_PATH=/ pnpm tsx scripts/og.ts
 */
import { chromium } from '@playwright/test'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { AXES } from '../src/data/axes'
import { CATALOGUE, CATALOGUE_IS_PLACEHOLDER } from '../src/data/archetypes'
import { AXIS_IDS } from '../src/engine/types'
import type { Archetype } from '../src/engine/match'

const origin = process.env.SITE_ORIGIN?.replace(/\/$/, '')
const basePath = process.env.BASE_PATH
if (!origin || !/^https?:\/\//.test(origin) || !basePath || !basePath.startsWith('/') || !basePath.endsWith('/')) {
  console.error('og: SITE_ORIGIN (https://…) and BASE_PATH (/…/) are required for a production build')
  process.exit(1)
}
if (CATALOGUE_IS_PLACEHOLDER) console.warn('og: WARNING — building previews from the placeholder catalogue')

const DIST = 'dist'
const site = `${origin}${basePath}`
const shell = readFileSync(`${DIST}/index.html`, 'utf8')
if (!shell.includes('<!--og-->')) {
  console.error('og: dist/index.html has no <!--og--> marker')
  process.exit(1)
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function page(o: { title: string; description: string; url: string; image: string }) {
  const tags = [
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="12 Axes²" />`,
    `<meta property="og:title" content="${esc(o.title)}" />`,
    `<meta property="og:description" content="${esc(o.description)}" />`,
    `<meta property="og:url" content="${esc(o.url)}" />`,
    `<meta property="og:image" content="${esc(o.image)}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
  ].join('\n    ')
  return shell.replace('<!--og-->', tags)
}

function write(path: string, html: string) {
  mkdirSync(path, { recursive: true })
  writeFileSync(`${path}/index.html`, html)
}

// ---- images ---------------------------------------------------------------

// Inlined: a setContent page cannot load file:// URLs.
const font = (pkg: string, file: string) =>
  `data:font/woff2;base64,${readFileSync(`node_modules/@fontsource-variable/${pkg}/files/${file}`).toString('base64')}`
const FONTS = `
@font-face { font-family: D; font-weight: 200 800; src: url(${font('bricolage-grotesque', 'bricolage-grotesque-latin-wght-normal.woff2')}) format('woff2'); }
@font-face { font-family: B; font-weight: 200 800; src: url(${font('atkinson-hyperlegible-next', 'atkinson-hyperlegible-next-latin-wght-normal.woff2')}) format('woff2'); }`

// The share cards' dot paper (src/share/card.ts paper()): 56px pitch, lattice centred on 1200×630.
// Track width in px: .rs (470) minus the title column (150) and gap (14).
const TRACK_W = 306

function imageHtml(a: Archetype | null) {
  const rows = a
    ? AXIS_IDS.map((ax, k) => {
        const x = (v: number) => ((v + 100) / 200) * 100
        // Pole names sit inside the track ends; a marker covering one pushes it inward past the
        // marker (as on the share cards), and it is dropped if it would cross the centre line.
        const px = [a.ideal[k]!, a.now[k]!].map(v => (x(v) / 100) * TRACK_W)
        const textW = (t: string) => t.length * 6.6
        let negL = 7
        for (const m of [...px].sort((p, q) => p - q)) if (m - 8 < negL + textW(AXES[ax].neg) && m + 8 > negL - 3) negL = m + 12
        let posR = 7
        for (const m of [...px].sort((p, q) => q - p)) if (TRACK_W - m - 8 < posR + textW(AXES[ax].pos) && TRACK_W - m + 8 > posR - 3) posR = TRACK_W - m + 12
        const neg = negL + textW(AXES[ax].neg) < TRACK_W / 2 - 3 ? `<b class="pn" style="left:${negL}px">${esc(AXES[ax].neg)}</b>` : ''
        const pos = posR + textW(AXES[ax].pos) < TRACK_W / 2 - 3 ? `<b class="pp" style="right:${posR}px">${esc(AXES[ax].pos)}</b>` : ''
        return `<div class="r"><span class="t">${esc(AXES[ax].title)}</span><span class="tr"><i class="mid"></i>${neg}${pos}
          <i class="d" style="left:${x(a.ideal[k]!)}%"></i><i class="c" style="left:${x(a.now[k]!)}%"></i></span></div>`
      }).join('')
    : ''
  const body = a
    ? `<div class="k">In theory</div><h1>${esc(a.name)}</h1><p>${esc(a.summary)}</p>`
    : `<h1 class="big">Your politics,<br/>twice.</h1><p>Every statement answered for your ideal system and for here and now. Private: nothing leaves your device.</p>`
  return `<!doctype html><html><head><meta charset="utf-8"><style>${FONTS}
  * { box-sizing: border-box; margin: 0 }
  body { width: 1200px; height: 630px; background: #141726; color: #ece8df; font-family: B; overflow: hidden;
    background-image: radial-gradient(circle at 28px 28px, #323959 2px, transparent 2.6px);
    background-size: 56px 56px; background-position: 12px 7px; display: flex; padding: 56px; gap: 48px }
  .l { flex: 1 1 0; display: flex; flex-direction: column; min-width: 0 }
  .w { font-family: D; font-weight: 800; font-size: 44px; letter-spacing: -0.03em }
  .w sup { color: #f2b45a; font-size: 0.55em }
  .k { margin-top: auto; color: #a3acff; font-weight: 700; font-size: 26px }
  h1 { font-family: D; font-weight: 800; font-size: ${a && a.name.length > 22 ? 56 : 68}px; line-height: 1; letter-spacing: -0.02em; margin-top: 8px }
  h1.big { margin-top: auto; font-size: 84px }
  p { margin-top: 18px; color: #a9abbd; font-size: 22px; line-height: 1.35; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden }
  .f { margin-top: 28px; font-weight: 700; font-size: 24px }
  .rs { width: ${a ? 470 : 0}px; display: ${a ? 'flex' : 'none'}; flex-direction: column; justify-content: center; gap: 9px }
  .r { display: flex; align-items: center; gap: 14px; height: 32px }
  .t { width: 150px; font-size: 15px; font-weight: 700; text-align: right }
  .tr { position: relative; flex: 1; height: 26px; background: #1b1f33; border: 1px solid #2c3150 }
  .pn, .pp { position: absolute; top: 5px; font-size: 12px; font-weight: 400; color: #8a8ca3 }
  .d, .c { z-index: 1 }
  .mid { position: absolute; left: 50%; top: 0; bottom: 0; width: 1px; background: #4d5275 }
  .d, .c { position: absolute; width: 14px; height: 14px; margin-left: -7px }
  .d { top: 1px; background: #a3acff; transform: rotate(45deg) scale(0.8) }
  .lg { margin: 6px 0 0 164px; font-size: 15px; color: #a9abbd }
  .lg b { color: #a3acff; font-weight: 400 } .lg u { color: #f2b45a; text-decoration: none }
  .c { top: 9px; background: #f2b45a; border-radius: 50% }
  </style></head><body><div class="l"><div class="w">12 Axes<sup>2</sup></div>${body}<div class="f">What’s your gap?</div></div>
  <div class="rs">${rows}<div class="lg"><b>◆</b> ideal system &nbsp; <u>●</u> here and now</div></div></body></html>`
}

mkdirSync(`${DIST}/og`, { recursive: true })
const browser = await chromium.launch({ executablePath: existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined })
const ctx = await browser.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 })
const pg = await ctx.newPage()
for (const a of [null, ...CATALOGUE.filter(x => !x.sensitive)]) {
  await pg.setContent(imageHtml(a), { waitUntil: 'load' })
  await pg.evaluate(() => document.fonts.ready)
  await pg.screenshot({ path: `${DIST}/og/${a ? a.slug : 'default'}.png` })
}
await browser.close()

// ---- pages ----------------------------------------------------------------

const desc = 'A 12-axis political values quiz where every statement is answered twice: for your ideal system, and for here and now.'
writeFileSync(
  `${DIST}/index.html`,
  page({ title: '12 Axes² (12 Axes Squared) — your politics, in theory and in practice', description: desc, url: site, image: `${site}og/default.png` }),
)
const open = CATALOGUE.filter(x => !x.sensitive)
let n = 0
for (const a of open) {
  write(`${DIST}/p/${a.slug}`, page({
    title: `In theory and here and now, fits ${a.name}`,
    description: `Someone’s 12 Axes² result: their answers fit ${a.name}, and no other listed ideology, for their ideal system and for here and now. ${desc}`,
    url: `${site}p/${a.slug}/`,
    image: `${site}og/${a.slug}.png`,
  }))
  n++
  for (const b of open) {
    if (b.slug === a.slug) continue
    write(`${DIST}/p/${a.slug}/${b.slug}`, page({
      title: `In theory, fits ${a.name}. Here and now, fits ${b.name}.`,
      description: `Someone’s 12 Axes² result: their ideal-system answers fit ${a.name}, their here-and-now answers fit ${b.name}. ${desc}`,
      url: `${site}p/${a.slug}/${b.slug}/`,
      image: `${site}og/${a.slug}.png`,
    }))
    n++
  }
}
console.log(`og: ${open.length + 1} images, ${n} stub pages for ${site}`)
