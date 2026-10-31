<script setup lang="ts">
const { screen, fault, toast, hud, init, dispose, suspend } = useGame()
const site = useSite()
const canvas = ref<HTMLCanvasElement | null>(null)
const hintScreens = ['hangar', 'settings', 'paused']

const onDoc = computed(() => site.page.value !== null)

useHead({ title: () => site.title.value })

wireSite()

onMounted(() => {
  init(canvas.value!)
  suspend(onDoc.value)
})
watch(onDoc, on => suspend(on))
onBeforeUnmount(dispose)

</script>

<template>
  <canvas ref="canvas" class="stage" />
  <div class="ui">
    <template v-if="!onDoc">
      <Cockpit v-if="(screen === 'playing' || screen === 'paused') && hud.fpp" />
      <div v-if="fault" class="modal panel" role="alert">
        <h2>Graphics unavailable</h2>
        <p>{{ fault }}</p>
      </div>
      <div v-else-if="screen === 'loading'" class="boot">
        <BrandLogo class="boot-logo" />
        <div class="boot-bar"><i /></div>
        <span class="mono muted">Initialising flight systems</span>
      </div>
      <MainMenu v-else-if="screen === 'menu'" />
      <Hud v-else-if="screen === 'playing'" />
      <PauseMenu v-else-if="screen === 'paused'" />
      <GameOver v-else-if="screen === 'over'" />
      <Hangar v-else-if="screen === 'hangar'" />
      <SettingsPanel v-else-if="screen === 'settings'" />
      <div v-if="screen === 'playing' && hud.cheat" :key="'cf'" class="cheat-flash" />
      <div v-if="screen === 'playing' && hud.glitch > 0" class="glitch" :style="{ opacity: hud.glitch }" />
      <div v-if="screen === 'playing' && hud.frost > 0.03" class="frost" :style="{ opacity: Math.min(1, hud.frost) }" />
      <div v-if="screen === 'playing' && hud.corrupt > 0.02" class="corrupt" :style="{ opacity: Math.min(1, hud.corrupt) }" />
      <div v-if="screen === 'playing' && hud.storm > 0" class="storm" :style="{ opacity: hud.storm }" />
      <div v-if="screen === 'playing'" class="hurt" :style="{ opacity: hud.hit }" />
      <div v-if="screen === 'playing'" class="warp" :style="{ opacity: Math.pow(hud.warp, 6), background: `radial-gradient(circle at center, #fff 0%, ${hud.flash} 100%)` }" />
      <OrientationHint v-if="hintScreens.includes(screen)" />
      <div v-if="toast" :key="toast.id" class="toast" role="status">{{ toast.text }}</div>
    </template>

    <AboutPage v-else-if="site.page.value === 'about'" />
    <TermsPage v-else-if="site.page.value === 'terms'" />
    <LicensePage v-else-if="site.page.value === 'license'" />
  </div>
</template>
