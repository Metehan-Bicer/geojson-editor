import type { Tool } from '../lib/types'

interface Props {
  tool: Tool
  onTool: (t: Tool) => void
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  snapping: boolean
  onSnapping: (v: boolean) => void
  onFitAll: () => void
  hasFeatures: boolean
}

const DRAW: Array<{ tool: Tool; label: string; key: string }> = [
  { tool: 'select', label: 'Seç / düzenle', key: 'V' },
  { tool: 'marker', label: 'Nokta', key: 'M' },
  { tool: 'line', label: 'Çizgi', key: 'L' },
  { tool: 'polygon', label: 'Alan', key: 'P' },
  { tool: 'rectangle', label: 'Dikdörtgen', key: 'R' },
  { tool: 'circle', label: 'Daire', key: 'C' },
]
const EDIT: Array<{ tool: Tool; label: string; key: string }> = [
  { tool: 'drag', label: 'Taşı', key: 'D' },
  { tool: 'rotate', label: 'Döndür', key: 'O' },
  { tool: 'cut', label: 'Kes', key: 'X' },
  { tool: 'remove', label: 'Sil', key: 'E' },
]

export function Toolbar({ tool, onTool, canUndo, canRedo, onUndo, onRedo, snapping, onSnapping, onFitAll, hasFeatures }: Props) {
  const group = (items: typeof DRAW, label: string) => (
    <div className="toolgroup" role="group" aria-label={label}>
      {items.map((it) => (
        <button key={it.tool} type="button" aria-pressed={tool === it.tool} onClick={() => onTool(tool === it.tool && it.tool !== 'select' ? 'select' : it.tool)} title={`${it.label} (${it.key})`}>
          {it.label} <kbd>{it.key}</kbd>
        </button>
      ))}
    </div>
  )
  return (
    <div className="toolbar">
      {group(DRAW, 'Çizim araçları')}
      {group(EDIT, 'Düzenleme araçları')}
      <div className="toolgroup" role="group" aria-label="Geçmiş">
        <button type="button" onClick={onUndo} disabled={!canUndo} title="Geri al (Ctrl+Z)">Geri al</button>
        <button type="button" onClick={onRedo} disabled={!canRedo} title="Yinele (Ctrl+Y)">Yinele</button>
      </div>
      <div className="toolgroup" role="group" aria-label="Görünüm">
        <button type="button" aria-pressed={snapping} onClick={() => onSnapping(!snapping)} title="Köşelere yapıştır (S)">
          Yapıştır <kbd>S</kbd>
        </button>
        <button type="button" onClick={onFitAll} disabled={!hasFeatures} title="Tüm öğeleri sığdır (F)">
          Sığdır <kbd>F</kbd>
        </button>
      </div>
    </div>
  )
}
