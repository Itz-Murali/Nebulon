<script setup lang="ts">
const props = defineProps<{ to: string }>()
const site = useSite()

const onClick = (e: MouseEvent) => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
  e.preventDefault()
  site.open(props.to)
}

</script>

<template>
  <a :href="to" @click="onClick"><slot /></a>
</template>
