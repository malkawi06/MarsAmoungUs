/**
 * Tests for the Compare scoring (src/lib/similarity.ts) and checks on the sourced data files.
 * Run with `npm test` (Node's built-in test runner; no extra dependencies).
 */

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { ANALOG_SITES, LANDFORM_NAMES, analogsFor } from '../src/data/analogs.ts'
import { EARTH_SITES, TARGETS } from '../src/data/compare.ts'
import { GLOSSARY } from '../src/data/glossary.ts'
import {
  FACTOR_LABELS,
  NO_DATA,
  PURPOSES,
  compare,
  plannedFor,
  rank,
  scoreFactor,
  scoreLevels,
  type EarthSite,
  type FactorId,
  type Purpose,
  type Target,
} from '../src/lib/similarity.ts'

const site = (overrides: Partial<EarthSite> = {}): EarthSite => ({
  id: 'test-site',
  name: 'Test site',
  country: 'Nowhere',
  lat: 0,
  lon: 0,
  analogFor: 'Mars',
  meanTempC: 10,
  dailyRangeC: 15,
  precipMmYr: 100,
  elevationM: 0,
  slopeDeg: 2,
  reliefM: 20,
  materials: ['basalt'],
  landforms: ['impact'],
  source: 'https://example.org',
  ...overrides,
})

const target = (overrides: Partial<Target> = {}): Target => ({
  id: 'test-target',
  name: 'Test target',
  body: 'Moon',
  lat: -86,
  lon: 0,
  materials: ['anorthosite'],
  landforms: ['impact'],
  iceAccess: false,
  note: '',
  sources: [{ title: 'Example', url: 'https://example.org' }],
  ...overrides,
})

const purpose = (id: string): Purpose => PURPOSES.find((p) => p.id === id)!

