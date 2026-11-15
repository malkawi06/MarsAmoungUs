/** Checks for Closest to Mars (src/lib/marsIndex.ts), including every claim its page makes. */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { site } from '../src/config/site.ts'
import { ANALOG_SITES } from '../src/data/analogs.ts'
import { EARTH_SITES } from '../src/data/compare.ts'
import { cellAt, cellLat, cellLon, type Cells } from '../src/lib/discover.ts'
import { marsIndex, topShare } from '../src/lib/marsIndex.ts'

const fixture: Cells = {
  cellDeg: 0.5,
  row: [100, 100, 100, 20],
  col: [400, 500, 600, 100],
  meanTempC10: [-60, 250, 100, -300],
  dailyRangeC10: [150, 80, 120, 50],
  precipMmYr: [70, 2000, 300, 100],
  windMs10: [50, 30, 40, 70],
  elevationM: [5000, 10, 1500, 3000],
  reliefM: [500, 50, 300, 100],
  rock: ['sc', 'ss', 'vb', 'ig'],
}

test('the coldest, driest, highest cell with the biggest swing ranks first; ice is left out', () => {
  const index = marsIndex(fixture)
  assert.equal(index.ranked, 3)
  assert.equal(index.score[0], 100)
  assert.equal(index.score[1], 0)
  assert.equal(index.score[3], 0)
  assert.ok(Number.isNaN(index.percentiles.cold[3]))
  assert.equal(topShare(index, 0), 0)
})

const cells = JSON.parse(readFileSync('public/discover/cells.json', 'utf8')) as Cells
const onTibetanPlateau = (i: number) => {
  const lat = cellLat(cells, i)
  const lon = cellLon(cells, i)
  return lat > 28 && lat < 38 && lon > 75 && lon < 100
}
const best = (score: Float32Array) => score.reduce((b, s, i) => (s > score[b] ? i : b), 0)
const median = (v: number[]) => [...v].sort((a, b) => a - b)[v.length >> 1]
const index = marsIndex(cells)

test('the page: Earth’s most Mars-like ice-free land is on the Tibetan Plateau', () => {
  assert.ok(onTibetanPlateau(best(index.score)))
})

test('the page: the analog sites space agencies chose rank in the top 1% of land', () => {
  for (const place of site.mars.checks) {
    const i = cellAt(cells, place.lat, place.lon)
    assert.ok(i >= 0, place.name)
    assert.ok(topShare(index, i) < 1, `${place.name}: top ${topShare(index, i).toFixed(2)}%`)
  }
})

test('the page: with random weights, 40 times, the top region stays on the Tibetan Plateau', () => {
  let seed = 7
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  for (let run = 0; run < 40; run++) {
    const weights = [0, 0, 0, 0].map(() => 0.5 + random())
    assert.ok(onTibetanPlateau(best(marsIndex(cells, weights).score)), `run ${run}`)
  }
})

const shares = (sites: { lat: number; lon: number }[]) =>
  sites
    .map((s) => cellAt(cells, s.lat, s.lon))
    .filter((i) => i >= 0 && index.score[i] > 0)
    .map((i) => topShare(index, i))

test('the page: known Mars analogs rank far above random land, known Moon analogs do not', () => {
  const isMoon = (name: string) =>
    EARTH_SITES.some((s) => s.name === name && s.analogFor === 'Moon') ||
    ANALOG_SITES.some((s) => s.name === name && 'moon' in s.landforms)
  const all = [...EARTH_SITES, ...ANALOG_SITES].filter(
    (s, k, list) => list.findIndex((x) => x.name === s.name) === k,
  )
  assert.ok(median(shares(all.filter((s) => !isMoon(s.name)))) < 20)
  assert.ok(median(shares(all.filter((s) => isMoon(s.name)))) > 40)
})
