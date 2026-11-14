"""
Measures the environment of each Artemis candidate region from NASA Lunar Reconnaissance Orbiter data:
sunlight and permanent shadow from LOLA, surface temperature and stable ice from Diviner, and radar
returns from Mini-RF.

Run from the repo root:  python3 scripts/build_moon_environment.py   (needs numpy)
Output: analysis/data/moon_environment.json, read by analysis/build_compare_data.py.

Each region is measured over every point within RADIUS_KM of its centre (analysis/data/moon_centroids.json,
the mean of the published landing sites). Only the parts of each file around the regions are downloaded,
with HTTP range requests, so the run takes about a minute.

Sources:
- LOLA average illumination, south pole, 120 m/pixel (Mazarico et al. 2011, Icarus 211, 1066-1081):
  https://imbrium.mit.edu/EXTRAS/ILLUMINATION/  (AVGVISIB_75S_120M_201608)
  Share of the time each pixel is sunlit, 2009-2013 geometry over many years of solar positions; 0 = permanent
  shadow.
- Diviner Polar Resource Product, south (Paige et al. 2010, Science 330, 479-482), about 0.5 km triangles:
  https://pds-geosciences.wustl.edu/lro/urn-nasa-pds-lro_diviner_derived1/data_derived_prp/
  Average and maximum surface temperature over the year (K), and the depth below which water ice would stay
  stable (m; -999 = nowhere within the model's depth).
- Mini-RF global mosaic, circular polarization ratio (CPR), 32 pixels/degree, simple cylindrical:
  https://pds-geosciences.wustl.edu/lro/lro-l-mrflro-5-global-mosaic-v1/lromrf_1001/data/32ppd/
  CPR above 1 is what water ice gives, but rough, rocky ground gives it too (Spudis et al. 2013, JGR
  Planets 118, 2016-2029), so it is reported, not read as ice.
"""
import json
import math
import time
import urllib.request
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
RADIUS_KM = 7.5
R_MOON = 1737.4
UA = {'User-Agent': 'mars-among-us moon environment'}

LOLA_URL = 'https://imbrium.mit.edu/EXTRAS/ILLUMINATION/IMG/AVGVISIB_75S_120M_201608.IMG'
LOLA = dict(size=7624, scale_m=120.0, offset=3811.5, dn_scale=0.00004)  # from the .LBL
DIVINER_URL = ('https://pds-geosciences.wustl.edu/lro/urn-nasa-pds-lro_diviner_derived1/'
               'data_derived_prp/dlre_prp_south.tab')
DIV = dict(row_bytes=210, header_rows=1, grid=1200)  # from the .LBL; 2 triangles per grid cell
MINIRF_URL = ('https://pds-geosciences.wustl.edu/lro/lro-l-mrflro-5-global-mosaic-v1/lromrf_1001/'
              'data/32ppd/global_cpr_32ppd_simp_0c')


def get_range(url, start, end, chunk=1_000_000):
    """Bytes start..end of a remote file, in chunks, retrying a dropped connection."""
    parts = []
    for s in range(start, end + 1, chunk):
        e = min(s + chunk - 1, end)
        for attempt in range(5):
            try:
                req = urllib.request.Request(url, headers={**UA, 'Range': f'bytes={s}-{e}'})
                with urllib.request.urlopen(req, timeout=120) as r:
                    data = r.read()
                assert len(data) == e - s + 1, (url, s, e, len(data))
                parts.append(data)
                break
            except (OSError, AssertionError) as err:
                if attempt == 4:
                    raise
                print(f'  retry {url.rsplit("/", 1)[1]} {s}-{e}: {err}')
                time.sleep(2 ** attempt)
    return b''.join(parts)


def distance_km(lat1, lon1, lat2, lon2):
    """Great-circle distance on the Moon, inputs in degrees (arrays allowed)."""
    p1, p2 = np.radians(lat1), np.radians(lat2)
    a = np.sin((p2 - p1) / 2) ** 2 + np.cos(p1) * np.cos(p2) * np.sin(np.radians(lon2 - lon1) / 2) ** 2
    return 2 * R_MOON * np.arcsin(np.sqrt(a))


# --- LOLA: polar stereographic (spherical), centre -90°, as in the label ------------------------------
def lola_xy(lat, lon):
    """Projected metres. South polar stereographic: x = ρ sin λ, y = ρ cos λ, ρ = 2R tan(π/4 + φ/2)."""
    rho = 2 * R_MOON * 1000 * np.tan(np.pi / 4 + np.radians(lat) / 2)
    return rho * np.sin(np.radians(lon)), rho * np.cos(np.radians(lon))


