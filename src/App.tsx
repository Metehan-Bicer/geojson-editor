import { useCallback, useEffect, useMemo, useState } from 'react'
import { MapEditor } from './components/MapEditor'
import { Toolbar } from './components/Toolbar'
import { FeatureList } from './components/FeatureList'
import { FeatureDetails } from './components/FeatureDetails'
import { CodePanel } from './components/CodePanel'
import { SettingsPanel } from './components/SettingsPanel'
import { useHistory } from './hooks/useHistory'
import { collectionBbox, formatArea, formatLength, measure } from './lib/geo'
import { loadFeatures, saveFeatures } from './lib/storage'
import { SAMPLE } from './lib/sample'
import type { BasemapId, EditorFeature, Tool } from './lib/types'

type Tab = 'features' | 'code' | 'settings'

const HINTS: Partial<Record<Tool, string>> = {
  marker: 'Haritaya tıklayarak nokta ekleyin',
  line: 'Tıklayarak köşe ekleyin, son köşeye tekrar tıklayarak bitirin',
  polygon: 'Tıklayarak köşe ekleyin, ilk köşeye tıklayarak kapatın',
  rectangle: 'İki köşeye tıklayın',
  circle: 'Merkeze tıklayın, sonra yarıçapı belirleyin',
  drag: 'Bir öğeyi sürükleyerek taşıyın',
  rotate: 'Bir öğeye tıklayıp tutamaçla döndürün',
  cut: 'Kesmek istediğiniz alanın üzerine bir alan çizin',
  remove: 'Silmek için öğeye tıklayın',
}

export default function App() {
  const history = useHistory<EditorFeature[]>(() => loadFeatures() ?? SAMPLE)
  const features = history.value
  const [version, setVersion] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [tool, setTool] = useState<Tool>('select')
  const [tab, setTab] = useState<Tab>('features')
  const [snapping, setSnapping] = useState(true)
  const [basemap, setBasemap] = useState<BasemapId>('osm')
  const [focus, setFocus] = useState<{ bbox: [number, number, number, number]; key: number } | null>(null)

  const selected = useMemo(() => features.find((f) => f.id === selectedId) ?? null, [features, selectedId])

  useEffect(() => saveFeatures(features), [features])

  /** Changes made in the UI (not on the map) need the map layers rebuilt. */
  const setFromUi = useCallback(
    (updater: EditorFeature[] | ((prev: EditorFeature[]) => EditorFeature[])) => {
      history.set(updater)
      setVersion((v) => v + 1)
    },
    [history],
  )

  /** Changes coming from map interaction; skips no-op updates so a click doesn't pollute history. */
  const onMapChange = useCallback(
    (updater: (prev: EditorFeature[]) => EditorFeature[]) => {
      history.set((prev) => {
        const next = updater(prev)
        return JSON.stringify(next) === JSON.stringify(prev) ? prev : next
      })
    },
    [history],
  )

  const undo = () => { history.undo(); setVersion((v) => v + 1); setSelectedId(null) }
  const redo = () => { history.redo(); setVersion((v) => v + 1); setSelectedId(null) }

  const zoomTo = (f: EditorFeature) => setFocus({ bbox: measure(f).bbox, key: Date.now() })
  const fitAll = () => {
    const b = collectionBbox(features)
    if (b) setFocus({ bbox: b, key: Date.now() })
  }
  const deleteFeature = (id: string) => {
    setFromUi((prev) => prev.filter((f) => f.id !== id))
    if (selectedId === id) setSelectedId(null)
  }
  const updateFeature = (next: EditorFeature) => setFromUi((prev) => prev.map((f) => (f.id === next.id ? next : f)))
  const addFeature = (f: EditorFeature) => {
    setFromUi((prev) => [...prev, f])
    setSelectedId(f.id)
  }
  const replaceAll = (fs: EditorFeature[]) => {
    setFromUi(fs)
    setSelectedId(null)
    setFocus(collectionBbox(fs) ? { bbox: collectionBbox(fs)!, key: Date.now() } : null)
  }
  const appendAll = (fs: EditorFeature[]) => {
    setFromUi((prev) => [...prev, ...fs])
    const b = collectionBbox(fs)
    if (b) setFocus({ bbox: b, key: Date.now() })
    setTab('features')
  }

  // Keyboard shortcuts (ignored while typing in a field).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return
      const mod = e.ctrlKey || e.metaKey
      if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return }
      if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); return }
      if (mod) return
      const map: Record<string, Tool> = { v: 'select', m: 'marker', l: 'line', p: 'polygon', r: 'rectangle', c: 'circle', d: 'drag', o: 'rotate', x: 'cut', e: 'remove' }
      const k = e.key.toLowerCase()
      if (k in map) { setTool(map[k]); return }
      if (k === 'escape') { setTool('select'); return }
      if (k === 's') { setSnapping((s) => !s); return }
      if (k === 'f') { fitAll(); return }
      if ((k === 'delete' || k === 'backspace') && selectedId) { e.preventDefault(); deleteFeature(selectedId) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const totals = useMemo(() => {
    let area = 0
    let length = 0
    for (const f of features) {
      const m = measure(f)
      area += m.area ?? 0
      length += m.length ?? 0
    }
    return { area, length }
  }, [features])

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-head">
          <h1>GeoJSON Editörü</h1>
          <p>Çiz, düzenle, ölç, dışa aktar</p>
        </div>
        <div className="tabs" role="tablist">
          {(
            [
              ['features', `Öğeler (${features.length})`],
              ['code', 'GeoJSON'],
              ['settings', 'Ayarlar'],
            ] as Array<[Tab, string]>
          ).map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>
              {label}
            </button>
          ))}
        </div>

        <div className="panel">
          {tab === 'features' && (
            <>
              {features.length > 0 && (
                <div className="section">
                  <div className="kv">
                    <dt>Toplam alan</dt><dd>{totals.area ? formatArea(totals.area) : '–'}</dd>
                    <dt>Toplam uzunluk</dt><dd>{totals.length ? formatLength(totals.length) : '–'}</dd>
                  </div>
                </div>
              )}
              <FeatureList features={features} selectedId={selectedId} onSelect={setSelectedId} onZoom={zoomTo} onDelete={deleteFeature} />
              {selected && <FeatureDetails feature={selected} onChange={updateFeature} onAdd={addFeature} onDelete={deleteFeature} onZoom={zoomTo} />}
            </>
          )}
          {tab === 'code' && <CodePanel features={features} selected={selected} onReplace={replaceAll} onAppend={appendAll} />}
          {tab === 'settings' && (
            <SettingsPanel
              basemap={basemap}
              onBasemap={setBasemap}
              snapping={snapping}
              onSnapping={setSnapping}
              onGoTo={(bbox) => setFocus({ bbox, key: Date.now() })}
              onClearAll={() => replaceAll([])}
              count={features.length}
            />
          )}
        </div>
      </aside>

      <div className="map-column">
        <Toolbar
          tool={tool}
          onTool={setTool}
          canUndo={history.canUndo}
          canRedo={history.canRedo}
          onUndo={undo}
          onRedo={redo}
          snapping={snapping}
          onSnapping={setSnapping}
          onFitAll={fitAll}
          hasFeatures={features.length > 0}
        />
        <MapEditor
          features={features}
          version={version}
          selectedId={selectedId}
          onSelect={setSelectedId}
          tool={tool}
          onToolDone={() => setTool('select')}
          onMapChange={onMapChange}
          snapping={snapping}
          basemap={basemap}
          focus={focus}
          hint={HINTS[tool] ?? null}
        />
      </div>
    </div>
  )
}
