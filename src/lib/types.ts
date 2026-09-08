import type { Feature, Geometry } from 'geojson'

export type Props = Record<string, unknown>
export type EditorFeature = Feature<Geometry, Props> & { id: string }

export type Tool = 'select' | 'marker' | 'line' | 'polygon' | 'rectangle' | 'circle' | 'drag' | 'rotate' | 'cut' | 'remove'

export type BasemapId = 'osm' | 'light' | 'satellite'

export const BASEMAPS: Record<BasemapId, { name: string; url: string; attribution: string; maxZoom: number }> = {
  osm: {
    name: 'OpenStreetMap',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> katkıda bulunanlar',
    maxZoom: 19,
  },
  light: {
    name: 'Açık (CARTO)',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
    maxZoom: 20,
  },
  satellite: {
    name: 'Uydu (Esri)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Esri, Maxar, Earthstar Geographics',
    maxZoom: 19,
  },
}

/** Internal property keys that never reach the export. */
export const INTERNAL_KEYS = ['_shape', '_radius']
