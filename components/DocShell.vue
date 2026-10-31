<script setup lang="ts">
import { ICON_URL } from '~/game/brand'

interface TocItem { id: string; label: string }
const props = defineProps<{ current: 'about' | 'terms' | 'license'; toc?: TocItem[] }>()

const site = useSite()
const root = ref<HTMLElement | null>(null)
const tocList = ref<HTMLElement | null>(null)
const marker = ref<HTMLElement | null>(null)
const active = ref(props.toc?.[0]?.id ?? '')
let spy: IntersectionObserver | null = null

const jump = (id: string) => {
  const el = root.value?.querySelector<HTMLElement>('#' + id)
  if (!el) return
  active.value = id
  el.scrollIntoView({ behavior: motionReduced() ? 'auto' : 'smooth', block: 'start' })
}

const placeMarker = async () => {
  await nextTick()
  const a = tocList.value?.querySelector<HTMLElement>('a.on')
  if (a && marker.value) moveMarker(marker.value, a.offsetTop, a.offsetHeight)
}
watch(active, placeMarker)

const onKey = (e: KeyboardEvent) => {
  if (e.code === 'Escape') site.home()
}

onMounted(() => {
  window.addEventListener('keydown', onKey)
  const el = root.value
  if (!el) return
  el.scrollTop = 0
  reveal(el, { y: 0, duration: 380 })
  reveal(el.querySelectorAll('.a-in'), { y: 18, delay: 120, step: 110, duration: 800 })
  if (props.toc?.length && 'IntersectionObserver' in window) {
    spy = new IntersectionObserver(
      entries => {
        const hit = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (hit) active.value = hit.target.id
      },
      { root: el, rootMargin: '-12% 0px -70% 0px' }
    )
    for (const t of props.toc) {
      const s = el.querySelector('#' + t.id)
      if (s) spy.observe(s)
    }
    placeMarker()
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  spy?.disconnect()
})

</script>

<template>
  <div ref="root" class="doc">
    <header class="doc-bar">
      <NavLink to="/" class="doc-brand" aria-label="Nebulon, back to the game">
        <img :src="ICON_URL" alt="" width="28" height="28" />
        <span>Nebulon</span>
      </NavLink>
      <nav class="doc-nav" aria-label="Pages">
        <NavLink to="/about" :aria-current="current === 'about' ? 'page' : undefined">About</NavLink>
        <NavLink to="/terms" :aria-current="current === 'terms' ? 'page' : undefined">Terms</NavLink>
        <NavLink to="/license" :aria-current="current === 'license' ? 'page' : undefined">License</NavLink>
      </nav>
      <button class="doc-play" type="button" @click="site.home()">Play</button>
    </header>

    <div class="doc-body" :class="{ 'has-toc': !!toc?.length }">
      <aside v-if="toc?.length" class="doc-toc" aria-label="On this page">
        <ul ref="tocList">
          <i ref="marker" class="toc-marker" aria-hidden="true" />
          <li v-for="t in toc" :key="t.id">
            <a :href="'#' + t.id" :class="{ on: active === t.id }" @click.prevent="jump(t.id)">{{ t.label }}</a>
          </li>
        </ul>
      </aside>
      <main class="doc-main">
        <slot />
      </main>
    </div>

    <SiteFooter />
  </div>
</template>
