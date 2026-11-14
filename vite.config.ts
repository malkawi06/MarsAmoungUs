import { readFileSync } from 'node:fs'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { site } from './src/config/site.ts'
import { ANALOG_SITES, LANDFORM_NAMES } from './src/data/analogs.ts'
import { EARTH_SITES, TARGETS } from './src/data/compare.ts'
import {
  TRAITS,
  cellAt,
  cellLat,
  cellLon,
  checkAgainstKnown,
  knownPlaceNear,
  scoresFrom,
  topRegions,
  traitScores,
  distanceKm,
  type Cells,
} from './src/lib/discover.ts'
import { PURPOSES, plannedFor, rank } from './src/lib/similarity.ts'

// The home page's worked example: where to train for a permanent base in one Artemis region,
// computed from the real data.
const exampleTarget = TARGETS.find((t) => t.name === 'Slater Plain')!
const examplePurpose = PURPOSES.find((p) => p.id === 'moonBase')!
const exampleRanking = rank(exampleTarget, examplePurpose, EARTH_SITES)
const exampleMatch = exampleRanking[0]

// The Discover grid: how many patches of land it compares, and two results worked out from it.
const cells = JSON.parse(
  readFileSync(new URL('./public/discover/cells.json', import.meta.url), 'utf8'),
) as Cells
const landCells = cells.row.length
const knownCells = EARTH_SITES.map((s) => ({ id: s.id, cell: cellAt(cells, s.lat, s.lon) })).filter(
  (s) => s.cell >= 0,
)
const siteName = (id: string) => EARTH_SITES.find((s) => s.id === id)!.name

// The coldest land in the grid, to set against the Moon's Diviner temperatures.
let coldest = -1
cells.meanTempC10.forEach((t, i) => {
  if (t !== null && (coldest < 0 || t < cells.meanTempC10[coldest]!)) coldest = i
})

// The check against analogs found by other researchers (see checkAgainstKnown).
const check = checkAgainstKnown(cells, knownCells)

// Three examples for the page: the strongest pairs, each site used once.
const checkExamples: { from: string; to: string }[] = []
const used = new Set<string>()
for (const r of [...check.results].sort((a, b) => a.topPct - b.topPct)) {
  if (checkExamples.length === 3) break
  if (used.has(r.id) || used.has(r.closestId)) continue
  used.add(r.id).add(r.closestId)
  checkExamples.push({ from: siteName(r.id), to: siteName(r.closestId) })
}

// The Home page's discoveries: the best region from one known site that is not on our lists.
const knownPlaces = [...EARTH_SITES, ...ANALOG_SITES]
function findNew(discovery: { fromId: string; place: string; near: { lat: number; lon: number } }) {
  const seed = knownCells.find((s) => s.id === discovery.fromId)!
  const seedScores = scoresFrom(cells, seed.cell)
  const found = topRegions(cells, seedScores, seed.cell, 10).find(
    (i) => !knownPlaceNear(cells, i, knownPlaces),
  )!
  // The place name is written by hand in site.ts; stop the build if the data has moved the result.
  if (
    distanceKm(
      cellLat(cells, found),
      cellLon(cells, found),
      discovery.near.lat,
      discovery.near.lon,
    ) > 100
  )
    throw new Error(
      `Home discovery moved: ${cellLat(cells, found)}, ${cellLon(cells, found)} is no longer near ${discovery.place}. Update site.home.`,
    )
  const foundTraits = traitScores(cells, seed.cell, found)
  return {
    fromId: seed.id,
    fromName: siteName(seed.id),
    cell: found,
    lat: cellLat(cells, found),
    lon: cellLon(cells, found),
    place: discovery.place,
    percent: Math.round(seedScores[found]),
    traits: TRAITS.map((t) => ({
      label: t.label,
      unit: t.unit,
      from: t.value(cells, seed.cell),
      here: t.value(cells, found),
      score: foundTraits[t.id],
    })),
  }
}

// Every distinct paper or page the data cites: Moon/Mars targets, Earth analogs and scored Earth sites.
const sourceCount = new Set([
  ...TARGETS.flatMap((t) => t.sources.map((s) => s.url)),
  ...ANALOG_SITES.flatMap((a) => a.sources.map((s) => s.url)),
  ...EARTH_SITES.map((s) => s.source),
]).size

// Fills %SITE_NAME%, %SITE_DESCRIPTION% and %SITE_URL% in index.html from src/config/site.ts,
// so the browser tab and link previews stay in sync with the rest of the app.
function siteMeta(): Plugin {
  return {
    name: 'site-meta',
    transformIndexHtml: (html) =>
      html
        .replaceAll('%SITE_NAME%', site.name)
        .replaceAll('%SITE_DESCRIPTION%', site.pitch)
        // Link previews need an absolute URL for the image.
        .replaceAll('%SITE_URL%', site.links.demo),
  }
}

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serves the site from /<repo>/; the deploy workflow sets BASE_PATH. Everywhere else: '/'.
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), tailwindcss(), siteMeta()],
  // The home page shows only these counts and names; passing them in at build time keeps the full
  // site data out of the first page load (it loads with the Compare and Earth Analogs pages).
  define: {
    __HOME_STATS__: JSON.stringify({
      targets: TARGETS.length,
      earthSites: EARTH_SITES.length,
      purposes: PURPOSES.length,
      analogSites: ANALOG_SITES.length,
      sources: sourceCount,
      landCells,
      discoverTraits: TRAITS.length,
      coldestLand: {
        tempC: cells.meanTempC10[coldest]! / 10,
        lat: cellLat(cells, coldest),
        lon: cellLon(cells, coldest),
      },
      check: {
        seeds: check.seeds,
        medianTopPct: check.medianTopPct,
        randomMedianTopPct: check.randomMedianTopPct,
        examples: checkExamples,
      },
      discovery: findNew(site.home.discovery),
      moreDiscoveries: site.home.moreDiscoveries.map(findNew),
      landforms: Object.entries(LANDFORM_NAMES),
      example: {
        targetId: exampleTarget.id,
        targetName: exampleTarget.name,
        purposeId: examplePurpose.id,
        purposeLabel: examplePurpose.label,
        siteId: exampleMatch.site.id,
        siteName: exampleMatch.site.name,
        siteCountry: exampleMatch.site.country,
        percent: exampleMatch.percent,
        factors: exampleMatch.factors
          .filter((f) => f.score !== null)
          .map((f) => ({ label: f.label, score: f.score, reason: f.reason })),
        notScored: exampleMatch.factors.filter((f) => f.score === null).map((f) => f.label),
        notComparable: plannedFor(examplePurpose, exampleTarget.body).map((f) => f.label),
        shortlist: exampleRanking.slice(0, 3).map((m) => ({
          place: m.place,
          name: m.site.name,
          country: m.site.country,
          percent: m.percent,
        })),
      },
    }),
  },
})
