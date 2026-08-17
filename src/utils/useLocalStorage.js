import { useEffect, useState, useRef } from 'react'

/**
 * A drop-in replacement for useState that persists to localStorage.
 * Falls back gracefully (in-memory only) if localStorage is unavailable
 * (e.g. private browsing, or when previewed inside an environment that
 * blocks storage access) so the app never crashes.
 */
export function useLocalStorage(key, initialValue) {
  const readValue = (storageKey) => {
    try {
      const stored = window.localStorage.getItem(storageKey)
      return stored !== null ? JSON.parse(stored) : initialValue
    } catch {
      return initialValue
    }
  }

  const [value, setValue] = useState(() => readValue(key))
  const activeKeyRef = useRef(key)

  // When key changes, immediately synchronize state from localStorage
  useEffect(() => {
    if (activeKeyRef.current !== key) {
      activeKeyRef.current = key
      setValue(readValue(key))
    }
  }, [key])

  // Persist value to localStorage only for the active key
  useEffect(() => {
    if (activeKeyRef.current === key) {
      try {
        window.localStorage.setItem(key, JSON.stringify(value))
      } catch {
        // Storage unavailable — the app still works for this session,
        // it just won't persist across reloads.
      }
    }
  }, [key, value])

  return [value, setValue]
}

