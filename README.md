# Mars Among Us

**Find the places on Earth that resemble the Moon and Mars, and see why.** Built for the
[NASA Space Apps Challenge 2026](https://www.spaceappschallenge.org) (November 14–15, 2026).

Live: **https://malkawi06.github.io/mars-among-us/**

| Page                           | What it does                                                                                                                                                                                                                                                                       |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Discover** (`/discover`)     | Pick a known Moon or Mars analog site; every 0.5° land cell on Earth is compared with it on the same NASA POWER climate, terrain and rock-type data, and the closest regions, including ones not yet studied as analogs, are shown on a map. Built by `scripts/build_discover.py`. |
| **Compare** (`/compare`)       | Pick a place on the Moon (the nine Artemis landing regions) or Mars and a purpose (rover testing, base, local resources, search for life, training). Every Earth site is scored factor by factor, with the target's orbital image next to the site.                                |
| **Earth Analogs** (`/analogs`) | The analog sites on a satellite map, filtered by landform, each with the published research behind it.                                                                                                                                                                             |
| **About** (`/about`)           | The challenge, the solution, the data used and the team: the sections of the Space Apps submission form.                                                                                                                                                                           |

**Stack:** Vite · React 19 · TypeScript · Tailwind CSS v4 · React Router · Leaflet · Python (data scripts).

---

## How it works

### Orbital images (at deploy time)

The deploy workflow runs `scripts/fetch_earth_images.py`, which downloads ~6 km images of every site at
the same scale, so the Compare page can show a target and an Earth site side by side:

- Earth: Sentinel-2 cloudless 2024 (EOX).
- Mars: Global CTX Mosaic (Murray Lab).
- Moon: LROC NAC south-pole mosaic (Moon Trek), which covers 85.5°S to the pole (4 of the 9 Artemis regions), and the
  LROC NAC Artemis site mosaics for the other 5 (`scripts/lroc_roi.py`, needs rasterio and pyproj).

These files are built on every deploy and are not committed.

### Compare scoring

Each purpose compares its own factors (slope, rock type, landform, temperature, day–night swing, aridity,
ice). Every factor scores 1, 2 or 3 with equal weights, after the NASA-led analog framework of Stern et al.
2025 (JGR Planets, doi 10.1029/2024JE008803). Factors with no sourced value are left out, and a score based
on fewer than two factors is flagged as low confidence.

- **Ties.** Three scores give few possible percentages, so sites often share one. Sites with the same
  percentage are ordered by how close their measured values are to the target's, and sites the data cannot
  tell apart share a place (shown as `=2`) instead of being listed in an arbitrary order.
- **Not compared yet.** Local relief, sunlight and radiation have no sourced, comparable value for any
  target, so they are not scored. The page names them under each purpose instead of counting them as factors.
- **Slope limits.** The 8° Artemis landing limit is a Moon rule: it gives Moon targets a partial score and
  the base / habitat landing rule. A Mars target is compared with its own published slope only.

The data and its sources are in [`analysis/`](analysis/README.md); regenerate `src/data/compare.ts` with
`python3 analysis/build_compare_data.py`.

### Moon environment

`scripts/build_moon_environment.py` measures each Artemis region from NASA Lunar Reconnaissance Orbiter data,
within 7.5 km of its centre: sunlight and permanent shadow from LOLA, surface temperature and stable ice from
Diviner. It downloads only the parts of each file around the regions and writes
`analysis/data/moon_environment.json`, which `analysis/build_compare_data.py` adds to the Moon targets. The
values are shown on Compare, not scored: Earth sites have air temperatures and no sunlit-time value.

### Discover grid

`scripts/build_discover.py` builds `public/discover/cells.json`: every 0.5° land cell with NASA POWER
climate, mean elevation and relief from terrain tiles, and the dominant GLiM rock class. It needs numpy, Pillow and
xarray with zarr support, and is run by hand; the result is committed.

**Check against known analogs.** From each known analog site, the closest other known site (at least 400 km
away, found by other researchers) ranks in about the top 1% of Earth's land; places picked at random would
rank in about the top 3%. The numbers are worked out from the data on every build
(`checkAgainstKnown` in `src/lib/discover.ts`) and shown on Home and Discover; a test fails if the method
stops beating chance by at least two times.

Discover and Compare measure terrain at different scales, and each page labels its own. Compare measures a
0.6 km window at the site on the 30 m ASTER model; Discover averages a patch about 50 km across at about
1 km. The same place therefore has different elevation and relief on the two pages. Slope is not in the
Discover grid, because it means nothing at that scale.

---

## Run locally

Requires **Node.js 20.19+ or 22.12+**.

```bash
git clone https://github.com/malkawi06/mars-among-us.git
cd mars-among-us
npm install
npm run dev              # http://localhost:5173
```

The orbital images are downloaded at deploy time. To have them locally (needs Python 3 with Pillow):

```bash
python scripts/fetch_earth_images.py
```

| Script                 | What it does                               |
| ---------------------- | ------------------------------------------ |
| `npm run dev`          | Dev server with hot reload                 |
| `npm run build`        | Type-check (`tsc -b`) and production build |
| `npm run preview`      | Serve the production build locally         |
| `npm run lint`         | ESLint                                     |
| `npm test`             | Unit tests (Node's built-in test runner)   |
| `npm run format`       | Format everything with Prettier            |
| `npm run format:check` | Check formatting without writing           |

## Deploy

GitHub Pages is the main host: `.github/workflows/deploy-pages.yml` fetches the images, builds
and publishes every push to `main`. `netlify.toml` and `vercel.json` keep the same app working on Netlify
and Vercel (SPA fallback), without the satellite images.

## Project layout

```
src/
├── config/site.ts       ← all page text: name, pitch, nav, About sections, team, links
├── data/
│   ├── analogs.ts       ← Earth analog sites per landform, with sources
│   ├── compare.ts       ← generated by analysis/build_compare_data.py
│   └── glossary.ts      ← what each rock and landform word means, with sources
├── lib/
│   ├── discover.ts      ← Discover: grid lookup, trait similarity, filters, top regions
│   ├── similarity.ts    ← Compare: factor scores, match percentage, ranking and ties
│   └── orbitalImages.ts ← reads the deploy-time orbital images
├── components/          ← shared UI (PageHeader, Photo, TargetImages, AnalogMap, DiscoverMap, …)
├── pages/               ← Home, Discover, Compare, Analogs, About
└── index.css            ← Tailwind, light/dark color tokens, scroll and photo animations
public/
├── discover/cells.json  ← the Discover grid, built by scripts/build_discover.py
└── photos/              ← NASA photos behind Home and the page headers (credits in site.ts)
analysis/                ← sourced data and method for Compare
scripts/
├── build_discover.py    ← builds the Discover grid (run by hand, result committed)
├── build_moon_environment.py ← LRO sunlight, temperature and ice per Artemis region (run by hand)
├── fetch_earth_images.py ← deploy-time orbital images
└── lroc_roi.py          ← LROC Artemis site mosaics, used by fetch_earth_images.py
tests/                   ← unit tests for both scoring modules and checks on the data files
```

## Data and credits

- **Mars landform classes (Earth Analogs filter):** DoMars16k, Wilhelm et al. 2020, doi 10.5281/zenodo.4291940.
- **Global CTX Mosaic of Mars:** NASA/JPL/MSSS/The Murray Lab.
- **LROC NAC south-pole mosaic:** NASA/GSFC/Arizona State University, via NASA Moon Trek.
- **LROC NAC Artemis site mosaics:** NASA/GSFC/Arizona State University; Henriksen et al. 2023, European Lunar Symposium.
- **Artemis candidate landing regions:** NASA, October 28, 2024 (announced for Artemis III; since February 2026 NASA plans the first crewed landing for Artemis IV). Region centres from JGR Planets 2025, doi 10.1029/2025JE009434.
- **Climate:** NASA POWER, 2001–2020.
- **Moon sunlight and shadow:** LRO LOLA average illumination maps (Mazarico et al. 2011, Icarus).
- **Moon temperature and stable ice:** LRO Diviner Polar Resource Product (Paige et al. 2010, Science).
- **Elevation and slope (Compare):** ASTER GDEM (NASA/METI).
- **Elevation and relief (Discover):** Terrain Tiles on AWS (SRTM and other elevation data).
- **Rock type (Discover):** GLiM Global Lithological Map, Hartmann & Moosdorf 2012 (CC BY 3.0).
- **Earth satellite images:** Sentinel-2 cloudless 2024 by EOX IT Services GmbH (contains modified Copernicus Sentinel data 2024).
- **Maps:** Sentinel-2 cloudless 2024 (EOX) and OpenStreetMap.
- **Page photos:** NASA Image and Video Library: Curiosity (PIA23898, NASA/JPL-Caltech/MSSS), Perseverance
  (PIA23727, NASA/JPL-Caltech/ASU/MSSS), Apollo 15 (jsc2011e118359, NASA) and the Haughton-Mars Project
  (ARC-2007-ACD07-0170-005 and -006, NASA). Each page links its photo's NASA page.

This project is not affiliated with or endorsed by NASA.
