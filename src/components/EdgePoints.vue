<script setup lang="ts">
import { withDefaults } from 'vue'
import ColorPoint from '~/components/ColorPoint.vue'

interface PointLike { name: string; hex: string; x: number; y: number }

const props = withDefaults(defineProps<{
  points: PointLike[]
  customPoints?: PointLike[]
}>(), {
  customPoints: () => []
})
</script>

<template>
  <div class="absolute inset-0">
    <ColorPoint v-for="p in props.points" :key="'g'+p.name + p.hex" :color="p" :x="p.x" :y="p.y" />
    <ColorPoint v-for="p in props.customPoints" :key="'cg'+p.name + p.hex" :color="{ name: p.name, hex: p.hex }" :x="p.x" :y="p.y" :highlight="true" />
  </div>
</template>


