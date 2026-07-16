import { useEffect, useState } from 'react'

/**
 * A drop-in replacement for useState that persists to localStorage.
 * Falls back gracefully (in-memory only) if localStorage is unavailable
 * (e.g. private browsing, or when previewed inside an environment that
 * blocks storage access) so the app never crashes.
 */
export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = window.localStorage.getItem(key)
      return stored !== null ? JSON.parse(stored) : initialValue
    } catch {
      return initialValue
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Storage unavailable — the app still works for this session,
      // it just won't persist across reloads.
    }
  }, [key, value])

  return [value, setValue]
}
