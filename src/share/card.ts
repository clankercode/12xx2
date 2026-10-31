import { AXIS_IDS, GROUPS, type AxisId, type GroupId } from '../engine/types'
import type { FitSet, Results } from '../engine/results'
import { AXES, GROUP_TITLES } from '../data/axes'
import { sameInBothFrames } from '../engine/results'
import { CANT_TELL, MATCH_LABEL, RG_BAND, fitTitle, nearestNote } from '../ui/copy'

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

export const C = {
  ink: '#141726',
  ink2: '#1a1e31',
  rule: '#23283f',
  major: '#2d3352',
  /** The page's --dot in dark mode. */
  dot: '#323959',
  paper: '#ece8df',
  muted: '#9a9fb8',
  ideal: '#a3acff',
  now: '#f2b45a',
}
export const DISPLAY = '"Bricolage Grotesque Variable", "Arial Narrow", sans-serif'
export const BODY = '"Atkinson Hyperlegible Next Variable", system-ui, sans-serif'

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

/** A frame's note on the card: "can't tell them apart" for several fits, the band for one, the nearest for none. */
function fitNote(f: FitSet): string {
  if (f.fits.length > 1) return `${CANT_TELL.charAt(0).toUpperCase()}${CANT_TELL.slice(1)}`
  return f.fits.length === 1 ? MATCH_LABEL[f.fits[0]!.label] : nearestNote(f)
}

/** Every ideology a card would name for this frame (its fit set, or the nearest when it fits nothing). */
const cardNames = (f: FitSet) => (f.fits.length ? f.fits.map(m => m.arch) : f.nearest ? [f.nearest.arch] : [])

export function headline(r: Results, allowSensitive: boolean): Headline {
  const h = r.hero
  const generic: Headline = { kicker: 'My 12 axes, twice', lines: [] }
  const blocked = (...fs: (FitSet | null)[]) => !allowSensitive && fs.some(f => f && cardNames(f).some(a => a.sensitive))
  const ideal = (f: FitSet) => ({ label: 'In theory I fit', name: fitTitle(f), color: C.ideal, note: fitNote(f) })
  if (h.kind === 'split') {
    if (blocked(h.ideal, h.now)) return generic
    return {
      kicker: 'My politics',
      lines: [ideal(h.ideal), { label: h.now.fits.length ? 'Here and now I fit' : 'Here and now', name: fitTitle(h.now), color: C.now, note: fitNote(h.now) }],
    }
  }
  if (h.kind === 'constant') {
    if (blocked(h.ideal)) return generic
    // Here and now missing, or fitting other ideologies too: name the ideal only, make no constancy claim.
    if (!sameInBothFrames(h)) return { kicker: 'My politics', lines: [ideal(h.ideal)] }
    return { kicker: 'In theory and here and now I fit', lines: [{ name: fitTitle(h.ideal), color: C.paper, note: fitNote(h.ideal) }] }
  }
  // An empty fit set: say so, with the nearest ideology as a measurement, not a verdict.
  if (h.kind === 'no-fit') {
    if (blocked(h.ideal)) return generic
    return { kicker: 'My 12 axes, twice', lines: [{ name: 'No close match', color: C.paper, note: nearestNote(h.ideal) }] }
  }
  return generic
}

export function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
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

export function diamond(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x, y - r)
  ctx.lineTo(x + r, y)
  ctx.lineTo(x, y + r)
  ctx.lineTo(x - r, y)
  ctx.closePath()
  ctx.fill()
}

/**
 * Dark dot-paper background shared by every card: the site's dot grid (28px pitch, ~1.1px dots;
 * src/styles/global.css body::before) at twice the size, as a card is usually seen at about half its
 * width. The lattice is centred so the margins match on every side.
 */
export function paper(ctx: CanvasRenderingContext2D, W: number, H: number, scale = 2) {
  ctx.fillStyle = C.ink
  ctx.fillRect(0, 0, W, H)
  const pitch = 28 * scale
  const r = 1.1 * scale
  const x0 = (W - pitch * Math.floor(W / pitch) + pitch) / 2
  const y0 = (H - pitch * Math.floor(H / pitch) + pitch) / 2
  ctx.fillStyle = C.dot
  ctx.beginPath()
  for (let y = y0; y < H; y += pitch) {
    for (let x = x0; x < W; x += pitch) {
      ctx.moveTo(x + r, y)
      ctx.arc(x, y, r, 0, Math.PI * 2)
    }
  }
  ctx.fill()
}

