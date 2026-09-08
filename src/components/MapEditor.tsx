import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import '@geoman-io/leaflet-geoman-free'
import type { Feature, Point } from 'geojson'
import { BASEMAPS, type BasemapId, type EditorFeature, type Props as FProps, type Tool } from '../lib/types'
import { isCircle, newId } from '../lib/geo'

interface Props {
  features: EditorFeature[]
  /** Incremented whenever features change outside the map; triggers a full layer rebuild. */
  version: number
  selectedId: string | null
  onSelect: (id: string | null) => void
  tool: Tool
  onToolDone: () => void
  onMapChange: (updater: (prev: EditorFeature[]) => EditorFeature[]) => void
  snapping: boolean
  basemap: BasemapId
  focus: { bbox: [number, number, number, number]; key: number } | null
  hint: string | null
}

type FLayer = L.Layer & { feature?: Feature; pm?: L.PM.PMLayer }

function num(v: unknown, d: number): number {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN
  return Number.isFinite(n) ? n : d
}

function pinIcon(color: string): L.DivIcon {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="36" viewBox="0 0 26 36"><path d="M13 1C6.4 1 1 6.3 1 12.8 1 21.6 13 35 13 35s12-13.4 12-22.2C25 6.3 19.6 1 13 1z" fill="${color}" stroke="#fff" stroke-width="2"/><circle cx="13" cy="13" r="4.5" fill="#fff"/></svg>`
  return L.divIcon({ html: svg, className: 'pin', iconSize: [26, 36], iconAnchor: [13, 35], popupAnchor: [0, -30] })
}

function markerColor(f: EditorFeature): string {
  const c = f.properties?.['marker-color']
  return typeof c === 'string' ? c : '#2563eb'
}

function styleFor(f: EditorFeature, selected: boolean): L.PathOptions {
  const p = f.properties ?? {}
  const stroke = typeof p.stroke === 'string' ? p.stroke : '#2563eb'
  const filled = f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon' || isCircle(f) || f.geometry.type === 'GeometryCollection'
  return {
    color: stroke,
    weight: num(p['stroke-width'], 2) + (selected ? 2 : 0),
    opacity: num(p['stroke-opacity'], 1),
    fillColor: typeof p.fill === 'string' ? p.fill : stroke,
    fillOpacity: filled ? num(p['fill-opacity'], 0.2) : 0,
  }
}

function buildLayer(f: EditorFeature, selected: boolean): FLayer {
  let layer: FLayer
  if (isCircle(f)) {
    const [lng, lat] = (f.geometry as Point).coordinates
    layer = L.circle([lat, lng], { radius: Number(f.properties._radius), ...styleFor(f, selected) })
  } else if (f.geometry.type === 'Point') {
    const [lng, lat] = f.geometry.coordinates
    layer = L.marker([lat, lng], { icon: pinIcon(markerColor(f)) })
  } else {
    layer = L.GeoJSON.geometryToLayer(f as Feature, {
      style: () => styleFor(f, selected),
      pointToLayer: (_pt, latlng) => L.marker(latlng, { icon: pinIcon(markerColor(f)) }),
    })
  }
  layer.feature = f
  return layer
}

function layerToFeature(layer: FLayer, base: EditorFeature): EditorFeature {
  if (layer instanceof L.Circle) {
    const c = layer.getLatLng()
    return {
      ...base,
      geometry: { type: 'Point', coordinates: [+c.lng.toFixed(7), +c.lat.toFixed(7)] },
      properties: { ...base.properties, _shape: 'Circle', _radius: Math.round(layer.getRadius()) },
    }
  }
  layer.feature = base
  const gj = (layer as L.Layer & { toGeoJSON: (p?: number) => Feature | GeoJSON.FeatureCollection }).toGeoJSON(7)
  if (gj.type === 'Feature') return { ...base, geometry: gj.geometry }
  return { ...base, geometry: { type: 'GeometryCollection', geometries: gj.features.map((x) => x.geometry) } }
}

export function MapEditor({ features, version, selectedId, onSelect, tool, onToolDone, onMapChange, snapping, basemap, focus, hint }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const groupRef = useRef<L.FeatureGroup | null>(null)
  const baseRef = useRef<L.TileLayer | null>(null)
  const layersRef = useRef<globalThis.Map<string, FLayer>>(new globalThis.Map())
  const toolRef = useRef(tool)
  const cbRef = useRef({ onSelect, onMapChange, onToolDone })
  const [cursor, setCursor] = useState<{ lat: number; lng: number } | null>(null)
  const [zoom, setZoom] = useState(6)
  toolRef.current = tool
  cbRef.current = { onSelect, onMapChange, onToolDone }

  const syncLayer = (layer: FLayer, id: string) => {
    cbRef.current.onMapChange((prev) => prev.map((f) => (f.id === id ? layerToFeature(layer, f) : f)))
  }

  const attach = (layer: FLayer, id: string) => {
    layer.on('click', (e) => {
      L.DomEvent.stopPropagation(e as L.LeafletEvent)
      if (toolRef.current === 'select') cbRef.current.onSelect(id)
    })
    const sync = () => syncLayer(layer, id)
    layer.on('pm:edit', sync)
    layer.on('pm:dragend', sync)
    layer.on('pm:rotateend', sync)
  }

  // Create the map once.
  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const map = L.map(host, { center: [39, 35], zoom: 6, zoomControl: true })
    L.control.scale({ metric: true, imperial: false }).addTo(map)
    const group = L.featureGroup().addTo(map)
    map.pm.setLang('tr')
    map.pm.setGlobalOptions({
      layerGroup: group,
      snappable: snapping,
      snapDistance: 20,
      allowSelfIntersection: false,
      pathOptions: styleFor({ type: 'Feature', id: '', properties: {}, geometry: { type: 'Polygon', coordinates: [] } }, false),
      markerStyle: { icon: pinIcon('#2563eb') },
      templineStyle: { color: '#2563eb', dashArray: '5 5' },
      hintlineStyle: { color: '#2563eb', dashArray: '5 5' },
    })

    map.on('pm:create', (e) => {
      const layer = e.layer as FLayer
      const id = newId()
      const props: FProps = {}
      if (e.shape === 'Circle') props._shape = 'Circle'
      if (e.shape === 'Rectangle') props._shape = 'Rectangle'
      const base: EditorFeature = { type: 'Feature', id, properties: props, geometry: { type: 'Point', coordinates: [0, 0] } }
      const feature = layerToFeature(layer, base)
      layer.feature = feature
      layersRef.current.set(id, layer)
      attach(layer, id)
      cbRef.current.onMapChange((prev) => [...prev, feature])
      cbRef.current.onToolDone()
      cbRef.current.onSelect(id)
    })
    map.on('pm:remove', (e) => {
      const id = (e.layer as FLayer).feature?.id
      if (typeof id !== 'string') return
      layersRef.current.delete(id)
      cbRef.current.onMapChange((prev) => prev.filter((f) => f.id !== id))
      cbRef.current.onSelect(null)
    })
    map.on('pm:cut', (e) => {
      const orig = e.originalLayer as FLayer
      const id = orig.feature?.id
      if (typeof id !== 'string') return
      const layer = e.layer as FLayer
      layer.feature = orig.feature
      layersRef.current.set(id, layer)
      attach(layer, id)
      syncLayer(layer, id)
    })
    map.on('click', () => {
      if (toolRef.current === 'select') cbRef.current.onSelect(null)
    })
    map.on('mousemove', (e) => setCursor({ lat: e.latlng.lat, lng: e.latlng.lng }))
    map.on('mouseout', () => setCursor(null))
    map.on('zoomend', () => setZoom(map.getZoom()))

    mapRef.current = map
    groupRef.current = group
    return () => {
      map.remove()
      mapRef.current = null
      groupRef.current = null
      layersRef.current.clear()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Basemap
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    baseRef.current?.remove()
    const b = BASEMAPS[basemap]
    baseRef.current = L.tileLayer(b.url, { attribution: b.attribution, maxZoom: b.maxZoom }).addTo(map)
    baseRef.current.bringToBack()
  }, [basemap])

  // Rebuild layers after external changes (import, undo, property edits...).
  useEffect(() => {
    const group = groupRef.current
    if (!group) return
    group.clearLayers()
    layersRef.current.clear()
    for (const f of features) {
      const layer = buildLayer(f, f.id === selectedId)
      attach(layer, f.id)
      layersRef.current.set(f.id, layer)
      group.addLayer(layer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version])

  // Selection: highlight and enable vertex editing on the selected layer while in select mode.
  useEffect(() => {
    for (const [id, layer] of layersRef.current) {
      const f = layer.feature as EditorFeature | undefined
      const selected = id === selectedId
      if (layer.pm?.enabled()) layer.pm.disable()
      if (f && layer instanceof L.Path) layer.setStyle(styleFor(f, selected))
      if (selected) {
        if (layer instanceof L.Path) layer.bringToFront()
        if (tool === 'select') layer.pm?.enable({ allowSelfIntersection: false })
      }
    }
  }, [selectedId, tool, version])

  // Tool modes
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const pm = map.pm
    pm.disableDraw()
    if (pm.globalDragModeEnabled()) pm.disableGlobalDragMode()
    if (pm.globalRemovalModeEnabled()) pm.disableGlobalRemovalMode()
    if (pm.globalCutModeEnabled()) pm.disableGlobalCutMode()
    if (pm.globalRotateModeEnabled()) pm.disableGlobalRotateMode()
    const draw: Partial<Record<Tool, 'Marker' | 'Line' | 'Polygon' | 'Rectangle' | 'Circle'>> = {
      marker: 'Marker',
      line: 'Line',
      polygon: 'Polygon',
      rectangle: 'Rectangle',
      circle: 'Circle',
    }
    const shape = draw[tool]
    if (shape) pm.enableDraw(shape, { snappable: snapping, snapDistance: 20, allowSelfIntersection: false, continueDrawing: false })
    else if (tool === 'drag') pm.enableGlobalDragMode()
    else if (tool === 'rotate') pm.enableGlobalRotateMode()
    else if (tool === 'cut') pm.enableGlobalCutMode({ allowSelfIntersection: false })
    else if (tool === 'remove') pm.enableGlobalRemovalMode()
  }, [tool, snapping])

  useEffect(() => {
    mapRef.current?.pm.setGlobalOptions({ snappable: snapping })
  }, [snapping])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !focus) return
    const [w, s, e, n] = focus.bbox
    map.fitBounds(
      [
        [s, w],
        [n, e],
      ],
      { padding: [40, 40], maxZoom: 16 },
    )
  }, [focus])

  return (
    <div className="map-area">
      <div ref={hostRef} className="map" />
      {hint && <div className="hint">{hint}</div>}
      <div className="statusbar" aria-live="off">
        <span>{cursor ? `${cursor.lat.toFixed(5)}, ${cursor.lng.toFixed(5)}` : 'Enlem, boylam'}</span>
        <span>Zoom {zoom}</span>
      </div>
    </div>
  )
}
