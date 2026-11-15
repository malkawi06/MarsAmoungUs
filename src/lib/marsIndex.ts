/**
 * Closest to Mars: every ice-free land cell ranked by how far it goes toward Mars's conditions.
 *
 * Mars is colder, drier and thinner-aired than anywhere on Earth, with a bigger day–night swing, so
 * no Earth value can equal Mars's. Each condition is therefore ranked instead: a cell's percentile
 * is the share of ice-free land it is more Mars-like than (colder, bigger swing, drier, higher, so
 * thinner air). The index is the weighted mean of the four percentiles, 0–100. Ice sheets are left
 * out: Mars's surface is rock and dust. Mars values are from NASA's Mars Fact Sheet.
 */
import type { Cells } from './discover'

export type MarsAxisId = 'cold' | 'swing' | 'dry' | 'thin'

export const MARS_AXES: {
  id: MarsAxisId
  label: string
  /** The cell's value as shown, in `unit`. */
  value: (cells: Cells, i: number) => number | null
  unit: string
  /** True when a higher value is more like Mars. */
  higher: boolean
  /** Mars's value, from NASA's Mars Fact Sheet. */
  mars: string
}[] = [
  {
    id: 'cold',
    label: 'Mean temperature',
    value: (c, i) => tenth(c.meanTempC10[i]),
    unit: '°C',
    higher: false,
    mars: 'about −59 °C',
  },
  {
    id: 'swing',
    label: 'Day–night swing',
    value: (c, i) => tenth(c.dailyRangeC10[i]),
    unit: '°C',
    higher: true,
    mars: 'about 58 °C (−89 to −31 °C)',
  },
  {
    id: 'dry',
    label: 'Rain and snow',
    value: (c, i) => c.precipMmYr[i],
    unit: 'mm/yr',
    higher: false,
    mars: 'no rain',
  },
  {
    id: 'thin',
    label: 'Elevation (thinner air)',
    value: (c, i) => c.elevationM[i],
    unit: 'm',
    higher: true,
    mars: 'air at 6.36 mb, under 1% of Earth’s',
  },
]

function tenth(v: number | null) {
  return v === null ? null : v / 10
}

export interface MarsIndex {
  /** 0–100 per cell; 0 for ice and for cells missing a value. */
  score: Float32Array
  /** Per axis, the share of ice-free land (0–1) each cell is more Mars-like than; NaN when left out. */
  percentiles: Record<MarsAxisId, Float32Array>
  /** Cells in the ranking. */
  ranked: number
}

/** Ranks every ice-free cell with all four values. `weights` follow MARS_AXES; equal by default. */
export function marsIndex(cells: Cells, weights: number[] = [1, 1, 1, 1]): MarsIndex {
  const n = cells.row.length
  const eligible: number[] = []
  for (let i = 0; i < n; i++)
    if (cells.rock[i] !== 'ig' && MARS_AXES.every((a) => a.value(cells, i) !== null))
      eligible.push(i)

  const percentiles = {} as Record<MarsAxisId, Float32Array>
  for (const axis of MARS_AXES) {
    const p = new Float32Array(n).fill(NaN)
    const sorted = [...eligible].sort(
      (a, b) => (axis.value(cells, a) as number) - (axis.value(cells, b) as number),
    )
    const last = sorted.length - 1
    sorted.forEach((i, k) => (p[i] = axis.higher ? k / last : 1 - k / last))
    percentiles[axis.id] = p
  }

  const total = weights.reduce((a, b) => a + b, 0)
  const score = new Float32Array(n)
  for (const i of eligible)
    score[i] =
      (MARS_AXES.reduce((sum, axis, k) => sum + weights[k] * percentiles[axis.id][i], 0) / total) *
      100
  return { score, percentiles, ranked: eligible.length }
}

/** Cell i's place among the ranked land: 1 for the most Mars-like. */
export function placeOf(index: MarsIndex, i: number): number {
  let above = 0
  for (const s of index.score) if (s > index.score[i]) above++
  return above + 1
}

/** The share of ranked land (%) scoring above cell i: 0.4 means it is in the top 0.4%. */
export const topShare = (index: MarsIndex, i: number) =>
  ((placeOf(index, i) - 1) / index.ranked) * 100
