// Checks Discover beyond the build-time test (run by hand, a few minutes):
//   node --experimental-strip-types scripts/check_discover_robustness.ts
// 1. Stricter nulls: the known-analog check with climate traits only, terrain and rock only,
//    and with each trait dropped in turn (median share of land ranked above, lower is better).
// 2. Robustness of the Home regions: 40 runs with each tolerance scaled at random by 0.5–1.5,
//    independently; how often each region stays within 100 km. Copy the counts to
//    site.home (`holds`) and the climate/terrain numbers to the Discover page.
import { readFileSync } from 'node:fs'
import { site } from '../src/config/site.ts'
import { ANALOG_SITES } from '../src/data/analogs.ts'
import { EARTH_SITES } from '../src/data/compare.ts'
import {
  ROCK,
  cellAt,
  cellLat,
  cellLon,
  distanceKm,
  knownPlaceNear,
  topRegions,
  type Cells,
} from '../src/lib/discover.ts'

const cells = JSON.parse(
  readFileSync(new URL('../public/discover/cells.json', import.meta.url), 'utf8'),
) as Cells
const n = cells.row.length
const IDS = ['meanTemp', 'dailyRange', 'precip', 'wind', 'elevation', 'relief', 'rock'] as const
type Id = (typeof IDS)[number]
type Scale = Record<Id, number>

// Same formulas as traitScores in src/lib/discover.ts, with one tolerance scale per trait.
const linear = (a: number | null, b: number | null, zeroAt: number) =>
  a === null || b === null ? null : Math.max(0, 1 - Math.abs(a - b) / zeroAt)
const ratio = (a: number | null, b: number | null, offset: number, k: number) =>
  a === null || b === null
    ? null
    : Math.max(0, 1 - Math.abs(Math.log10((a + offset) / (b + offset))) / k)

function scores(s: number, k: Scale, use: readonly Id[]) {
  const out = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const t: Record<Id, number | null> = {
      meanTemp: linear(cells.meanTempC10[s], cells.meanTempC10[i], 150 * k.meanTemp),
      dailyRange: linear(cells.dailyRangeC10[s], cells.dailyRangeC10[i], 80 * k.dailyRange),
      precip: ratio(cells.precipMmYr[s], cells.precipMmYr[i], 10, k.precip),
      wind: linear(cells.windMs10[s], cells.windMs10[i], 30 * k.wind),
      elevation: linear(cells.elevationM[s], cells.elevationM[i], 1500 * k.elevation),
      relief: ratio(cells.reliefM[s], cells.reliefM[i], 50, k.relief),
      rock:
        cells.rock[s] === cells.rock[i]
          ? 1
          : ROCK[cells.rock[s]]?.kind === ROCK[cells.rock[i]]?.kind
            ? 0.5
            : 0,
    }
    let sum = 0
    let m = 0
    for (const id of use) {
      const v = t[id]
      if (v !== null) {
        sum += v
        m++
      }
    }
    out[i] = m ? (sum / m) * 100 : 0
  }
  return out
}

const at = (i: number) => [cellLat(cells, i), cellLon(cells, i)] as const
const known = EARTH_SITES.map((s) => ({ id: s.id, cell: cellAt(cells, s.lat, s.lon) })).filter(
  (s) => s.cell >= 0,
)
const one = Object.fromEntries(IDS.map((id) => [id, 1])) as Scale

/** Median over seeds of the share of land (%) ranked above the closest other known site. */
function check(use: readonly Id[]) {
  const tops: number[] = []
  for (const seed of known) {
    const sc = scores(seed.cell, one, use)
    const sorted = Float32Array.from(sc).sort()
    const above = (v: number) => {
      let lo = 0
      let hi = n
      while (lo < hi) {
        const mid = (lo + hi) >> 1
        if (sorted[mid] <= v) lo = mid + 1
        else hi = mid
      }
      return (100 * (n - lo)) / n
    }
    const others = known.filter(
      (o) => o.id !== seed.id && distanceKm(...at(seed.cell), ...at(o.cell)) >= 400,
    )
    tops.push(Math.min(...others.map((o) => above(sc[o.cell]))))
  }
  tops.sort((a, b) => a - b)
  return tops[Math.floor(tops.length / 2)].toFixed(2)
}

console.log('All seven traits:', check(IDS))
console.log('Climate only:', check(IDS.slice(0, 4)))
console.log('Terrain and rock only:', check(IDS.slice(4)))
for (const d of IDS) console.log(`Without ${d}:`, check(IDS.filter((x) => x !== d)))

const places = [...EARTH_SITES, ...ANALOG_SITES]
const regions = [site.home.discovery, ...site.home.moreDiscoveries]
const found = (fromId: string, k: Scale) => {
  const s = known.find((x) => x.id === fromId)!.cell
  return topRegions(cells, scores(s, k, IDS), s, 10).find((i) => !knownPlaceNear(cells, i, places))!
}
const base = new Map(regions.map((d) => [d.fromId, found(d.fromId, one)]))
let seed = 7 // fixed, so the counts repeat
const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647
const holds = new Map(regions.map((d) => [d.fromId, 0]))
const RUNS = 40
for (let r = 0; r < RUNS; r++) {
  const k = Object.fromEntries(IDS.map((id) => [id, 0.5 + random()])) as Scale
  for (const d of regions)
    if (distanceKm(...at(found(d.fromId, k)), ...at(base.get(d.fromId)!)) <= 100)
      holds.set(d.fromId, holds.get(d.fromId)! + 1)
}
console.log(`Holds (of ${RUNS} runs):`, Object.fromEntries(holds))
