/**
 * Preview entry. Imports the mock shim first so `__TAURI_INTERNALS__` exists
 * before any application module reads it, then boots the real app unchanged.
 *
 * Keeping this a separate entry means the production bundle is untouched: the
 * app's own `main.tsx` never imports anything from `preview/`.
 */
import './mock-tauri'

declare global {
  interface Window {
    __PREVIEW_ERROR__?: string
  }
}

const showError = (message: string) => {
  const box = document.getElementById('preview-error')
  if (!box) return
  box.textContent = `PREVIEW BOOT FAILED\n\n${message}\n\nState: ${
    new URLSearchParams(location.search).get('state') ?? 'connected'
  }`
  box.style.display = 'block'
  document.getElementById('initial-loading-overlay')?.remove()
}

window.addEventListener('error', (event) => {
  showError(String(event.error ?? event.message))
})

window.addEventListener('unhandledrejection', (event) => {
  showError(String(event.reason))
})

// Imported dynamically so the shim above is fully installed first; a static
// import would be hoisted and the app would read `__TAURI_INTERNALS__` before
// the mock exists.
void import('@/main').catch((error: unknown) => {
  showError(error instanceof Error ? (error.stack ?? error.message) : String(error))
})
