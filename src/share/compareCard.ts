import { AXIS_IDS, GROUPS, type GroupId } from '../engine/types'
import type { Results } from '../engine/results'
import type { Comparison, CompareSummary, FrameComparison } from '../engine/compare'
import { AXES } from '../data/axes'
import { BODY, C, CARD_DIMS, DISPLAY, diamond, headline, paper, wordmark, wrapText, type CardSize } from './card'

export interface CompareCardOptions {
  size: CardSize
  /** Display names, [first, second]. Drawn on the card only; never put in a link. */
  names: [string, string]
  host: string
}

export const SUMMARY_TEXT: Record<CompareSummary, string> = {
  'ideals-differ-more': 'We disagree more about ideals than about what to do here and now.',
  'practice-differs-more': 'We share more of our ideals than of our here-and-now politics.',
  even: 'We disagree about as much in theory as here and now.',
}

export const NOT_COMPARABLE = 'Different countries: here-and-now answers aren’t directly comparable.'

/** "4 of 12" — or a dash when nothing could be compared. */
export const clearCount = (f: FrameComparison) => (f.compared === 0 ? '—' : `${f.clear} of ${f.compared}`)

/** One person's headline as short labelled lines; sensitive names were already gated by their own share opt-in. */
function personLines(r: Results): { label: string; name: string; color: string }[] {
  const hl = headline(r, true)
  if (hl.lines.length === 0) return [{ label: '', name: 'No reliable match', color: C.muted }]
  if (hl.lines.length === 1 && !hl.lines[0]!.label) return [{ label: 'In theory and here and now', name: hl.lines[0]!.name, color: C.paper }]
  return hl.lines.map(l => ({ label: l.label ?? '', name: l.name, color: l.color }))
}

/** Cuts text to fit maxW with an ellipsis (current ctx.font). */
function ellipsize(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text
  let t = text
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxW) t = t.slice(0, -1)
  return `${t.trimEnd()}…`
}

/** Largest font size from max down to min that fits one line; at min, the text is ellipsized. */
function fitLine(ctx: CanvasRenderingContext2D, text: string, maxW: number, max: number, min: number, weight: number, family: string) {
  for (let size = max; size >= min; size -= 2) {
    ctx.font = `${weight} ${size}px ${family}`
    if (ctx.measureText(text).width <= maxW) return { text, size }
  }
  ctx.font = `${weight} ${min}px ${family}`
  return { text: ellipsize(ctx, text, maxW), size: min }
}

/**
 * An ideology name in at most two lines: one line shrinking from max to one, else two lines at two
 * (the second ellipsized if it still doesn't fit). Never silently names a different ideology.
 */
function fitName(ctx: CanvasRenderingContext2D, name: string, maxW: number, max: number, one: number, two: number) {
  const single = fitLine(ctx, name, maxW, max, one, 800, DISPLAY)
  if (!single.text.endsWith('…') || single.text === name) return { lines: [single.text], size: single.size }
  ctx.font = `800 ${two}px ${DISPLAY}`
  const lines = wrapText(ctx, name, maxW)
  const kept = lines.slice(0, 2)
  if (lines.length > 2) kept[1] = ellipsize(ctx, `${kept[1]} ${lines.slice(2).join(' ')}`, maxW)
  else kept[1] = kept[1] ? ellipsize(ctx, kept[1], maxW) : ''
  return { lines: kept.filter(Boolean).map(l => ellipsize(ctx, l, maxW)), size: two }
}

/** Person glyph: first person filled, second hollow (same encoding as the chart markers). */
function personGlyph(ctx: CanvasRenderingContext2D, who: 0 | 1, x: number, y: number, r: number) {
  ctx.beginPath()
  ctx.arc(x, y, who === 0 ? r : r - 2, 0, Math.PI * 2)
  if (who === 0) {
    ctx.fillStyle = C.paper
    ctx.fill()
  } else {
    ctx.strokeStyle = C.paper
    ctx.lineWidth = 4
    ctx.stroke()
    ctx.lineWidth = 1
  }
}