describe('scoreFactor', () => {
  it('scores frozen ground from the MODIS ground temperature', () => {
    const moon = target({
      environment: {
        radiusKm: 7.5,
        sunlitBestPct: 80,
        sunlitMedianPct: 30,
        permanentShadowPct: 1,
        tempAvgMedianK: 113,
        tempAvgMinK: 41,
        tempMaxK: 278,
        iceWithin1mPct: 50,
        radarCprMedian: 0.5,
        radarCprAbove1Pct: 2,
      },
    })
    const f = (groundTempC: number | null, groundWarmestMonthC: number | null) =>
      scoreFactor('frozenGround', moon, site({ groundTempC, groundWarmestMonthC })).score
    assert.equal(f(-29, -11), 3)
    assert.equal(f(-10, 15), 2)
    assert.equal(f(12, 30), 1)
    assert.equal(f(null, null), 2)
    // Without Diviner data the target has no value, so the factor is left out.
    assert.equal(
      scoreFactor('frozenGround', target(), site({ groundTempC: -29, groundWarmestMonthC: -11 }))
        .score,
      null,
    )
  })

  it('scores ground ice from recorded ice, ESA permafrost and ground temperature', () => {
    const moon = target({
      environment: {
        radiusKm: 7.5,
        sunlitBestPct: 80,
        sunlitMedianPct: 30,
        permanentShadowPct: 1,
        tempAvgMedianK: 113,
        tempAvgMinK: 41,
        tempMaxK: 278,
        iceWithin1mPct: 50,
        radarCprMedian: 0.5,
        radarCprAbove1Pct: 2,
      },
    })
    const g = (o: Partial<EarthSite>) => scoreFactor('groundIce', moon, site(o)).score
    assert.equal(g({ materials: ['ice'] }), 3)
    assert.equal(g({ permafrostPct: 100, groundTempC: -16 }), 3)
    assert.equal(g({ permafrostPct: 60, groundTempC: -3 }), 2)
    assert.equal(g({ permafrostPct: 34, groundTempC: -1 }), 1)
    // No permafrost value: too warm for it, or unknown when the ground is cold.
    assert.equal(g({ permafrostPct: null, groundTempC: 20 }), 1)
    assert.equal(g({ permafrostPct: null, groundTempC: -5 }), 2)
  })

  it('scores slope against the target limit and the 8° landing limit', () => {
    const t = target({ slopeMaxDeg: 5 })
    assert.equal(scoreFactor('slope', t, site({ slopeDeg: 5 })).score, 3)
    assert.equal(scoreFactor('slope', t, site({ slopeDeg: 7.9 })).score, 2)
    assert.equal(scoreFactor('slope', t, site({ slopeDeg: 8 })).score, 1)
  })

  it('uses the Artemis landing limit for Moon targets only', () => {
    // A Mars target has no partial band: within its own slope or not.
    const mars = target({ body: 'Mars', slopeMaxDeg: 5 })
    assert.equal(scoreFactor('slope', mars, site({ slopeDeg: 5 })).score, 3)
    assert.equal(scoreFactor('slope', mars, site({ slopeDeg: 7 })).score, 1)
    assert.deepEqual(
      scoreLevels('slope', mars).map((level) => level.score),
      [3, 1],
    )
    for (const s of [3, 7, 20]) {
      const { reason } = scoreFactor('slope', mars, site({ slopeDeg: s }))
      assert.ok(!/artemis|landing limit/i.test(reason), reason)
    }
    for (const level of scoreLevels('slope', mars)) assert.ok(!/artemis/i.test(level.text))
    // Oxia Planum, the only Mars target with a slope: its own 8°, no Artemis wording.
    const oxia = TARGETS.find((t) => t.id === 'mars-oxia-planum')!
    for (const s of EARTH_SITES)
      assert.ok(!/artemis/i.test(scoreFactor('slope', oxia, s).reason), s.id)
  })

  it('gives measured factors a gap that grows with the distance from the target', () => {
    const moon = target({ slopeMaxDeg: 5 })
    assert.equal(scoreFactor('slope', moon, site({ slopeDeg: 2 })).gap, 0)
    assert.equal(scoreFactor('slope', moon, site({ slopeDeg: 8 })).gap, 1)
    const swing = (c: number) =>
      scoreFactor('dailyRange', target({ dailyRangeC: 70 }), site({ dailyRangeC: c })).gap!
    assert.ok(swing(60) < swing(50))
    const rain = (mm: number) =>
      scoreFactor('aridity', target({ precipMmYr: 0 }), site({ precipMmYr: mm })).gap!
    assert.ok(rain(10) < rain(20))
    // Named and unmeasured values have no gap.
    assert.equal(scoreFactor('rock', moon, site()).gap, undefined)
    assert.equal(scoreFactor('slope', moon, site({ slopeDeg: null })).gap, undefined)
  })

  it('treats an unmeasured Earth slope as neutral, and a missing target slope as no data', () => {
    assert.equal(
      scoreFactor('slope', target({ slopeMaxDeg: 5 }), site({ slopeDeg: null })).score,
      2,
    )
    const missing = scoreFactor('slope', target(), site())
    assert.equal(missing.score, null)
    assert.equal(missing.target, NO_DATA)
  })

  it('scores rock: same material, same kind, different kind, unknown', () => {
    const t = target({ materials: ['clay'] })
    assert.equal(scoreFactor('rock', t, site({ materials: ['clay', 'sand'] })).score, 3)
    assert.equal(scoreFactor('rock', t, site({ materials: ['sandstone'] })).score, 2)
    assert.equal(scoreFactor('rock', t, site({ materials: ['basalt'] })).score, 1)
    assert.equal(scoreFactor('rock', t, site({ materials: [] })).score, 2)
  })

  it('scores the day–night swing by its difference', () => {
    const t = target({ dailyRangeC: 70 })
    assert.equal(scoreFactor('dailyRange', t, site({ dailyRangeC: 60 })).score, 3)
    assert.equal(scoreFactor('dailyRange', t, site({ dailyRangeC: 40 })).score, 2)
    assert.equal(scoreFactor('dailyRange', t, site({ dailyRangeC: 39 })).score, 1)
    assert.equal(scoreFactor('dailyRange', target(), site()).target, NO_DATA)
  })

  it('leaves ice out with its own reason when the target has no reachable ice', () => {
    const result = scoreFactor('ice', target({ iceAccess: false }), site({ materials: ['ice'] }))
    assert.equal(result.score, null)
    assert.notEqual(result.target, NO_DATA)
    assert.equal(
      scoreFactor('ice', target({ iceAccess: true }), site({ materials: ['ice'] })).score,
      3,
    )
    assert.equal(scoreFactor('ice', target({ iceAccess: true }), site()).score, 1)
  })

  it('scores mean temperature by its difference', () => {
    const t = target({ meanTempC: -60 })
    assert.equal(scoreFactor('meanTemp', t, site({ meanTempC: -40 })).score, 3)
    assert.equal(scoreFactor('meanTemp', t, site({ meanTempC: -15 })).score, 2)
    assert.equal(scoreFactor('meanTemp', t, site({ meanTempC: -14 })).score, 1)
    assert.equal(scoreFactor('meanTemp', target(), site()).target, NO_DATA)
  })

  it('scores landform as same or different', () => {
    const t = target({ landforms: ['impact'] })
    assert.equal(scoreFactor('landform', t, site({ landforms: ['dunes', 'impact'] })).score, 3)
    assert.equal(scoreFactor('landform', t, site({ landforms: ['dunes'] })).score, 1)
    assert.equal(scoreFactor('landform', target({ landforms: [] }), site()).target, NO_DATA)
  })

  it('scores dryness by Earth rainfall', () => {
    const t = target({ body: 'Mars', precipMmYr: 0 })
    assert.equal(scoreFactor('aridity', t, site({ precipMmYr: 25 })).score, 3)
    assert.equal(scoreFactor('aridity', t, site({ precipMmYr: 250 })).score, 2)
    assert.equal(scoreFactor('aridity', t, site({ precipMmYr: 251 })).score, 1)
  })
})

