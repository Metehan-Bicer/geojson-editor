import { useEffect, useRef, useState, type DragEvent } from 'react'
import type { EditorFeature } from '../lib/types'
import { circleToPolygon, download, isCircle, parseGeoJSON, toCollection } from '../lib/geo'
import { toWkt } from '../lib/wkt'
import { SAMPLE } from '../lib/sample'

interface Props {
  features: EditorFeature[]
  selected: EditorFeature | null
  onReplace: (features: EditorFeature[]) => void
  onAppend: (features: EditorFeature[]) => void
}

export function CodePanel({ features, selected, onReplace, onAppend }: Props) {
  const [scope, setScope] = useState<'all' | 'selected'>('all')
  const [text, setText] = useState('')
  const [dirty, setDirty] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const source = scope === 'selected' && selected ? [selected] : features
  const json = JSON.stringify(toCollection(source), null, 2)

  useEffect(() => {
    if (!dirty) setText(json)
  }, [json, dirty])

  const importText = (raw: string, mode: 'replace' | 'append') => {
    try {
      const parsed = parseGeoJSON(JSON.parse(raw))
      if (mode === 'replace') onReplace(parsed)
      else onAppend(parsed)
      setDirty(false)
      setMsg({ kind: 'ok', text: `${parsed.length} öğe ${mode === 'replace' ? 'yüklendi' : 'eklendi'}.` })
    } catch (err) {
      setMsg({ kind: 'error', text: err instanceof SyntaxError ? `JSON çözümlenemedi: ${err.message}` : (err as Error).message })
    }
  }

  const readFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return
    const file = files[0]
    file.text().then((t) => importText(t, 'append'))
  }

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(false)
    readFiles(e.dataTransfer.files)
  }

  const exportWkt = () =>
    source.map((f) => toWkt((isCircle(f) ? circleToPolygon(f) : f).geometry)).join('\n')

  const copy = async (t: string, label: string) => {
    try {
      await navigator.clipboard.writeText(t)
      setMsg({ kind: 'ok', text: label })
    } catch {
      setMsg({ kind: 'error', text: 'Panoya kopyalanamadı.' })
    }
  }

  return (
    <>
      <div className="section">
        <h2>İçe aktar</h2>
        <div className={`dropzone${dragging ? ' active' : ''}`} onDragOver={(e) => { e.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={onDrop}>
          GeoJSON dosyasını buraya bırakın
        </div>
        <div className="btn-row">
          <input ref={fileRef} type="file" accept=".json,.geojson,application/geo+json,application/json" hidden onChange={(e) => { readFiles(e.target.files); e.target.value = '' }} />
          <button type="button" className="btn" onClick={() => fileRef.current?.click()}>Dosya seç</button>
          <button type="button" className="btn" onClick={() => onReplace(SAMPLE.map((f) => ({ ...f, properties: { ...f.properties } })))}>Örnek veri yükle</button>
        </div>
      </div>

      <div className="section grow">
        <div className="inline" style={{ justifyContent: 'space-between' }}>
          <h2>GeoJSON</h2>
          <select value={scope} onChange={(e) => { setScope(e.target.value as 'all' | 'selected'); setDirty(false) }} style={{ width: 'auto', minHeight: 28 }} aria-label="Kapsam">
            <option value="all">Tüm öğeler ({features.length})</option>
            <option value="selected" disabled={!selected}>Yalnızca seçili</option>
          </select>
        </div>
        <textarea
          rows={16}
          value={text}
          spellCheck={false}
          aria-label="GeoJSON metni"
          onChange={(e) => { setText(e.target.value); setDirty(true); setMsg(null) }}
        />
        <div className="btn-row">
          <button type="button" className="btn primary" disabled={!dirty} onClick={() => importText(text, 'replace')}>Uygula (tümünü değiştir)</button>
          <button type="button" className="btn" disabled={!dirty} onClick={() => importText(text, 'append')}>Ekle</button>
          <button type="button" className="btn" disabled={!dirty} onClick={() => { setDirty(false); setText(json); setMsg(null) }}>Vazgeç</button>
        </div>
        {msg && <div className={`msg ${msg.kind}`}>{msg.text}</div>}
        <p className="label">Metni düzenleyip "Uygula" ile haritaya yansıtabilirsiniz. Daireler dışa aktarımda 64 köşeli alana dönüştürülür.</p>
      </div>

      <div className="section">
        <h2>Dışa aktar</h2>
        <div className="btn-row">
          <button type="button" className="btn" disabled={source.length === 0} onClick={() => download('cizim.geojson', json, 'application/geo+json')}>GeoJSON indir</button>
          <button type="button" className="btn" disabled={source.length === 0} onClick={() => download('cizim.wkt', exportWkt(), 'text/plain')}>WKT indir</button>
          <button type="button" className="btn" disabled={source.length === 0} onClick={() => copy(json, 'GeoJSON panoya kopyalandı.')}>GeoJSON kopyala</button>
          <button type="button" className="btn" disabled={source.length === 0} onClick={() => copy(exportWkt(), 'WKT panoya kopyalandı.')}>WKT kopyala</button>
        </div>
      </div>
    </>
  )
}