function marker(ctx: CanvasRenderingContext2D, frame: 'I' | 'N', who: 0 | 1, x: number, y: number, r: number, ring = false) {
  const color = frame === 'I' ? C.ideal : C.now
  const path = () => {
    ctx.beginPath()
    if (frame === 'I') {
      ctx.moveTo(x, y - r)
      ctx.lineTo(x + r, y)
      ctx.lineTo(x, y + r)
      ctx.lineTo(x - r, y)
      ctx.closePath()
    } else ctx.arc(x, y, r * 0.85, 0, Math.PI * 2)
  }
  if (who === 0) {
    ctx.fillStyle = color
    if (frame === 'I') diamond(ctx, x, y, r)
    else {
      path()
      ctx.fill()
    }
    return
  }
  // Hollow: punch the track colour through (hiding the connector inside), unless it rings a filled marker.
  path()
  if (!ring) {
    ctx.fillStyle = C.ink2
    ctx.fill()
  }
  ctx.strokeStyle = color
  ctx.lineWidth = r > 8 ? 3.5 : 2.5
  ctx.stroke()
  ctx.lineWidth = 1
}

/** Draws a two-person comparison card. Pure Canvas 2D, like the single-result card. */
export function drawCompareCard(canvas: HTMLCanvasElement, a: Results, b: Results, cmp: Comparison, o: CompareCardOptions) {
  const [W, H] = CARD_DIMS[o.size]
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  const wide = o.size === 'wide'
  const story = o.size === 'story'
  const pad = wide ? 48 : 72
  const top = story ? 230 : pad
  const footY = H - (wide ? 28 : story ? 340 : 48)
  paper(ctx, W, H)
  wordmark(ctx, pad, top, wide)

  const people = [a, b] as const
  let y: number

  if (wide) {
    // Left column: names and headlines, then the counts.
    const colW = 470
    y = top + 74
    for (const who of [0, 1] as const) {
      personGlyph(ctx, who, pad + 9, y - 8, 9)
      ctx.fillStyle = C.paper
      ctx.fillText(fitLine(ctx, o.names[who], colW - 28, 26, 18, 800, DISPLAY).text, pad + 28, y)
      for (const l of personLines(people[who])) {
        if (l.label) {
          y += 24
          ctx.fillStyle = l.color
          ctx.font = `700 15px ${BODY}`
          ctx.fillText(l.label, pad + 28, y)
        }
        ctx.fillStyle = l.color === C.muted ? C.muted : C.paper
        const fit = fitLine(ctx, l.name, colW - 28, 24, 16, 800, DISPLAY)
        y += 26
        ctx.fillText(fit.text, pad + 28, y)
      }
      y += 40
    }
    y += 4
    ctx.fillStyle = C.muted
    ctx.font = `700 18px ${BODY}`
    ctx.fillText('Axes where we clearly differ', pad, y)
    y += 40
    const counts = (
      [
        ['in theory', cmp.ideal, C.ideal],
        ['here and now', cmp.now, C.now],
      ] as const
    ).map(([label, f, color]) => {
      const v = cmp.reliable ? clearCount(f) : '—'
      ctx.font = `800 40px ${DISPLAY}`
      const vw = ctx.measureText(v).width
      ctx.font = `700 18px ${BODY}`
      return { label, v, color, vw, w: vw + 10 + ctx.measureText(label).width }
    })
    // Side by side when both fit the column, else stacked, so two-digit counts never reach the chart.
    const inline = counts[0]!.w + 36 + counts[1]!.w <= colW
    let x = pad
    for (const [k, c] of counts.entries()) {
      if (k === 1 && !inline) {
        x = pad
        y += 46
      }
      ctx.fillStyle = C.paper
      ctx.font = `800 40px ${DISPLAY}`
      ctx.fillText(c.v, x, y)
      ctx.fillStyle = c.color
      ctx.font = `700 18px ${BODY}`
      ctx.fillText(c.label, x + c.vw + 10, y)
      x += c.w + 36
    }
    y += 34
    ctx.font = `400 18px ${BODY}`
    ctx.fillStyle = C.paper
    const sentence = !cmp.reliable
      ? 'One result was flagged as careless answering, so no differences are claimed.'
      : cmp.summary
        ? SUMMARY_TEXT[cmp.summary]
        : ''
    for (const t of wrapText(ctx, sentence, colW)) {
      ctx.fillText(t, pad, y)
      y += 24
    }
    if (cmp.sameCountry === false) {
      ctx.fillStyle = C.muted
      ctx.font = `400 15px ${BODY}`
      for (const t of wrapText(ctx, NOT_COMPARABLE, colW)) {
        ctx.fillText(t, pad, y)
        y += 20
      }
    }
  } else {
    ctx.fillStyle = C.muted
    ctx.font = `700 28px ${BODY}`
    y = top + (story ? 130 : 100)
    ctx.fillText('How our politics compare', pad, y)
    // Two columns, one per person; the taller one sets the height.
    const gap = 48
    const colW = (W - 2 * pad - gap) / 2
    const start = y + (story ? 76 : 60)
    let end = start
    for (const who of [0, 1] as const) {
      const x = pad + who * (colW + gap)
      let cy = start
      personGlyph(ctx, who, x + 13, cy - 13, 13)
      ctx.fillStyle = C.paper
      ctx.fillText(fitLine(ctx, o.names[who], colW - 40, 40, 26, 800, DISPLAY).text, x + 40, cy)
      for (const l of personLines(people[who])) {
        if (l.label) {
          cy += story ? 44 : 38
          ctx.fillStyle = l.color
          ctx.font = `700 22px ${BODY}`
          ctx.fillText(l.label, x, cy)
        } else cy += 8
        const fit = fitName(ctx, l.name, colW, story ? 44 : 38, 28, 26)
        ctx.fillStyle = l.color === C.muted ? C.muted : C.paper
        ctx.font = `800 ${fit.size}px ${DISPLAY}`
        for (const t of fit.lines) {
          cy += Math.round(fit.size * 1.05)
          ctx.fillText(t, x, cy)
        }
      }
      end = Math.max(end, cy)
    }
    y = end + (story ? 80 : 58)

    // The counts, one per frame.
    ctx.fillStyle = C.muted
    ctx.font = `700 24px ${BODY}`
    ctx.fillText('Axes where we clearly differ', pad, y)
    y += story ? 70 : 58
    for (const [k, [label, f, color]] of (
      [
        ['in theory', cmp.ideal, C.ideal],
        ['here and now', cmp.now, C.now],
      ] as const
    ).entries()) {
      const x = pad + k * (colW + gap)
      ctx.fillStyle = C.paper
      ctx.font = `800 ${story ? 64 : 54}px ${DISPLAY}`
      const v = cmp.reliable ? clearCount(f) : '—'
      ctx.fillText(v, x, y)
      const vw = ctx.measureText(v).width
      ctx.fillStyle = color
      ctx.font = `700 24px ${BODY}`
      ctx.fillText(label, x + vw + 14, y)
    }
    y += story ? 56 : 46
    ctx.fillStyle = C.paper
    ctx.font = `400 26px ${BODY}`
    const sentence = !cmp.reliable
      ? 'One result was flagged as careless answering, so no differences are claimed.'
      : cmp.summary
        ? SUMMARY_TEXT[cmp.summary]
        : ''
    for (const t of wrapText(ctx, sentence, W - 2 * pad)) {
      ctx.fillText(t, pad, y)
      y += 34
    }
    if (cmp.sameCountry === false) {
      ctx.fillStyle = C.muted
      ctx.font = `400 20px ${BODY}`
      ctx.fillText(NOT_COMPARABLE, pad, y)
      y += 28
    }
  }

  // Chart: per axis, an ideal lane (diamonds) above a here-and-now lane (circles);
  // first person filled, second hollow, joined by a solid line when clearly different.
  const chartX = wide ? 560 : pad
  const chartW = wide ? W - 560 - pad : W - 2 * pad
  const labelW = wide ? 180 : 230
  const trackX = chartX + labelW
  const trackW = chartW - labelW
  // Groups are separated by a gap only: on a two-person card the rows need the height more than group titles.
  const groupGap = wide ? 6 : 14
  let cy = wide ? pad + 10 : y + 26
  const overhead = 3 * groupGap
  const bottom = footY - (wide ? 42 : 84)
  const rowH = Math.max(30, Math.min(wide ? 40 : 64, (bottom - cy - overhead) / 12))
  // Under ~40px a row can't hold a full-size title plus the pole names, so both step down.
  const tight = !wide && rowH < 40
  const xs = (v: number) => trackX + ((v + 100) / 200) * trackW
  const r0 = Math.max(6, Math.min(11, rowH * 0.2))
  for (const g of Object.keys(GROUPS) as GroupId[]) {
    for (const ax of GROUPS[g]) {
      const k = AXIS_IDS.indexOf(ax)
      const mid = cy + rowH / 2
      // Two lanes leave no room inside the track, so pole names go under the axis title.
      ctx.fillStyle = C.paper
      ctx.font = `700 ${wide ? 14 : tight ? 18 : 21}px ${BODY}`
      ctx.fillText(AXES[ax].title, chartX, mid - (wide ? 2 : tight ? 1 : 3))
      ctx.fillStyle = C.muted
      const poles = `${AXES[ax].neg} ↔ ${AXES[ax].pos}`
      let fs = wide ? 11 : tight ? 13 : 15
      ctx.font = `400 ${fs}px ${BODY}`
      while (fs > 9 && ctx.measureText(poles).width > labelW - 10) ctx.font = `400 ${--fs}px ${BODY}`
      ctx.fillText(poles, chartX, mid + (wide ? 12 : tight ? 13 : 16))
      ctx.fillStyle = C.ink2
      ctx.fillRect(trackX, cy + 4, trackW, rowH - 8)
      ctx.strokeStyle = C.major
      ctx.strokeRect(trackX + 0.5, cy + 4.5, trackW - 1, rowH - 9)
      ctx.strokeStyle = C.muted
      ctx.beginPath()
      ctx.moveTo(xs(0), cy + 4)
      ctx.lineTo(xs(0), cy + rowH - 4)
      ctx.stroke()
      const lanes = [
        { f: 'I' as const, d: cmp.ideal.axes[k], y: cy + rowH * 0.3 },
        { f: 'N' as const, d: cmp.now.axes[k], y: cy + rowH * 0.7 },
      ]
      for (const lane of lanes) {
        const d = lane.d
        if (d) {
          const clear = cmp.reliable && d.clear
          ctx.strokeStyle = clear ? C.paper : C.muted
          ctx.lineWidth = clear ? 3 : 1.5
          ctx.setLineDash(clear ? [] : [5, 5])
          ctx.beginPath()
          ctx.moveTo(xs(d.a), lane.y)
          ctx.lineTo(xs(d.b), lane.y)
          ctx.stroke()
          ctx.setLineDash([])
          ctx.lineWidth = 1
        }
        // Filled first, then the hollow ring on top; when the two coincide the ring grows to circle the filled marker.
        const va = people[0].payload[lane.f][k]
        const vb = people[1].payload[lane.f][k]
        if (va !== null && va !== undefined) marker(ctx, lane.f, 0, xs(va), lane.y, r0)
        if (vb !== null && vb !== undefined) {
          const onTop = va !== null && va !== undefined && Math.abs(xs(va) - xs(vb)) < 2 * r0
          marker(ctx, lane.f, 1, xs(vb), lane.y, onTop ? r0 + 3 : r0, onTop)
        }
      }
      cy += rowH
    }
    cy += groupGap
  }

  // Legend, wrapped at the chart's right edge.
  ctx.font = `400 ${wide ? 14 : 18}px ${BODY}`
  const legend: [string, string][] = [
    ['◆', C.ideal],
    [' ideal   ', C.muted],
    ['●', C.now],
    [' here and now   ', C.muted],
    // Filled vs hollow is keyed by the glyphs beside the names, so the legend stays one line.
    ['solid line = clearly different', C.muted],
  ]
  let lx = chartX
  let ly = cy + (wide ? 8 : 6)
  for (const [t, c] of legend) {
    const w = ctx.measureText(t.trimEnd()).width
    if (lx > chartX && lx + w > chartX + chartW && t !== ' ideal   ' && t !== ' here and now   ') {
      lx = chartX
      ly += wide ? 18 : 26
    }
    ctx.fillStyle = c
    ctx.fillText(t, lx, ly)
    lx += ctx.measureText(t).width
  }

  ctx.fillStyle = C.paper
  ctx.font = `700 ${wide ? 20 : 28}px ${BODY}`
  ctx.fillText(`${o.host} — how do you two compare?`, pad, footY)
}
