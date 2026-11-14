"""
Measures the slope around each Mars target from NASA Mars Global Surveyor MOLA topography.

Run from the repo root:  python3 scripts/build_mars_slope.py   (needs numpy)
Output: analysis/data/mars_slope.json, read by analysis/build_compare_data.py.

Data: MOLA Mission Experiment Gridded Data Record (MEGDR), topography, 128 pixels/degree (about 463 m),
simple cylindrical, 44° x 90° tiles: https://pds-geosciences.wustl.edu/mgs/mgs-m-mola-5-megdr-l3-v1/mgsl_300x/meg128/
The layout of each tile is read from its PDS label. Only the rows around each target are downloaded.

Slope is worked out at every pixel with Horn's method (the 3 x 3 neighbours), as on Earth. Each target gets the
90th percentile of the slopes within RADIUS_KM of its centre: 90% of the ground there is flatter than that.
"""
import json
import math
import time
import urllib.request
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
BASE = 'https://pds-geosciences.wustl.edu/mgs/mgs-m-mola-5-megdr-l3-v1/mgsl_300x/meg128/'
R_MARS_M = 3_396_190
RADIUS_KM = 10
UA = {'User-Agent': 'mars-among-us mars slope'}
# analysis/build_compare_data.py uses these for targets without a published slope. Oxia Planum keeps its
# published 8° landing limit; it is measured here too, as a check that MOLA agrees with it.
TARGETS = {
    'oxia-planum': (18.275, -24.632),
    'jezero': (18.44, 77.45),
    'gale': (-4.5895, 137.4417),
    'victoria': (-2.05, -5.50),
    'arcadia': (39.8, -157.9),
}


def get(url, start=None, end=None):
    headers = dict(UA)
    if start is not None:
        headers['Range'] = f'bytes={start}-{end}'
    for attempt in range(5):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=120) as r:
                data = r.read()
            if start is not None:
                assert len(data) == end - start + 1, (url, len(data))
            return data
        except (OSError, AssertionError) as err:
            if attempt == 4:
                raise
            print(f'  retry {url}: {err}')
            time.sleep(2 ** attempt)


def label(name):
    text = get(BASE + name + '.lbl').decode('latin-1')
    values = {}
    for line in text.splitlines():
        k, _, v = line.partition('=')
        k = k.strip()
        if k and v and k not in values:
            values[k] = v.split('<')[0].strip().strip('"')
    return values


def tile_for(lat, lon_east):
    top = next(t for t in (88, 44, 0, -44) if t >= lat > t - 44)
    west = int(lon_east // 90) * 90
    return f"megt{abs(top):02d}{'n' if top >= 0 else 's'}{west:03d}hb", top, west


def slope_p90(sid, lat, lon):
    lon_east = lon % 360
    name, top, west = tile_for(lat, lon_east)
    lb = label(name)
    lines, samples = int(lb['LINES']), int(lb['LINE_SAMPLES'])
    res = float(lb['MAP_RESOLUTION'])
    assert lb['SAMPLE_BITS'] == '16' and 'INTEGER' in lb['SAMPLE_TYPE'], lb
    assert abs(float(lb['MAXIMUM_LATITUDE']) - top) < 1e-6 and abs(float(lb['WESTERNMOST_LONGITUDE']) - west) < 1e-6, lb
    dtype = '>i2' if lb['SAMPLE_TYPE'].startswith('MSB') else '<i2'
    scale = float(lb.get('SCALING_FACTOR', '1'))
    offset = float(lb.get('OFFSET', '0'))
    px_m = 2 * math.pi * R_MARS_M / 360 / res
    half = int(RADIUS_KM * 1000 / px_m) + 3
    row = int((top - lat) * res)
    col = int((lon_east - west) * res)
    half_cols = int(half / max(math.cos(math.radians(lat)), 0.05)) + 1
    r0, r1 = row - half, row + half
    c0, c1 = col - half_cols, col + half_cols
    assert r0 >= 0 and r1 < lines and c0 >= 0 and c1 < samples, f'{sid} window crosses a tile edge'
    raw = get(BASE + name + '.img', r0 * samples * 2, (r1 + 1) * samples * 2 - 1)
    z = np.frombuffer(raw, dtype=dtype).reshape(r1 - r0 + 1, samples)[:, c0:c1 + 1].astype(float) * scale + offset
    lat_rows = top - (np.arange(r0, r1 + 1) + 0.5) / res
    dy = px_m
    dx = px_m * np.cos(np.radians(lat_rows))[1:-1, None]
    a, b, c = z[:-2, :-2], z[:-2, 1:-1], z[:-2, 2:]
    d, f = z[1:-1, :-2], z[1:-1, 2:]
    g, h, i = z[2:, :-2], z[2:, 1:-1], z[2:, 2:]
    dzdx = ((c + 2 * f + i) - (a + 2 * d + g)) / (8 * dx)
    dzdy = ((g + 2 * h + i) - (a + 2 * b + c)) / (8 * dy)
    slope = np.degrees(np.arctan(np.hypot(dzdx, dzdy)))
    plat = lat_rows[1:-1, None]
    plon = west + (np.arange(c0 + 1, c1) + 0.5)[None, :] / res
    dist = R_MARS_M / 1000 * np.radians(np.hypot(plat - lat, (plon - lon_east) * np.cos(np.radians(lat))))
    inside = slope[dist <= RADIUS_KM]
    elev = z[1:-1, 1:-1][dist <= RADIUS_KM]
    print(f'{sid}: {name}, {inside.size} pixels, slope median {np.median(inside):.2f}°, '
          f'p90 {np.percentile(inside, 90):.2f}°, elevation {np.median(elev):.0f} m')
    return {'slopeP90Deg': round(float(np.percentile(inside, 90)), 1),
            'slopeMedianDeg': round(float(np.median(inside)), 1),
            'pixels': int(inside.size)}


def main():
    out = {'about': f'90th percentile and median MOLA slope within {RADIUS_KM} km of each target. '
                    'See scripts/build_mars_slope.py.', 'radiusKm': RADIUS_KM, 'targets': {}}
    for sid, (lat, lon) in TARGETS.items():
        out['targets'][sid] = slope_p90(sid, lat, lon)
    path = ROOT / 'analysis' / 'data' / 'mars_slope.json'
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(out, indent=2) + '\n')
    print('wrote', path)


if __name__ == '__main__':
    main()
