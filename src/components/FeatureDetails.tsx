import { useState } from 'react'
import buffer from '@turf/buffer'
import simplify from '@turf/simplify'
import type { Feature } from 'geojson'
import { INTERNAL_KEYS, type EditorFeature, type Props as FProps } from '../lib/types'
import { circleToPolygon, formatArea, formatCoord, formatLength, isCircle, measure, newId, typeName } from '../lib/geo'
import { toWkt } from '../lib/wkt'

interface Props {
  feature: EditorFeature
  onChange: (next: EditorFeature) => void
  onAdd: (f: EditorFeature) => void
  onDelete: (id: string) => void
  onZoom: (f: EditorFeature) => void
}

function str(v: unknown, d = ''): string {
  return typeof v === 'string' ? v : v === undefined || v === null ? d : String(v)
}

export function FeatureDetails({ feature, onChange, onAdd, onDelete, onZoom }: Props) {
  const [bufferM, setBufferM] = useState(500)
  const [tolerance, setTolerance] = useState(0.001)
  const [newKey, setNewKey] = useState('')
  const [copied, setCopied] = useState<string | null>(null)
  const m = measure(feature)
  const props = feature.properties ?? {}
  const isPoint = feature.geometry.type === 'Point' && !isCircle(feature)
  const isLine = feature.geometry.type === 'LineString' || feature.geometry.type === 'MultiLineString'
  const isArea = m.area !== undefined

  const setProp = (k: string, v: unknown) => onChange({ ...feature, properties: { ...props, [k]: v } })
  const delProp = (k: string) => {
    const { [k]: _removed, ...rest } = props
    onChange({ ...feature, properties: rest })
  }
  const renameProp = (from: string, to: string) => {
    if (!to || to === from || to in props) return
    const next: FProps = {}
    for (const [k, v] of Object.entries(props)) next[k === from ? to : k] = v
    onChange({ ...feature, properties: next })
  }

  const copy = async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(label)
      setTimeout(() => setCopied(null), 1500)
    } catch {
      setCopied('Kopyalanamadı')
    }
  }

  const addBuffer = () => {
    const src = isCircle(feature) ? circleToPolygon(feature) : feature
    const out = buffer(src as Feature, bufferM, { units: 'meters' })
    if (!out) return
    onAdd({ type: 'Feature', id: newId(), geometry: out.geometry, properties: { name: `${str(props.name, typeName(feature))} (+${bufferM} m)`, stroke: '#7c3aed', fill: '#7c3aed', 'fill-opacity': 0.15 } })
  }
  const doSimplify = () => {
    if (isPoint || isCircle(feature)) return
    const out = simplify(feature as Feature, { tolerance, highQuality: true })
    onChange({ ...feature, geometry: out.geometry })
  }
  const addCentroid = () => {
    onAdd({ type: 'Feature', id: newId(), geometry: { type: 'Point', coordinates: m.centroid }, properties: { name: `${str(props.name, typeName(feature))} merkezi`, 'marker-color': '#0f766e' } })
  }
  const duplicate = () => {
    onAdd({ ...feature, id: newId(), properties: { ...props, name: `${str(props.name, typeName(feature))} kopyası` } })
  }
  const toPolygon = () => onChange(circleToPolygon(feature))

  const userKeys = Object.keys(props).filter((k) => !INTERNAL_KEYS.includes(k))

  return (
    <>
      <div className="section">
        <div className="control">
          <label htmlFor="fname">Ad</label>
          <input id="fname" type="text" value={str(props.name)} placeholder={typeName(feature)} onChange={(e) => setProp('name', e.target.value)} />
        </div>
        <div className="btn-row">
          <button type="button" className="btn small" onClick={() => onZoom(feature)}>Yakınlaştır</button>
          <button type="button" className="btn small" onClick={duplicate}>Kopyala</button>
          {isCircle(feature) && <button type="button" className="btn small" onClick={toPolygon}>Alana dönüştür</button>}
          <button type="button" className="btn small danger" onClick={() => onDelete(feature.id)}>Sil</button>
        </div>
      </div>

      <div className="section">
        <h2>Ölçümler</h2>
        <dl className="kv">
          <dt>Tür</dt><dd>{typeName(feature)}</dd>
          {isArea && <><dt>Alan</dt><dd>{formatArea(m.area!)}</dd></>}
          {m.perimeter !== undefined && <><dt>Çevre</dt><dd>{formatLength(m.perimeter)}</dd></>}
          {m.length !== undefined && <><dt>Uzunluk</dt><dd>{formatLength(m.length)}</dd></>}
          {isCircle(feature) && <><dt>Yarıçap</dt><dd>{formatLength(Number(props._radius))}</dd></>}
          <dt>Köşe sayısı</dt><dd>{m.vertices}</dd>
          <dt>Merkez</dt><dd>{formatCoord(m.centroid)}</dd>
          {!isPoint && <><dt>Sınır kutusu</dt><dd>{m.bbox.map((v) => v.toFixed(4)).join(', ')}</dd></>}
        </dl>
        <div className="btn-row">
          <button type="button" className="btn small" onClick={() => copy('GeoJSON kopyalandı', JSON.stringify({ ...feature, properties: Object.fromEntries(userKeys.map((k) => [k, props[k]])) }, null, 2))}>GeoJSON kopyala</button>
          <button type="button" className="btn small" onClick={() => copy('WKT kopyalandı', toWkt((isCircle(feature) ? circleToPolygon(feature) : feature).geometry))}>WKT kopyala</button>
          {copied && <span className="label">{copied}</span>}
        </div>
      </div>

      <div className="section">
        <h2>Görünüm</h2>
        {isPoint ? (
          <div className="inline">
            <label className="label" htmlFor="mcolor">İşaret rengi</label>
            <input id="mcolor" type="color" value={str(props['marker-color'], '#2563eb')} onChange={(e) => setProp('marker-color', e.target.value)} />
          </div>
        ) : (
          <>
            <div className="control-row">
              <div className="inline">
                <label className="label" htmlFor="stroke">Çizgi</label>
                <input id="stroke" type="color" value={str(props.stroke, '#2563eb')} onChange={(e) => setProp('stroke', e.target.value)} />
              </div>
              {!isLine && (
                <div className="inline">
                  <label className="label" htmlFor="fill">Dolgu</label>
                  <input id="fill" type="color" value={str(props.fill, str(props.stroke, '#2563eb'))} onChange={(e) => setProp('fill', e.target.value)} />
                </div>
              )}
            </div>
            <div className="control">
              <label htmlFor="sw">Çizgi kalınlığı: {Number(props['stroke-width'] ?? 2)} px</label>
              <input id="sw" type="range" min={1} max={10} step={1} value={Number(props['stroke-width'] ?? 2)} onChange={(e) => setProp('stroke-width', Number(e.target.value))} />
            </div>
            {!isLine && (
              <div className="control">
                <label htmlFor="fo">Dolgu saydamlığı: {Math.round(Number(props['fill-opacity'] ?? 0.2) * 100)}%</label>
                <input id="fo" type="range" min={0} max={1} step={0.05} value={Number(props['fill-opacity'] ?? 0.2)} onChange={(e) => setProp('fill-opacity', Number(e.target.value))} />
              </div>
            )}
          </>
        )}
      </div>

      <div className="section">
        <h2>Özellikler</h2>
        <table className="props">
          <tbody>
            {userKeys.map((k) => (
              <tr key={k}>
                <td><input type="text" defaultValue={k} aria-label="Anahtar" onBlur={(e) => renameProp(k, e.target.value.trim())} /></td>
                <td><input type="text" value={str(props[k])} aria-label="Değer" onChange={(e) => setProp(k, e.target.value)} /></td>
                <td><button type="button" className="iconbtn" aria-label={`${k} özelliğini sil`} onClick={() => delProp(k)}>✕</button></td>
              </tr>
            ))}
            <tr>
              <td><input type="text" placeholder="yeni anahtar" value={newKey} aria-label="Yeni anahtar" onChange={(e) => setNewKey(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && newKey.trim()) { setProp(newKey.trim(), ''); setNewKey('') } }} /></td>
              <td colSpan={2}><button type="button" className="btn small" disabled={!newKey.trim() || newKey.trim() in props} onClick={() => { setProp(newKey.trim(), ''); setNewKey('') }}>Ekle</button></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="section">
        <h2>Araçlar</h2>
        <div className="inline">
          <label className="label" htmlFor="buf">Tampon (m)</label>
          <input id="buf" type="number" min={1} step={50} value={bufferM} style={{ width: 100 }} onChange={(e) => setBufferM(Number(e.target.value))} />
          <button type="button" className="btn small" onClick={addBuffer}>Tampon oluştur</button>
        </div>
        {!isPoint && !isCircle(feature) && (
          <div className="inline">
            <label className="label" htmlFor="tol">Basitleştir (tolerans °)</label>
            <input id="tol" type="number" min={0.00001} step={0.0005} value={tolerance} style={{ width: 110 }} onChange={(e) => setTolerance(Number(e.target.value))} />
            <button type="button" className="btn small" onClick={doSimplify}>Uygula</button>
          </div>
        )}
        <div className="inline">
          <button type="button" className="btn small" onClick={addCentroid}>Merkez noktası ekle</button>
        </div>
      </div>
    </>
  )
}
