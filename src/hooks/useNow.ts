import { useSyncExternalStore } from 'react'

// Reloj compartido que se actualiza cada 30 s: evita llamar a Date.now() durante el render.
let current = Date.now()
const listeners = new Set<() => void>()
let timer: ReturnType<typeof setInterval> | undefined

function subscribe(listener: () => void) {
  listeners.add(listener)
  if (!timer) {
    timer = setInterval(() => {
      current = Date.now()
      for (const l of listeners) l()
    }, 30_000)
  }
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0 && timer) {
      clearInterval(timer)
      timer = undefined
    }
  }
}

export function useNow(): number {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => current,
  )
}
