/**
 * Every piece of project-specific text in the app lives here.
 * On hackathon day, edit this file first: pages and components only read from it.
 *
 * Keep this file free of browser-only code. vite.config.ts also imports it to fill
 * the <title> and <meta description> in index.html.
 */

export interface TeamMember {
  name: string
  /** Leave empty to hide. */
  role: string
  /** Optional profile links. Leave empty to hide. */
  github?: string
  linkedin?: string
}

export interface NasaDataSource {
  name: string
  url: string
  /** One or two sentences on how the project uses this data. */
  howWeUseIt: string
}

export interface Photo {
  /** File name in public/photos, without the -1280/-2560 width and .jpg. */
  file: string
  alt: string
  /** Title from the NASA page; where that is only a photo number, a short description from the same page. */
  title: string
  credit: string
  page: string
}

export interface NavItem {
  to: string
  label: string
  /** Shorter label for the phone tab bar. */
  shortLabel?: string
  /** One sentence on what the page does. */
  description: string
}

export const site = {
  /** Project name: navbar, hero, browser tab. */
  name: 'Mars Among Us',
  /** One-line pitch: hero subtitle and <meta description>. */
  pitch:
    'Find the places on Earth that resemble the Moon and Mars, scored factor by factor with the research to back up every number.',

  event: {
    name: 'NASA Space Apps Challenge 2026',
    dates: 'November 14–15, 2026',
    url: 'https://www.spaceappschallenge.org',
  },

  challenge: {
    /** Leave empty to hide. */
    name: 'Identify Earth Locations that Analog the Permanent Moon Base Locations and Mars',
    /** Link to the challenge page on spaceappschallenge.org. */
    url: 'https://www.spaceappschallenge.org/2026/challenges/permanent-moon-base-locations-and-mars/',
  },

  team: {
    /** Leave empty to hide. */
    name: 'Mars Among Us',
    location: 'Jordan',
    members: [
      {
        name: 'Mohammad Huseen Malkawi',
        role: 'Creator · Data, web and submission',
        github: 'https://github.com/malkawi06',
        linkedin: 'https://www.linkedin.com/in/mohammad-h-malkawi/',
      },
      {
        name: 'Nour Oqaily',
        role: 'Website testing',
        linkedin: 'https://www.linkedin.com/in/nour-oqaily-4310b6440/',
      },
      {
        name: 'Mohammad Kilany',
        role: 'Presentation',
        linkedin: 'https://www.linkedin.com/in/mohammad-kilani-413317366/',
      },
      {
        name: 'Aisha',
        role: 'Source review',
        linkedin: 'https://www.linkedin.com/in/aisha-mohammad-202907416/',
      },
      {
        name: 'Hadeel Abughazleh',
        role: 'Research and ideas',
        linkedin: 'https://www.linkedin.com/in/hadeel-abughazleh-89aa0a32b/',
      },
      {
        name: 'Hadeel Qamar',
        role: 'Research and ideas',
        linkedin: 'https://www.linkedin.com/in/hadeel-qamar-779241311/',
      },
    ] satisfies TeamMember[],
  },

  /** External links. Empty strings are hidden in the UI. */
  links: {
    repo: 'https://github.com/malkawi06/mars-among-us',
    /** Live site URL. */
    demo: 'https://malkawi06.github.io/mars-among-us/',
    /** 30-second demo video (Space Apps asks for one). */
    video: '',
    /** Slide deck or project page on spaceappschallenge.org. */
    slides: '',
  },

  nav: [
    { to: '/', label: 'Home', description: 'What the site does and how.' },
    {
      to: '/discover',
      label: 'Discover',
      description:
        'Pick a known Moon or Mars analog site and find the places anywhere on Earth whose environment matches it, including ones nobody has studied as analogs.',
    },
    {
      to: '/compare',
      label: 'Compare',
      description:
        'Pick a place on the Moon or Mars and a purpose, and see which Earth sites match it best, factor by factor.',
    },
    {
      to: '/analogs',
      label: 'Earth Analogs',
      shortLabel: 'Analogs',
      description:
        'A map of places on Earth that look like Moon and Mars landforms, each with its published source.',
    },
    {
      to: '/about',
      label: 'About',
      description: 'The challenge, the team and every NASA data source used.',
    },
  ] satisfies NavItem[],

  /** Full-screen NASA photos: behind each Home section and at the top of each page. */
  photos: {
    hero: {
      file: 'mars-mount-sharp',
      alt: 'Layered slopes of Mount Sharp on Mars, seen by the Curiosity rover',
      title: "A Dramatic View of Mars' Mount Sharp",
      credit: 'NASA/JPL-Caltech/MSSS',
      page: 'https://images.nasa.gov/details/PIA23898',
    },
    discover: {
      file: 'mars-jezero',
      alt: 'Rocks on the floor of Jezero Crater on Mars, seen by the Perseverance rover',
      title: "Perseverance's Mastcam-Z First High-Resolution Panorama",
      credit: 'NASA/JPL-Caltech/ASU/MSSS',
      page: 'https://images.nasa.gov/details/PIA23727',
    },
    compare: {
      file: 'moon-hadley',
      alt: 'Astronaut David Scott at the lunar rover on the edge of Hadley Rille, Apollo 15',
      title: 'Apollo 15 lunar panorama',
      credit: 'NASA',
      page: 'https://images.nasa.gov/details/jsc2011e118359',
    },
    analogs: {
      file: 'earth-haughton',
      alt: 'Two NASA K10 rovers surveying Haughton Crater on Devon Island, Canada',
      title: 'K10 rovers surveying Haughton Crater, Devon Island (Haughton-Mars Project, 2007)',
      credit: 'NASA/Matt Deans',
      page: 'https://images.nasa.gov/details/ARC-2007-ACD07-0170-005',
    },
    method: {
      file: 'earth-haughton-camp',
      alt: 'A NASA K10 rover above the Haughton-Mars Project base camp on Devon Island, Canada',
      title: 'K10 rover descending toward base camp, Haughton Crater (Haughton-Mars Project, 2007)',
      credit: 'NASA/Lorenzo Flueckiger (CMU West)',
      page: 'https://images.nasa.gov/details/ARC-2007-ACD07-0170-006',
    },
  } satisfies Record<string, Photo>,

  home: {
    /** Right under the hero: who the project helps and why it matters. */
    impact: {
      eyebrow: 'Why it matters',
      title: 'Before the Moon and Mars, there is Earth',
      intro:
        'Rovers, instruments and crews headed for the Moon and Mars are tested first at places on Earth that resemble them. Where they train decides what those tests can prove, and today the right place is found by searching scattered research papers by hand.',
      audiences: [
        {
          who: 'Mission and training planners',
          what: 'A ranked shortlist of Earth sites for one Artemis region or Mars site and one job, with the evidence behind every score.',
        },
        {
          who: 'Analog researchers',
          what: 'New candidate regions found across all of Earth’s land, beyond the handful of places already in use.',
        },
        {
          who: 'Students and the public',
          what: 'A way to see how places on Earth relate to the Moon and Mars, with every number traced to NASA data or a published study.',
        },
      ],
    },
    primaryCta: { label: 'Discover new analogs', to: '/discover' },
    secondaryCta: { label: 'Compare with the Moon and Mars', to: '/compare' },
    /** Title of the Home section on how scores are worked out. */
    methodTitle: 'A source for every number',
    scoring:
      'Each factor scores 3 (strong), 2 (partial) or 1 (weak), and all factors count the same. The match is the average turned into a percentage: all 3s give 100%, all 1s give 0%. Sites with the same match are ordered by how close their measured values are to the target, and sites the data cannot tell apart share a place. The method follows the NASA-led analog framework of Stern et al. (2025).',
    /**
     * The new-analog example on Home: the best region from this known site that is not on our lists.
     * `place` is written by hand, so the build stops if the result moves more than 100 km from `near`.
     */
    discovery: {
      fromId: 'wadi-rum',
      place: 'near Tabas, central Iran',
      near: { lat: 33.6, lon: 56.9 },
    },
    noData:
      'Some values are not published yet, such as the mean temperature at most Mars sites. Those factors are left out of the score instead of guessed, and the page says so. When fewer than two factors can be scored, the page warns that the result is rough.',
  },

  discover: {
    title: 'Discover new analogs',
    intro:
      'Pick a place already used to study the Moon or Mars. Every 0.5° patch of land on Earth is compared with it on the same NASA data, and the closest matches light up, including places nobody has studied as analogs yet.',
    methodShort:
      'Each 50 km patch of land is compared with the known site on seven traits from NASA climate, terrain and rock-type data; the closer every trait, the higher the match.',
    method:
      'Each patch of land is about 50 km across. Climate is the NASA POWER annual average (MERRA-2): mean temperature, day–night swing, rain and snow, and wind at 10 m. Elevation and relief come from SRTM-based terrain tiles at about 1 km: elevation is the mean of the patch and relief its highest point minus its lowest, so both differ from the Compare page, which measures a 0.6 km window at the site. Slope is left out because small slopes vanish at this scale. Rock type is the dominant class of the GLiM global lithological map. The known site is compared through its own patch, so both sides are measured the same way. For each trait, similarity falls in a straight line from 100% (equal) to 0% at a gap we chose, shown next to it; the match is the average. Landform, ground ice and fine slope are not in global data, so check them on the satellite image and in Compare.',
    sources: [
      {
        title: 'NASA POWER climatology (MERRA-2), on the AWS Open Data registry',
        url: 'https://power.larc.nasa.gov',
      },
      {
        title: 'Terrain Tiles (SRTM and other elevation data), AWS Open Data',
        url: 'https://registry.opendata.aws/terrain-tiles/',
      },
      {
        title: 'Hartmann & Moosdorf (2012), GLiM Global Lithological Map, 0.5° grid (CC BY 3.0)',
        url: 'https://doi.pangaea.de/10.1594/PANGAEA.788537',
      },
      {
        title:
          'ESA Permafrost_cci, permafrost extent, Northern Hemisphere, v3.0 (2019), via the ESA Open Science Catalog; free for any use with credit',
        url: 'https://catalogue.ceda.ac.uk/uuid/6e2091cb0c8b4106921b63cd5357c97c',
      },
    ],
  },

  analogs: {
    title: 'Earth Analogs',
    intro:
      'Places on Earth that look like landforms on Mars or the Moon, each backed by published sources. Pick a landform, then select a site on the list or the map to see why it counts and where that comes from.',
  },

  compare: {
    title: 'Compare with the Moon and Mars',
    intro:
      'Pick a place on the Moon or Mars and what you need an Earth analog for. Every Earth site is scored factor by factor, so you can see exactly where it matches and where it does not.',
    methodShort:
      'Each factor scores 3 (strong), 2 (partial) or 1 (weak); the match is their average as a percentage.',
    method:
      'Each factor scores 1 (weak), 2 (partial) or 3 (strong), and all factors count equally, following the NASA-led framework of Stern et al. (2025). Factors without sourced data for the target are left out. Sites with the same match are ordered by how close their measured values are to the target; sites that are still equal share a place. Earth climate: NASA POWER 2001–2020; Earth slope and elevation: ASTER 30 m elevation model, in a 0.6 km window at the pin.',
    methodSource: 'https://agupubs.onlinelibrary.wiley.com/doi/full/10.1029/2024JE008803',
  },

  about: {
    challenge:
      'Scientists test rovers, instruments and crews at places on Earth that resemble the Moon or Mars, called terrestrial analogs. Finding the right analog for a given landing site and purpose usually means searching scattered research papers by hand.',
    solution:
      'Mars Among Us answers two questions. Compare: which known Earth analog best matches a given place on the Moon or Mars, for a given job? Pick one of the nine Artemis landing regions or a Mars landing site, and a purpose such as rover testing, a base or astronaut training; every Earth analog site is scored factor by factor (slope, rock type, temperature, dryness, ice) following the NASA-led framework of Stern et al. (2025), with a source for every number. Discover: where else on Earth is like a known analog? Every half-degree patch of land is compared with it on seven traits, which points to regions nobody has listed as analogs yet. Factors without sourced data are left out rather than guessed.',
    /** How the project is built, in order. Shown as numbered steps on the About page. */
    build: [
      {
        title: 'Gather sourced data',
        text: 'Python scripts read NASA and ESA data straight from the archives, often only the bytes around each place: climate from NASA POWER, terrain, rock type from GLiM, permafrost from ESA, and for each Artemis region sunlight (LOLA), temperature and ice (Diviner) and radar (Mini-RF) from NASA’s Lunar Reconnaissance Orbiter. They write small data files that ship with the site.',
      },
      {
        title: 'Score every match',
        text: 'Compare scores each factor 3 (strong), 2 (partial) or 1 (weak) and averages them, as in Stern et al. (2025). Discover measures how close two patches of land are on each of seven traits, within tolerances, and turns the average into a percentage.',
      },
      {
        title: 'Check against known analogs',
        text: 'From each known analog site, Discover should rank the other known analogs, found by other researchers, near the top. It does, far better than places picked at random; the Discover page shows the numbers. Unit tests check the scoring and the data files, and one fails if that check stops beating chance by at least two times.',
      },
      {
        title: 'Show the evidence',
        text: 'A React and TypeScript web app scores everything in the browser and links each number to its source. Real orbital images of the target and the Earth site are shown side by side at the same scale. It is built with Vite, Tailwind CSS and Leaflet, and deployed to GitHub Pages by GitHub Actions.',
      },
    ],
    nasaData: [
      {
        name: 'NASA Earth Observatory',
        url: 'https://science.nasa.gov/earth/earth-observatory/',
        howWeUseIt: 'Images of Earth analog sites such as Meteor Crater, Haughton and Holuhraun.',
      },
      {
        name: 'Artemis candidate landing regions',
        url: 'https://www.nasa.gov/news-release/nasa-provides-update-on-artemis-iii-moon-landing-regions/',
        howWeUseIt:
          'The nine Moon south-pole regions on the Compare page: NASA’s candidate regions for the first crewed Artemis landing.',
      },
      {
        name: 'LRO LROC NAC south-pole mosaic (via NASA Moon Trek)',
        url: 'https://trek.nasa.gov/moon/',
        howWeUseIt: 'Orbital images of the Artemis regions on the Compare page.',
      },
      {
        name: 'LROC NAC controlled mosaics of the Artemis candidate sites',
        url: 'https://data.lroc.im-ldi.com/lroc/rdr_product_select',
        howWeUseIt:
          'Orbital images of the five Artemis regions north of 85.5°S, where the south-pole mosaic ends.',
      },
      {
        name: 'LRO LOLA average illumination maps (south pole)',
        url: 'https://imbrium.mit.edu/EXTRAS/ILLUMINATION/',
        howWeUseIt:
          'How much of the time each Artemis region is sunlit, and how much of it is in permanent shadow.',
      },
      {
        name: 'LRO Diviner Polar Resource Product (south pole)',
        url: 'https://pds-geosciences.wustl.edu/lro/urn-nasa-pds-lro_diviner_derived1/data_derived_prp/',
        howWeUseIt:
          'Surface temperature of each Artemis region, and where water ice could stay stable within 1 m of the surface.',
      },
      {
        name: 'Global CTX Mosaic of Mars (NASA/JPL/MSSS/The Murray Lab)',
        url: 'https://murray-lab.caltech.edu/CTX/',
        howWeUseIt: 'Orbital images of the Mars targets on the Compare page.',
      },
      {
        name: 'NASA POWER',
        url: 'https://power.larc.nasa.gov',
        howWeUseIt: 'Temperature and rainfall (2001–2020) at every Earth analog site.',
      },
      {
        name: 'ASTER Global Digital Elevation Model (NASA/METI)',
        url: 'https://asterweb.jpl.nasa.gov/gdem.asp',
        howWeUseIt:
          'Slope and local relief at every Earth analog site, and the shaded terrain relief (via NASA GIBS) shown inside a selected Discover patch.',
      },
      {
        name: 'Mars Global Surveyor MOLA topography (PDS)',
        url: 'https://pds-geosciences.wustl.edu/mgs/mgs-m-mola-5-megdr-l3-v1/mgsl_300x/meg128/',
        howWeUseIt:
          'Slope around the Mars targets without a published value (Jezero, Gale, Victoria, Arcadia): 90% of the ground within 10 km is flatter than the value used.',
      },
      {
        name: 'LRO Mini-RF global radar mosaic (PDS)',
        url: 'https://pds-geosciences.wustl.edu/lro/lro-l-mrflro-5-global-mosaic-v1/',
        howWeUseIt:
          'Radar returns of each Artemis region: the share of the area with a circular polarization ratio above 1, which ice gives, and so does rough ground.',
      },
      {
        name: 'MODIS Terra land surface temperature, via NASA Worldview/GIBS',
        url: 'https://worldview.earthdata.nasa.gov',
        howWeUseIt:
          "The ground's own temperature, the Earth counterpart of Diviner on the Moon: a map layer, and each Earth site's monthly values for 2025, which score frozen ground for a permanent Moon base.",
      },
      {
        name: 'NASA Worldview and Earthdata Search',
        url: 'https://search.earthdata.nasa.gov',
        howWeUseIt:
          'Every Earth site links to its satellite imagery in Worldview and to the NASA datasets covering it in Earthdata Search.',
      },
    ] satisfies NasaDataSource[],
    /** Data from the challenge's partner space agencies, listed on the Space Apps form separately. */
    partnerData: [
      {
        name: 'ESA Permafrost_cci, via the ESA Open Science Catalog',
        url: 'https://opensciencedata.esa.int/products/esa-cci-permafrost/collection',
        howWeUseIt:
          'Share of permafrost ground in every Discover cell (2019, Northern Hemisphere), for the permafrost filter.',
      },
      {
        name: 'Copernicus Sentinel-2 (ESA), in the EOxCloudless 2016 mosaic',
        url: 'https://cloudless.eox.at',
        howWeUseIt: 'The satellite map and the Earth site images on the Compare page.',
      },
    ] satisfies NasaDataSource[],
    /**
     * Every other source behind the site, for the About page's Sources section and the Space Apps
     * References field. Each Earth analog site also lists its own published sources where it is shown.
     */
    references: {
      papers: [
        {
          name: 'Stern et al. (2025), JGR Planets: A Comprehensive Framework for Assessing Terrestrial Analogue Field Sites for Ocean Worlds',
          url: 'https://doi.org/10.1029/2024JE008803',
          howWeUseIt: 'The 1–3 factor scoring that Compare adapts to the Moon and Mars.',
        },
        {
          name: 'Wueller, Berger & Kring (2026), JGR Planets: Assessing Potential Landing Sites … Within Artemis Candidate Landing Regions',
          url: 'https://doi.org/10.1029/2025JE009434',
          howWeUseIt: 'The landing sites whose mean gives each Artemis region’s centre.',
        },
        {
          name: 'Wueller et al. (2025), JGR Planets: Geologic History of the Mons Malapert and Mons Mouton Regions',
          url: 'https://doi.org/10.1029/2025JE009127',
          howWeUseIt: 'Geology of the Mons Mouton and Malapert regions.',
        },
        {
          name: 'Mazarico et al. (2011), Icarus: Illumination conditions of the lunar polar regions using LOLA topography',
          url: 'https://doi.org/10.1016/j.icarus.2010.10.030',
          howWeUseIt: 'The LOLA sunlight maps behind each region’s sunlight and shadow.',
        },
        {
          name: 'Paige et al. (2010), Science: Diviner Lunar Radiometer Observations of Cold Traps in the Moon’s South Polar Region',
          url: 'https://doi.org/10.1126/science.1187726',
          howWeUseIt: 'The Diviner temperature and ice-stability data.',
        },
        {
          name: 'Spudis et al. (2013), JGR Planets: Evidence for water ice on the Moon … from the LRO Mini-RF imaging radar',
          url: 'https://doi.org/10.1002/jgre.20156',
          howWeUseIt: 'What a radar CPR above 1 can and cannot mean.',
        },
        {
          name: 'Hartmann & Moosdorf (2012), G³: The new global lithological map database GLiM',
          url: 'https://doi.org/10.1029/2012GC004370',
          howWeUseIt: 'The rock type of every Discover patch.',
        },
        {
          name: 'Wilhelm et al. (2020): DoMars16k, a dataset of Mars landforms',
          url: 'https://doi.org/10.5281/zenodo.4291940',
          howWeUseIt: 'The Mars landform classes on the Earth Analogs page.',
        },
      ],
      data: [
        {
          name: 'GLiM Global Lithological Map, 0.5° grid (PANGAEA) · CC BY 3.0',
          url: 'https://doi.org/10.1594/PANGAEA.788537',
          howWeUseIt: 'Rock type in Discover.',
        },
        {
          name: 'Terrain Tiles on AWS Open Data (SRTM and other elevation data)',
          url: 'https://registry.opendata.aws/terrain-tiles/',
          howWeUseIt: 'Elevation and relief in Discover.',
        },
        {
          name: 'OpenStreetMap · ODbL',
          url: 'https://www.openstreetmap.org/copyright',
          howWeUseIt: 'The street basemap.',
        },
      ],
      software: [
        {
          name: 'React, React DOM and React Router · MIT',
          url: 'https://react.dev',
          howWeUseIt: 'The web app.',
        },
        {
          name: 'Leaflet · BSD-2-Clause',
          url: 'https://leafletjs.com',
          howWeUseIt: 'The maps.',
        },
        {
          name: 'Lucide icons · ISC',
          url: 'https://lucide.dev',
          howWeUseIt: 'The icons.',
        },
        {
          name: 'Barlow and Barlow Condensed fonts · OFL-1.1',
          url: 'https://github.com/jpt/barlow',
          howWeUseIt: 'The typefaces.',
        },
      ],
    } satisfies Record<string, NasaDataSource[]>,
    /** Each AI tool used and what for (the Space Apps form asks). Leave empty to hide the section. */
    ai: '',
  },

  footer: {
    tagline: 'Built for NASA Space Apps Challenge 2026',
    disclaimer: 'This project is not affiliated with or endorsed by NASA.',
  },
}

export type Site = typeof site
