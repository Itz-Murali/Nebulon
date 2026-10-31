<script setup lang="ts">
import { SHIPS } from '~/game/config'

const { hud, save } = useGame()
const accent = computed(() => '#' + (SHIPS.find(s => s.id === save.ship) ?? SHIPS[0]).look.accent.toString(16).padStart(6, '0'))
const low = computed(() => hud.value.hp / Math.max(1, hud.value.maxHp) < 0.3)
const sway = computed(() => ({
  '--cp': accent.value,
  '--bank': String(Math.max(-1, Math.min(1, hud.value.bank)))
}))

</script>

<template>
  <div class="cockpit" :class="{ low, jolt: hud.hit > 0.45, boost: hud.hyperOn }" :style="sway" aria-hidden="true">
    <div class="cp-glass" />
    <div class="cp-rig">
      <div class="cp-top"><i /></div>
      <div class="cp-pillar l"><i /></div>
      <div class="cp-pillar r"><i /></div>
      <div class="cp-dash">
        <svg class="cp-line" viewBox="0 0 100 100" preserveAspectRatio="none">
          <polyline points="0,40 18,18 36,30 64,30 82,18 100,40" fill="none" stroke="var(--cp)" stroke-width="2" vector-effect="non-scaling-stroke" />
        </svg>
        <div class="cp-leds l"><i v-for="n in 7" :key="n" :style="{ animationDelay: n * 0.19 + 's' }" /></div>
        <div class="cp-leds r"><i v-for="n in 7" :key="n" :style="{ animationDelay: n * 0.23 + 's' }" /></div>
        <div class="cp-scan" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.cockpit { position: absolute; inset: 0; pointer-events: none; overflow: hidden; animation: cpIn 0.5s ease-out both; --edge: linear-gradient(160deg, #1a2238 0%, #0b1020 45%, #05070f 100%); }
.cp-glass { position: absolute; inset: 0; background: radial-gradient(ellipse at 50% 45%, transparent 55%, rgba(0, 0, 0, 0.5) 100%), linear-gradient(115deg, transparent 38%, rgba(255, 255, 255, 0.035) 42%, transparent 48%, transparent 60%, rgba(255, 255, 255, 0.02) 63%, transparent 68%); }
.cp-rig { position: absolute; inset: -14px; transform: translateX(calc(var(--bank) * -16px)) rotate(calc(var(--bank) * -1.2deg)); transition: transform 0.1s linear; }
.cp-top, .cp-pillar, .cp-dash { position: absolute; background: var(--edge); }
.cp-top { top: 0; left: 0; right: 0; height: clamp(34px, 10vh, 96px); clip-path: polygon(0 0, 100% 0, 100% 52%, 72% 100%, 28% 100%, 0 52%); }
.cp-top i { position: absolute; left: 28%; right: 28%; bottom: 0; height: 2px; background: var(--cp); box-shadow: 0 0 10px var(--cp); opacity: 0.7; }
.cp-pillar { top: 0; bottom: 0; width: clamp(60px, 15vw, 320px); }
.cp-pillar.l { left: 0; clip-path: polygon(0 0, 100% 0, 42% 80%, 0 100%); }
.cp-pillar.r { right: 0; clip-path: polygon(0 0, 100% 0, 100% 100%, 58% 80%); transform: none; background: linear-gradient(200deg, #1a2238 0%, #0b1020 45%, #05070f 100%); }
.cp-pillar i { position: absolute; inset: 0; background: linear-gradient(100deg, transparent 60%, color-mix(in srgb, var(--cp) 22%, transparent) 100%); }
.cp-pillar.r i { background: linear-gradient(260deg, transparent 60%, color-mix(in srgb, var(--cp) 22%, transparent) 100%); }
.cp-dash { left: 0; right: 0; bottom: 0; height: clamp(84px, 24vh, 230px); clip-path: polygon(0 40%, 18% 18%, 36% 30%, 64% 30%, 82% 18%, 100% 40%, 100% 100%, 0 100%); background: linear-gradient(180deg, #151c30 0%, #080b16 55%, #04060c 100%); }
.cp-line { position: absolute; inset: 0; width: 100%; height: 100%; filter: drop-shadow(0 0 6px var(--cp)); opacity: 0.85; }
.cp-leds { position: absolute; bottom: 14%; display: flex; gap: 6px; }
.cp-leds.l { left: 10%; }
.cp-leds.r { right: 10%; }
.cp-leds i { width: 7px; height: 7px; border-radius: 50%; background: var(--cp); box-shadow: 0 0 8px var(--cp); animation: cpBlink 1.6s ease-in-out infinite; }
.cp-scan { position: absolute; left: 36%; right: 36%; bottom: 14%; height: 3px; background: linear-gradient(90deg, transparent, var(--cp), transparent); opacity: 0.55; animation: cpScan 2.2s ease-in-out infinite; }
.low .cp-line { stroke: #ff3a2a; filter: drop-shadow(0 0 8px #ff3a2a); animation: cpWarn 0.7s ease-in-out infinite; }
.low .cp-leds i { background: #ff3a2a; box-shadow: 0 0 8px #ff3a2a; animation-duration: 0.5s; }
.boost .cp-rig { animation: cpRumble 0.09s linear infinite; }
.jolt .cp-rig { animation: cpJolt 0.12s steps(2) infinite; }
@keyframes cpIn { from { opacity: 0; transform: scale(1.06); } to { opacity: 1; transform: none; } }
@keyframes cpBlink { 0%, 100% { opacity: 0.25; } 50% { opacity: 1; } }
@keyframes cpScan { 0%, 100% { transform: scaleX(0.3); } 50% { transform: scaleX(1); } }
@keyframes cpWarn { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
@keyframes cpRumble { 0% { margin: 0 0 0 0; } 50% { margin: 1px 0 0 -1px; } 100% { margin: 0; } }
@keyframes cpJolt { 0% { margin: 0 6px 0 -6px; } 100% { margin: 4px -5px 0 5px; } }
@media (max-aspect-ratio: 1/1) {
  .cp-pillar { width: clamp(34px, 11vw, 120px); }
  .cp-dash { height: clamp(70px, 16vh, 160px); }
}
:global(.reduce-motion) .cockpit * { animation: none !important; }

</style>