describe('scoreLevels', () => {
  it('describes every score that scoreFactor gives, for all real data', () => {
    for (const target of TARGETS)
      for (const site of EARTH_SITES)
        for (const factor of Object.keys(FACTOR_LABELS) as FactorId[]) {
          const { score, earth } = scoreFactor(factor, target, site)
          const levels = scoreLevels(factor, target).map((level) => level.score)
          // A value not measured on Earth scores a neutral 2, which the page explains separately.
          if (score !== null && levels.length && earth !== 'not measured')
            assert.ok(levels.includes(score), `${factor} ${target.id} ${site.id}`)
        }
  })
})

describe('compare', () => {
  it('maps the mean score to 0–100% and ignores factors without data', () => {
    // No landform for the target, and no day–night swing: two of the four rover factors score.
    const t = target({ slopeMaxDeg: 5, landforms: [] })
    const best = compare(t, purpose('rover'), site({ slopeDeg: 1, materials: ['anorthosite'] }))
    assert.equal(best.scored, 2)
    assert.equal(best.factors.length, 4)
    assert.equal(best.percent, 100)
    const worst = compare(t, purpose('rover'), site({ slopeDeg: 20, materials: ['ice'] }))
    assert.equal(worst.percent, 0)
  })

  it('gives no percentage when nothing can be scored', () => {
    const t = target({ materials: [], landforms: [] })
    assert.equal(compare(t, purpose('training'), site()).percent, null)
  })

  it('scores only factors that can be scored, and names the others as planned', () => {
    for (const p of PURPOSES)
      for (const f of p.factors)
        assert.ok(
          TARGETS.some((t) => p.bodies.includes(t.body) && scoreLevels(f, t).length > 0),
          `${p.id}: ${f}`,
        )
    const labels = (id: string, body: 'Moon' | 'Mars') =>
      plannedFor(purpose(id), body).map((f) => f.label)
    assert.deepEqual(labels('base', 'Moon'), ['Sunlight'])
    assert.deepEqual(labels('base', 'Mars'), [])
    assert.deepEqual(labels('life', 'Mars'), ['Radiation / UV'])
    assert.deepEqual(labels('isru', 'Moon'), [])
  })

  it('applies the 8° landing rule to Moon targets only', () => {
    const steep = site({ slopeDeg: 12 })
    assert.equal(compare(target({ body: 'Moon' }), purpose('base'), steep).fails, true)
    assert.equal(compare(target({ body: 'Mars' }), purpose('base'), steep).fails, false)
    assert.equal(compare(target({ body: 'Moon' }), purpose('rover'), steep).fails, false)
    assert.equal(compare(target(), purpose('base'), site({ slopeDeg: null })).fails, false)
  })
})

