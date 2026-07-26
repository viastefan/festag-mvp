/**
 * Runs only on festag.app — lets the portal detect Tagro and probe extension auth.
 *
 * Content scripts run in an isolated JS world: CustomEvents/postMessage from here
 * do NOT reach the page React app. We therefore:
 * 1. Write status to html[data-*] (shared DOM)
 * 2. Inject a tiny page script to dispatch events the portal can listen to
 * 3. Probe extension→API session via background worker (cookie bridge)
 */
(() => {
  if (window.__festagExtensionBridge) return
  window.__festagExtensionBridge = true

  const version = chrome.runtime.getManifest().version
  let probing = false

  function injectPageNotify() {
    const script = document.createElement('script')
    script.textContent = `(function(){
      try {
        var root = document.documentElement;
        window.dispatchEvent(new CustomEvent('festag-extension-pong', {
          detail: {
            version: root.dataset.festagExtension || null,
            session: root.dataset.festagExtensionSession || 'unknown',
            backend: root.dataset.festagExtensionBackend || 'unknown',
            email: root.dataset.festagExtensionEmail || null,
          }
        }));
      } catch (e) {}
    })();`
    ;(document.head || document.documentElement).appendChild(script)
    script.remove()
  }

  function setPending() {
    document.documentElement.dataset.festagExtensionSession = 'pending'
    document.documentElement.dataset.festagExtensionBackend = 'unknown'
    delete document.documentElement.dataset.festagExtensionEmail
  }

  async function probeExtensionSession() {
    if (probing) return
    probing = true
    setPending()
    injectPageNotify()

    try {
      const response = await chrome.runtime.sendMessage({ type: 'getSession' })
      if (response?.ok) {
        document.documentElement.dataset.festagExtensionSession = 'ok'
        document.documentElement.dataset.festagExtensionBackend = response.backendReady ? 'ready' : 'fail'
        if (response.user?.email) {
          document.documentElement.dataset.festagExtensionEmail = response.user.email
        } else {
          delete document.documentElement.dataset.festagExtensionEmail
        }
      } else {
        document.documentElement.dataset.festagExtensionSession = 'fail'
        document.documentElement.dataset.festagExtensionBackend = 'fail'
        delete document.documentElement.dataset.festagExtensionEmail
      }
    } catch {
      document.documentElement.dataset.festagExtensionSession = 'fail'
      document.documentElement.dataset.festagExtensionBackend = 'fail'
      delete document.documentElement.dataset.festagExtensionEmail
    } finally {
      probing = false
      injectPageNotify()
    }
  }

  function announce() {
    document.documentElement.dataset.festagExtension = version
    injectPageNotify()
    void probeExtensionSession()
  }

  announce()

  window.addEventListener('festag-extension-ping', () => {
    announce()
  })

  window.addEventListener('message', (event) => {
    if (event.source !== window) return
    if (event.data?.type !== 'festag-extension-ping') return
    announce()
  })

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type === 'festag:extension-updated') {
      announce()
    }
  })
})()
