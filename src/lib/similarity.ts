/**
 * Scores how well an Earth site matches a Moon or Mars target for one analog purpose.
 *
 * Method (after Stern et al. 2025, JGR Planets, doi 10.1029/2024JE008803):
 * - the factors compared depend on the purpose;
 * - each factor scores 1 (weak), 2 (partial / unknown) or 3 (strong), all factors weigh the same;
 * - a factor with no data for the target is left out and shown as "no data";
 * - overall match = (mean score − 1) / 2, so all 3s = 100% and all 1s = 0%.
 *
 * Three scores give few possible percentages, so sites often share one. Sites with the same
 * percentage are ordered by how far their measured values are from the target's (`gap`), and
 * sites that are still equal share a place instead of being listed in an arbitrary order.
 */

export type Body = 'Moon' | 'Mars'

export interface EarthSite {
  id: string
  name: string
  country: string
  lat: number
  lon: number
  analogFor: Body
  meanTempC: number
  dailyRangeC: number
  precipMmYr: number
  elevationM: number
  /** null = not measured: the coordinates fall on a lake or the sea. */
  slopeDeg: number | null
  reliefM: number | null
  materials: string[]
  landforms: string[]
  source: string
  note?: string
}

export interface Target {
  id: string
  name: string
  body: Body
  lat: number
  lon: number
  materials: string[]
  landforms: string[]
  slopeMaxDeg?: number
  meanTempC?: number
  /** Near-surface air temperature, daily high minus low, °C. */
  dailyRangeC?: number
  precipMmYr?: number
  iceAccess: boolean
  /** What the place is geologically, in one sentence (Moon regions). */
  setting?: string
  /** Measured by NASA's Lunar Reconnaissance Orbiter around the region centre (Moon regions). */
  environment?: MoonEnvironment
  note: string
  sources: TargetSource[]
}

/**
 * A Moon region's environment, from scripts/build_moon_environment.py. Shown, not scored: Earth sites have
 * air temperatures and no sunlit-time value, so there is nothing comparable on the Earth side.
 */
export interface MoonEnvironment {
  /** Every value covers the points within this distance of the region centre. */
  radiusKm: number
  /** LOLA: share of the time the best-lit point is in sunlight, and the middle point. */
  sunlitBestPct: number
  sunlitMedianPct: number
  /** LOLA: share of the area that never sees the Sun. */
  permanentShadowPct: number
  /** Diviner: median of the yearly average surface temperature, the coldest yearly average, the hottest moment. */
  tempAvgMedianK: number
  tempAvgMinK: number
  tempMaxK: number
  /** Diviner: share of the area where water ice would stay stable within 1 m of the surface. */
  iceWithin1mPct: number
  /** Mini-RF radar: middle circular polarization ratio, and the share of the area above 1. */
  radarCprMedian: number
  radarCprAbove1Pct: number
}

export interface TargetSource {
  title: string
  url: string
  /** What the source reports, in one sentence. Only set when checked against the source. */
  says?: string
  /** Factors whose target value this source supports. */
  supports?: FactorId[]
}

export type FactorId = 'slope' | 'rock' | 'landform' | 'meanTemp' | 'aridity' | 'ice' | 'dailyRange'

export type Score = 1 | 2 | 3

export interface FactorResult {
  factor: FactorId
  label: string
  /** null = no data for the target, so the factor is left out of the match. */
  score: Score | null
  target: string
  earth: string
  reason: string
  /**
   * Measured factors only: how far the Earth value is from the target's, where 0 is no gap and 1
   * is the gap at which the factor turns weak. Orders sites that share a percentage; it is not
   * part of the percentage.
   */
  gap?: number
}

/** A factor a purpose should compare, but that no target has a sourced, comparable value for yet. */
export interface PlannedFactor {
  label: string
  /** Why it cannot be scored yet, in one sentence. */
  why: string
  /** Bodies it applies to; all when left out. */
  bodies?: Body[]
}

export interface Purpose {
  id: string
  label: string
  bodies: Body[]
  factors: FactorId[]
  /** Named on the page as not compared yet, so a purpose does not look more complete than it is. */
  planned?: PlannedFactor[]
  /**
   * Landing-slope rule for Moon targets: Earth sites this steep or steeper fail. The Artemis Human
   * Landing System requires landing slopes of 0–8° (NASA 2019, quoted in JGR Planets 2025,
   * doi 10.1029/2025JE009434). There is no equivalent sourced rule for Mars, so it is not applied there.
   */
  maxSlopeDeg?: number
}

