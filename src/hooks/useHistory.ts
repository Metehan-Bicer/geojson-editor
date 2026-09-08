import { useCallback, useRef, useState } from 'react'

const LIMIT = 100

/** Undo/redo stack. `set` records a step by default; pass `record: false` for transient updates. */
export function useHistory<T>(initial: T | (() => T)) {
  const [present, setPresent] = useState<T>(initial)
  const past = useRef<T[]>([])
  const future = useRef<T[]>([])
  const [, bump] = useState(0)

  const set = useCallback((next: T | ((prev: T) => T), record = true) => {
    setPresent((prev) => {
      const value = typeof next === 'function' ? (next as (p: T) => T)(prev) : next
      if (value === prev) return prev
      if (record) {
        past.current.push(prev)
        if (past.current.length > LIMIT) past.current.shift()
        future.current = []
      }
      return value
    })
    bump((n) => n + 1)
  }, [])

  const undo = useCallback(() => {
    setPresent((prev) => {
      const p = past.current.pop()
      if (p === undefined) return prev
      future.current.push(prev)
      return p
    })
    bump((n) => n + 1)
  }, [])

  const redo = useCallback(() => {
    setPresent((prev) => {
      const f = future.current.pop()
      if (f === undefined) return prev
      past.current.push(prev)
      return f
    })
    bump((n) => n + 1)
  }, [])

  return { value: present, set, undo, redo, canUndo: past.current.length > 0, canRedo: future.current.length > 0 }
}
