<script setup lang="ts">
import type { Quality } from '~/types'
const { save, flags, reset } = useGame()
const pwa = usePwa()
const confirming = ref(false)
const levels: Quality[] = ['low', 'medium', 'high']
const doReset = () => {
  reset()
  confirming.value = false
}

</script>

<template>
  <ScreenFrame title="Settings" sub="Saved in this browser only.">
    <div class="field">
      <label for="vol">Master volume <b class="mono">{{ Math.round(save.settings.volume * 100) }}%</b></label>
      <input id="vol" v-model.number="save.settings.volume" type="range" min="0" max="1" step="0.05" />
    </div>
    <label class="check"><input v-model="save.settings.muted" type="checkbox" /> Mute all sound</label>
    <label class="check"><input v-model="save.settings.music" type="checkbox" /> Game music</label>
    <p class="muted small">Background music while you fly. On by default. You can switch it on or off during a paused run and hear the change right away.</p>
    <p v-if="save.settings.muted && save.settings.music" class="warn small">Mute all sound is on, so music stays silent. Turn it off to hear the music.</p>

    <div class="field">
      <span>Graphics quality</span>
      <div class="seg">
        <button v-for="q in levels" :key="q" :class="{ on: save.settings.quality === q }" @click="save.settings.quality = q">{{ q }}</button>
      </div>
    </div>

    <div class="field">
      <label for="sens">Touch steering sensitivity <b class="mono">{{ save.settings.sens.toFixed(1) }}x</b></label>
      <input id="sens" v-model.number="save.settings.sens" type="range" min="0.5" max="2" step="0.1" />
    </div>
    <label class="check"><input v-model="save.settings.reduceMotion" type="checkbox" /> Reduce interface motion</label>

    <label class="check"><input v-model="save.settings.fpp" type="checkbox" /> First-person (FPP) cockpit view</label>
    <p class="muted small">Fly from inside your ship. Works in every mode, universe and event. Off by default.</p>

    <div class="stack">
      <button v-if="pwa.canInstall.value" class="cmd" @click="pwa.install()"><span>INSTALL APP</span></button>
      <p v-else-if="pwa.standalone.value" class="muted small">Running as an installed app.</p>
      <p v-else-if="pwa.ios.value" class="muted small">To install on iPhone or iPad: tap Share, then Add to Home Screen.</p>
    </div>

    <p class="muted small">
      Progress belongs to this browser on this device. It is not synced anywhere and is lost if you clear site data.
    </p>
    <p v-if="!flags.storage" class="warn small">Browser storage is unavailable. Progress will not be saved.</p>

    <div v-if="!confirming">
      <button class="cmd danger" @click="confirming = true"><span>RESET ALL DATA</span></button>
    </div>
    <div v-else class="stack">
      <p class="warn small">This erases your records, selected ship and settings.</p>
      <button class="cmd danger" @click="doReset()"><span>CONFIRM RESET</span></button>
      <button class="cmd" @click="confirming = false"><span>CANCEL</span></button>
    </div>
  </ScreenFrame>
</template>
