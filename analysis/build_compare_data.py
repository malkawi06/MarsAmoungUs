"""Builds src/data/compare.ts from the sourced data in analysis/data.

Run from the repo root:  python3 analysis/build_compare_data.py
Inputs (see analysis/README.md for how each was made):
  data/power.csv           NASA POWER climatology 2001-2020 per Earth site
  data/dem.csv             ASTER GDEM elevation, slope and relief per Earth site
  data/moon_centroids.json Artemis region centres (mean of published landing sites)
  data/moon_environment.json Sunlight (LOLA), temperature and stable ice (Diviner) per Artemis region,
                           built by scripts/build_moon_environment.py
  data/ground_temp.csv     MODIS ground temperature per Earth site, built by scripts/build_ground_temperature.py
  data/mars_slope.json     MOLA slope around each Mars target, built by scripts/build_mars_slope.py
  ../public/discover/cells.json  ESA Permafrost_cci share of each 0.5° patch (scripts/build_permafrost.py)
"""

import csv
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / 'analysis' / 'data'

power = {r['id']: r for r in csv.DictReader(open(DATA / 'power.csv'))}
dem = {r['id']: r for r in csv.DictReader(open(DATA / 'dem.csv'))}
moon_centroids = json.load(open(DATA / 'moon_centroids.json'))
moon_environment = json.load(open(DATA / 'moon_environment.json'))
ground = {r['id']: r for r in csv.DictReader(open(DATA / 'ground_temp.csv'))}
mars_slope = json.load(open(DATA / 'mars_slope.json'))
cells = json.load(open(ROOT / 'public' / 'discover' / 'cells.json'))
patch = {(r, c): i for i, (r, c) in enumerate(zip(cells['row'], cells['col']))}


def permafrost_at(lat, lon):
    """ESA permafrost share (%) of the Discover patch containing the point, or None."""
    i = patch.get((int((90 - lat) / cells['cellDeg']), int((lon + 180) / cells['cellDeg'])))
    return None if i is None else cells['permafrostPct'][i]

# Existing analog sites: name, country, coordinates and first source come from src/data/analogs.ts.
analogs_ts = (ROOT / 'src' / 'data' / 'analogs.ts').read_text()
existing = {}
for block in re.split(r"\n  \{\n    id: ", analogs_ts[analogs_ts.index('export const ANALOG_SITES'):])[1:]:
    sid = re.match(r"'([^']+)'", block).group(1)
    get = lambda key: re.search(key + r":\s*\n?\s*'((?:[^'\\]|\\.)*)'", block).group(1)
    num = lambda key: float(re.search(key + r':\s*(-?[\d.]+)', block).group(1))
    source = re.search(r"url: '(https?://[^']+)'", block[block.index('sources'):]).group(1)
    existing[sid] = dict(name=get('name'), country=get('country'), lat=num('lat'), lon=num('lon'), source=source)

