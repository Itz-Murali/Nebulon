<script setup lang="ts">
import { ArrowLeft } from 'lucide-vue-next'
defineProps<{ title: string; sub: string }>()
const { back } = useGame()
const frame = ref<HTMLElement | null>(null)
onMounted(() => reveal(frame.value, { y: 18, duration: 520 }))

</script>

<template>
  <section ref="frame" class="frame panel a-in">
    <header class="frame-head">
      <button class="icon-btn" aria-label="Back" @click="back()"><ArrowLeft :size="18" /></button>
      <div class="grow">
        <h2>{{ title }}</h2>
        <span class="muted">{{ sub }}</span>
      </div>
    </header>
    <div class="frame-body"><slot /></div>
  </section>
</template>
