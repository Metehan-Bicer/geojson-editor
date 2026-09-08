import type { EditorFeature } from '../lib/types'
import { formatArea, formatLength, kindOf, labelOf, measure, typeName } from '../lib/geo'

interface Props {
  features: EditorFeature[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  onZoom: (f: EditorFeature) => void
  onDelete: (id: string) => void
}

function swatchColor(f: EditorFeature): string {
  const p = f.properties ?? {}
  const c = f.geometry.type === 'Point' && !p._shape ? p['marker-color'] : (p.fill ?? p.stroke)
  return typeof c === 'string' ? c : '#2563eb'
}

function summary(f: EditorFeature): string {
  const m = measure(f)
  if (m.area !== undefined) return formatArea(m.area)
  if (m.length !== undefined) return formatLength(m.length)
  return `${m.centroid[1].toFixed(4)}, ${m.centroid[0].toFixed(4)}`
}

export function FeatureList({ features, selectedId, onSelect, onZoom, onDelete }: Props) {
  if (features.length === 0) {
    return <div className="empty">Henüz öğe yok. Üstteki araçlarla çizmeye başlayın ya da GeoJSON sekmesinden dosya yükleyin.</div>
  }
  return (
    <ul className="flist" aria-label="Öğeler">
      {features.map((f, i) => (
        <li key={f.id}>
          <div className="frow" aria-current={f.id === selectedId} onClick={() => onSelect(f.id === selectedId ? null : f.id)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(f.id) } }}>
            <span className={`swatch ${kindOf(f)}`} style={{ background: swatchColor(f) }} />
            <span>
              <div className="name">{labelOf(f, i)}</div>
              <div className="meta">{typeName(f)} · {summary(f)}</div>
            </span>
            <span className="actions">
              <button type="button" className="iconbtn" title="Yakınlaştır" onClick={(e) => { e.stopPropagation(); onZoom(f) }} aria-label="Yakınlaştır">⌖</button>
              <button type="button" className="iconbtn" title="Sil" onClick={(e) => { e.stopPropagation(); onDelete(f.id) }} aria-label="Sil">✕</button>
            </span>
          </div>
        </li>
      ))}
    </ul>
  )
}
