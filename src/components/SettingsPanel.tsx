import { useEffect, useState } from 'react'
import { BASEMAPS, type BasemapId } from '../lib/types'

interface Props {
  basemap: BasemapId
  onBasemap: (b: BasemapId) => void
  snapping: boolean
  onSnapping: (v: boolean) => void
  onGoTo: (bbox: [number, number, number, number]) => void
  onClearAll: () => void
  count: number
}

interface Hit {
  display_name: string
  boundingbox: [string, string, string, string]
}

export function SettingsPanel({ basemap, onBasemap, snapping, onSnapping, onGoTo, onClearAll, count }: Props) {
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<Hit[]>([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (q.trim().length < 3) {
      setHits([])
      return
    }
    const ctrl = new AbortController()
    const t = window.setTimeout(async () => {
      setBusy(true)
      setErr(null)
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&accept-language=tr&q=${encodeURIComponent(q.trim())}`
        const res = await fetch(url, { signal: ctrl.signal })
        if (!res.ok) throw new Error(`Arama servisi ${res.status}`)
        setHits((await res.json()) as Hit[])
      } catch (e) {
        if (!ctrl.signal.aborted) setErr((e as Error).message)
      } finally {
        if (!ctrl.signal.aborted) setBusy(false)
      }
    }, 450)
    return () => {
      window.clearTimeout(t)
      ctrl.abort()
    }
  }, [q])

  return (
    <>
      <div className="section">
        <h2>Konuma git</h2>
        <input type="search" placeholder="Şehir, ilçe, adres…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Konum ara" />
        {busy && <span className="label">Aranıyor…</span>}
        {err && <div className="msg error">{err}</div>}
        {hits.length > 0 && (
          <ul className="search-results">
            {hits.map((h, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => {
                    const [s, n, w, e] = h.boundingbox.map(Number)
                    onGoTo([w, s, e, n])
                    setHits([])
                  }}
                >
                  {h.display_name}
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="label">Arama OpenStreetMap Nominatim servisini kullanır.</p>
      </div>

      <div className="section">
        <h2>Harita</h2>
        <div className="control">
          <label htmlFor="basemap">Altlık</label>
          <select id="basemap" value={basemap} onChange={(e) => onBasemap(e.target.value as BasemapId)}>
            {(Object.keys(BASEMAPS) as BasemapId[]).map((id) => (
              <option key={id} value={id}>{BASEMAPS[id].name}</option>
            ))}
          </select>
        </div>
        <label className="check">
          <input type="checkbox" checked={snapping} onChange={(e) => onSnapping(e.target.checked)} />
          Çizerken köşelere yapıştır
        </label>
      </div>

      <div className="section">
        <h2>Klavye kısayolları</h2>
        <dl className="kv">
          <dt>V / M / L / P / R / C</dt><dd>Seç, nokta, çizgi, alan, dikdörtgen, daire</dd>
          <dt>D / O / X / E</dt><dd>Taşı, döndür, kes, sil modu</dd>
          <dt>S / F</dt><dd>Yapıştırmayı aç-kapat, tümünü sığdır</dd>
          <dt>Esc</dt><dd>Çizimi iptal et, seçime dön</dd>
          <dt>Delete</dt><dd>Seçili öğeyi sil</dd>
          <dt>Ctrl+Z / Ctrl+Y</dt><dd>Geri al / yinele</dd>
        </dl>
      </div>

      <div className="section">
        <h2>Veri</h2>
        <p className="label">Çizimler tarayıcıda otomatik kaydedilir ({count} öğe).</p>
        <div className="btn-row">
          <button type="button" className="btn danger" disabled={count === 0} onClick={() => { if (window.confirm('Tüm öğeler silinsin mi?')) onClearAll() }}>Tümünü sil</button>
        </div>
      </div>
    </>
  )
}
