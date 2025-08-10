<script setup lang="ts">
import rawColors from '../../data/和色大辞典.json'
import * as utils from '~/lib/utils'
import ColorPoint from '~/components/ColorPoint.vue'
import { ref, computed, onBeforeUnmount } from 'vue'

interface RawColor { name: string; reading: string; hex: string }
type Base = RawColor & { h: number; l: number }
type Point = Base & { x: number; y: number }

const base: Base[] = (rawColors as RawColor[]).map(c => {
  const { r, g, b } = utils.hexToRgb(c.hex)
  const { h, l } = utils.rgbToHsl(r, g, b)
  return { ...c, h, l }
})

const hue = ref(0)
const points = computed<Point[]>(() => base.map(b => {
  const nh = ((b.h + hue.value) % 360 + 360) % 360
  return { ...b, x: (nh / 360) * 100, y: b.l }
}))

const barRef = ref<HTMLDivElement | null>(null)
let moving = false
let didMove = false
let dragStartX = 0
let dragStartHue = 0
const hueGradient = computed(() =>
  Array.from({ length: 37 })
    .map((_, i) => `hsl(${(((i * 10 - hue.value) % 360) + 360) % 360},100%,50%)`)
    .join(',')
)
function setHueFromDelta(e: PointerEvent) {
  const el = barRef.value
  if (!el) return
  const r = el.getBoundingClientRect()
  const deltaPx = e.clientX - dragStartX
  const deltaRatio = deltaPx / r.width
  const deltaHue = deltaRatio * 360
  hue.value = ((dragStartHue + deltaHue) % 360 + 360) % 360
}
function onDown(e: PointerEvent) {
  moving = true
  ;(e.target as Element).setPointerCapture?.(e.pointerId)
  dragStartX = e.clientX
  dragStartHue = hue.value
  didMove = false
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp, { once: true })
}
function onMove(e: PointerEvent) {
  if (!moving) return
  if (!didMove && Math.abs(e.clientX - dragStartX) > 3) didMove = true
  setHueFromDelta(e)
}
function onUp(e: PointerEvent) {
  if (!didMove) {
    const el = barRef.value
    if (el) {
      const r = el.getBoundingClientRect()
      const t = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))
      const screenDeg = t * 360
      const clickedHue = ((screenDeg - hue.value) % 360 + 360) % 360
      const newHue = ((180 - clickedHue) % 360 + 360) % 360
      hue.value = newHue
    }
  }
  moving = false
  window.removeEventListener('pointermove', onMove)
}
onBeforeUnmount(() => window.removeEventListener('pointermove', onMove))

function labelDeg(screenDeg: number): string {
  const v = ((screenDeg - hue.value) % 360 + 360) % 360
  return `${Math.round(v)}°`
}
</script>

<template>
  <main class="space-y-4">
    <h1 class="text-xl font-semibold">和色大辞典 色相-亮度 散点图</h1>
    <div class="relative w-full h-[600px] rounded-md bg-white">
      <div class="absolute left-8 right-8 top-8 bottom-24">
        <div class="absolute left-0 right-0 bottom-0 h-px bg-gray-400"></div>
        <div class="absolute left-0 top-0 bottom-0 w-px bg-gray-400"></div>

        <div class="absolute -bottom-6 left-0 text-xs text-gray-500">{{ labelDeg(0) }}</div>
        <div class="absolute -bottom-6 left-[33.33%] -translate-x-1/2 text-xs text-gray-500">{{ labelDeg(120) }}</div>
        <div class="absolute -bottom-6 left-[66.66%] -translate-x-1/2 text-xs text-gray-500">{{ labelDeg(240) }}</div>
        <div class="absolute -bottom-6 right-0 text-xs text-gray-500">{{ labelDeg(360) }}</div>

        <div class="absolute left-0 bottom-0 -translate-y-1/2 -translate-x-6 text-xs text-gray-500">0</div>
        <div class="absolute left-0 bottom-1/2 -translate-y-1/2 -translate-x-6 text-xs text-gray-500">50</div>
        <div class="absolute left-0 top-0 -translate-y-1/2 -translate-x-6 text-xs text-gray-500">100</div>

        <div class="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-10 text-sm text-gray-700">色相</div>
        <div class="absolute left-0 top-1/2 -translate-x-10 -translate-y-1/2 [writing-mode:vertical-rl] text-sm text-gray-700">亮度</div>

        <div class="absolute inset-0">
          <ColorPoint v-for="p in points" :key="p.name + p.hex" :color="p" :x="p.x" :y="p.y" />
        </div>
      </div>
      <div
        ref="barRef"
        class="absolute left-8 right-8 bottom-2 h-10 rounded-sm cursor-pointer select-none"
        @pointerdown="onDown"
      >
        <div class="absolute inset-x-0 top-1/2 -translate-y-1/2 h-6 overflow-hidden rounded">
          <div class="w-full h-full" :style="{ background: `linear-gradient(to right, ${hueGradient})` }"></div>
        </div>
        <div class="absolute inset-y-0" style="left: calc(50% - 1px)"><div class="w-[2px] h-full bg-black/60"></div></div>
      </div>
    </div>
  </main>
  
</template>


