import type { EditorFeature } from './types'

const KEY = 'geojson-editor:v1'

export function loadFeatures(): EditorFeature[] | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as EditorFeature[]) : null
  } catch {
    return null
  }
}

export function saveFeatures(features: EditorFeature[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(features))
  } catch {
    /* storage may be unavailable; autosave is best-effort */
  }
}
