"""
Monthly ground (land surface) temperature at every Earth analog site, from NASA MODIS, for the
"Permanent Moon base" purpose on the Compare page.

Run from the repo root:  python3 scripts/build_ground_temperature.py   (needs numpy and Pillow)
Output: analysis/data/ground_temp.csv, read by analysis/build_compare_data.py.

Data: MODIS Terra land surface temperature, monthly, 0.05° (ASTER TES algorithm), day and night, served by
NASA GIBS, the imagery behind NASA Worldview:
https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/  layers MODIS_Terra_L3_Land_Surface_Temp_Monthly_CMG_{Day,Night}_TES
GIBS tiles are colour-coded; each colour stands for a temperature interval listed in the layer's GIBS colour map
(MODIS_Land_Surface_Temp.xml), so a pixel is read back as the middle of its interval. Each site reads the
3 x 3 pixels around it at zoom 6 and keeps their median.

For each month of YEAR, the month's ground temperature is the mean of the day and night values that exist:
in polar night MODIS has no daytime value, so only the night value is used. Months with neither are left out.
The year's mean is the mean of the months, and is left out when fewer than 10 months have data.
"""
import csv
import io
import math
import re
import statistics
import time
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
YEAR = 2025
ZOOM = 6
LAYER = 'MODIS_Terra_L3_Land_Surface_Temp_Monthly_CMG_{}_TES'
TILE = ('https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/{layer}/default/{date}/'
        'GoogleMapsCompatible_Level6/{z}/{y}/{x}.png')
COLORMAP = 'https://gibs.earthdata.nasa.gov/colormaps/v1.3/MODIS_Land_Surface_Temp.xml'
UA = {'User-Agent': 'mars-among-us ground temperature'}


def get(url):
    for attempt in range(5):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
                return r.read()
        except OSError as err:
            if attempt == 4:
                raise
            print(f'  retry {url}: {err}')
            time.sleep(2 ** attempt)


def colour_table():
    """RGB -> (low, high, units) for every colour that stands for a temperature."""
    root = ET.fromstring(get(COLORMAP))
    table, units = {}, None
    for cmap in root.iter():
        if not cmap.tag.endswith('ColorMap'):
            continue
        for el in cmap:
            if el.tag.endswith('Entries'):
                for entry in el:
                    a = entry.attrib
                    if a.get('transparent') == 'true' or a.get('nodata') == 'true':
                        continue
                    nums = re.findall(r'-?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?', a.get('value', ''))
                    if len(nums) < 1:
                        continue
                    lo = float(nums[0])
                    hi = float(nums[1]) if len(nums) > 1 else lo
                    if math.isinf(hi) or abs(hi) > 1e6:
                        hi = lo
                    rgb = tuple(int(v) for v in a['rgb'].split(','))
                    table[rgb] = (lo, hi)
            if el.tag.endswith('Legend'):
                units = cmap.attrib.get('units') or units
        units = cmap.attrib.get('units') or units
    assert table, 'no colours found in the GIBS colour map'
    print(f'  colour map: {len(table)} colours, units {units!r}, '
          f'{min(v[0] for v in table.values())}..{max(v[1] for v in table.values())}')
    return table, units


def pixel(lat, lon):
    """Tile column/row and pixel inside the tile for a point, Web Mercator at ZOOM."""
    n = 2 ** ZOOM
    x = (lon + 180) / 360 * n
    lat_r = math.radians(lat)
    y = (1 - math.log(math.tan(lat_r) + 1 / math.cos(lat_r)) / math.pi) / 2 * n
    return int(x), int(y), int((x % 1) * 256), int((y % 1) * 256)


_tiles = {}


def read(layer, date, lat, lon, table):
    tx, ty, px, py = pixel(lat, lon)
    key = (layer, date, tx, ty)
    if key not in _tiles:
        raw = get(TILE.format(layer=layer, date=date, z=ZOOM, x=tx, y=ty))
        _tiles[key] = np.array(Image.open(io.BytesIO(raw)).convert('RGBA'))
    img = _tiles[key]
    values = []
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            r, g, b, a = img[min(255, max(0, py + dy)), min(255, max(0, px + dx))]
            hit = table.get((int(r), int(g), int(b)))
            if a > 0 and hit:
                values.append((hit[0] + hit[1]) / 2)
    return statistics.median(values) if values else None


def sites():
    """Earth sites (id, lat, lon) from src/data/compare.ts."""
    ts = (ROOT / 'src' / 'data' / 'compare.ts').read_text()
    block = ts[ts.index('EARTH_SITES'):ts.index('TARGETS')]
    out = []
    for chunk in block.split('\n  {')[1:]:
        sid = re.search(r"id: '([^']+)'", chunk).group(1)
        lat = float(re.search(r'\blat: (-?[\d.]+)', chunk).group(1))
        lon = float(re.search(r'\blon: (-?[\d.]+)', chunk).group(1))
        out.append((sid, lat, lon))
    return out


def main():
    table, units = colour_table()
    to_c = (lambda v: v - 273.15) if (units or '').strip().upper() in ('K', 'KELVIN') else (lambda v: v)
    rows = []
    for sid, lat, lon in sites():
        months = []
        for m in range(1, 13):
            date = f'{YEAR}-{m:02d}-01'
            day = read(LAYER.format('Day'), date, lat, lon, table)
            night = read(LAYER.format('Night'), date, lat, lon, table)
            have = [to_c(v) for v in (day, night) if v is not None]
            months.append(sum(have) / len(have) if have else None)
        ok = [v for v in months if v is not None]
        row = {
            'id': sid,
            'months_with_data': len(ok),
            'annual_c': round(sum(ok) / len(ok), 1) if len(ok) >= 10 else '',
            'warmest_month_c': round(max(ok), 1) if ok else '',
            'coldest_month_c': round(min(ok), 1) if ok else '',
        }
        print(row)
        rows.append(row)
    path = ROOT / 'analysis' / 'data' / 'ground_temp.csv'
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, 'w', newline='') as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]))
        w.writeheader()
        w.writerows(rows)
    print('wrote', path)


if __name__ == '__main__':
    main()
