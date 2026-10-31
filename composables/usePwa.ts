import { computed, ref } from 'vue'

interface InstallPrompt extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const deferred = ref<InstallPrompt | null>(null)
const standalone = ref(false)
const ios = ref(false)
let wired = false

export function wirePwa() {
  if (wired || !import.meta.client) return
  wired = true
  const mq = window.matchMedia('(display-mode: standalone), (display-mode: fullscreen)')
  standalone.value = mq.matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
  ios.value = /iphone|ipad|ipod/i.test(navigator.userAgent) && !standalone.value
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault()
    deferred.value = e as InstallPrompt
  })
  window.addEventListener('appinstalled', () => {
    deferred.value = null
    standalone.value = true
    warmOffline()
  })
}

export function warmOffline() {
  if (!import.meta.client || !('serviceWorker' in navigator)) return
  navigator.serviceWorker.ready
    .then(reg => {
      const urls = performance.getEntriesByType('resource').map(r => r.name)
      ;(reg.active ?? navigator.serviceWorker.controller)?.postMessage({ type: 'WARM', urls })
    })
    .catch(() => undefined)
}

export function usePwa() {
  const canInstall = computed(() => !!deferred.value)
  const install = async () => {
    const p = deferred.value
    if (!p) return
    deferred.value = null
    try {
      await p.prompt()
      await p.userChoice
    } catch {
    }
  }
  return { canInstall, install, standalone, ios }
}
