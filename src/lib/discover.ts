/**
 * Discover: find places anywhere on Earth whose environment matches a known Moon or Mars analog site.
 *
 * The grid (public/discover/cells.json, built by scripts/build_discover.py) holds every 0.5° land
 * cell with the same measurements for all cells: NASA POWER climate (MERRA-2 annual climatology),
 * terrain from SRTM-based terrain tiles at about 1 km, and the dominant rock class from GLiM.
 * A known site is compared through its own grid cell, so both sides are measured the same way.
 *
 * Scale: a cell is about 50 km across, so its elevation is a mean and its relief the highest minus
 * the lowest point of the whole patch. The Compare page measures the same site in a 0.6 km window
 * on the 30 m ASTER model, so the two pages' terrain values differ and are labelled by scale.
 * Slope is not in the grid at all: it means nothing at this scale.
 */

export interface Cells {
  cellDeg: number
  row: number[]
  col: number[]
  meanTempC10: (number | null)[]
  dailyRangeC10: (number | null)[]
  precipMmYr: (number | null)[]
  windMs10: (number | null)[]
  elevationM: (number | null)[]
  reliefM: (number | null)[]
  rock: string[]
}

/** Cell centre from its row (0 = 89.75°N) and column (0 = 179.75°W). */
export const cellLat = (cells: Cells, i: number) =>
  90 - cells.cellDeg / 2 - cells.row[i] * cells.cellDeg
export const cellLon = (cells: Cells, i: number) =>
  -180 + cells.cellDeg / 2 + cells.col[i] * cells.cellDeg

/** The land cell containing a point, or -1 (open water, or too small an island for the grid). */
export function cellAt(cells: Cells, lat: number, lon: number): number {
  const r = Math.round((90 - cells.cellDeg / 2 - lat) / cells.cellDeg)
  const c = Math.round((lon + 180 - cells.cellDeg / 2) / cells.cellDeg)
  for (let i = 0; i < cells.row.length; i++) if (cells.row[i] === r && cells.col[i] === c) return i
  return -1
}

/** GLiM rock classes (Hartmann & Moosdorf 2012) and the broad kind each belongs to. */
export const ROCK: Record<string, { name: string; kind: string }> = {
  su: { name: 'Unconsolidated sediments', kind: 'sedimentary' },
  ss: { name: 'Siliciclastic sedimentary rocks', kind: 'sedimentary' },
  sm: { name: 'Mixed sedimentary rocks', kind: 'sedimentary' },
  sc: { name: 'Carbonate sedimentary rocks', kind: 'sedimentary' },
  ev: { name: 'Evaporites', kind: 'sedimentary' },
  vb: { name: 'Basic volcanic rocks', kind: 'igneous' },
  vi: { name: 'Intermediate volcanic rocks', kind: 'igneous' },
  va: { name: 'Acid volcanic rocks', kind: 'igneous' },
  py: { name: 'Pyroclastics', kind: 'igneous' },
  pb: { name: 'Basic plutonic rocks', kind: 'igneous' },
  pi: { name: 'Intermediate plutonic rocks', kind: 'igneous' },
  pa: { name: 'Acid plutonic rocks', kind: 'igneous' },
  mt: { name: 'Metamorphic rocks', kind: 'metamorphic' },
  ig: { name: 'Ice and glaciers', kind: 'ice' },
}

/** Optional limits on where to look. Rain thresholds match the Compare page's dryness factor. */
export const FILTERS = {
  rock: {
    label: 'Rock',
    options: [
      { id: 'any', label: 'Any rock' },
      { id: 'igneous', label: 'Volcanic or igneous' },
      { id: 'sedimentary', label: 'Sedimentary' },
      { id: 'metamorphic', label: 'Metamorphic' },
      { id: 'ice', label: 'Ice' },
    ],
  },
  climate: {
    label: 'Climate',
    options: [
      { id: 'any', label: 'Any climate' },
      { id: 'desert', label: 'Desert (250 mm/yr or less)' },
      { id: 'hyperArid', label: 'Hyper-arid (25 mm/yr or less)' },
      { id: 'cold', label: 'Cold (mean 0 °C or below)' },
    ],
  },
} as const

export type RockFilter = (typeof FILTERS.rock.options)[number]['id']
export type ClimateFilter = (typeof FILTERS.climate.options)[number]['id']