const RELIEF: PlannedFactor = {
  label: 'Local relief',
  why: 'Earth relief is measured over a 0.6 km window; no Moon or Mars target has a sourced value at that scale.',
}
const SUNLIGHT: PlannedFactor = {
  label: 'Sunlight',
  why: 'Each Artemis region shows its sunlight from NASA LOLA above, but no Earth site has a comparable value, so it is not scored.',
  bodies: ['Moon'],
}
const RADIATION: PlannedFactor = {
  label: 'Radiation / UV',
  why: 'No sourced radiation value has been added for the Mars targets or the Earth sites.',
}

export const PURPOSES: Purpose[] = [
  {
    id: 'rover',
    label: 'Rover testing',
    bodies: ['Moon', 'Mars'],
    factors: ['slope', 'rock', 'dailyRange'],
    planned: [RELIEF],
  },
  {
    id: 'base',
    label: 'Base / habitat',
    bodies: ['Moon', 'Mars'],
    factors: ['dailyRange', 'meanTemp', 'slope', 'rock'],
    planned: [SUNLIGHT],
    maxSlopeDeg: 8,
  },
  {
    id: 'isru',
    label: 'Using local resources',
    bodies: ['Moon', 'Mars'],
    factors: ['rock', 'ice', 'meanTemp'],
  },
  {
    id: 'life',
    label: 'Search for life',
    bodies: ['Mars'],
    factors: ['aridity', 'rock', 'meanTemp'],
    planned: [RADIATION],
  },
  {
    id: 'training',
    label: 'Astronaut training',
    bodies: ['Moon', 'Mars'],
    factors: ['rock', 'landform'],
    planned: [RELIEF],
  },
]

/** The factors a purpose cannot compare yet for this body. */
export const plannedFor = (purpose: Purpose, body: Body): PlannedFactor[] =>
  (purpose.planned ?? []).filter((f) => !f.bodies || f.bodies.includes(body))

export const FACTOR_LABELS: Record<FactorId, string> = {
  slope: 'Slope',
  rock: 'Rock / surface type',
  landform: 'Landform',
  meanTemp: 'Mean temperature',
  aridity: 'Dryness',
  ice: 'Water ice',
  dailyRange: 'Day–night temperature swing',
}

/** Materials in the same group are a partial match (e.g. clay vs sandstone). */
export const MATERIAL_GROUP: Record<string, string> = {
  sand: 'sedimentary',
  sulfate: 'sedimentary',
  salt: 'sedimentary',
  clay: 'sedimentary',
  carbonate: 'sedimentary',
  sandstone: 'sedimentary',
  basalt: 'igneous',
  anorthosite: 'igneous',
  ice: 'ice',
}

/**
 * The Artemis Human Landing System lands on slopes of 0–8°, so on the Moon an Earth site steeper
 * than the target but under 8° is still a partial match. It is a Moon rule: Mars has no sourced
 * second limit, so there a site is either within the target's slope or not.
 */
const ARTEMIS_LANDING_LIMIT_DEG = 8
/** Temperature gaps (°C) for a strong and a partial match. */
const MEAN_TEMP_GAP = { strong: 20, partial: 45 }
const DAILY_RANGE_GAP = { strong: 10, partial: 30 }
/** Yearly precipitation (mm) for hyper-arid and desert. */
const RAIN = { hyperArid: 25, desert: 250 }

const list = (items: string[]) => items.join(', ') || 'none recorded'
const result = (
  factor: FactorId,
  score: Score | null,
  target: string,
  earth: string,
  reason: string,
  gap?: number,
): FactorResult => ({
  factor,
  label: FACTOR_LABELS[factor],
  score,
  target,
  earth,
  reason,
  ...(gap === undefined ? {} : { gap }),
})
/** The target value shown for a factor left out because the target has no sourced value. */
export const NO_DATA = 'no data'
const noData = (factor: FactorId, earth = '—') =>
  result(factor, null, NO_DATA, earth, 'Left out: no sourced value for the target yet.')

