import type L from 'leaflet'
import { createContext, use } from 'react'

export const MapContext = createContext<L.Map | null>(null)
/** The layer a Tooltip binds to. */
export const LayerContext = createContext<L.Layer | null>(null)

/** The Leaflet map of the enclosing MapView. */
export function useMap(): L.Map {
  const map = use(MapContext)
  if (!map) throw new Error('useMap must be used inside a MapView')
  return map
}