/** Whether cell i meets the chosen limits. A cell without the needed value does not pass. */
export function passes(cells: Cells, i: number, rock: RockFilter, climate: ClimateFilter): boolean {
  if (rock !== 'any' && ROCK[cells.rock[i]]?.kind !== rock) return false
  const rain = cells.precipMmYr[i]
  const temp = cells.meanTempC10[i]
  if (climate === 'desert') return rain !== null && rain <= 250
  if (climate === 'hyperArid') return rain !== null && rain <= 25
  if (climate === 'cold') return temp !== null && temp <= 0
  return true
}

export type TraitId =
  'meanTemp' | 'dailyRange' | 'precip' | 'wind' | 'elevation' | 'relief' | 'rock'

/**
 * How far apart two values can be before a trait counts as not similar at all. These are the
 * method's choices, not measured values: similarity falls in a straight line from 100% (equal) to
 * 0% (this far apart or more). Rain and relief are compared as ratios, since 10 mm versus 100 mm
 * matters more than 1,010 mm versus 1,100 mm.
 */
export const TRAITS: {
  id: TraitId
  label: string
  /** Value shown to people, or null when the cell has none. */
  value: (cells: Cells, i: number) => number | string | null
  unit: string
  tolerance: string
}[] = [
  {
    id: 'meanTemp',
    label: 'Mean temperature',
    value: (c, i) => tenth(c.meanTempC10[i]),
    unit: '°C',
    tolerance: '15 °C apart scores 0%',
  },
  {
    id: 'dailyRange',
    label: 'Day–night swing',
    value: (c, i) => tenth(c.dailyRangeC10[i]),
    unit: '°C',
    tolerance: '8 °C apart scores 0%',
  },
  {
    id: 'precip',
    label: 'Rain and snow',
    value: (c, i) => c.precipMmYr[i],
    unit: 'mm/yr',
    tolerance: 'ten times wetter or drier scores 0%',
  },
  {
    id: 'wind',
    label: 'Wind at 10 m',
    value: (c, i) => tenth(c.windMs10[i]),
    unit: 'm/s',
    tolerance: '3 m/s apart scores 0%',
  },
  {
    id: 'elevation',
    label: 'Mean elevation of the patch',
    value: (c, i) => c.elevationM[i],
    unit: 'm',
    tolerance: '1,500 m apart scores 0%',
  },
  {
    id: 'relief',
    label: 'Relief across the patch',
    value: (c, i) => c.reliefM[i],
    unit: 'm',
    tolerance: 'ten times flatter or rougher scores 0%',
  },
  {
    id: 'rock',
    label: 'Rock type',
    value: (c, i) => ROCK[c.rock[i]]?.name ?? null,
    unit: '',
    tolerance: 'same class 100%, same kind (e.g. both sedimentary) 50%, otherwise 0%',
  },
]

function tenth(v: number | null) {
  return v === null ? null : v / 10
}

const linear = (a: number | null, b: number | null, zeroAt: number) =>
  a === null || b === null ? null : Math.max(0, 1 - Math.abs(a - b) / zeroAt)
const ratio = (a: number | null, b: number | null, offset: number) =>
  a === null || b === null
    ? null
    : Math.max(0, 1 - Math.abs(Math.log10((a + offset) / (b + offset))))

/** Similarity of cell i to cell s for each trait, 0–1, or null when either cell lacks the value. */
export function traitScores(cells: Cells, s: number, i: number): Record<TraitId, number | null> {
  const rockScore =
    cells.rock[s] === cells.rock[i]
      ? 1
      : ROCK[cells.rock[s]]?.kind === ROCK[cells.rock[i]]?.kind
        ? 0.5
        : 0
  return {
    meanTemp: linear(cells.meanTempC10[s], cells.meanTempC10[i], 150),
    dailyRange: linear(cells.dailyRangeC10[s], cells.dailyRangeC10[i], 80),
    precip: ratio(cells.precipMmYr[s], cells.precipMmYr[i], 10),
    wind: linear(cells.windMs10[s], cells.windMs10[i], 30),
    elevation: linear(cells.elevationM[s], cells.elevationM[i], 1500),
    relief: ratio(cells.reliefM[s], cells.reliefM[i], 50),
    rock: rockScore,
  }
}

