<script setup lang="ts">
import { LOGO_URL } from '~/game/brand'

defineProps<{ size?: 'hero' }>()
const emit = defineEmits<{ (e: 'tap'): void }>()
const failed = ref(false)

</script>

<template>
  <img v-if="!failed" class="logo" :class="{ 'logo-xl': size === 'hero' }" :src="LOGO_URL" alt="NEBULON: Infinite Frontier" draggable="false" @error="failed = true" @click="emit('tap')" />
  <div v-else class="logo-text" :class="{ 'logo-xl': size === 'hero' }" @click="emit('tap')">
    <h1>NEBULON</h1>
    <p class="sub">INFINITE FRONTIER</p>
  </div>
</template>
