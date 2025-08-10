<script setup lang="ts">
import { ref } from 'vue'
import { useFloating, autoUpdate, offset, flip, shift } from '@floating-ui/vue'
interface RawColor {
  name: string
  hex: string
  reading?: string
}

const props = defineProps<{
  color: RawColor
  x: number
  y: number
  highlight?: boolean
}>()
const emit = defineEmits<{ hover: [value: { x: number; y: number; hex: string } | null] }>()

const referenceRef = ref<HTMLElement | null>(null)
const floatingRef = ref<HTMLElement | null>(null)
const open = ref(false)

const { x, y, strategy } = useFloating(referenceRef, floatingRef, {
  placement: 'top',
  whileElementsMounted: autoUpdate,
  middleware: [offset(8), flip(), shift()]
})

function onClick() {
  navigator.clipboard?.writeText(props.color.hex)
}
function onEnter() {
  open.value = true
  emit('hover', { x: props.x, y: props.y, hex: props.color.hex })
}
function onLeave() {
  open.value = false
  emit('hover', null)
}
</script>

<template>
  <div class="absolute" :style="{ left: `calc(${props.x}% - 3px)`, bottom: `calc(${props.y}% - 3px)` }">
    <div
      ref="referenceRef"
      class="rounded-full cursor-pointer"
      :class="(open || props.highlight) ? 'ring-2 ring-black/40' : 'ring-1 ring-black/10'"
      :style="{ width: '6px', height: '6px', backgroundColor: props.color.hex }"
      @mouseenter="onEnter"
      @mouseleave="onLeave"
      @click="onClick"
    ></div>
    <div
      v-if="open"
      ref="floatingRef"
      class="z-50 px-2 py-1 text-sm rounded bg-black/80 text-white shadow select-none"
      :style="{ position: strategy, left: `${x ?? 0}px`, top: `${y ?? 0}px` }"
    >
      <div class="flex items-center gap-2">
        <span class="inline-block w-3 h-5 rounded" :style="{ backgroundColor: props.color.hex }"></span>
        <div class="leading-tight">
          <div class="whitespace-nowrap">{{ props.color.name }}</div>
          <div v-if="props.color.reading" class="mt-0.5 text-xs opacity-75 leading-tight whitespace-nowrap">{{ props.color.reading }}</div>
          <div class="mt-0.5 opacity-90">{{ props.color.hex }}</div>
        </div>
      </div>
    </div>
  </div>
</template>