# Material and landform tags, taken from each site's sourced description (analogs.ts `why`, or the source below).
EARTH = [
    # id, analogFor, materials, landforms, (name, country, lat, lon, source) for sites not in analogs.ts
    ('la-joya', 'Mars', ['sand'], ['dunes'], None),
    ('white-sands', 'Mars', ['sand', 'sulfate'], ['dunes'], None),
    ('namib', 'Mars', ['sand'], ['dunes'], None),
    ('mdrs-hanksville', 'Mars', ['clay', 'sandstone'], ['lake-sediment'], None),
    ('wadi-rum', 'Mars', ['sandstone', 'sand'], [], None),
    ('green-river', 'Mars', ['sandstone'], ['channel'], None),
    ('qaidam', 'Mars', ['salt'], [], None),
    ('channeled-scablands', 'Mars', [], ['channel'], None),
    ('tuktoyaktuk', 'Mars', ['ice'], [], None),
    ('garwood-valley', 'Mars', ['ice'], [], None),
    ('taylor-valley', 'Mars', ['ice'], [], None),
    ('blackhawk', 'Mars', [], ['landslide'], None),
    ('meteor-crater', 'Mars', [], ['impact'], None),
    ('haughton', 'Mars', [], ['impact'], None),
    ('lonar', 'Mars', ['basalt'], ['impact'], None),
    ('henbury', 'Mars', [], ['impact'], None),
    ('atacama-yungay', 'Mars', ['salt'], [], None),
    ('salar-de-uyuni', 'Mars', ['salt'], [], None),
    ('holuhraun', 'Mars', ['basalt'], [], None),
    ('beacon-valley', 'Mars', ['ice'], ['polygons'], None),
    ('mistastin', 'Moon', ['anorthosite'], ['impact'],
     ('Mistastin Lake impact structure', 'Canada (Labrador)', 55.88, -63.30,
      'https://www.researchgate.net/publication/241208537_Mistastin_Impact_Structure_Labrador_A_Geological_Analogue_for_Lunar_Highland_Craters')),
    ('ries', 'Moon', [], ['impact'],
     ('Nördlinger Ries crater', 'Germany', 48.88, 10.58, 'https://blogs.esa.int/caves/2017/09/18/the-astronauts-are-back/')),
    ('lofoten', 'Moon', ['anorthosite'], [],
     ('Lofoten anorthosite', 'Norway', 68.10, 13.50, 'https://blogs.esa.int/caves/2025/07/28/astronauts-learn-moon-geology-in-a-fjord/')),
    ('craters-of-the-moon', 'Moon', ['basalt'], [],
     ('Craters of the Moon lava field', 'USA (Idaho)', 43.46, -113.51,
      'https://www.nps.gov/crmo/learn/historyculture/space-exploration-research-and-astronaut-training.htm')),
    ('lanzarote-corona', 'Mars', ['basalt'], ['lava-tube'],
     ('La Corona lava tube, Lanzarote', 'Spain', 29.10, -13.50, 'https://pubmed.ncbi.nlm.nih.gov/41572783/')),
]

JGR = 'https://agupubs.onlinelibrary.wiley.com/doi/10.1029/2025JE009434'
LPI_HIGHLANDS = 'https://www.hou.usra.edu/meetings/lpsc2020/pdf/2867.pdf'
NASA_MALAPERT = 'https://www.nasa.gov/image-detail/malapert-massif-m1432398306-lroc'
MOUTON_MALAPERT = 'https://agupubs.onlinelibrary.wiley.com/doi/10.1029/2025JE009127'
NASA_NOBILE = 'https://www.nasa.gov/news-release/nasas-artemis-rover-to-land-near-nobile-region-of-moons-south-pole/'
ASTRONOMY_SITES = 'https://www.astronomy.com/space-exploration/here-are-the-nine-sites-where-artemis-3-might-land-on-the-moon/'
WIKI_DE_GERLACHE = 'https://en.wikipedia.org/wiki/De_Gerlache_(crater)'
SOUTH_POLE = 'https://www.nature.com/articles/s41467-024-50155-w'
WIKI_JEZERO = 'https://en.wikipedia.org/wiki/Jezero_(crater)'
WIKI_OXIA = 'https://en.wikipedia.org/wiki/Oxia_Planum'