describe('rank', () => {
  it('sorts by percentage and puts sites failing the landing rule last', () => {
    const t = target({ slopeMaxDeg: 5 })
    const ranked = rank(t, purpose('base'), [
      site({ id: 'steep-match', slopeDeg: 9, materials: ['anorthosite'] }),
      site({ id: 'flat-other', slopeDeg: 1, materials: ['ice'] }),
      site({ id: 'flat-match', slopeDeg: 1, materials: ['anorthosite'] }),
    ])
    assert.deepEqual(
      ranked.map((m) => m.site.id),
      ['flat-match', 'flat-other', 'steep-match'],
    )
  })
})

describe('rank: sites that share a percentage', () => {
  const t = target({ slopeMaxDeg: 5 })
  const rover = purpose('rover')

  it('orders them by how close the measured values are', () => {
    // Both are a partial slope match with different rock (25%); 6° is closer to the target than 7.5°.
    const ranked = rank(t, rover, [
      site({ id: 'far', name: 'A', slopeDeg: 7.5 }),
      site({ id: 'near', name: 'B', slopeDeg: 6 }),
    ])
    assert.equal(ranked[0].percent, ranked[1].percent)
    assert.deepEqual(
      ranked.map((m) => [m.site.id, m.place, m.tied]),
      [
        ['near', 1, false],
        ['far', 2, false],
      ],
    )
  })

  it('gives sites that cannot be told apart the same place, listed by name', () => {
    const ranked = rank(t, rover, [
      site({ id: 'c', name: 'Charlie', slopeDeg: 3 }),
      site({ id: 'top', name: 'Zulu', slopeDeg: 1, materials: ['anorthosite'] }),
      site({ id: 'a', name: 'Alpha', slopeDeg: 2 }),
      site({ id: 'last', name: 'Bravo', slopeDeg: 20 }),
    ])
    assert.deepEqual(
      ranked.map((m) => [m.site.id, m.place, m.tied]),
      [
        ['top', 1, false],
        ['a', 2, true],
        ['c', 2, true],
        ['last', 4, false],
      ],
    )
  })

  it('puts a site with no measured value after the measured ones', () => {
    const ranked = rank(target({ slopeMaxDeg: 5, materials: ['clay'] }), rover, [
      site({ id: 'water', name: 'A', slopeDeg: null, materials: ['clay'] }),
      site({ id: 'measured', name: 'B', slopeDeg: 6, materials: ['clay'] }),
    ])
    assert.equal(ranked[0].percent, ranked[1].percent)
    assert.deepEqual(
      ranked.map((m) => m.site.id),
      ['measured', 'water'],
    )
  })

  it('is the same whatever order the sites come in', () => {
    for (const real of TARGETS)
      for (const p of PURPOSES.filter((p) => p.bodies.includes(real.body))) {
        const ids = (sites: EarthSite[]) => rank(real, p, sites).map((m) => m.site.id)
        assert.deepEqual(ids([...EARTH_SITES].reverse()), ids(EARTH_SITES), `${real.id} ${p.id}`)
      }
  })
})

