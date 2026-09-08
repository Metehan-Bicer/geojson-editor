import area from '@turf/area'
import length from '@turf/length'
import bbox from '@turf/bbox'
import centroid from '@turf/centroid'
import circle from '@turf/circle'
import type { Feature, FeatureCollection, Geometry, GeometryCollection, Position } from 'geojson'
import { INTERNAL_KEYS, type EditorFeature, type Props } from './types'

export function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10)
}

const nf = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 })

export function formatArea(m2: number): string {
  if (m2 < 10_000) return `${nf.format(m2)} m²`
  if (m2 < 1_000_000) return `${nf.format(m2 / 10_000)} ha`
  return `${nf.format(m2 / 1_000_000)} km²`
}

export function formatLength(m: number): string {
  if (m < 1000) return `${nf.format(m)} m`
  return `${nf.format(m / 1000)} km`
}

export function formatCoord(pos: Position): string {
  return `${pos[1].toFixed(5)}, ${pos[0].toFixed(5)}`
}

export function isCircle(f: EditorFeature): boolean {
  return f.properties?._shape === 'Circle' && typeof f.properties._radius === 'number'
}

/** Circle features are stored as a Point plus radius; this returns their polygon outline. */
export function circleToPolygon(f: EditorFeature, steps = 64): EditorFeature {
  const r = Number(f.properties._radius)
  const poly = circle(f.geometry as GeoJSON.Point, r / 1000, { steps, units: 'kilometers' })
  const { _shape: _s, _radius: _r, ...rest } = f.properties
  return { ...f, geometry: poly.geometry, properties: { ...rest, radius_m: Math.round(r) } }
}

export type GeomKind = 'point' | 'line' | 'polygon' | 'multi' | 'collection'

export function kindOf(f: EditorFeature): GeomKind {
  switch (f.geometry.type) {
    case 'Point':
      return 'point'
    case 'LineString':
      return 'line'
    case 'Polygon':
      return 'polygon'
    case 'GeometryCollection':
      return 'collection'
    default:
      return 'multi'
  }
}

export function typeName(f: EditorFeature): string {
  if (isCircle(f)) return 'Daire'
  if (f.properties?._shape === 'Rectangle' && f.geometry.type === 'Polygon') return 'Dikdörtgen'
  const names: Record<string, string> = {
    Point: 'Nokta',
    MultiPoint: 'Çoklu nokta',
    LineString: 'Çizgi',
    MultiLineString: 'Çoklu çizgi',
    Polygon: 'Alan',
    MultiPolygon: 'Çoklu alan',
    GeometryCollection: 'Geometri koleksiyonu',
  }
  return names[f.geometry.type] ?? f.geometry.type
}

export function labelOf(f: EditorFeature, index: number): string {
  const n = f.properties?.name
  if (typeof n === 'string' && n.trim()) return n
  return `${typeName(f)} ${index + 1}`
}

export interface Measurement {
  area?: number
  perimeter?: number
  length?: number
  vertices: number
  centroid: Position
  bbox: [number, number, number, number]
}

function countVertices(g: Geometry): number {
  switch (g.type) {
    case 'Point':
      return 1
    case 'MultiPoint':
    case 'LineString':
      return g.coordinates.length
    case 'MultiLineString':
    case 'Polygon':
      return g.coordinates.reduce((n, ring) => n + ring.length, 0)
    case 'MultiPolygon':
      return g.coordinates.reduce((n, poly) => n + poly.reduce((m, ring) => m + ring.length, 0), 0)
    case 'GeometryCollection':
      return g.geometries.reduce((n, gg) => n + countVertices(gg), 0)
  }
}

