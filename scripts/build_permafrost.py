"""
Adds the share of permafrost-underlain ground to every Discover grid cell, from ESA's Permafrost Climate
Change Initiative (Permafrost_cci), as listed in the ESA Open Science Catalog:
https://opensciencedata.esa.int/products/esa-cci-permafrost/collection

Run from the repo root:  python3 scripts/build_permafrost.py   (needs numpy, xarray, zarr, fsspec, aiohttp,
pyproj)
Reads and rewrites public/discover/cells.json, adding `permafrostPct`: the mean permafrost area fraction (PFR,
0-100 %) of the ~1 km pixels in each 0.5° cell, for the latest year in the dataset. null = no data: the dataset
covers the Northern Hemisphere only, so every cell south of it, and open water, is null.

Data: the DeepESDL copy of Permafrost_cci L4 (yearly, 2000-2019), Arctic polar stereographic, ~926 m:
s3://deep-esdl-public/esa-cci-permafrost-1x1151x1641-1.0.0.zarr (public; read over HTTPS).
"""
import json
from pathlib import Path

import numpy as np
import xarray as xr
from pyproj import CRS, Transformer

ROOT = Path(__file__).resolve().parent.parent
CELLS = ROOT / 'public' / 'discover' / 'cells.json'
ZARR = 'https://deep-esdl-public.s3.amazonaws.com/esa-cci-permafrost-1x1151x1641-1.0.0.zarr'
CHUNK = (1151, 1641)


def main():
    cells = json.loads(CELLS.read_text())
    deg = cells['cellDeg']
    rows, cols = 180 / deg, 360 / deg
    ds = xr.open_zarr(ZARR, consolidated=True)
    pfr = ds['PFR'].isel(time=-1)
    year = str(ds['time'].values[-1])[:4]
    crs = CRS.from_wkt(ds['spatial_ref'].attrs['crs_wkt'])
    to_lonlat = Transformer.from_crs(crs, 'EPSG:4326', always_xy=True)
    x, y = ds['x'].values, ds['y'].values
    total = np.zeros(int(rows * cols))
    count = np.zeros(int(rows * cols))
    for i in range(0, y.size, CHUNK[0]):
        for j in range(0, x.size, CHUNK[1]):
            block = pfr[i:i + CHUNK[0], j:j + CHUNK[1]].values.astype(float)
            ok = np.isfinite(block)
            if not ok.any():
                continue
            xx, yy = np.meshgrid(x[j:j + CHUNK[1]], y[i:i + CHUNK[0]])
            lon, lat = to_lonlat.transform(xx[ok], yy[ok])
            r = np.clip(((90 - lat) / deg).astype(int), 0, int(rows) - 1)
            c = np.clip(((lon + 180) / deg).astype(int), 0, int(cols) - 1)
            idx = r * int(cols) + c
            np.add.at(total, idx, block[ok])
            np.add.at(count, idx, 1)
        print(f'  rows {i}/{y.size}')
    out = []
    for r, c in zip(cells['row'], cells['col']):
        k = r * int(cols) + c
        out.append(round(total[k] / count[k]) if count[k] else None)
    cells['permafrostPct'] = out
    cells['about'] += f' permafrostPct: ESA Permafrost_cci {year}, see scripts/build_permafrost.py.'
    have = [v for v in out if v is not None]
    print(f'{year}: {len(have)} cells with data, {sum(v >= 50 for v in have)} at least half permafrost')
    CELLS.write_text(json.dumps(cells, separators=(',', ':'), ensure_ascii=False))


if __name__ == '__main__':
    main()
