import 'leaflet/dist/leaflet.css'
import L, { type LatLngBoundsExpression, type LatLngExpression, type PathOptions } from 'leaflet'
import { use, useCallback, useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { LayerContext, MapContext, useMap } from '../hooks/useMap'

interface MapViewProps {
  /** Initial center and zoom. Leaflet reads them once on mount. */
  center?: LatLngExpression
  zoom?: number
  /** Initial base layer: OpenStreetMap streets, or Sentinel-2 cloud-free satellite imagery (10 m). */
  basemap?: 'streets' | 'satellite'
  /** Give the map a height here (e.g. "h-96"); Leaflet needs one. */
  className?: string
  /** Map layers from this file: CircleMarker, ImageOverlay, ... */
  children?: ReactNode
}

/**
 * Leaflet map with an OpenStreetMap and a Sentinel-2 satellite basemap, switchable from the layers
 * control in the top-right corner.
 */
export function MapView({
  center = [20, 0],
  zoom = 2,
  basemap = 'streets',
  className = 'h-96',
  children,
}: MapViewProps) {
  const [initial] = useState({ center, zoom, basemap })
  const [map, setMap] = useState<L.Map | null>(null)

  const container = useCallback(
    (el: HTMLDivElement | null) => {
      if (!el) return
      const m = L.map(el, {
        center: initial.center,
        zoom: initial.zoom,
        minZoom: 1,
        worldCopyJump: true,
      })
      const streets = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        className: 'basemap-osm',
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      })
      // The 2016 mosaic: CC BY 4.0. EOX's later years are CC BY-NC-SA, which Space Apps rules out.
      const satellite = L.tileLayer(
        'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless_3857/default/g/{z}/{y}/{x}.jpg',
        {
          attribution:
            '<a href="https://cloudless.eox.at">EOxCloudless</a> by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2016 &amp; 2017)',
          maxNativeZoom: 14,
          maxZoom: 19,
        },
      )
      ;(initial.basemap === 'satellite' ? satellite : streets).addTo(m)
      const overlays = Object.fromEntries(
        LST_MONTHS.map(({ label, date }) => [
          `Ground temperature, ${label}`,
          surfaceTemperature(date),
        ]),
      )
      L.control
        .layers({ OpenStreetMap: streets, 'Sentinel-2 satellite': satellite }, overlays, {
          position: 'topright',
        })
        .addTo(m)
      const legend = new L.Control({ position: 'bottomright' })
      legend.onAdd = () => {
        const img = L.DomUtil.create('img', 'map-legend')
        img.src = 'https://gibs.earthdata.nasa.gov/legends/MODIS_Land_Surface_Temp_H.svg'
        img.alt = 'Ground temperature colour scale, kelvin'
        img.width = 300
        return img
      }
      const shown = new Set<L.Layer>()
      m.on('overlayadd', (ev) => {
        if (shown.add(ev.layer).size === 1) legend.addTo(m)
      })
      m.on('overlayremove', (ev) => {
        shown.delete(ev.layer)
        if (shown.size === 0) legend.remove()
      })
      L.control.scale({ position: 'bottomleft' }).addTo(m)
      setMap(m)
      return () => {
        m.remove()
        setMap(null)
      }
    },
    [initial],
  )

  return (
    <>
      <div
        ref={container}
        className={`isolate w-full overflow-hidden rounded-xl border border-border ${className}`}
      />
      {map && <MapContext value={map}>{children}</MapContext>}
    </>
  )
}

/** Months offered for NASA's monthly ground temperature layer: southern and northern winter. */
const LST_MONTHS = [
  { label: 'Jan 2026', date: '2026-01-01' },
  { label: 'Jul 2026', date: '2026-07-01' },
]

/**
 * MODIS Terra daytime land surface temperature, monthly (NASA GIBS, the imagery behind NASA
 * Worldview). It measures the ground itself, like LRO Diviner on the Moon.
 */
function surfaceTemperature(date: string) {
  return L.tileLayer(
    `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_L3_Land_Surface_Temp_Monthly_CMG_Day_TES/default/${date}/GoogleMapsCompatible_Level6/{z}/{y}/{x}.png`,
    {
      attribution:
        'Ground temperature: NASA <a href="https://worldview.earthdata.nasa.gov">Worldview</a>/GIBS, MODIS Terra',
      maxNativeZoom: 6,
      maxZoom: 19,
      opacity: 0.75,
    },
  )
}

/** Adds `layer` to the map while mounted. */
function useOnMap(layer: L.Layer) {
  const map = useMap()
  useEffect(() => {
    layer.addTo(map)
    return () => {
      layer.remove()
    }
  }, [map, layer])
}

export function CircleMarker({
  center,
  radius,
  pathOptions,
  eventHandlers,
  children,
}: {
  center: LatLngExpression
  radius: number
  pathOptions?: PathOptions
  eventHandlers?: L.LeafletEventHandlerFnMap
  children?: ReactNode
}) {
  const [layer] = useState(() => L.circleMarker(center, { radius, ...pathOptions }))
  useOnMap(layer)
  useEffect(() => {
    layer.setLatLng(center)
  }, [layer, center])
  useEffect(() => {
    layer.setRadius(radius)
  }, [layer, radius])
  useEffect(() => {
    if (pathOptions) layer.setStyle(pathOptions)
  }, [layer, pathOptions])
  useEffect(() => {
    if (!eventHandlers) return
    layer.on(eventHandlers)
    return () => {
      layer.off(eventHandlers)
    }
  }, [layer, eventHandlers])
  return <LayerContext value={layer}>{children}</LayerContext>
}

/** A tooltip on the enclosing CircleMarker; its children render into the tooltip. */
export function Tooltip({
  permanent,
  direction,
  offset,
  children,
}: {
  permanent?: boolean
  direction?: L.Direction
  offset?: L.PointExpression
  children?: ReactNode
}) {
  const layer = use(LayerContext)
  const [content] = useState(() => document.createElement('div'))
  const [tooltip] = useState(() => L.tooltip({ permanent, direction, ...(offset && { offset }) }))
  useEffect(() => {
    if (!layer) return
    tooltip.setContent(content)
    layer.bindTooltip(tooltip)
    return () => {
      layer.unbindTooltip()
    }
  }, [layer, tooltip, content])
  useEffect(() => {
    tooltip.update()
  })
  return createPortal(children, content)
}

export function ImageOverlay({
  url,
  bounds,
  opacity,
}: {
  url: string
  bounds: LatLngBoundsExpression
  opacity?: number
}) {
  const [layer] = useState(() => L.imageOverlay(url, bounds, { opacity }))
  useOnMap(layer)
  useEffect(() => {
    layer.setUrl(url)
  }, [layer, url])
  return null
}