describe('data files', () => {
  const unique = (ids: string[]) => new Set(ids).size === ids.length
  const isUrl = (url: string) => /^https:\/\/\S+$/.test(url)
  const validLatLon = (lat: number, lon: number) =>
    lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180

  it('Compare: unique ids, valid coordinates and a source for every site and target', () => {
    assert.ok(unique(EARTH_SITES.map((s) => s.id)))
    assert.ok(unique(TARGETS.map((t) => t.id)))
    for (const s of EARTH_SITES) {
      assert.ok(validLatLon(s.lat, s.lon), s.id)
      assert.ok(isUrl(s.source), s.id)
    }
    for (const t of TARGETS) {
      assert.ok(validLatLon(t.lat, t.lon), t.id)
      assert.ok(t.sources.length > 0 && t.sources.every((src) => isUrl(src.url) && src.title), t.id)
    }
  })

  it('Compare: every rock and landform word has a sourced meaning', () => {
    for (const item of [...EARTH_SITES, ...TARGETS])
      for (const term of [...item.materials, ...item.landforms]) {
        assert.ok(GLOSSARY[term], `${item.id}: ${term}`)
        assert.ok(isUrl(GLOSSARY[term].source.url), term)
      }
  })

  it('Compare: every Moon region has its measured LRO environment, within physical limits', () => {
    for (const t of TARGETS.filter((t) => t.body === 'Moon')) {
      const e = t.environment
      assert.ok(e, t.id)
      for (const pct of [
        e.sunlitBestPct,
        e.sunlitMedianPct,
        e.permanentShadowPct,
        e.iceWithin1mPct,
      ])
        assert.ok(pct >= 0 && pct <= 100, `${t.id}: ${pct}`)
      assert.ok(e.sunlitMedianPct <= e.sunlitBestPct, t.id)
      assert.ok(e.tempAvgMinK <= e.tempAvgMedianK && e.tempAvgMedianK < e.tempMaxK, t.id)
      assert.ok(e.tempAvgMinK > 20 && e.tempMaxK < 420, t.id)
    }
    assert.ok(TARGETS.filter((t) => t.body === 'Mars').every((t) => !t.environment))
  })

  it('Compare: every purpose has a target body that offers it', () => {
    for (const p of PURPOSES)
      assert.ok(
        TARGETS.some((t) => p.bodies.includes(t.body)),
        p.id,
      )
  })

  it('Earth Analogs: unique ids, valid coordinates, known landforms and sources', () => {
    assert.ok(unique(ANALOG_SITES.map((s) => s.id)))
    for (const s of ANALOG_SITES) {
      assert.ok(validLatLon(s.lat, s.lon), s.id)
      assert.ok(s.sources.length > 0 && s.sources.every((src) => isUrl(src.url)), s.id)
      for (const code of Object.keys(s.landforms))
        assert.ok(Object.hasOwn(LANDFORM_NAMES, code), code)
    }
  })

  it('Earth Analogs: every landform has at least one site, strongest evidence first', () => {
    const order = ['strong', 'moderate', 'weak']
    for (const code of Object.keys(LANDFORM_NAMES) as (keyof typeof LANDFORM_NAMES)[]) {
      const ranks = analogsFor(code).map(({ confidence }) => order.indexOf(confidence))
      assert.ok(ranks.length > 0, code)
      assert.deepEqual(
        ranks,
        [...ranks].sort((a, b) => a - b),
        code,
      )
    }
  })
})

describe('Artemis regions', () => {
  it('get different permanent-base twins by the kind of ground (massif, crater rim, plain)', () => {
    const moon = TARGETS.filter((t) => t.body === 'Moon')
    const tops = new Set(moon.map((t) => rank(t, purpose('moonBase'), EARTH_SITES)[0].site.id))
    assert.ok(tops.size > 1, 'every Artemis region has the same first site')
  })
})

describe('landform', () => {
  it('leaves out a site with no recorded landform instead of scoring it weak', () => {
    const r = scoreFactor('landform', target({ landforms: ['impact'] }), site({ landforms: [] }))
    assert.equal(r.score, null)
  })
})
