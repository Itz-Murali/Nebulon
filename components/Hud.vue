<script setup lang="ts">
import { Pause, Zap } from 'lucide-vue-next'
const { hud, pause, hyper, cheat } = useGame()
let taps = 0
let tapTimer = 0
const tapHp = () => {
  taps++
  clearTimeout(tapTimer)
  tapTimer = window.setTimeout(() => (taps = 0), 1800)
  if (taps >= 4) {
    taps = 0
    cheat()
  }
}
const nav = (v: number, suffix = '') => {
  if (!hud.value.scramble) return fmt(v) + suffix
  const n = String(Math.floor(v)).length
  return Array.from({ length: Math.max(2, n) }, () => Math.floor(Math.random() * 10)).join('') + suffix
}
const coarse = import.meta.client && window.matchMedia('(pointer: coarse)').matches

</script>

<template>
  <div class="hud">
    <div class="hud-tl panel">
      <div class="stat"><span class="muted">Distance</span><b class="mono" :class="{ glitchy: hud.scramble }">{{ nav(hud.dist, ' m') }}</b></div>
      <div class="stat"><span class="muted">Score</span><b class="mono">{{ fmt(hud.score) }}</b></div>
    </div>

    <div class="hud-tc muted small">{{ hud.universe }}</div>
    <div v-if="hud.tag && hud.warp < 0.3" class="hud-tag mono" role="status">{{ hud.tag }}</div>

    <div class="hud-tr">
      <div class="panel stat"><span class="muted">Speed</span><b class="mono" :class="{ glitchy: hud.scramble }">{{ nav(hud.speed, ' km/s') }}</b></div>
      <button class="icon-btn solid" aria-label="Pause" @click="pause()"><Pause :size="20" /></button>
    </div>

    <div class="hud-hp">
      <div class="stat"><span class="muted">HP</span><b class="mono">{{ Math.ceil(hud.hp) }}</b></div>
      <div class="hpbar" :class="{ low: hud.hp / hud.maxHp < 0.3 }"><i :style="{ width: (hud.hp / hud.maxHp) * 100 + '%' }" /></div>
    </div>

    <div v-if="hud.cheat" class="hud-cheat">CHEAT</div>

    <div class="hud-bl panel">
      <div class="stat"><span class="muted">Energy collected</span><b class="mono">{{ fmt(hud.energy) }}</b></div>
    </div>

    <div class="hud-bc" @click="tapHp">
      <div class="meter" :class="{ on: hud.hyperOn }" role="progressbar" aria-label="Hyperdrive" :aria-valuenow="Math.round(hud.hyper)" aria-valuemin="0" aria-valuemax="100">
        <i :style="{ width: hud.hyper + '%' }" />
      </div>
      <span class="muted">Hyperdrive</span>
    </div>

    <div v-if="hud.notice && hud.warp < 0.3" class="hud-notice">{{ hud.notice }}</div>

    <div v-if="hud.warp > 0.3" class="hud-msg" :style="{ opacity: hud.warp }">Crossing the wormhole</div>

    <div v-if="!coarse" class="hud-br muted">WASD / arrows steer · Space hyperdrive · Esc pause</div>

    <button v-if="coarse" class="hyper-btn" aria-label="Hyperdrive" @pointerdown.prevent="hyper(true)" @pointerup="hyper(false)" @pointercancel="hyper(false)" @pointerleave="hyper(false)">
      <Zap :size="28" />
    </button>
  </div>
</template>
