const VERSION = 'nebulon-v2'
const SHELL = `${VERSION}-shell`
const ASSETS = `${VERSION}-assets`
const MEDIA = `${VERSION}-media`

const STATIC = ['/manifest.webmanifest', '/brand/nebulon-wordmark.webp', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/maskable-512.png']
const MUSIC = ['/audio/nebulon-theme.mp3']
const SKIP_FONT = /(cyrillic|greek|vietnamese|hebrew|arabic|devanagari|thai|korean|japanese|chinese|symbols|math)/i

const cacheable = res => res && (res.ok || res.type === 'opaque')
const isMedia = url => /\.(mp3|ogg|m4a|wav)$/i.test(url.pathname) || url.pathname.startsWith('/audio/')
const timeout = (ms, p) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))])

async function keep(cacheName, url, init) {
  try {
    const cache = await caches.open(cacheName)
    if (await cache.match(url)) return true
    const res = await fetch(url, init)
    if (res && res.ok) {
      await cache.put(url, res.clone())
      return true
    }
  } catch (e) {
  }
  return false
}

async function discover(url) {
  const found = []
  try {
    const res = await fetch(url)
    if (!res.ok) return found
    const copy = res.clone()
    const text = await res.text()
    const cache = await caches.open(ASSETS)
    await cache.put(url, copy)
    const base = new URL(url, self.location.origin)
    if (url.endsWith('.css')) {
      for (const m of text.matchAll(/url\(\s*["']?([^"')]+\.woff2?)["']?\s*\)/g)) {
        const u = new URL(m[1], base)
        if (u.origin === self.location.origin && !SKIP_FONT.test(u.pathname)) found.push(u.pathname)
      }
    } else if (url.endsWith('.js')) {
      for (const m of text.matchAll(/["']\.\/([\w.-]+\.(?:js|css))["']/g)) found.push(new URL(m[1], base).pathname)
    }
  } catch (e) {
  }
  return found
}

async function precacheShell() {
  const shell = await caches.open(SHELL)
  const res = await fetch('/', { cache: 'reload' })
  if (!res.ok) throw new Error('shell')
  await shell.put('/', res.clone())
  const html = await res.text()

  const pending = new Set(STATIC)
  for (const m of html.matchAll(/["'(](\/_nuxt\/[^"'\s)]+)/g)) pending.add(m[1].split('?')[0])

  const done = new Set()
  for (let pass = 0; pass < 4 && pending.size && done.size < 250; pass++) {
    const batch = [...pending].filter(u => !done.has(u))
    pending.clear()
    await Promise.all(
      batch.map(async u => {
        done.add(u)
        if (u.startsWith('/_nuxt/') && (u.endsWith('.css') || u.endsWith('.js'))) {
          for (const next of await discover(u)) if (!done.has(next)) pending.add(next)
        } else {
          await keep(ASSETS, u)
        }
      })
    )
  }
}

async function warm(urls) {
  const jobs = []
  for (const u of MUSIC) jobs.push(keep(MEDIA, u))
  for (const u of urls || []) {
    try {
      const url = new URL(u, self.location.origin)
      if (url.origin === self.location.origin && (url.pathname.startsWith('/_nuxt/') || url.pathname.startsWith('/brand/') || url.pathname.startsWith('/icons/'))) {
        jobs.push(keep(ASSETS, url.pathname))
      }
    } catch (e) {
    }
  }
  await Promise.all(jobs)
}

self.addEventListener('install', event => {
  event.waitUntil(
    precacheShell()
      .catch(() => undefined)
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys => Promise.all(keys.filter(k => !k.startsWith(VERSION)).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('message', event => {
  const d = event.data
  if (d && d.type === 'WARM') event.waitUntil(warm(d.urls))
})

self.addEventListener('fetch', event => {
  const req = event.request
  if (req.method !== 'GET' || !req.url.startsWith('http')) return
  if (req.headers.has('range')) return
  const url = new URL(req.url)

  if (req.mode === 'navigate') {
    event.respondWith(
      timeout(4000, fetch(req))
        .then(res => {
          if (cacheable(res) && res.status === 200 && url.origin === self.location.origin) {
            const copy = res.clone()
            caches.open(SHELL).then(c => c.put('/', copy))
          }
          return res
        })
        .catch(() => caches.match('/').then(r => r || Response.error()))
    )
    return
  }

  if (isMedia(url)) {
    event.respondWith(
      caches.match(req, { cacheName: MEDIA }).then(
        hit =>
          hit ||
          fetch(req).then(res => {
            if (res && res.status === 200 && res.type !== 'opaque') {
              const copy = res.clone()
              caches.open(MEDIA).then(c => c.put(req, copy))
            }
            return res
          })
      )
    )
    return
  }

  if (url.origin === self.location.origin && url.pathname.startsWith('/_nuxt/')) {
    event.respondWith(
      caches.match(req).then(
        hit =>
          hit ||
          fetch(req).then(res => {
            if (cacheable(res)) {
              const copy = res.clone()
              caches.open(ASSETS).then(c => c.put(req, copy))
            }
            return res
          })
      )
    )
    return
  }

  event.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req)
        .then(res => {
          if (cacheable(res)) {
            const copy = res.clone()
            caches.open(ASSETS).then(c => c.put(req, copy))
          }
          return res
        })
        .catch(() => hit || Response.error())
      return hit || net
    })
  )
})