export function wordmark(ctx: CanvasRenderingContext2D, x: number, top: number, wide: boolean) {
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = C.paper
  ctx.font = `800 ${wide ? 34 : 44}px ${DISPLAY}`
  ctx.fillText('12 Axes', x, top + (wide ? 22 : 30))
  const wmW = ctx.measureText('12 Axes').width
  ctx.fillStyle = C.now
  ctx.font = `800 ${wide ? 20 : 26}px ${DISPLAY}`
  ctx.fillText('2', x + wmW + 4, top + (wide ? 4 : 6))
}

/**
 * Pole names sit inside the track ends; a marker covering one pushes it inward past the marker,
 * and it is dropped if that would cross the centre line.
 */
export function poleNames(
  ctx: CanvasRenderingContext2D,
  ax: AxisId,
  trackX: number,
  trackW: number,
  mid: number,
  marks: number[],
  r0: number,
  wide: boolean,
) {
  const centre = trackX + trackW / 2
  ctx.fillStyle = C.muted
  ctx.globalAlpha = 0.75
  ctx.font = `400 ${wide ? 11 : 15}px ${BODY}`
  ctx.textAlign = 'left'
  const wNeg = ctx.measureText(AXES[ax].neg).width
  let negX = trackX + 8
  for (const m of [...marks].sort((a, b) => a - b)) if (m - r0 < negX + wNeg && m + r0 > negX - 4) negX = m + r0 + 6
  if (negX + wNeg < centre - 4) ctx.fillText(AXES[ax].neg, negX, mid + (wide ? 4 : 5))
  ctx.textAlign = 'right'
  const wPos = ctx.measureText(AXES[ax].pos).width
  let posX = trackX + trackW - 8
  for (const m of [...marks].sort((a, b) => b - a)) if (m + r0 > posX - wPos && m - r0 < posX + 4) posX = m - r0 - 6
  if (posX - wPos > centre + 4) ctx.fillText(AXES[ax].pos, posX, mid + (wide ? 4 : 5))
  ctx.textAlign = 'left'
  ctx.globalAlpha = 1
}

/** Draws a share card. Pure Canvas 2D: no DOM snapshotting, no external requests. */
export function drawCard(canvas: HTMLCanvasElement, r: Results, o: CardOptions) {
  const [W, H] = CARD_DIMS[o.size]
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  const wide = o.size === 'wide'
  const pad = wide ? 48 : 72
  // Stories: keep text out of the app overlays (profile bar on top, reply bar at the bottom).
  const story = o.size === 'story'
  const top = story ? 230 : pad
  const footY = H - (wide ? 28 : story ? 340 : 48)

  paper(ctx, W, H)
  wordmark(ctx, pad, top, wide)

  // Headline.
  const hl = headline(r, o.allowSensitive)
  const left = pad
  const colW = wide ? 470 : W - 2 * pad
  let y = top + (wide ? 80 : 130)
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
    // A fit set of several names shrinks to its line budget, so the chart below keeps its room.
    const maxLines = wide || hl.lines.length === 1 ? 3 : 2
    let size = wide ? 44 : hl.lines.length > 1 ? 70 : 92
    ctx.font = `800 ${size}px ${DISPLAY}`
    let wrapped = wrapText(ctx, line.name, colW)
    while (wrapped.length > maxLines && size > (wide ? 30 : 48)) {
      size -= 4
      ctx.font = `800 ${size}px ${DISPLAY}`
      wrapped = wrapText(ctx, line.name, colW)
    }
    for (const t of wrapped) {
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
  const bottom = footY - (wide ? 42 : 72)
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
      // Pole names sit inside the track ends; a marker covering one pushes it inward past the marker,
      // and it is dropped if that would cross the centre line.
      const r0 = wide ? 7 : 11
      poleNames(ctx, ax, trackX, trackW, mid, [row.I, row.N].filter((v): v is number => v !== null).map(xs), r0, wide)
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
    ctx.font = `400 18px ${BODY}`
    let lx = chartX
    for (const [t, c] of [['◆', C.ideal], [' ideal   ', C.muted], ['●', C.now], [' here and now   solid line = gap bigger than noise', C.muted]] as const) {
      ctx.fillStyle = c
      ctx.fillText(t, lx, cy + 6)
      lx += ctx.measureText(t).width
    }
  }

  // Footer.
  ctx.fillStyle = C.paper
  ctx.font = `700 ${wide ? 20 : 28}px ${BODY}`
  const foot = `${o.host} — what’s your gap?`
  ctx.fillText(foot, pad, footY)
}

export function cardBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob(b => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png'))
}