def lola_latlon(x, y):
    rho = np.hypot(x, y)
    lat = np.degrees(2 * np.arctan(rho / (2 * R_MOON * 1000)) - np.pi / 2)
    lon = np.degrees(np.arctan2(x, y))
    return lat, lon


def lola_window(lat, lon):
    """Sunlit share (0-1) of every pixel within RADIUS_KM of the point."""
    x, y = lola_xy(lat, lon)
    # Image rows run from +y at the top; columns from -x at the left (checked in check_lola_orientation).
    col = LOLA['offset'] + x / LOLA['scale_m']
    line = LOLA['offset'] - y / LOLA['scale_m']
    half = int(RADIUS_KM * 1000 / LOLA['scale_m']) + 2
    l0, l1 = int(line) - half, int(line) + half
    raw = get_range(LOLA_URL, l0 * LOLA['size'] * 2, (l1 + 1) * LOLA['size'] * 2 - 1)
    block = np.frombuffer(raw, dtype='<i2').reshape(l1 - l0 + 1, LOLA['size'])
    c0, c1 = int(col) - half, int(col) + half
    block = block[:, c0:c1 + 1].astype(float) * LOLA['dn_scale']
    lines, cols = np.mgrid[l0:l1 + 1, c0:c1 + 1]
    plat, plon = lola_latlon((cols - LOLA['offset']) * LOLA['scale_m'], (LOLA['offset'] - lines) * LOLA['scale_m'])
    inside = distance_km(lat, lon, plat, plon) <= RADIUS_KM
    return block[inside]


def check_lola_orientation():
    """Permanently shadowed crater floors must read 0, so a flipped image would show at once."""
    for name, lat, lon in [('Shackleton', -89.67, 129.78), ('Haworth', -87.45, -5.0), ('Shoemaker', -88.14, 44.9),
                           ('Faustini', -87.18, 77.0)]:
        x, y = lola_xy(lat, lon)
        col = int(LOLA['offset'] + x / LOLA['scale_m'])
        line = int(LOLA['offset'] - y / LOLA['scale_m'])
        raw = get_range(LOLA_URL, (line * LOLA['size'] + col) * 2, (line * LOLA['size'] + col) * 2 + 1)
        value = int.from_bytes(raw, 'little', signed=True) * LOLA['dn_scale']
        print(f'  check {name} floor sunlit share: {value:.3f}')
        assert value < 0.05, f'{name} floor should be in permanent shadow; the image orientation is wrong'


# --- Diviner: rows in grid order, x falling and y rising, 2 triangles per cell -------------------------
def diviner_rows(row0, count):
    raw = get_range(DIVINER_URL, (DIV['header_rows'] + row0) * DIV['row_bytes'],
                    (DIV['header_rows'] + row0 + count) * DIV['row_bytes'] - 1)
    rows = np.array([[float(v) for v in line.split(',')] for line in raw.decode().splitlines() if line.strip()])
    return rows[:, 9:]  # clon, clat, calt, temp_avg, temp_max, ice_depth


def diviner_window(lat, lon):
    # The grid is about 0.5 km in x and y; x = R cos(lat) cos(lon), y = R cos(lat) sin(lon).
    r = R_MOON * math.cos(math.radians(lat))
    x, y = r * math.cos(math.radians(lon)), r * math.sin(math.radians(lon))
    ix, iy = round((299.5 - x) / 0.5), round((y + 299.5) / 0.5)
    half = int(RADIUS_KM / 0.5) + 3
    out = []
    for i in range(ix - half, ix + half + 1):
        out.append(diviner_rows((i * DIV['grid'] + iy - half) * 2, (2 * half + 1) * 2))
    rows = np.vstack(out)
    inside = distance_km(lat, lon, rows[:, 1], rows[:, 0]) <= RADIUS_KM
    # Every point within the radius must be inside the downloaded block, or the window was misplaced.
    edge = distance_km(lat, lon, rows[:, 1], rows[:, 0]).max()
    assert edge > RADIUS_KM, f'downloaded block too small around {lat}, {lon}'
    return rows[inside]


