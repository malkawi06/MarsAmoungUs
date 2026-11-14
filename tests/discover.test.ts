import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { EARTH_SITES } from '../src/data/compare.ts'
import {
  cellAt,
  cellLat,
  cellLon,
  checkAgainstKnown,
  distanceKm,
  knownPlaceNear,
  passes,
  similarity,
  topRegions,
  traitScores,
  type Cells,
} from '../src/lib/discover.ts'

// Three cells: two hot dry deserts on sandstone and one cold wet place on ice.
const cells: Cells = {
  cellDeg: 0.5,
  row: [100, 100, 20],
  col: [400, 500, 100],
  meanTempC10: [200, 210, -150],
  dailyRangeC10: [150, 140, 50],
  precipMmYr: [40, 50, 900],
  windMs10: [40, 40, 70],
  elevationM: [900, 800, 300],
  reliefM: [600, 500, 100],
  rock: ['ss', 'ss', 'ig'],
}

test('a cell is 100% like itself', () => {
  assert.equal(similarity(cells, 0, 0), 100)
})

test('a similar desert scores far above a cold wet place', () => {
  assert.ok(similarity(cells, 0, 1) > 85)
  assert.ok(similarity(cells, 0, 2) < 20)
})

test('rock: same class 1, same kind 0.5, different kind 0', () => {
  const c = { ...cells, rock: ['ss', 'sc', 'vb'] }
  assert.equal(traitScores(c, 0, 0).rock, 1)
  assert.equal(traitScores(c, 0, 1).rock, 0.5)
  assert.equal(traitScores(c, 0, 2).rock, 0)
})

test('missing values are left out, not counted as 0', () => {
  const c = { ...cells, elevationM: [900, null, 300] }
  assert.equal(traitScores(c, 0, 1).elevation, null)
  assert.ok(similarity(c, 0, 1) > 85)
})

test('top regions skip the seed and stay apart', () => {
  const scores = new Float32Array([100, 90, 10])
  const picks = topRegions(cells, scores, 0, 5, 400)
  assert.ok(!picks.includes(0))
  assert.deepEqual(picks, [1, 2])
})

test('cellAt finds the cell containing a point', () => {
  assert.equal(cellAt(cells, 39.75, 20.25), 0)
  assert.equal(cellAt(cells, 0, 0), -1)
  assert.ok(Math.abs(distanceKm(0, 0, 0, 1) - 111.2) < 0.5)
})

test('filters keep only the chosen rock kind and climate', () => {
  assert.equal(passes(cells, 0, 'sedimentary', 'desert'), true)
  assert.equal(passes(cells, 0, 'igneous', 'any'), false)
  assert.equal(passes(cells, 0, 'any', 'hyperArid'), false)
  assert.equal(passes(cells, 2, 'ice', 'cold'), true)
})

test('top regions stop at places filtered out (score 0)', () => {
  assert.deepEqual(topRegions(cells, new Float32Array([100, 0, 0]), 0, 5, 400), [])
})

test('knownPlaceNear finds a listed place within 100 km only', () => {
  const places = [{ name: 'Here', lat: 39.75, lon: 20.25 }]
  assert.equal(knownPlaceNear(cells, 0, places)?.name, 'Here')
  assert.equal(knownPlaceNear(cells, 2, places), undefined)
})

test('the real grid: known analogs rank far above chance from each other', () => {
  const grid = JSON.parse(
    readFileSync(new URL('../public/discover/cells.json', import.meta.url), 'utf8'),
  ) as Cells
  const known = EARTH_SITES.map((s) => ({ id: s.id, cell: cellAt(grid, s.lat, s.lon) })).filter(
    (s) => s.cell >= 0,
  )
  const check = checkAgainstKnown(grid, known)
  assert.ok(check.seeds >= 20, `${check.seeds} seeds`)
  assert.ok(check.medianTopPct * 2 < check.randomMedianTopPct, JSON.stringify(check))
  // No seed may count a site closer than 400 km.
  for (const r of check.results) {
    const a = known.find((k) => k.id === r.id)!.cell
    const b = known.find((k) => k.id === r.closestId)!.cell
    const at = (i: number) => [cellLat(grid, i), cellLon(grid, i)] as const
    assert.ok(distanceKm(...at(a), ...at(b)) >= 400, `${r.id} -> ${r.closestId}`)
  }
})