# Title of every target source, what it reports (only when checked against the source) and which
# factors' target values it supports, so the Compare page can show where each value comes from.
MOLA = 'https://pds-geosciences.wustl.edu/mgs/mgs-m-mola-5-megdr-l3-v1/mgsl_300x/meg128/'
SOURCE_INFO = {
    JGR: dict(
        title='Wueller, Berger & Kring (2026), JGR Planets: Assessing potential landing sites with favorable '
              'illumination and accessible, potentially volatile-rich permanently shadowed regions within '
              'Artemis candidate landing regions',
        says='Finds 130 landing sites inside NASA\'s Artemis candidate regions that meet the Human Landing '
             'System requirements and are within 2 km of a permanently shadowed region.',
        supports=['slope', 'ice', 'landform']),
    LPI_HIGHLANDS: dict(
        title='Gruener et al. (2020), LPSC: Greenland "White Mountain" anorthosite, a new lunar polar regolith simulant',
        says='NASA Johnson Space Center uses anorthosite from Greenland to simulate the regolith at the lunar '
             'south pole, where astronauts are to land.',
        supports=['rock']),
    NASA_MALAPERT: dict(
        title='Malapert Massif (NASA, LROC image)',
        says='Malapert massif is thought to be a remnant of the South Pole–Aitken basin rim, which formed '
             'more than 4 billion years ago.',
        supports=['landform']),
    MOUTON_MALAPERT: dict(
        title='Wueller et al. (2025), JGR Planets: geology of Mons Mouton and Mons Malapert (doi 10.1029/2025JE009127)',
        says='From their location and topography, Mons Mouton and Mons Malapert are interpreted as remnant '
             'massifs of the South Pole–Aitken basin rim.',
        supports=['landform']),
    NASA_NOBILE: dict(
        title='NASA\'s Artemis rover to land near Nobile region of Moon\'s south pole (NASA, 2021)',
        says='Nobile Crater is an impact crater, formed by a collision with a smaller body.',
        supports=['landform']),
    ASTRONOMY_SITES: dict(
        title='Here are the nine sites where Artemis 3 might land on the Moon (Astronomy magazine)',
        says='Nobile Rim 2 is a site on the northeastern rim of Nobile Crater.',
        supports=['landform']),
    WIKI_DE_GERLACHE: dict(
        title='de Gerlache (crater) (Wikipedia)',
        says='de Gerlache is a lunar impact crater.',
        supports=['landform']),
    SOUTH_POLE: dict(
        title='Qiao, Head et al. (2024), Nature Communications: geological evidence for extensive basin ejecta '
              'as plains terrains in the Moon\'s south polar region',
        says='The south polar region is highland terrain covered in impact craters of all sizes and ages, next '
             'to the South Pole–Aitken basin, the largest and oldest preserved impact basin on the Moon.'),
    'https://www.esa.int/ESA_Multimedia/Images/2022/08/Water-rich_minerals_at_Jezero_Crater':
        dict(title='Water-rich minerals at Jezero Crater (ESA, 2022)',
             says='The minerals around Jezero Crater, altered by water in the past, are predominately clays and '
                  'carbonate salts.',
             supports=['rock']),
    WIKI_JEZERO: dict(
        title='Jezero (crater) (Wikipedia)',
        says='Thought to have once been flooded with water, the crater contains a fan-delta deposit rich in '
             'clays; the lake was present when valley networks were forming on Mars.',
        supports=['landform']),
    'https://en.wikipedia.org/wiki/Octavia_E._Butler_Landing': dict(title='Octavia E. Butler Landing (Wikipedia)'),
    'https://www.jpl.nasa.gov/news/nasas-first-weather-report-from-jezero-crater-on-mars/':
        dict(title='NASA\'s first weather report from Jezero Crater on Mars (NASA JPL)',
             says='MEDA recorded a high of −22 °C and a low of −83 °C in Jezero Crater on sols 43 and 44.',
             supports=['dailyRange']),
    'https://www.jpl.nasa.gov/news/nasas-curiosity-rover-finds-patches-of-rock-record-erased-revealing-clues/':
        dict(title='NASA\'s Curiosity rover finds patches of rock record erased, revealing clues (NASA JPL)',
             says='Layers of clay minerals formed at the bottom of the lake in Gale Crater.',
             supports=['rock', 'landform']),
    'https://en.wikipedia.org/wiki/Bradbury_Landing': dict(title='Bradbury Landing (Wikipedia)'),
    'https://www.jpl.nasa.gov/images/pia16913-steady-temperatures-at-mars-gale-crater/':
        dict(title='PIA16913: Steady temperatures at Mars\' Gale Crater (NASA JPL)',
             says='REMS measured daily air temperature highs of about 0 °C and lows of about −70 °C.',
             supports=['dailyRange']),
    'https://pmc.ncbi.nlm.nih.gov/articles/PMC7987365/': dict(
        title='Quantin-Nataf et al. (2021), Astrobiology: Oxia Planum, the landing site for the ExoMars '
              '"Rosalind Franklin" rover mission',
        says='Oxia Planum is a 200 km-wide, low-relief terrain with clay-bearing bedrock, chosen by ESA as '
             'the landing site of the ExoMars rover; the landing ellipse avoids slopes above 8° at the MOLA '
             'sub-kilometre scale.',
        supports=['rock', 'slope']),
    WIKI_OXIA: dict(
        title='Oxia Planum (Wikipedia)',
        says='A 200 km-wide clay-bearing plain on the eastern border of Chryse Planitia; the IAU feature is near '
             '18.275°N 335.368°E.'),
    'https://www.tandfonline.com/doi/full/10.1080/17445647.2024.2302361': dict(
        title='Fawdon et al. (2024), Journal of Maps: the high-resolution map of Oxia Planum, Mars',
        says='A 1:30,000 geological map of the landing site, with 15 bedrock units in 6 groups.'),
    'https://agupubs.onlinelibrary.wiley.com/doi/full/10.1029/2022JE007374': dict(
        title='McCollom & Hynek (2023), JGR Planets: Proposed origin of the Burns formation (Meridiani Planum, '
              'Mars)',
        says='The sulfate-rich sandstones of the Burns formation were investigated by the Opportunity rover on '
             'Meridiani Planum.',
        supports=['rock']),
    'https://en.wikipedia.org/wiki/Victoria_(crater)': dict(
        title='Victoria (crater) (Wikipedia)',
        says='Victoria is an impact crater on Mars at 2.05°S, 5.50°W, in Meridiani Planum.',
        supports=['landform']),
    'https://agupubs.onlinelibrary.wiley.com/doi/10.1029/2024JE008724': dict(
        title='Luzzi et al. (2025), JGR Planets: geomorphological evidence of near-surface ice at candidate '
              'landing sites in northern Amazonis Planitia, Mars',
        says='Characterizes candidate landing sites AP-1 (39.8°N, 202.1°E), AP-8 and AP-9, maps about 9,000 '
             'thermal contraction polygons there and estimates the ice beneath them lies within tens of '
             'centimetres of the surface.',
        supports=['ice']),
    MOLA: dict(title='Mars Global Surveyor MOLA topography (MEGDR), 128 pixels/degree (NASA PDS)',
               supports=['slope']),
}