export function scoreFactor(factor: FactorId, target: Target, site: EarthSite): FactorResult {
  switch (factor) {
    case 'slope': {
      const earth = site.slopeDeg === null ? 'not measured' : `${site.slopeDeg.toFixed(1)}°`
      if (target.slopeMaxDeg === undefined) return noData(factor, earth)
      if (site.slopeDeg === null)
        return result(
          factor,
          2,
          `under ${target.slopeMaxDeg}°`,
          earth,
          'Not measured: the coordinates fall on water. Neutral.',
        )
      const max = target.slopeMaxDeg
      const over = Math.max(0, site.slopeDeg - max)
      if (target.body !== 'Moon') {
        // Mars: within the target's own slope or not. The Artemis limit does not apply here.
        const within = over === 0
        return result(
          factor,
          within ? 3 : 1,
          `under ${max}°`,
          earth,
          within ? `As flat as the target (under ${max}°).` : `Steeper than the target's ${max}°.`,
          over / max,
        )
      }
      const score: Score = over === 0 ? 3 : site.slopeDeg < ARTEMIS_LANDING_LIMIT_DEG ? 2 : 1
      const reason =
        score === 3
          ? `As flat as the target (under ${max}°).`
          : score === 2
            ? `Steeper than the target, but still under the ${ARTEMIS_LANDING_LIMIT_DEG}° Artemis landing limit.`
            : `Steeper than the ${ARTEMIS_LANDING_LIMIT_DEG}° Artemis landing limit.`
      // 1 at the landing limit; a target already at the limit falls back to its own slope.
      const span = ARTEMIS_LANDING_LIMIT_DEG - max
      return result(factor, score, `under ${max}°`, earth, reason, over / (span > 0 ? span : max))
    }
    case 'rock': {
      const earth = list(site.materials)
      if (!target.materials.length) return noData(factor, earth)
      if (!site.materials.length)
        return result(
          factor,
          2,
          list(target.materials),
          earth,
          'Rock type not recorded for this site: neutral.',
        )
      const shared = site.materials.filter((m) => target.materials.includes(m))
      if (shared.length)
        return result(factor, 3, list(target.materials), earth, `Same material: ${list(shared)}.`)
      const groups = new Set(target.materials.map((m) => MATERIAL_GROUP[m]))
      const related = site.materials.some((m) => groups.has(MATERIAL_GROUP[m]))
      return related
        ? result(
            factor,
            2,
            list(target.materials),
            earth,
            'Different material of the same kind (e.g. both sedimentary).',
          )
        : result(factor, 1, list(target.materials), earth, 'Different kind of material.')
    }
    case 'landform': {
      const earth = list(site.landforms)
      if (!target.landforms.length) return noData(factor, earth)
      const shared = site.landforms.filter((l) => target.landforms.includes(l))
      return shared.length
        ? result(factor, 3, list(target.landforms), earth, `Same landform: ${list(shared)}.`)
        : result(factor, 1, list(target.landforms), earth, 'No matching landform.')
    }
    case 'meanTemp': {
      const earth = `${site.meanTempC.toFixed(1)} °C`
      if (target.meanTempC === undefined) return noData(factor, earth)
      const diff = Math.abs(site.meanTempC - target.meanTempC)
      const score: Score = diff <= MEAN_TEMP_GAP.strong ? 3 : diff <= MEAN_TEMP_GAP.partial ? 2 : 1
      return result(
        factor,
        score,
        `${target.meanTempC} °C`,
        earth,
        `${Math.round(diff)} °C apart.`,
        diff / MEAN_TEMP_GAP.partial,
      )
    }
    case 'aridity': {
      const earth = `${site.precipMmYr} mm/yr`
      if (target.precipMmYr === undefined) return noData(factor, earth)
      const score: Score =
        site.precipMmYr <= RAIN.hyperArid ? 3 : site.precipMmYr <= RAIN.desert ? 2 : 1
      const reason =
        score === 3
          ? `Hyper-arid (${RAIN.hyperArid} mm/yr or less).`
          : score === 2
            ? `Desert (${RAIN.desert} mm/yr or less).`
            : 'Wetter than a desert.'
      return result(factor, score, 'no rain', earth, reason, site.precipMmYr / RAIN.desert)
    }
    case 'ice': {
      const has = site.materials.includes('ice')
      if (!target.iceAccess)
        return result(
          factor,
          null,
          'no ice reachable',
          has ? 'ice' : 'no ice',
          'The target has no reachable ice, so this is left out.',
        )
      return has
        ? result(factor, 3, 'ice reachable', 'ice', 'Both have ground ice.')
        : result(factor, 1, 'ice reachable', 'no ice', 'No ground ice at this site.')
    }
    case 'dailyRange': {
      const earth = `${site.dailyRangeC.toFixed(1)} °C`
      if (target.dailyRangeC === undefined) return noData(factor, earth)
      const diff = Math.abs(site.dailyRangeC - target.dailyRangeC)
      const score: Score =
        diff <= DAILY_RANGE_GAP.strong ? 3 : diff <= DAILY_RANGE_GAP.partial ? 2 : 1
      return result(
        factor,
        score,
        `${target.dailyRangeC} °C`,
        earth,
        `${Math.round(diff)} °C apart.`,
        diff / DAILY_RANGE_GAP.partial,
      )
    }
  }
}

