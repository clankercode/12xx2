import { AXIS_IDS, GROUPS, type GroupId } from '../engine/types'
import type { Results } from '../engine/results'
import { AXES, GROUP_TITLES } from '../data/axes'
import { MATCH_LABEL, RG_BAND } from '../ui/copy'

export type CardSize = 'post' | 'story' | 'wide'
export const CARD_DIMS: Record<CardSize, [number, number]> = {
  post: [1080, 1350],
  story: [1080, 1920],
  wide: [1200, 630],
}

export interface CardOptions {
  size: CardSize
  minimal: boolean
  showSc: boolean
  showCountry: boolean
  /** Allow a sensitive archetype to appear as the headline (explicit opt-in, spec §2.6). */
  allowSensitive: boolean
  host: string
  countryLabel?: string
}

const C = {
  ink: '#141726',
  ink2: '#1a1e31',
  rule: '#23283f',
  major: '#2d3352',
  paper: '#ece8df',
  muted: '#9a9fb8',
  ideal: '#a3acff',
  now: '#f2b45a',
}
const DISPLAY = '"Bricolage Grotesque Variable", "Arial Narrow", sans-serif'
const BODY = '"Atkinson Hyperlegible Next Variable", system-ui, sans-serif'

export async function ensureFonts() {
  try {
    await Promise.all([document.fonts.load(`800 64px ${DISPLAY}`), document.fonts.load(`400 24px ${BODY}`), document.fonts.load(`700 24px ${BODY}`)])
  } catch {
    /* fall back to system fonts */
  }
}

export interface Headline {
  kicker: string
  lines: { label?: string; name: string; color: string; note?: string }[]
}

export function headline(r: Results, allowSensitive: boolean): Headline {
  const h = r.hero
  const blocked = (slug: string, sensitive: boolean) => sensitive && !allowSensitive && slug !== ''
  if (h.kind === 'split') {
    if (blocked(h.ideal.match.arch.slug, h.ideal.match.arch.sensitive) || blocked(h.now.match.arch.slug, h.now.match.arch.sensitive))
      return { kicker: 'My 12 axes, twice', lines: [] }
    return {
      kicker: 'My politics',
      lines: [
        { label: 'In theory', name: h.ideal.match.arch.name, color: C.ideal, note: MATCH_LABEL[h.ideal.match.label] },
        { label: 'Here and now', name: h.now.match.arch.name, color: C.now, note: MATCH_LABEL[h.now.match.label] },
      ],
    }
  }
  if (h.kind === 'constant') {
    if (blocked(h.ideal.match.arch.slug, h.ideal.match.arch.sensitive)) return { kicker: 'My 12 axes, twice', lines: [] }
    return {
      kicker: 'Constant in theory and practice',
      lines: [{ name: h.ideal.match.arch.name, color: C.paper, note: MATCH_LABEL[h.ideal.match.label] }],
    }
  }
  return { kicker: 'My 12 axes, twice', lines: [] }
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w
    if (ctx.measureText(test).width > maxWidth && cur) {
      lines.push(cur)
      cur = w
    } else cur = test
  }
  if (cur) lines.push(cur)
  return lines
}

function diamond(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x, y - r)
  ctx.lineTo(x + r, y)
  ctx.lineTo(x, y + r)
  ctx.lineTo(x - r, y)
  ctx.closePath()
  ctx.fill()
}

