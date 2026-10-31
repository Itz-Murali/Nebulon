import { wirePwa, warmOffline } from '~/composables/usePwa'

export default defineNuxtPlugin(() => {
  wirePwa()
  if (!('serviceWorker' in navigator) || location.hostname === 'localhost' || location.hostname === '127.0.0.1') return
  const register = () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then(() => {
        window.setTimeout(warmOffline, 4000)
      })
      .catch(() => {
      })
  }
  if (document.readyState === 'complete') register()
  else window.addEventListener('load', register)
})