/** How a factor is scored: what earns 3, 2 and 1, in words. Kept next to scoreFactor so they agree. */
export function scoreLevels(factor: FactorId, target: Target): { score: Score; text: string }[] {
  switch (factor) {
    case 'slope':
      // Mars has no sourced second limit, so there is no partial score there.
      if (target.body !== 'Moon')
        return [
          { score: 3, text: `As flat as the target: ${target.slopeMaxDeg ?? '—'}° or less.` },
          { score: 1, text: `Steeper than the target's ${target.slopeMaxDeg ?? '—'}°.` },
        ]
      return [
        { score: 3, text: `As flat as the target: ${target.slopeMaxDeg ?? '—'}° or less.` },
        { score: 2, text: `Steeper than the target, but under ${ARTEMIS_LANDING_LIMIT_DEG}°.` },
        {
          score: 1,
          text: `${ARTEMIS_LANDING_LIMIT_DEG}° or steeper: above the Artemis lander's landing limit.`,
        },
      ]
    case 'rock':
      return [
        { score: 3, text: 'The same material on both.' },
        {
          score: 2,
          text: 'A different material of the same kind (both igneous, or both sedimentary). Also given when the site has no recorded rock type.',
        },
        { score: 1, text: 'A different kind of material.' },
      ]
    case 'landform':
      return [
        { score: 3, text: 'The same landform on both.' },
        { score: 1, text: 'No landform in common.' },
      ]
    case 'meanTemp':
      return [
        { score: 3, text: `Within ${MEAN_TEMP_GAP.strong} °C of each other.` },
        { score: 2, text: `Within ${MEAN_TEMP_GAP.partial} °C.` },
        { score: 1, text: `More than ${MEAN_TEMP_GAP.partial} °C apart.` },
      ]
    case 'dailyRange':
      return [
        { score: 3, text: `Within ${DAILY_RANGE_GAP.strong} °C of each other.` },
        { score: 2, text: `Within ${DAILY_RANGE_GAP.partial} °C.` },
        { score: 1, text: `More than ${DAILY_RANGE_GAP.partial} °C apart.` },
      ]
    case 'aridity':
      return [
        { score: 3, text: `Hyper-arid: ${RAIN.hyperArid} mm of rain a year or less.` },
        { score: 2, text: `Desert: ${RAIN.desert} mm a year or less.` },
        { score: 1, text: 'Wetter than a desert.' },
      ]
    case 'ice':
      return [
        { score: 3, text: 'Both have ground ice.' },
        { score: 1, text: 'The target has reachable ice; the Earth site has none.' },
      ]
  }
}

export interface Match {
  site: EarthSite
  factors: FactorResult[]
  /** 0–100, or null when no factor could be scored. */
  percent: number | null
  scored: number
  /** Fails the purpose's landing-slope rule. */
  fails: boolean
  /**
   * Mean `gap` of the measured factors, or null when none was measured. Lower is closer to the
   * target. Used only to order sites that share a percentage.
   */
  gap: number | null
}

export function compare(target: Target, purpose: Purpose, site: EarthSite): Match {
  const factors = purpose.factors.map((f) => scoreFactor(f, target, site))
  const scores = factors.flatMap((f) => (f.score === null ? [] : [f.score]))
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length
  const gaps = factors.flatMap((f) => (f.score === null || f.gap === undefined ? [] : [f.gap]))
  return {
    site,
    factors,
    percent: scores.length ? Math.round(((mean - 1) / 2) * 100) : null,
    scored: scores.length,
    fails:
      purpose.maxSlopeDeg !== undefined &&
      target.body === 'Moon' &&
      site.slopeDeg !== null &&
      site.slopeDeg >= purpose.maxSlopeDeg,
    // Two decimals: finer differences are below the precision of the data, so they count as equal.
    gap: gaps.length
      ? Math.round((gaps.reduce((a, b) => a + b, 0) / gaps.length) * 100) / 100
      : null,
  }
}

export interface Ranked extends Match {
  /** 1 for the best match. Sites that cannot be told apart share a place. */
  place: number
  /** Shares its place with at least one other site. */
  tied: boolean
}

/** A site with no measured factor sorts after the measured ones that share its percentage. */
const gapOf = (match: Match) => match.gap ?? Number.MAX_VALUE

/** Sites failing the slope rule last, then best percentage, then smallest gap. 0 = cannot be told apart. */
const order = (a: Match, b: Match) =>
  Number(a.fails) - Number(b.fails) || (b.percent ?? -1) - (a.percent ?? -1) || gapOf(a) - gapOf(b)

/**
 * Best matches first. Sites with the same percentage are ordered by how close their measured
 * values are to the target's; sites that are still equal share a place and are listed by name.
 */
export function rank(target: Target, purpose: Purpose, sites: EarthSite[]): Ranked[] {
  const sorted = sites
    .map((site) => compare(target, purpose, site))
    .sort((a, b) => order(a, b) || a.site.name.localeCompare(b.site.name))
  const places = sorted.map((match, i) => {
    let first = i
    while (first > 0 && order(sorted[first - 1], match) === 0) first--
    return first + 1
  })
  return sorted.map((match, i) => ({
    ...match,
    place: places[i],
    tied: places[i - 1] === places[i] || places[i + 1] === places[i],
  }))
}