/** Draws a share card. Pure Canvas 2D: no DOM snapshotting, no external requests. */
export function drawCard(canvas: HTMLCanvasElement, r: Results, o: CardOptions) {
  const [W, H] = CARD_DIMS[o.size]
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  const wide = o.size === 'wide'
  const pad = wide ? 48 : 72

  // Squared paper.
  ctx.fillStyle = C.ink
  ctx.fillRect(0, 0, W, H)
  ctx.lineWidth = 1
  for (let x = 0; x <= W; x += 30) {
    ctx.strokeStyle = x % 150 === 0 ? C.major : C.rule
    ctx.beginPath()
    ctx.moveTo(x + 0.5, 0)
    ctx.lineTo(x + 0.5, H)
    ctx.stroke()
  }
  for (let y = 0; y <= H; y += 30) {
    ctx.strokeStyle = y % 150 === 0 ? C.major : C.rule
    ctx.beginPath()
    ctx.moveTo(0, y + 0.5)
    ctx.lineTo(W, y + 0.5)
    ctx.stroke()
  }

  // Wordmark.
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = C.paper
  ctx.font = `800 ${wide ? 34 : 44}px ${DISPLAY}`
  ctx.fillText('12 Axes', pad, pad + (wide ? 22 : 30))
  const wmW = ctx.measureText('12 Axes').width
  ctx.fillStyle = C.now
  ctx.font = `800 ${wide ? 20 : 26}px ${DISPLAY}`
  ctx.fillText('2', pad + wmW + 4, pad + (wide ? 4 : 6))

  // Headline.
  const hl = headline(r, o.allowSensitive)
  const left = pad
  const colW = wide ? 470 : W - 2 * pad
  let y = pad + (wide ? 80 : 130)
  ctx.fillStyle = C.muted
  ctx.font = `700 ${wide ? 22 : 30}px ${BODY}`
  ctx.fillText(hl.kicker, left, y)
  y += wide ? 18 : 24
  for (const line of hl.lines) {
    if (line.label) {
      y += wide ? 30 : 44
      ctx.fillStyle = line.color
      ctx.font = `700 ${wide ? 20 : 28}px ${BODY}`
      ctx.fillText(line.label, left, y)
    }
    ctx.fillStyle = C.paper
    const size = wide ? 44 : hl.lines.length > 1 ? 70 : 92
    ctx.font = `800 ${size}px ${DISPLAY}`
    for (const t of wrapText(ctx, line.name, colW)) {
      y += size * 1.02
      ctx.fillText(t, left, y)
    }
    if (line.note && !o.minimal) {
      y += wide ? 30 : 48
      ctx.fillStyle = C.muted
      ctx.font = `400 ${wide ? 18 : 26}px ${BODY}`
      ctx.fillText(line.note, left, y)
    }
  }

  // Stats line.
  if (!o.minimal) {
    y += wide ? 40 : 64
    ctx.font = `700 ${wide ? 22 : 30}px ${BODY}`
    ctx.fillStyle = C.paper
    const p = r.payload
    const parts: string[] = []
    if (p.rg !== null && r.rgBand) parts.push(`Reality Gap ${p.rg} · ${RG_BAND[r.rgBand]}`)
    if (o.showSc && p.sc) parts.push(`System confidence ${p.sc.score}`)
    if (o.showCountry && o.countryLabel) parts.push(o.countryLabel)
    ctx.fillText(parts.join('   ·   '), left, y)
    if (p.rg !== null) {
      y += wide ? 24 : 36
      ctx.font = `400 ${wide ? 16 : 22}px ${BODY}`
      ctx.fillStyle = C.muted
      ctx.fillText('0 = same answers in both frames · random clicking ≈ 38', left, y)
    }
  }

  // Compact 12×2 chart.
  const chartX = wide ? 560 : pad
  const chartW = wide ? W - 560 - pad : W - 2 * pad
  const labelW = wide ? 150 : 220
  const trackX = chartX + labelW
  const trackW = chartW - labelW
  const groupGap = wide ? 6 : 22
  let cy = wide ? pad + 10 : y + 56
  // Fit 12 rows between the headline and the footer.
  const overhead = wide ? 4 * groupGap : 4 * (14 + groupGap) + 30
  const bottom = H - (wide ? 70 : 120)
  const rowH = Math.max(28, Math.min(wide ? 40 : 72, (bottom - cy - overhead) / 12))
  const xs = (v: number) => trackX + ((v + 100) / 200) * trackW
  for (const g of Object.keys(GROUPS) as GroupId[]) {
    if (!wide) {
      ctx.fillStyle = C.muted
      ctx.font = `700 20px ${BODY}`
      ctx.fillText(GROUP_TITLES[g], chartX, cy + 4)
      cy += 14
    }
    for (const ax of GROUPS[g]) {
      const k = AXIS_IDS.indexOf(ax)
      const row = r.rows[k]!
      const mid = cy + rowH / 2
      ctx.fillStyle = C.paper
      ctx.font = `700 ${wide ? 15 : 22}px ${BODY}`
      ctx.fillText(AXES[ax].title, chartX, mid + 6)
      // track
      ctx.fillStyle = C.ink2
      ctx.fillRect(trackX, cy + 6, trackW, rowH - 12)
      ctx.strokeStyle = C.major
      ctx.strokeRect(trackX + 0.5, cy + 6.5, trackW - 1, rowH - 13)
      ctx.strokeStyle = C.muted
      ctx.beginPath()
      ctx.moveTo(xs(0), cy + 6)
      ctx.lineTo(xs(0), cy + rowH - 6)
      ctx.stroke()
      // Pole names sit inside the track ends, under the markers.
      ctx.fillStyle = C.muted
      ctx.globalAlpha = 0.75
      ctx.font = `400 ${wide ? 11 : 15}px ${BODY}`
      ctx.textAlign = 'left'
      ctx.fillText(AXES[ax].neg, trackX + 8, mid + (wide ? 4 : 5))
      ctx.textAlign = 'right'
      ctx.fillText(AXES[ax].pos, trackX + trackW - 8, mid + (wide ? 4 : 5))
      ctx.textAlign = 'left'
      ctx.globalAlpha = 1
      const yI = cy + rowH * 0.33
      const yN = cy + rowH * 0.67
      if (row.I !== null && row.N !== null) {
        ctx.strokeStyle = row.notable ? C.paper : C.muted
        ctx.lineWidth = row.notable ? 3 : 1.5
        ctx.setLineDash(row.notable ? [] : [5, 5])
        ctx.beginPath()
        ctx.moveTo(xs(row.I), yI)
        ctx.lineTo(xs(row.N), yN)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.lineWidth = 1
      }
      const r0 = wide ? 7 : 11
      if (row.I !== null) {
        ctx.fillStyle = C.ideal
        diamond(ctx, xs(row.I), yI, r0)
      }
      if (row.N !== null) {
        ctx.fillStyle = C.now
        ctx.beginPath()
        ctx.arc(xs(row.N), yN, r0 * 0.85, 0, Math.PI * 2)
        ctx.fill()
      }
      cy += rowH
    }
    cy += groupGap
  }
  if (!wide) {
    ctx.fillStyle = C.muted
    ctx.font = `400 18px ${BODY}`
    ctx.fillText('◆ ideal system   ● here and now   line = the gap between them', chartX, cy + 6)
  }

  // Footer.
  ctx.fillStyle = C.paper
  ctx.font = `700 ${wide ? 20 : 28}px ${BODY}`
  const foot = `${o.host} — what’s your gap?`
  ctx.fillText(foot, pad, H - (wide ? 28 : 48))
}

export function cardBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob(b => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png'))
}
