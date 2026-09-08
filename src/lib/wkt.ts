import type { Geometry, Position } from 'geojson'

const pos = (p: Position) => `${p[0]} ${p[1]}`
const ring = (r: Position[]) => `(${r.map(pos).join(', ')})`

export function toWkt(g: Geometry): string {
  switch (g.type) {
    case 'Point':
      return `POINT (${pos(g.coordinates)})`
    case 'MultiPoint':
      return `MULTIPOINT (${g.coordinates.map((p) => `(${pos(p)})`).join(', ')})`
    case 'LineString':
      return `LINESTRING ${ring(g.coordinates)}`
    case 'MultiLineString':
      return `MULTILINESTRING (${g.coordinates.map(ring).join(', ')})`
    case 'Polygon':
      return `POLYGON (${g.coordinates.map(ring).join(', ')})`
    case 'MultiPolygon':
      return `MULTIPOLYGON (${g.coordinates.map((poly) => `(${poly.map(ring).join(', ')})`).join(', ')})`
    case 'GeometryCollection':
      return `GEOMETRYCOLLECTION (${g.geometries.map(toWkt).join(', ')})`
  }
}
