/** FNV-1a 32-bit hash over bytes. Deterministic seeds for stability draws. */
export function fnv1a(bytes: Uint8Array): number {
  let h = 0x811c9dc5
  for (const b of bytes) {
    h ^= b
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h >>> 0
}

export function fnv1aString(s: string): number {
  return fnv1a(new TextEncoder().encode(s))
}

/** mulberry32: small, fast, good-enough PRNG for simulations and bootstraps. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Standard normal draw via Box–Muller. */
export function gaussian(rng: () => number): number {
  let u = 0
  while (u === 0) u = rng()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng())
}
