<script setup lang="ts">
const { resume, restart, go } = useGame()

</script>

<template>
  <div class="modal panel" role="dialog" aria-label="Paused">
    <h2>Paused</h2>
    <div class="stack">
      <button class="cmd primary" @click="resume()"><span>RESUME</span></button>
      <button class="cmd" @click="restart()"><span>RESTART RUN</span></button>
      <button class="cmd" @click="go('settings')"><span>SETTINGS</span></button>
      <button class="cmd" @click="go('menu')"><span>MAIN MENU</span></button>
    </div>
    <p class="muted small">Leaving the run banks the energy you collected so far.</p>
  </div>
</template>
