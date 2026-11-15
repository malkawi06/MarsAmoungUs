/// <reference types="vite/client" />

/** Counts and landform names for the home page, filled in by vite.config.ts at build time. */
declare const __HOME_STATS__: {
  targets: number
  earthSites: number
  purposes: number
  analogSites: number
  /** Distinct sources cited across the Moon/Mars targets and the Earth sites. */
  sources: number
  /** Patches of land in the Discover grid, and the traits each is compared on. */
  landCells: number
  discoverTraits: number
  /** The grid cell with the lowest mean air temperature (NASA POWER T2M), °C. */
  coldestLand: { tempC: number; lat: number; lon: number }
  /** Discover checked against analogs found by other researchers (checkAgainstKnown). */
  check: {
    seeds: number
    medianTopPct: number
    randomMedianTopPct: number
    examples: { from: string; to: string }[]
  }
  /** Closest to Mars (src/lib/marsIndex.ts): the top region and where agencies' analog sites rank. */
  mars: {
    place: string
    score: number
    ranked: number
    traits: { label: string; unit: string; here: number | null; mars: string }[]
    checks: { name: string; who: string; url: string; topPct: number }[]
  }
  /** The best region from one known site that is not on our lists, with every trait compared. */
  discovery: Discovery
  /** More regions found the same way, from other known sites. */
  moreDiscoveries: Discovery[]
  landforms: [string, string][]
  /** The best Earth match for one Moon region and purpose, computed from the data at build time. */
  example: {
    targetId: string
    targetName: string
    purposeId: string
    purposeLabel: string
    siteId: string
    siteName: string
    siteCountry: string
    percent: number | null
    factors: { label: string; score: 1 | 2 | 3; reason: string }[]
    notScored: string[]
    /** Named by the purpose as having no comparable value on Earth. */
    notComparable: string[]
    /** The top three Earth sites, best first. */
    shortlist: { place: number; name: string; country: string; percent: number | null }[]
  }
}

/** The best region from one known site that is not on our lists (vite.config.ts findNew). */
interface Discovery {
  fromId: string
  fromName: string
  cell: number
  lat: number
  lon: number
  place: string
  percent: number
  traits: {
    label: string
    unit: string
    from: number | string | null
    here: number | string | null
    score: number | null
  }[]
}