def cite(url):
    return {'title': SOURCE_INFO[url]['title'], 'url': url,
            **{k: SOURCE_INFO[url][k] for k in ('says', 'supports') if k in SOURCE_INFO[url]}}


# name, accessible cold trap (< 110 K) from a landing site (Wueller et al., JGR Planets 2025/2026).
# Nobile Rim 2: the paper only reports PSRs that "may maintain surface temperatures below 125 K".
# name, accessible cold trap, landform, geological setting and the sources for it. Only four regions sit on
# an impact-crater rim; the others are massifs of the South Pole-Aitken basin rim or a plain.
MOON = [
    ('Peak near Cabeus B', False, 'massif',
     'A peak on a ~6 km high massif between the Cabeus and Drygalski craters, about 35 km southwest of Cabeus B crater.',
     [JGR]),
    ('Haworth', True, 'impact', 'Near the rims of the ancient Haworth and Cabeus impact craters.', [JGR]),
    ('Malapert Massif', False, 'massif',
     'A massif thought to be a remnant of the rim of the South Pole–Aitken basin, which formed more than 4 billion years ago.',
     [NASA_MALAPERT, MOUTON_MALAPERT]),
    ('Mons Mouton Plateau', True, 'massif',
     'The largest Artemis region, a plateau on Mons Mouton, a massif interpreted as part of the South Pole–Aitken basin rim.',
     [JGR, MOUTON_MALAPERT]),
    ('Mons Mouton', True, 'massif',
     'Near the southern edge of the ~8 km high Mons Mouton, a massif interpreted as part of the South Pole–Aitken basin rim.',
     [JGR, MOUTON_MALAPERT]),
    ('Nobile Rim 1', False, 'impact', 'On Mons Mouton, near the western rim of Nobile, an impact crater.',
     [JGR, NASA_NOBILE]),
    ('Nobile Rim 2', False, 'impact', 'On the northeastern rim of Nobile, an impact crater.',
     [ASTRONOMY_SITES, NASA_NOBILE]),
    ('de Gerlache Rim 2', False, 'impact', 'Just north of de Gerlache Rim 1, on the rim of de Gerlache, an impact crater.',
     [JGR, WIKI_DE_GERLACHE]),
    ('Slater Plain', True, 'plain', 'A plain about 20 km northeast of Slater crater, on the far side of the Moon.', [JGR]),
]
# id, name, lat, lon, materials, landforms, reachable ice, note, sources, sourced measurements.
# Slopes only when measured over hundreds of metres, like the Earth slopes (landing limits over
# 2–5 m are not comparable); day–night swing is near-surface air temperature, like NASA POWER's.
MARS = [
    ('jezero', 'Jezero Crater', 18.44, 77.45, ['clay', 'carbonate'], ['lake-sediment'], False,
     'Perseverance landing site (Octavia E. Butler Landing). Day–night swing: one sample day (sols 43–44), '
     'high −22 °C, low −83 °C, measured by MEDA.',
     ['https://www.esa.int/ESA_Multimedia/Images/2022/08/Water-rich_minerals_at_Jezero_Crater', WIKI_JEZERO,
      'https://en.wikipedia.org/wiki/Octavia_E._Butler_Landing',
      'https://www.jpl.nasa.gov/news/nasas-first-weather-report-from-jezero-crater-on-mars/'],
     {'dailyRangeC': 61}),
    ('gale', 'Gale Crater', -4.5895, 137.4417, ['clay'], ['lake-sediment'], False,
     'Curiosity landing site (Bradbury Landing). Day–night swing: daily highs about 0 °C and lows about '
     '−70 °C, measured by REMS.',
     ['https://www.jpl.nasa.gov/news/nasas-curiosity-rover-finds-patches-of-rock-record-erased-revealing-clues/',
      'https://en.wikipedia.org/wiki/Bradbury_Landing',
      'https://www.jpl.nasa.gov/images/pia16913-steady-temperatures-at-mars-gale-crater/'],
     {'dailyRangeC': 70}),
    # Landform left empty: the sources describe clay-bearing layers and a later fan or delta, but none calls
    # the clays lake sediments, so the site is not tagged as one.
    ('oxia-planum', 'Oxia Planum', 18.275, -24.632, ['clay'], [], False,
     'Landing site of ESA\'s ExoMars Rosalind Franklin rover; the IAU feature is near 18.275°N, 335.368°E. The '
     'landing ellipse avoids slopes above 8° at the MOLA sub-kilometre scale.',
     ['https://pmc.ncbi.nlm.nih.gov/articles/PMC7987365/', WIKI_OXIA,
      'https://www.tandfonline.com/doi/full/10.1080/17445647.2024.2302361'],
     {'slopeMaxDeg': 8}),
    ('victoria', 'Victoria Crater (Meridiani Planum)', -2.05, -5.50, ['sulfate', 'sandstone'], ['impact'], False,
     'Crater explored by the Opportunity rover.',
     ['https://agupubs.onlinelibrary.wiley.com/doi/full/10.1029/2022JE007374',
      'https://en.wikipedia.org/wiki/Victoria_(crater)'],
     {}),
    ('arcadia', 'Arcadia Planitia', 39.8, -157.9, ['ice'], [], True,
     'Candidate human landing site AP-1 (39.8°N, 202.1°E), with evidence of near-surface ice.',
     ['https://agupubs.onlinelibrary.wiley.com/doi/10.1029/2024JE008724'],
     {}),
]