# --- Mini-RF: simple cylindrical, layout read from the PDS3 label ---------------------------------------
def minirf_label():
    req = urllib.request.Request(MINIRF_URL + '.lbl', headers=UA)
    text = urllib.request.urlopen(req, timeout=120).read().decode('latin-1')
    def value(key):
        for line in text.splitlines():
            k, _, v = line.partition('=')
            if k.strip() == key:
                return v.split('<')[0].strip().strip('"')
        raise KeyError(key)
    label = {k: value(k) for k in ('RECORD_BYTES', 'LINES', 'LINE_SAMPLES', 'SAMPLE_TYPE', 'SAMPLE_BITS',
                                   'MAP_RESOLUTION', 'MAXIMUM_LATITUDE', 'MINIMUM_LATITUDE',
                                   'WESTERNMOST_LONGITUDE', 'EASTERNMOST_LONGITUDE',
                                   'POSITIVE_LONGITUDE_DIRECTION', 'MISSING_CONSTANT')}
    print('  Mini-RF label', label)
    assert label['SAMPLE_TYPE'] == 'PC_REAL' and label['SAMPLE_BITS'] == '32', label
    assert label['POSITIVE_LONGITUDE_DIRECTION'] == 'EAST', label
    return label


def minirf_south(label, south_of):
    """Every pixel south of `south_of` degrees: values, and each pixel's centre latitude and longitude."""
    lines, samples = int(label['LINES']), int(label['LINE_SAMPLES'])
    res = float(label['MAP_RESOLUTION'])
    max_lat, west = float(label['MAXIMUM_LATITUDE']), float(label['WESTERNMOST_LONGITUDE'])
    assert abs(lines / res - (max_lat - float(label['MINIMUM_LATITUDE']))) < 1e-6, label
    first = int((max_lat - south_of) * res)
    raw = get_range(MINIRF_URL + '.img', first * samples * 4, lines * samples * 4 - 1, chunk=4_000_000)
    values = np.frombuffer(raw, dtype='<f4').reshape(lines - first, samples).astype(float)
    lat = max_lat - (np.arange(first, lines) + 0.5) / res
    lon = west + (np.arange(samples) + 0.5) / res
    return values, lat, lon


def minirf_window(mosaic, lat, lon):
    values, plat, plon = mosaic
    rows = np.flatnonzero(np.abs(plat - lat) * math.pi / 180 * R_MOON <= RADIUS_KM + 1)
    block = values[rows]
    dist = distance_km(lat, lon, plat[rows][:, None], plon[None, :])
    inside = dist <= RADIUS_KM
    v = block[inside]
    return v[np.isfinite(v) & (v > 0) & (v < 100)]


def summarize(name, lat, lon, mosaic):
    sun = lola_window(lat, lon)
    div = diviner_window(lat, lon)
    cpr = minirf_window(mosaic, lat, lon)
    assert cpr.size > 0, f'no Mini-RF pixels around {name}'
    t_avg, t_max, ice = div[:, 3], div[:, 4], div[:, 5]
    return {
        'sunlitBestPct': round(float(sun.max()) * 100),
        'sunlitMedianPct': round(float(np.median(sun)) * 100),
        'permanentShadowPct': round(float((sun == 0).mean()) * 100, 1),
        'tempAvgMedianK': round(float(np.median(t_avg))),
        'tempMaxK': round(float(t_max.max())),
        'tempAvgMinK': round(float(t_avg.min())),
        # Share of the area where ice would stay stable within 1 m of the surface.
        'iceWithin1mPct': round(float(((ice >= 0) & (ice <= 1)).mean()) * 100, 1),
        # Mini-RF: middle radar CPR, and the share of the area above 1 (ice-like, or rough ground).
        'radarCprMedian': round(float(np.median(cpr)), 2),
        'radarCprAbove1Pct': round(float((cpr > 1).mean()) * 100, 1),
        'lolaPixels': int(sun.size),
        'divinerPoints': int(div.shape[0]),
        'minirfPixels': int(cpr.size),
    }


def main():
    centroids = json.load(open(ROOT / 'analysis' / 'data' / 'moon_centroids.json'))
    print('Checking LOLA image orientation')
    check_lola_orientation()
    label = minirf_label()
    # Only the rows south of the northernmost region (plus a margin) are downloaded.
    mosaic = minirf_south(label, max(lat for lat, _, _ in centroids.values()) + 1)
    regions = {}
    for name, (lat, lon, _) in centroids.items():
        regions[name] = summarize(name, lat, lon, mosaic)
        print(name, regions[name])
    out = {
        'about': f'Measured within {RADIUS_KM} km of each region centre. See scripts/build_moon_environment.py.',
        'radiusKm': RADIUS_KM,
        'regions': regions,
    }
    path = ROOT / 'analysis' / 'data' / 'moon_environment.json'
    path.write_text(json.dumps(out, indent=2, ensure_ascii=False) + '\n')
    print('wrote', path)


if __name__ == '__main__':
    main()
