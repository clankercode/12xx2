/**
 * Fetches World Bank WGI rule-of-law and control-of-corruption scores (0–100, with 90% bounds)
 * into src/data/wgi.json. Keys are the API's own ISO 3166-1 alpha-2 country ids, so no code
 * mapping happens here; regional and income aggregates are dropped.
 *
 *   pnpm tsx scripts/wgi.ts [--year 2025]
 */
import { writeFileSync } from 'node:fs'

const args = process.argv.slice(2)
const YEAR = Number(args[args.indexOf('--year') + 1]) || 2025
const API = 'https://api.worldbank.org/v2'
const IND = {
  rl: 'GOV_WGI_RL.SC',
  rlLo: 'GOV_WGI_RL.SC_LB',
  rlHi: 'GOV_WGI_RL.SC_UB',
  cc: 'GOV_WGI_CC.SC',
  ccLo: 'GOV_WGI_CC.SC_LB',
  ccHi: 'GOV_WGI_CC.SC_UB',
} as const
type Field = keyof typeof IND

async function get(url: string): Promise<unknown[]> {
  const res = await fetch(url, { headers: { 'user-agent': 'curl/8 (12axes2 wgi fetch)', accept: 'application/json' } })
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  const body = (await res.json()) as [{ message?: unknown }, unknown[] | null]
  if (!body[1]) throw new Error(`no data: ${url} ${JSON.stringify(body[0])}`)
  return body[1]
}

// Real economies have a region; aggregates ("World", "Euro area", …) have region id "NA".
const economies = (await get(`${API}/country?format=json&per_page=400`)) as { iso2Code: string; region: { id: string } }[]
const real = new Set(economies.filter(e => e.region.id !== 'NA').map(e => e.iso2Code))

const rows: Record<string, Partial<Record<Field, number>>> = {}
for (const [field, id] of Object.entries(IND) as [Field, string][]) {
  const data = (await get(`${API}/country/all/indicator/${id}?source=3&format=json&date=${YEAR}&per_page=500`)) as {
    country: { id: string }
    value: number | null
  }[]
  for (const r of data) {
    if (r.value === null || !real.has(r.country.id)) continue
    ;(rows[r.country.id] ??= {})[field] = Number(r.value.toFixed(1))
  }
}

const countries: Record<string, { year: number } & Record<Field, number>> = {}
for (const code of Object.keys(rows).sort()) {
  const r = rows[code]!
  if ((Object.keys(IND) as Field[]).some(f => r[f] === undefined)) continue
  countries[code] = { year: YEAR, ...(r as Record<Field, number>) }
}

// Anchors that a mis-keyed table would fail: clear top and bottom performers.
const check = (code: string, test: (rl: number) => boolean) => {
  const c = countries[code]
  if (!c || !test(c.rl)) throw new Error(`wgi: implausible rule-of-law for ${code}: ${c?.rl}`)
}
check('DK', rl => rl > 80)
check('FI', rl => rl > 80)
check('NL', rl => rl > 75)
check('SY', rl => rl < 40)
check('SO', rl => rl < 35)
check('VE', rl => rl < 35)

writeFileSync(
  'src/data/wgi.json',
  JSON.stringify({
    source: `World Bank, Worldwide Governance Indicators (WGI), ${YEAR} data via api.worldbank.org, CC BY 4.0. Scores 0-100 with 90% confidence bounds.`,
    fetched: process.env.WGI_DATE ?? new Date().toISOString().slice(0, 10),
    countries,
  }),
)
console.log(`wgi: ${Object.keys(countries).length} countries for ${YEAR}`)
