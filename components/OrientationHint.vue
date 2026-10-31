<script setup lang="ts">
import { X } from 'lucide-vue-next'

const dismissed = useState('hint-dismissed', () => false)
const portrait = ref(false)
let mq: MediaQueryList | null = null
const update = () => (portrait.value = !!mq?.matches)

onMounted(() => {
  mq = window.matchMedia('(orientation: portrait)')
  update()
  mq.addEventListener('change', update)
})
onBeforeUnmount(() => mq?.removeEventListener('change', update))

</script>

<template>
  <div v-if="portrait && !dismissed" class="hint panel" role="status">
    <span>The game looks better in landscape. Rotate your device or widen the window.</span>
    <button class="icon-btn" aria-label="Dismiss" @click="dismissed = true"><X :size="16" /></button>
  </div>
</template>
