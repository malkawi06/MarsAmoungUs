import { useEffect, useMemo } from 'react'
import { useMap } from '../hooks/useMap'
import { CircleMarker, ImageOverlay, MapView, Rectangle, TileOverlay, Tooltip } from './MapView'
import { cellLat, cellLon, type Cells } from '../lib/discover'

/** Web Mercator stops here; the overlay covers the same band as the map. */
const MAX_LAT = 85.0511
const SIZE = 1024
/** Below this similarity a patch is left clear, so the map shows only the promising ones. */
export const SHOW_FROM = 60
const RELIEF_URL =
  'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/ASTER_GDEM_Greyscale_Shaded_Relief/default/GoogleMapsCompatible_Level12/{z}/{y}/{x}.jpeg'

/** Heat colour for a patch, t = 0 at SHOW_FROM to 1 at 100%: dark orange-red to bright yellow. */
function heat(t: number): [number, number, number, number] {
  return [255, Math.round(40 + 215 * t), Math.round(30 * t), Math.round(110 + 120 * t)]
}

const css = ([r, g, b, a]: [number, number, number, number]) => `rgba(${r},${g},${b},${a / 255})`

/** The corners of one grid patch, for its outline on the map. */
function patchBounds(cells: Cells, cell: number): [[number, number], [number, number]] {
  const half = cells.cellDeg / 2
  const lat = cellLat(cells, cell)
  const lon = cellLon(cells, cell)
  return [
    [lat - half, lon - half],
    [lat + half, lon + half],
  ]
}

/**
 * Paints every grid cell's similarity (0–100) onto a Web Mercator image, so Leaflet can lay it over
 * the satellite map without distortion. Clear below SHOW_FROM, then dark red to bright yellow.
 */
function paint(cells: Cells, scores: Float32Array): string {
  const grid = new Float32Array(360 * 720).fill(-1)
  for (let i = 0; i < scores.length; i++) grid[cells.row[i] * 720 + cells.col[i]] = scores[i]
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = SIZE
  const ctx = canvas.getContext('2d')!
  const image = ctx.createImageData(SIZE, SIZE)
  const yMax = Math.log(Math.tan(Math.PI / 4 + (MAX_LAT * Math.PI) / 360))
  for (let y = 0; y < SIZE; y++) {
    const lat = (Math.atan(Math.sinh(yMax * (1 - (2 * (y + 0.5)) / SIZE))) * 180) / Math.PI
    const row = Math.min(359, Math.max(0, Math.floor((90 - lat) / 0.5)))
    for (let x = 0; x < SIZE; x++) {
      const col = Math.min(719, Math.floor(((x + 0.5) / SIZE) * 720))
      const s = grid[row * 720 + col]
      if (s < SHOW_FROM) continue
      const t = (s - SHOW_FROM) / (100 - SHOW_FROM)
      image.data.set(heat(t), (y * SIZE + x) * 4)
    }
  }
  ctx.putImageData(image, 0, 0)
  return canvas.toDataURL()
}

export function DiscoverMap({
  cells,
  scores,
  seed,
  picks,
  selected,
  known,
  onSelect,
  className,
}: {
  cells: Cells
  scores: Float32Array
  seed: number
  picks: number[]
  selected?: number
  known: Set<number>
  onSelect: (cell: number) => void
  className?: string
}) {
  const url = useMemo(() => paint(cells, scores), [cells, scores])
  return (
    <MapView basemap="satellite" center={[20, 0]} zoom={2} className={className}>
      <ImageOverlay
        url={url}
        bounds={[
          [-MAX_LAT, -180],
          [MAX_LAT, 180],
        ]}
        opacity={0.85}
      />
      <CircleMarker
        center={[cellLat(cells, seed), cellLon(cells, seed)]}
        radius={9}
        pathOptions={{ color: '#000', weight: 2, fillColor: '#ffffff', fillOpacity: 1 }}
      >
        <Tooltip permanent direction="top" offset={[0, -8]}>
          Known site
        </Tooltip>
      </CircleMarker>
      {picks.map((i, n) => (
        <CircleMarker
          key={i}
          center={[cellLat(cells, i), cellLon(cells, i)]}
          radius={i === selected ? 11 : 8}
          pathOptions={{
            color: '#fff',
            weight: 2,
            fillColor: known.has(i) ? '#8e8e95' : '#ff8a4c',
            fillOpacity: 1,
          }}
          eventHandlers={{ click: () => onSelect(i) }}
        >
          <Tooltip direction="top" offset={[0, -8]}>
            #{n + 1} · {Math.round(scores[i])}%
          </Tooltip>
        </CircleMarker>
      ))}
      {selected !== undefined && (
        <>
          {/* The patch the numbers describe, and the terrain inside it at about 30 m. */}
          <TileOverlay
            url={RELIEF_URL}
            attribution="Terrain: NASA/METI ASTER GDEM shaded relief, via NASA GIBS"
            maxNativeZoom={12}
            className="relief-multiply"
          />
          <Rectangle
            bounds={patchBounds(cells, selected)}
            pathOptions={{ color: '#ffffff', weight: 2, fill: false, dashArray: '6 4' }}
          />
        </>
      )}
      <FlyTo cells={cells} cell={selected} />
    </MapView>
  )
}

function FlyTo({ cells, cell }: { cells: Cells; cell?: number }) {
  const map = useMap()
  useEffect(() => {
    // Fit the whole patch, so the terrain inside it is visible.
    if (cell !== undefined) map.flyToBounds(patchBounds(cells, cell), { padding: [24, 24] })
  }, [map, cells, cell])
  return null
}

/** What the colours and markers on the Discover map mean. */
export function DiscoverLegend({
  seedName,
  className = '',
}: {
  seedName: string
  className?: string
}) {
  const dot = 'inline-block size-3.5 shrink-0 rounded-full border-2'
  return (
    <div
      className={`flex flex-col gap-3 text-xs text-muted sm:flex-row sm:items-start sm:gap-8 ${className}`}
    >
      <div className="min-w-0 sm:w-64">
        <p className="mb-1.5 font-medium text-fg-2">Colour: how alike each patch is</p>
        <div
          className="h-3 rounded-full bg-[#9a9a9a]"
          style={{
            backgroundImage: `linear-gradient(to right, ${css(heat(0))}, ${css(heat(0.5))}, ${css(heat(1))})`,
          }}
        />
        <div className="mt-1 flex justify-between tabular-nums">
          <span>{SHOW_FROM}%</span>
          <span>100%</span>
        </div>
        <p className="mt-0.5">Below {SHOW_FROM}%: no colour.</p>
      </div>
      <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 sm:gap-x-6">
        <li className="flex items-center gap-2">
          <span className={`${dot} border-black bg-white`} /> Start: {seedName}
        </li>
        <li className="flex items-center gap-2">
          <span className={`${dot} border-white bg-accent`} /> New region, not on our list
        </li>
        <li className="flex items-center gap-2">
          <span className={`${dot} border-white bg-[#8e8e95]`} /> Already a known analog
        </li>
        <li className="flex items-center gap-2">
          <span className="inline-block size-3.5 shrink-0 border-2 border-dashed border-current" />{' '}
          The patch you opened
        </li>
      </ul>
    </div>
  )
}
