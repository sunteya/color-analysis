<script setup lang="ts">
interface RawColor {
  name: string
  reading: string
  hex: string
}

const props = defineProps<{
  color: RawColor
  x: number
  y: number
}>()

const title = `${props.color.name} ${props.color.reading} ${props.color.hex}`
</script>

<template>
  <div
    class="absolute rounded-full ring-1 ring-black/10"
    :style="{
      left: `calc(${props.x}% - 3px)`,
      bottom: `calc(${props.y}% - 3px)`,
      width: '6px',
      height: '6px',
      backgroundColor: props.color.hex,
    }"
    :title="title"
  ></div>
</template>