export function measure(f: EditorFeature): Measurement {
  const target = isCircle(f) ? circleToPolygon(f) : f
  const g = target.geometry
  const m: Measurement = {
    vertices: countVertices(f.geometry),
    centroid: centroid(target as Feature).geometry.coordinates,
    bbox: bbox(target as Feature) as [number, number, number, number],
  }
  if (g.type === 'Polygon' || g.type === 'MultiPolygon') {
    m.area = isCircle(f) ? Math.PI * Number(f.properties._radius) ** 2 : area(target as Feature)
    m.perimeter = isCircle(f) ? 2 * Math.PI * Number(f.properties._radius) : length(target as Feature, { units: 'meters' })
  } else if (g.type === 'LineString' || g.type === 'MultiLineString') {
    m.length = length(target as Feature, { units: 'meters' })
  } else if (g.type === 'GeometryCollection') {
    const polys = g.geometries.filter((x) => x.type === 'Polygon' || x.type === 'MultiPolygon')
    const lines = g.geometries.filter((x) => x.type === 'LineString' || x.type === 'MultiLineString')
    if (polys.length) m.area = polys.reduce((s, x) => s + area({ type: 'Feature', properties: {}, geometry: x }), 0)
    if (lines.length) m.length = lines.reduce((s, x) => s + length({ type: 'Feature', properties: {}, geometry: x }, { units: 'meters' }), 0)
  }
  return m
}

const GEOMETRY_TYPES = new Set(['Point', 'MultiPoint', 'LineString', 'MultiLineString', 'Polygon', 'MultiPolygon', 'GeometryCollection'])

function isGeometry(x: unknown): x is Geometry {
  if (!x || typeof x !== 'object') return false
  const t = (x as { type?: unknown }).type
  if (typeof t !== 'string' || !GEOMETRY_TYPES.has(t)) return false
  if (t === 'GeometryCollection') return Array.isArray((x as GeometryCollection).geometries)
  return Array.isArray((x as { coordinates?: unknown }).coordinates)
}

/** Accepts a FeatureCollection, Feature, bare Geometry or an array of them; returns editor features with ids. */
export function parseGeoJSON(input: unknown): EditorFeature[] {
  const out: EditorFeature[] = []
  const push = (f: Feature) => {
    if (!isGeometry(f.geometry)) throw new Error('Geçersiz geometri: eksik veya hatalı "coordinates".')
    const props = (f.properties && typeof f.properties === 'object' ? { ...(f.properties as Props) } : {}) as Props
    const id = typeof f.id === 'string' || typeof f.id === 'number' ? String(f.id) : newId()
    out.push({ type: 'Feature', id, geometry: f.geometry, properties: props })
  }
  const visit = (x: unknown) => {
    if (Array.isArray(x)) {
      x.forEach(visit)
      return
    }
    if (!x || typeof x !== 'object') throw new Error('GeoJSON bir nesne olmalı.')
    const t = (x as { type?: unknown }).type
    if (t === 'FeatureCollection') {
      const fs = (x as FeatureCollection).features
      if (!Array.isArray(fs)) throw new Error('FeatureCollection içinde "features" dizisi yok.')
      fs.forEach(push)
    } else if (t === 'Feature') push(x as Feature)
    else if (isGeometry(x)) push({ type: 'Feature', properties: {}, geometry: x })
    else throw new Error(`Tanınmayan GeoJSON türü: ${String(t)}`)
  }
  visit(input)
  if (out.length === 0) throw new Error('Dosyada hiç öğe yok.')
  return out
}

export function toCollection(features: EditorFeature[], opts: { circlesAsPolygons?: boolean; stripInternal?: boolean } = {}): FeatureCollection {
  const { circlesAsPolygons = true, stripInternal = true } = opts
  return {
    type: 'FeatureCollection',
    features: features.map((f) => {
      let out = f
      if (circlesAsPolygons && isCircle(f)) out = circleToPolygon(f)
      const props: Props = {}
      for (const [k, v] of Object.entries(out.properties ?? {})) {
        if (stripInternal && INTERNAL_KEYS.includes(k)) continue
        props[k] = v
      }
      return { type: 'Feature', id: out.id, geometry: out.geometry, properties: props }
    }),
  }
}

export function collectionBbox(features: EditorFeature[]): [number, number, number, number] | null {
  if (features.length === 0) return null
  const fc = toCollection(features)
  return bbox(fc) as [number, number, number, number]
}

export function download(filename: string, text: string, type = 'application/json') {
  const blob = new Blob([text], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