def ts(value):
    return json.dumps(value, ensure_ascii=False)


ON_WATER = {'tuktoyaktuk', 'lonar', 'mistastin'}
earth_rows = []
for sid, analog_for, materials, landforms, extra in EARTH:
    name, country, lat, lon, source = extra or tuple(existing[sid][k] for k in ('name', 'country', 'lat', 'lon', 'source'))
    p, d = power[sid], dem[sid]
    row = {
        'id': sid, 'name': name, 'country': country, 'lat': lat, 'lon': lon, 'analogFor': analog_for,
        'meanTempC': float(p['t2m_ann_c']), 'dailyRangeC': float(p['t2m_range_ann_c']),
        'precipMmYr': round(float(p['prec_mm_per_day_ann']) * 365),
        'elevationM': int(d['site_elev_m']),
        # Coordinates on a lake or the sea: the elevation model measures the water, not the terrain.
        'slopeDeg': None if sid in ON_WATER else float(d['slope_deg']),
        'reliefM': None if sid in ON_WATER else int(d['relief_m']),
        'materials': materials, 'landforms': landforms, 'source': source,
    }
    g = ground[sid]
    row['groundTempC'] = float(g['annual_c']) if g['annual_c'] else None
    row['groundWarmestMonthC'] = float(g['warmest_month_c']) if g['warmest_month_c'] else None
    row['permafrostPct'] = permafrost_at(lat, lon)
    if d['flag']:
        row['note'] = d['flag']
    earth_rows.append(row)

