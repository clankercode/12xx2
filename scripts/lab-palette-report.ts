/**
 * Prints the contrast and colour-vision numbers documented in src/lab/palettes.ts.
 * Run: pnpm tsx scripts/lab-palette-report.ts
 */
import { PALETTE_IDS, PALETTES, _RAMPS, contrast, signed } from '../src/lab/palettes'

const DARK_BG = '#141726'
const LIGHT_BG = '#f4f2ec'

// Machado, Oliveira & Fernandes (2009), severity 1.0, applied in linear RGB.
const MACHADO: Record<string, number[][]> = {
  protan: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deutan: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  tritan: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
}

const toLin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
function rgbLin(hex: string): number[] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(c => toLin(c / 255))
}
function lab(lin: number[]): number[] {
  const [r, g, b] = lin.map(x => Math.max(0, Math.min(1, x))) as [number, number, number]
  const X = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047
  const Y = 0.2126 * r + 0.7152 * g + 0.0722 * b
  const Z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116)
  return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))]
}
const sim = (hex: string, m?: number[][]) => {
  const c = rgbLin(hex)
  return m ? m.map(row => row[0]! * c[0]! + row[1]! * c[1]! + row[2]! * c[2]!) : c
}
const dE = (a: number[], b: number[]) => Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!)

for (const id of PALETTE_IDS) {
  const p = PALETTES[id]
  const ramp = _RAMPS[id]
  console.log(`\n== ${id} (${p.name})`)
  let minInk = Infinity
  for (let v = -3; v <= 3; v++) {
    const f = p.fill(v)
    const ink = contrast(f, p.ink(v))
    minInk = Math.min(minInk, ink)
    console.log(
      `${signed(v).padStart(3)} ${f}  ink ${p.ink(v)} ${ink.toFixed(2)}  vsDark ${contrast(f, DARK_BG).toFixed(2)}  vsLight ${contrast(f, LIGHT_BG).toFixed(2)}`,
    )
  }
  console.log(`min ink contrast ${minInk.toFixed(2)}`)
  for (const [name, m] of [['normal', undefined], ...Object.entries(MACHADO)] as [string, number[][] | undefined][]) {
    const pairs = [1, 2, 3].map(k => dE(lab(sim(ramp[3 - k]!, m)), lab(sim(ramp[3 + k]!, m))).toFixed(0))
    console.log(`  ${name.padEnd(7)} ΔE(−v,+v) for v=1,2,3: ${pairs.join(' ')}`)
  }
}
