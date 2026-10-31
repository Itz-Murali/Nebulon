<script setup lang="ts">
import { Check } from 'lucide-vue-next'
import { SHIPS } from '~/game/config'

const { save, choose, go } = useGame()
const ship = computed(() => SHIPS.find(s => s.id === save.ship) ?? SHIPS[0])
const pct = statPct
const bars = computed(() => {
  const s = ship.value.stats
  return [
    { label: 'Speed', text: `${Math.round(s.speed * 100)}%`, w: pct(s.speed, 0.8, 1.3) },
    { label: 'Handling', text: `${Math.round(s.handling * 100)}%`, w: pct(s.handling, 0.8, 1.4) },
    { label: 'Hyperdrive recharge', text: `${Math.round(s.hyper * 100)}%`, w: pct(s.hyper, 0.8, 1.6) },
    { label: 'Orb attraction', text: `+${s.magnet} m`, w: pct(s.magnet, 0, 3) }
  ]
})

</script>

<template>
  <ScreenFrame title="Spaceship hangar" sub="Drag the ship to rotate it. All ships are free.">
    <ul class="ships">
      <li v-for="s in SHIPS" :key="s.id">
        <button class="ship-row" :class="{ on: s.id === ship.id }" @click="choose(s.id)">
          <i class="swatch" :style="{ background: '#' + s.look.accent.toString(16).padStart(6, '0') }" />
          <span class="grow">{{ s.name }}<small>{{ s.role }}</small></span>
          <Check v-if="s.id === ship.id" :size="16" />
        </button>
      </li>
    </ul>

    <div class="detail">
      <h3>{{ ship.name }}</h3>
      <p class="muted">{{ ship.role }}</p>
      <p>{{ ship.desc }}</p>
      <div v-for="b in bars" :key="b.label" class="bar-row">
        <span>{{ b.label }}</span><b class="mono">{{ b.text }}</b>
        <div class="bar"><i :style="{ width: b.w + '%' }" /></div>
      </div>
      <button class="cmd primary" @click="go('menu')"><span>BACK TO LOBBY</span></button>
    </div>
  </ScreenFrame>
</template>
