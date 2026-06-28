/**
 * Runs only on festag.app — lets the portal detect that Tagro is installed.
 */
(() => {
  if (window.__festagExtensionBridge) return
  window.__festagExtensionBridge = true

  const version = chrome.runtime.getManifest().version

  function announce() {
    document.documentElement.dataset.festagExtension = version
    window.dispatchEvent(new CustomEvent('festag-extension-pong', {
      detail: { version, ok: true },
    }))
    window.postMessage({ type: 'festag-extension-pong', version, ok: true }, window.location.origin)
  }

  announce()

  window.addEventListener('festag-extension-ping', announce)

  window.addEventListener('message', (event) => {
    if (event.source !== window) return
    if (event.data?.type !== 'festag-extension-ping') return
    announce()
  })
})()
