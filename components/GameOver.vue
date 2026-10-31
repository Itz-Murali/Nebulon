<script setup lang="ts">
import { DISCOVERIES } from '~/game/config'
const { report, start, go } = useGame()
const found = computed(() => (report.value?.run.found ?? []).map(id => DISCOVERIES.find(d => d.id === id)).filter((d): d is NonNullable<typeof d> => !!d))

</script>

<template>
  <div v-if="report" class="modal panel" role="dialog" aria-label="Run complete">
    <h2>Hull breached</h2>
    <p v-if="report.recordScore || report.recordDist" class="record">NEW RECORD<span v-if="report.recordScore"> · score</span><span v-if="report.recordDist"> · distance</span></p>
    <dl class="results mono">
      <div><dt>Score</dt><dd>{{ fmt(report.run.score) }}</dd></div>
      <div><dt>Distance</dt><dd>{{ fmt(report.run.dist) }} m</dd></div>
      <div><dt>Energy collected</dt><dd>{{ fmt(report.run.energy) }}</dd></div>
      <div><dt>Objects passed</dt><dd>{{ fmt(report.run.passed) }}</dd></div>
      <div><dt>Universes visited</dt><dd>{{ report.run.universes }}</dd></div>
    </dl>
    <div v-if="found.length" class="found">
      <span class="muted small">Discoveries this flight</span>
      <ul><li v-for="d in found" :key="d.id"><b>{{ d.name }}</b><small>{{ d.blurb }}</small></li></ul>
    </div>
    <div class="stack">
      <button class="cmd primary" @click="start()"><span>RETRY</span></button>
      <button class="cmd" @click="go('hangar')"><span>SPACESHIP HANGAR</span></button>
      <button class="cmd" @click="go('menu')"><span>MAIN MENU</span></button>
    </div>
  </div>
</template>
