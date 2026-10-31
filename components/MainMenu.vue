<script setup lang="ts">
import { Play, Rocket, Settings, Compass, Skull, Zap, Trophy, Route, Info, ChevronRight, Orbit, Sparkles } from 'lucide-vue-next'
import { MODES, SHIPS, DISCOVERIES } from '~/game/config'
import type { ModeId } from '~/types'
import type { Component } from 'vue'

const root = ref<HTMLElement | null>(null)
const site = useSite()
const { go, start, save, mode, cheat } = useGame()

let taps = 0
let tapTimer = 0
const tapTitle = () => {
  taps++
  clearTimeout(tapTimer)
  tapTimer = window.setTimeout(() => (taps = 0), 1500)
  if (taps >= 7) {
    taps = 0
    cheat()
  }
}

const modes = Object.values(MODES)
const modeIcon: Record<ModeId, Component> = { classic: Compass, survival: Skull, hyperdrive: Zap }
const modeColor: Record<ModeId, string> = { classic: '#3d8bff', survival: '#ff5a4a', hyperdrive: '#b06bff' }
const setMode = (id: ModeId, e?: MouseEvent) => {
  if (mode.value !== id && e?.currentTarget) pop(e.currentTarget as Element)
  mode.value = id
}
const accent = computed(() => modeColor[mode.value])

const ship = computed(() => SHIPS.find(s => s.id === save.ship) ?? SHIPS[0])
const shipBars = computed(() => {
  const s = ship.value.stats
  return [
    { label: 'Speed', w: statPct(s.speed, 0.8, 1.3) },
    { label: 'Handling', w: statPct(s.handling, 0.8, 1.4) },
    { label: 'Hyperdrive', w: statPct(s.hyper, 0.8, 1.6) },
    { label: 'Magnet', w: Math.max(6, statPct(s.magnet, 0, 3)) }
  ]
})
const swatch = computed(() => '#' + ship.value.look.accent.toString(16).padStart(6, '0'))

const records = computed<{ label: string; value: string; icon: Component; wide?: boolean }[]>(() => [
  { label: 'Best score', value: fmt(save.stats.bestScore), icon: Trophy },
  { label: 'Best distance', value: fmt(save.stats.bestDist) + ' m', icon: Route },
  { label: 'Flights', value: fmt(save.stats.runs), icon: Rocket },
  { label: 'Energy banked', value: fmt(save.stats.totalEnergy), icon: Zap },
  { label: 'Discoveries', value: `${save.codex.length} / ${DISCOVERIES.length}`, icon: Sparkles, wide: true }
])

const onKey = (e: KeyboardEvent) => {
  if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return
  const a = document.activeElement
  if (a && a !== document.body) return
  if (e.code === 'Enter' || e.code === 'NumpadEnter') start()
  else if (e.code === 'Digit1' || e.code === 'Digit2' || e.code === 'Digit3') {
    const m = modes[Number(e.code.slice(-1)) - 1]
    if (m) setMode(m.id)
  }
}
onMounted(() => {
  window.addEventListener('keydown', onKey)
  if (root.value) reveal(root.value.querySelectorAll('.a-in'), { y: 18, step: 90, duration: 700 })
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  clearTimeout(tapTimer)
})

</script>

<template>
  <main ref="root" class="lobby" :style="{ '--accent': accent }">
    <header class="lobby-top">
      <div class="brand a-in">
        <BrandLogo @tap="tapTitle" />
        <p class="tag">The universe doesn't forgive mistakes.</p>
      </div>
      <div class="top-actions a-in">
        <button class="round-btn" aria-label="About Nebulon" title="About" @click="site.open('/about')">
          <Info :size="18" />
        </button>
      </div>
    </header>

    <section class="deck glass a-in" aria-label="Launch deck">
      <div class="eyebrow">Select mission</div>

      <div class="modes" role="radiogroup" aria-label="Game mode">
        <button
          v-for="(m, i) in modes"
          :key="m.id"
          class="mode-card"
          role="radio"
          :data-mode="m.id"
          :aria-checked="mode === m.id"
          :class="{ on: mode === m.id }"
          @click="setMode(m.id, $event)"
        >
          <span class="mode-ico"><component :is="modeIcon[m.id]" :size="20" /></span>
          <span class="mode-name">{{ m.name }}<em class="tier">{{ m.tier }}</em><kbd class="key">{{ i + 1 }}</kbd></span>
          <span class="mode-sub">{{ m.desc }}</span>
          <span class="mode-tags mono">
            <i>HULL {{ m.hp }}</i>
            <i class="threat">THREAT <b v-for="n in 3" :key="n" :class="{ on: n <= m.threat }" /></i>
            <i class="perk">{{ m.perk }}</i>
          </span>
        </button>
      </div>
      <p class="mode-note">{{ MODES[mode].desc }}</p>

      <button class="launch" @click="start()">
        <span class="launch-ico"><Play :size="18" fill="currentColor" /></span>
        <span class="launch-text">START FLIGHT</span>
        <kbd class="key key-lg">Enter</kbd>
        <ChevronRight class="launch-arrow" :size="22" />
      </button>
      <p class="legal">By playing you accept our <NavLink to="/terms">Terms and Conditions</NavLink> and <NavLink to="/license">License</NavLink>.</p>

      <div class="deck-links">
        <button class="link-btn" @click="go('hangar')">
          <span class="link-ico"><Rocket :size="18" /></span>
          <span class="link-text"><b>Hangar</b><small>{{ ship.name }}</small></span>
        </button>
        <button class="link-btn" @click="go('settings')">
          <span class="link-ico"><Settings :size="18" /></span>
          <span class="link-text"><b>Settings</b><small>Audio, graphics</small></span>
        </button>
      </div>

      <dl class="records">
        <div v-for="r in records" :key="r.label" class="rec" :class="{ wide: r.wide }">
          <dt><component :is="r.icon" :size="13" />{{ r.label }}</dt>
          <dd class="mono">{{ r.value }}</dd>
        </div>
      </dl>
    </section>

    <aside class="plate glass a-in" aria-label="Active ship">
      <div class="eyebrow">Active ship</div>
      <div class="plate-head">
        <span class="plate-dot" :style="{ background: swatch, boxShadow: `0 0 14px ${swatch}` }" />
        <div class="grow">
          <h3>{{ ship.name }}</h3>
          <span class="muted">{{ ship.role }}</span>
        </div>
      </div>
      <div v-for="b in shipBars" :key="b.label" class="mini">
        <span>{{ b.label }}</span>
        <div class="mini-bar"><i :style="{ width: b.w + '%' }" /></div>
      </div>
      <button class="plate-btn" @click="go('hangar')"><Orbit :size="16" /><span>Change ship</span><ChevronRight :size="16" /></button>
    </aside>

    <p class="foot window-note" role="note">The game looks better in landscape. Rotate your device or widen the window.</p>
  </main>
</template>
