import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { CATALOGUE } from '../src/data/archetypes'
import { MAP } from '../src/data/map'
import { distance, rank } from '../src/engine/match'
import { LAYOUT_VERSION, SPACES, distanceMatrix, layoutInputs, mapPoints, procrustes, spaceIndex, stress1 } from '../src/engine/mapLayout'
import { dist, egoPosition, placeOutOfSample, respondentRadii } from '../src/engine/mapGeo'
import { mulberry32 } from '../src/engine/prng'

describe('map.json', () => {
  it('is current for this catalogue (else run `just map-layout`)', () => {
    const hash = createHash('sha256').update(layoutInputs(CATALOGUE)).digest('hex').slice(0, 16)
    expect(MAP.inputHash).toBe(hash)
    expect(MAP.version).toBe(LAYOUT_VERSION)
    expect(MAP.slugs).toEqual(CATALOGUE.map(a => a.slug))
  })

  it('has every layout, with the reported stress matching its coordinates', () => {
    const pts = mapPoints(CATALOGUE)
    for (const space of SPACES)
      for (const dim of [2, 3] as const) {
        const L = MAP.layouts[`${space}-${dim}`]
        const idx = spaceIndex(space, CATALOGUE.length)
        expect(L.coords).toHaveLength(idx.length)
        expect(L.coords.every(c => c.length === dim)).toBe(true)
        const D = distanceMatrix(idx.map(i => pts[i]!))
        expect(stress1(L.coords, D)).toBeCloseTo(L.stress, 3)
      }
    // 3D is the faithful one; 2D is "fair".
    expect(MAP.layouts['ideal-3'].stress).toBeLessThan(0.1)
    expect(MAP.layouts['ideal-2'].stress).toBeLessThan(0.2)
  })

  it('changes when an input changes', () => {
    const moved = CATALOGUE.map((a, k) => (k === 0 ? { ...a, ideal: a.ideal.map((v, j) => (j === 0 ? v + 1 : v)) } : a))
    expect(layoutInputs(moved)).not.toBe(layoutInputs(CATALOGUE))
  })
})

describe('map geometry', () => {
  const u = CATALOGUE[5]!.ideal.map((v, k) => (k === 3 ? null : Math.max(-100, Math.min(100, v + 17))))

  it('respondent radius is exactly the quiz distance, with each target’s weights', () => {
    const radii = respondentRadii(u, CATALOGUE)
    CATALOGUE.forEach((a, k) => expect(radii[k]).toBe(distance(u, a.ideal, a.weight)))
    // …so nearest-first by radius is the quiz's own ranking.
    const byRadius = CATALOGUE.map((a, k) => ({ slug: a.slug, d: radii[k]! })).sort((x, y) => x.d - y.d || x.slug.localeCompare(y.slug))
    expect(byRadius.map(x => x.slug)).toEqual(rank(u, CATALOGUE, 'ideal').map(r => r.arch.slug))
  })

  it('an exact-from-here position sits at exactly its radius from the centre', () => {
    const Y = MAP.layouts['ideal-2'].coords
    const radii = respondentRadii(u, CATALOGUE)
    const at = placeOutOfSample(radii, Y).x as [number, number]
    Y.forEach((y, k) => {
      const p = egoPosition(at, [y[0]!, y[1]!], radii[k]!)
      expect(Math.hypot(p[0], p[1])).toBeCloseTo(radii[k]!, 12)
    })
  })

  it('out-of-sample placement recovers a point that fits the layout exactly', () => {
    const rng = mulberry32(7)
    const Y = Array.from({ length: 30 }, () => [rng() - 0.5, rng() - 0.5])
    const truth = [0.13, -0.21]
    const { x, resid } = placeOutOfSample(Y.map(y => dist(truth, y)), Y)
    expect(dist(x, truth)).toBeLessThan(1e-4)
    expect(resid).toBeLessThan(1e-4)
  })

  it('procrustes recovers a rotation and reflection', () => {
    const rng = mulberry32(3)
    const X = Array.from({ length: 20 }, () => [rng(), rng(), rng()])
    const c = Math.cos(0.7), s = Math.sin(0.7)
    const Y = X.map(([a, b, z]) => [c * a! - s * b! + 2, s * a! + c * b! - 1, -z!])
    const f = procrustes(X, Y)
    X.forEach((p, k) => expect(dist(f(p), Y[k]!)).toBeLessThan(1e-9))
    // A flat (rank-deficient) target still gives an orthogonal map: distances are preserved.
    const flat = X.map(([a, b]) => [a!, b!, 0])
    const g = procrustes(X, flat)
    expect(dist(g(X[0]!), g(X[1]!))).toBeCloseTo(dist(X[0]!, X[1]!), 9)
    // A tilted flat target: the null direction comes out of the eigensolver as roundoff, not zero.
    const rot = (p: number[]) => {
      const [ca, sa, cb, sb] = [Math.cos(0.1), Math.sin(0.1), Math.cos(0.2), Math.sin(0.2)]
      const [x, y, z] = [p[0]!, cb * p[1]! - sb * p[2]!, sb * p[1]! + cb * p[2]!]
      return [ca * x - sa * y, sa * x + ca * y, z]
    }
    const X4 = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]]
    const h = procrustes(X4, [[0, 0, 0], rot([1, 0, 0]), rot([0, 1, 0]), [0, 0, 0]])
    for (let i = 0; i < 4; i++) for (let j = 0; j < i; j++) expect(dist(h(X4[i]!), h(X4[j]!))).toBeCloseTo(dist(X4[i]!, X4[j]!), 9)
  })
})
