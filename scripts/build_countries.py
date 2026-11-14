"""Names the country of every Discover cell, so the page can say "Iran" instead of only coordinates.

Reads Natural Earth country borders (1:50m, public domain) in the TopoJSON form published as
countries-50m.json in the world-atlas package, and writes public/discover/countries.json:
  {"source": ..., "names": [country names], "cell": [index into names per cell, or -1]}
in the same cell order as public/discover/cells.json. Run by hand after build_discover.py:
  python3 scripts/build_countries.py path/to/countries-50m.json
No third-party modules.
"""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def decode_arcs(topo):
    """TopoJSON arcs to lists of (lon, lat), undoing the quantization and delta encoding."""
    (sx, sy), (tx, ty) = topo['transform']['scale'], topo['transform']['translate']
    arcs = []
    for arc in topo['arcs']:
        x = y = 0
        points = []
        for dx, dy in arc:
            x += dx
            y += dy
            points.append((x * sx + tx, y * sy + ty))
        arcs.append(points)
    return arcs


def ring(arcs, indexes):
    points = []
    for i in indexes:
        arc = arcs[i] if i >= 0 else arcs[~i][::-1]
        points.extend(arc if not points else arc[1:])
    return points


def polygons(geometry, arcs):
    """Each polygon as (outer ring, holes)."""
    if geometry['type'] == 'Polygon':
        parts = [geometry['arcs']]
    elif geometry['type'] == 'MultiPolygon':
        parts = geometry['arcs']
    else:
        return []
    return [[ring(arcs, r) for r in rings] for rings in parts]


def inside(lon, lat, points):
    """Ray casting: is (lon, lat) inside the ring?"""
    hit = False
    j = len(points) - 1
    for i in range(len(points)):
        xi, yi = points[i]
        xj, yj = points[j]
        if (yi > lat) != (yj > lat) and lon < (xj - xi) * (lat - yi) / (yj - yi) + xi:
            hit = not hit
        j = i
    return hit


def main(path):
    topo = json.loads(Path(path).read_text())
    arcs = decode_arcs(topo)
    countries = []
    for geometry in topo['objects']['countries']['geometries']:
        name = geometry.get('properties', {}).get('name')
        for rings in polygons(geometry, arcs):
            # A polygon across the 180° meridian (eastern Russia, Fiji) comes split into both
            # ends of the map: move its western part east of 180° so the ring is continuous.
            if max(p[0] for p in rings[0]) - min(p[0] for p in rings[0]) > 180:
                rings = [[(x + 360 if x < 0 else x, y) for x, y in r] for r in rings]
            xs = [p[0] for p in rings[0]]
            ys = [p[1] for p in rings[0]]
            countries.append((name, (min(xs), min(ys), max(xs), max(ys)), rings))

    def country_at(lon, lat):
        # All land south of 60° S is Antarctica, whose polygon wraps the pole and defeats ray casting.
        if lat < -60:
            return 'Antarctica'
        for x in (lon, lon + 360) if lon < 0 else (lon,):
            for name, (x0, y0, x1, y1), rings in countries:
                if x0 <= x <= x1 and y0 <= lat <= y1 and inside(x, lat, rings[0]):
                    if not any(inside(x, lat, hole) for hole in rings[1:]):
                        return name
        return None

    cells = json.loads((ROOT / 'public' / 'discover' / 'cells.json').read_text())
    deg = cells['cellDeg']
    names, index, out = [], {}, []
    for row, col in zip(cells['row'], cells['col']):
        lat = 90 - (row + 0.5) * deg
        lon = -180 + (col + 0.5) * deg
        # The centre can fall in the sea on a coast: then try points a quarter cell away.
        name = country_at(lon, lat)
        if name is None:
            for dx, dy in ((0.25, 0), (-0.25, 0), (0, 0.25), (0, -0.25)):
                name = country_at(lon + dx * deg / 0.5, lat + dy * deg / 0.5)
                if name:
                    break
        if name is None:
            out.append(-1)
            continue
        if name not in index:
            index[name] = len(names)
            names.append(name)
        out.append(index[name])

    result = {
        'source': 'Natural Earth 1:50m countries (public domain), via world-atlas 2.0.2',
        'names': names,
        'cell': out,
    }
    target = ROOT / 'public' / 'discover' / 'countries.json'
    target.write_text(json.dumps(result, separators=(',', ':')))
    named = sum(1 for i in out if i >= 0)
    print(f'{named} of {len(out)} cells named, {len(names)} countries, {target.stat().st_size} bytes')


if __name__ == '__main__':
    main(sys.argv[1])
