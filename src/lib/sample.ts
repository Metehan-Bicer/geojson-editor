import type { EditorFeature } from './types'

export const SAMPLE: EditorFeature[] = [
  {
    type: 'Feature',
    id: 'ornek-1',
    properties: { name: 'Salda Gölü çevresi', kategori: 'göl', fill: '#2563eb', 'fill-opacity': 0.2, stroke: '#2563eb' },
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [29.66, 37.575],
          [29.72, 37.585],
          [29.74, 37.545],
          [29.71, 37.51],
          [29.66, 37.515],
          [29.64, 37.55],
          [29.66, 37.575],
        ],
      ],
    },
  },
  {
    type: 'Feature',
    id: 'ornek-2',
    properties: { name: 'Anıtkabir', kategori: 'anıt', 'marker-color': '#dc2626' },
    geometry: { type: 'Point', coordinates: [32.8369, 39.9252] },
  },
  {
    type: 'Feature',
    id: 'ornek-3',
    properties: { name: 'Bursa–Uludağ hattı', kategori: 'rota', stroke: '#16a34a', 'stroke-width': 3 },
    geometry: {
      type: 'LineString',
      coordinates: [
        [29.06, 40.19],
        [29.09, 40.15],
        [29.12, 40.11],
        [29.17, 40.08],
        [29.22, 40.07],
      ],
    },
  },
  {
    type: 'Feature',
    id: 'ornek-4',
    properties: { name: 'Tuz Gölü tampon', _shape: 'Circle', _radius: 25000, fill: '#f59e0b', stroke: '#d97706', 'fill-opacity': 0.15 },
    geometry: { type: 'Point', coordinates: [33.35, 38.75] },
  },
]
