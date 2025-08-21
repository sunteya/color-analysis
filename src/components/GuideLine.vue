<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue'

const props = defineProps<{ modelValue: number }>()
const emit = defineEmits<{ 'update:modelValue': [value: number] }>()

const rootRef = ref<HTMLDivElement | null>(null)
let moving = false
let dragStartY = 0
let dragStartVal = 0

function clamp(v: number): number {
  if (v < 0) return 0
  if (v > 100) return 100
  return v
}

function setFromDelta(e: PointerEvent) {
  const el = rootRef.value
  if (!el) return
  const r = el.getBoundingClientRect()
  const deltaPx = e.clientY - dragStartY
  const deltaRatio = deltaPx / r.height
  const deltaVal = deltaRatio * 100
  const v = clamp(dragStartVal - deltaVal)
  emit('update:modelValue', v)
}

function onDown(e: PointerEvent) {
  moving = true
  ;(e.target as Element).setPointerCapture?.(e.pointerId)
  dragStartY = e.clientY
  dragStartVal = props.modelValue
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp, { once: true })
}
function onMove(e: PointerEvent) {
  if (!moving) return
  setFromDelta(e)
}
function onUp() {
  moving = false
  window.removeEventListener('pointermove', onMove)
}
onBeforeUnmount(() => window.removeEventListener('pointermove', onMove))
</script>

<template>
  <div ref="rootRef" class="absolute inset-0 pointer-events-none">
    <div
      class="absolute left-0 right-0 -translate-y-1/2 h-px bg-gray-400/40"
      :style="{ top: `calc(${100 - modelValue}% )` }"
    ></div>
    <div
      class="absolute -left-4 w-3 h-3 -translate-y-1/2 cursor-row-resize select-none pointer-events-auto z-10"
      :style="{ top: `calc(${100 - modelValue}% )` }"
      @pointerdown="onDown"
    >
      <div class="absolute inset-0 rounded bg-base-100 border border-base-300 shadow-sm"></div>
    </div>
    <div
      class="absolute -right-4 w-3 h-3 -translate-y-1/2 cursor-row-resize select-none pointer-events-auto z-10"
      :style="{ top: `calc(${100 - modelValue}% )` }"
      @pointerdown="onDown"
    >
      <div class="absolute inset-0 rounded bg-base-100 border border-base-300 shadow-sm"></div>
    </div>
  </div>
  
</template>


