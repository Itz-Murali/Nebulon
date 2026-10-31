import { computed, ref } from 'vue'

export type DocPage = 'about' | 'terms' | 'license'

const PAGES: Record<string, DocPage> = { '/about': 'about', '/terms': 'terms', '/license': 'license' }
const TITLES: Record<DocPage, string> = {
  about: 'About Nebulon',
  terms: 'Terms and Conditions',
  license: 'License'
}

const clean = (p: string) => {
  const t = p.replace(/\/+$/, '').toLowerCase()
  return t === '' ? '/' : t
}

const path = ref('/')
let wired = false

export function wireSite() {
  if (wired || !import.meta.client) return
  wired = true
  path.value = clean(location.pathname)
  window.addEventListener('popstate', () => {
    path.value = clean(location.pathname)
  })
}

export function useSite() {
  const page = computed<DocPage | null>(() => PAGES[path.value] ?? null)
  const title = computed(() => (page.value ? `${TITLES[page.value]} | Nebulon: Infinite Frontier` : 'Nebulon: Infinite Frontier'))
  const open = (to: string) => {
    const next = clean(to)
    if (next === path.value) return
    history.pushState({}, '', to)
    path.value = next
  }
  const home = () => open('/')
  return { path, page, title, open, home }
}