targets = []
for i, (name, cold_trap, landform, setting, setting_sources) in enumerate(MOON, 1):
    lat, lon, n = moon_centroids[name]
    urls = list(dict.fromkeys([JGR, *setting_sources, LPI_HIGHLANDS, SOUTH_POLE]))
    sources = [cite(url) for url in urls]
    for src in sources:
        # A source backs a region's landform only when it is one of the sources for its setting.
        if src['url'] not in setting_sources and 'landform' in src.get('supports', []):
            src['supports'] = [f for f in src['supports'] if f != 'landform']
            if not src['supports']:
                src.pop('supports')
    targets.append({
        'id': f'moon-{i}', 'name': name, 'body': 'Moon', 'lat': lat, 'lon': lon,
        'materials': ['anorthosite'], 'landforms': [landform], 'slopeMaxDeg': 5, 'precipMmYr': 0, 'iceAccess': cold_trap,
        'setting': setting,
        # The region's environment: Diviner temperature and ice set the Permanent Moon base factors; the rest is shown only.
        'environment': {
            'radiusKm': moon_environment['radiusKm'],
            **{k: v for k, v in moon_environment['regions'][name].items() if k not in ('lolaPixels', 'divinerPoints', 'minirfPixels')},
        },
        'note': f'Artemis candidate landing region. Centre = mean of the {n} candidate landing sites of Wueller et al. (Table A1), not counting sites proposed earlier by Kring et al. (2023); most landing sites have slopes under 5°.',
        'sources': sources,
    })
for sid, name, lat, lon, materials, landforms, ice, note, sources, measured in MARS:
    # No rain falls on Mars today. Site temperatures are left out until a sourced local value is added:
    # the planet-wide average is not a site value.
    # Targets without a published slope get MOLA's: 90% of the ground within 10 km is flatter than this.
    if 'slopeMaxDeg' not in measured and sid in mars_slope['targets']:
        p90 = mars_slope['targets'][sid]['slopeP90Deg']
        measured = {**measured, 'slopeMaxDeg': p90}
        note += (f' Slope: 90% of the ground within {mars_slope["radiusKm"]} km is flatter than {p90}° '
                 '(MOLA, 128 pixels/degree, about 460 m).')
        sources = [*sources, MOLA]
    targets.append({
        'id': f'mars-{sid}', 'name': name, 'body': 'Mars', 'lat': lat, 'lon': lon,
        'materials': materials, 'landforms': landforms, 'precipMmYr': 0, 'iceAccess': ice,
        **measured, 'note': note, 'sources': [cite(url) for url in sources],
    })

out = f'''// Generated by analysis/build_compare_data.py from analysis/data. Do not edit by hand.
import type {{ EarthSite, Target }} from '../lib/similarity.ts'

export const EARTH_SITES: EarthSite[] = {ts(earth_rows)}

export const TARGETS: Target[] = {ts(targets)}
'''
(ROOT / 'src' / 'data' / 'compare.ts').write_text(out)
print(f'{len(earth_rows)} Earth sites, {len(targets)} targets')
