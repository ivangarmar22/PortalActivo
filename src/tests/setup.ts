import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// APIs del navegador que jsdom no implementa y que usan los componentes de Radix.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver
Element.prototype.hasPointerCapture = () => false
Element.prototype.releasePointerCapture = () => {}
Element.prototype.scrollIntoView = () => {}

afterEach(() => {
  cleanup()
})