/** Overall similarity 0–100: the mean of the traits both cells have. */
export function similarity(cells: Cells, s: number, i: number): number {
  const scores = Object.values(traitScores(cells, s, i)).filter((v): v is number => v !== null)
  return scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length) * 100 : 0
}

/** Great-circle distance in km. */
export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const rad = Math.PI / 180
  const a =
    Math.sin(((lat2 - lat1) * rad) / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lon2 - lon1) * rad) / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(a))
}

/**
 * Best-matching cells, spread out: each pick is at least `spacingKm` from the seed and from every
 * earlier pick, so the list shows different regions instead of neighbouring cells.
 */
export function topRegions(
  cells: Cells,
  scores: Float32Array,
  seed: number,
  count = 10,
  spacingKm = 400,
) {
  const order = Array.from(scores.keys()).sort((a, b) => scores[b] - scores[a])
  const picks: number[] = []
  const seedLat = cellLat(cells, seed)
  const seedLon = cellLon(cells, seed)
  for (const i of order) {
    // Sorted best first, so a 0 means every place left was filtered out.
    if (picks.length >= count || scores[i] <= 0) break
    const lat = cellLat(cells, i)
    const lon = cellLon(cells, i)
    if (distanceKm(lat, lon, seedLat, seedLon) < spacingKm) continue
    if (picks.some((p) => distanceKm(lat, lon, cellLat(cells, p), cellLon(cells, p)) < spacingKm))
      continue
    picks.push(i)
  }
  return picks
}

/** A region this close to a site on our lists counts as an already known analog. */
export const KNOWN_KM = 100

/** The first listed place within KNOWN_KM of cell i, if any. */
export function knownPlaceNear<T extends { lat: number; lon: number }>(
  cells: Cells,
  i: number,
  places: T[],
): T | undefined {
  return places.find(
    (p) => distanceKm(p.lat, p.lon, cellLat(cells, i), cellLon(cells, i)) < KNOWN_KM,
  )
}

/** Similarity of every cell to cell s, 0–100. */
export function scoresFrom(cells: Cells, s: number): Float32Array {
  const out = new Float32Array(cells.row.length)
  for (let i = 0; i < out.length; i++) out[i] = similarity(cells, s, i)
  return out
}

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = sorted.length >> 1
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

export interface KnownAnalogCheck {
  /** Known sites used as starting points (those inside a land cell). */
  seeds: number
  /** For each seed: the closest other known analog, and the share of land (%) ranked above it. */
  results: { id: string; closestId: string; topPct: number }[]
  /** Median of topPct over the seeds. */
  medianTopPct: number
  /** The same median if the other known analogs were land cells picked at random. */
  randomMedianTopPct: number
}

/**
 * Checks Discover against analogs found by other researchers. From each known site, every land
 * cell is ranked by similarity; the check reports where the closest other known site lands, as the
 * share of Earth's land ranked above it. Sites closer than `spacingKm` to the seed are skipped, so
 * a neighbouring site of the same field cannot pass the check by being next door.
 *
 * If Discover only matched by chance, the best of k other sites would be the best of k random
 * cells: its share has median 1 − 0.5^(1/k). Comparing the two shows how much the method adds.
 */
export function checkAgainstKnown(
  cells: Cells,
  known: { id: string; cell: number }[],
  spacingKm = 400,
): KnownAnalogCheck {
  const n = cells.row.length
  const results: KnownAnalogCheck['results'] = []
  const randomMedians: number[] = []
  for (const seed of known) {
    const scores = scoresFrom(cells, seed.cell)
    const sorted = Float32Array.from(scores).sort()
    /** Share of land (%) strictly more similar than value v. */
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
    const at = (i: number) => [cellLat(cells, i), cellLon(cells, i)] as const
    const others = known.filter(
      (o) => o.id !== seed.id && distanceKm(...at(seed.cell), ...at(o.cell)) >= spacingKm,
    )
    if (!others.length) continue
    const ranked = others
      .map((o) => ({ id: o.id, topPct: above(scores[o.cell]) }))
      .sort((a, b) => a.topPct - b.topPct)
    results.push({ id: seed.id, closestId: ranked[0].id, topPct: ranked[0].topPct })
    randomMedians.push(100 * (1 - 0.5 ** (1 / others.length)))
  }
  return {
    seeds: results.length,
    results,
    medianTopPct: median(results.map((r) => r.topPct)),
    randomMedianTopPct: median(randomMedians),
  }
}
