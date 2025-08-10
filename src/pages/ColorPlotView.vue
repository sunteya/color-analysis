<script setup lang="ts">
import rawJP from '../../data/和色大辞典.json'
import rawYO from '../../data/洋色大辞典.json'
import rawCN from '../../data/中国传统色.json'
import ColorPoint from '~/components/ColorPoint.vue'
import GuideLine from '~/components/GuideLine.vue'
import { ref, computed, onBeforeUnmount } from 'vue'
import { hexToRgb, rgbToHsl } from '~/lib/utils'

interface RawColor { name: string; hex: string; hsl: [number, number, number]; reading?: string }
type Base = RawColor & { h: number; s: number; l: number }
type Point = Base & { x: number; y: number }

const tabs = [
  { key: 'jp', label: '和色大辞典', data: rawJP as RawColor[] },
  { key: 'yo', label: '洋色大辞典', data: rawYO as RawColor[] },
  { key: 'cn', label: '中国传统色', data: rawCN as RawColor[] },
]

const currentTab = ref<'jp' | 'yo' | 'cn'>('jp')
const currentLabel = computed(() => tabs.find(t => t.key === currentTab.value)!.label)
const selected = computed<RawColor[]>(() => tabs.find(t => t.key === currentTab.value)!.data)

const base = computed<Base[]>(() => selected.value.map(c => { const [h, s, l] = c.hsl; return { ...c, h, s, l } }))

const hue = ref(0)
const chromaPoints = computed<Point[]>(() => base.value.filter(b => b.s > 2).map(b => { const nh = ((b.h + hue.value) % 360 + 360) % 360; return { ...b, x: (nh / 360) * 100, y: b.l } }))
const grayPoints = computed<Point[]>(() => base.value.filter(b => b.s <= 2).map(b => ({ ...b, x: 50, y: b.l })))

const barRef = ref<HTMLDivElement | null>(null)
const plotRef = ref<HTMLDivElement | null>(null)
let moving = false
let didMove = false
let dragStartX = 0
let dragStartHue = 0
let plotMoving = false
let plotDidMove = false
let plotDragStartX = 0
let plotDragStartHue = 0
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
  hue.value = dragStartHue + deltaHue
}
function setHueFromPlotDelta(e: PointerEvent) {
  const el = plotRef.value
  if (!el) return
  const r = el.getBoundingClientRect()
  const deltaPx = e.clientX - plotDragStartX
  const deltaRatio = deltaPx / r.width
  const deltaHue = deltaRatio * 360
  hue.value = plotDragStartHue + deltaHue
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
      const newHue = hue.value + ((180 - clickedHue) % 360)
      hue.value = newHue
    }
  }
  moving = false
  window.removeEventListener('pointermove', onMove)
}
onBeforeUnmount(() => window.removeEventListener('pointermove', onMove))

const guide = ref(50)
const guides = ref<number[]>([])
function addGuideNearBottom() {
  const v = 8
  guides.value.push(v)
}
function onClickLeftStub() {
  addGuideNearBottom()
}
function onClickRightStub() {
  addGuideNearBottom()
}

function labelDeg(screenDeg: number): string {
  const v = ((screenDeg - hue.value) % 360 + 360) % 360
  return `${Math.round(v)}°`
}

const customHexInput = ref('')
const custom = computed<{ hex: string; x: number; y: number } | null>(() => {
  const t = customHexInput.value.trim()
  if (!t) return null
  const cleaned = t.replace(/^#/, '')
  if (!/^([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(cleaned)) return null
  const hex = `#${cleaned}`
  const { r, g, b } = hexToRgb(hex)
  const { h, l } = rgbToHsl(r, g, b)
  const nh = ((h + hue.value) % 360 + 360) % 360
  return { hex, x: (nh / 360) * 100, y: l }
})

const hoverPoint = ref<{ x: number; y: number; hex: string } | null>(null)
const indicator = computed(() => hoverPoint.value ?? custom.value)

const leftBlankPx: number = 40

function onPlotDown(e: PointerEvent) {
  // ignore extremely small areas if needed; otherwise start drag
  plotMoving = true
  ;(e.target as Element).setPointerCapture?.(e.pointerId)
  plotDragStartX = e.clientX
  plotDragStartHue = hue.value
  plotDidMove = false
  const onPlotMove = (ev: PointerEvent) => {
    if (!plotMoving) return
    if (!plotDidMove && Math.abs(ev.clientX - plotDragStartX) > 3) plotDidMove = true
    setHueFromPlotDelta(ev)
  }
  const onPlotUp = () => {
    plotMoving = false
    window.removeEventListener('pointermove', onPlotMove)
  }
  window.addEventListener('pointermove', onPlotMove)
  window.addEventListener('pointerup', onPlotUp, { once: true })
}

function onWheel(e: WheelEvent) {
  const el = plotRef.value
  if (!el) return
  const r = el.getBoundingClientRect()
  const deltaHue = (e.deltaX / r.width) * 360
  hue.value = hue.value - deltaHue
}

function onBarWheel(e: WheelEvent) {
  const el = barRef.value
  if (!el) return
  const r = el.getBoundingClientRect()
  const deltaHue = (e.deltaX / r.width) * 360
  hue.value = hue.value - deltaHue
}
</script>

<template>
  <main class="space-y-4">
    <div class="flex items-center gap-2 justify-between">
      <div class="inline-flex rounded bg-gray-200 p-1">
        <button
          v-for="t in tabs"
          :key="t.key"
          class="px-3 py-1 rounded text-sm"
          :class="currentTab === t.key ? 'bg-white shadow' : 'text-gray-700'
          "
          @click="currentTab = t.key as any"
        >{{ t.label }}</button>
      </div>
      <h1 class="ml-3 text-xl font-semibold">{{ currentLabel }} 色相-亮度 散点图</h1>
      <div class="ml-auto">
        <input
          v-model="customHexInput"
          class="px-2 py-1 rounded border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black/20"
          type="text"
          placeholder="#RRGGBB"
        />
      </div>
    </div>
    <div class="relative w-full h-[600px] rounded-md bg-white">
      <div ref="plotRef" class="absolute left-12 right-12 top-8 bottom-24" @pointerdown="onPlotDown" @wheel.passive="onWheel">
        <div class="absolute left-0 right-0 bottom-0 h-px bg-gray-400"></div>
        <div class="absolute left-0 top-0 bottom-0 w-px bg-gray-400"></div>
        <div class="absolute right-0 top-0 bottom-0 w-px bg-gray-400"></div>
        <div class="absolute top-0 bottom-0 w-px bg-gray-400" :style="{ left: leftBlankPx + 'px' }"></div>
        <div class="absolute bottom-0 -left-3 w-3 h-3 cursor-pointer" @click="onClickLeftStub">
          <div class="absolute inset-x-0 bottom-0 h-px bg-gray-400"></div>
        </div>
        <div class="absolute bottom-0 -right-3 w-3 h-3 cursor-pointer" @click="onClickRightStub">
          <div class="absolute inset-x-0 bottom-0 h-px bg-gray-400"></div>
        </div>
        <GuideLine v-model="guide" />
        <GuideLine
          v-for="(g, i) in guides"
          :key="'g'+i"
          :model-value="g"
          @update:modelValue="v => guides[i] = v"
        />

        <div class="absolute top-0 bottom-0 right-0" :style="{ left: leftBlankPx + 'px' }">
          <div class="absolute -bottom-6 left-0 text-xs text-gray-500">{{ labelDeg(0) }}</div>
          <div class="absolute -bottom-6 left-[33.33%] -translate-x-1/2 text-xs text-gray-500">{{ labelDeg(120) }}</div>
          <div class="absolute -bottom-6 left-[66.66%] -translate-x-1/2 text-xs text-gray-500">{{ labelDeg(240) }}</div>
          <div class="absolute -bottom-6 right-0 text-xs text-gray-500">{{ labelDeg(360) }}</div>

          <div class="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-10 text-sm text-gray-700">色相</div>

          <div class="absolute inset-0">
            <ColorPoint v-for="p in chromaPoints" :key="p.name + p.hex" :color="p" :x="p.x" :y="p.y" @hover="v => hoverPoint = v" />
            <ColorPoint v-if="custom" :color="{ name: 'Custom', hex: custom.hex }" :x="custom.x" :y="custom.y" :highlight="true" @hover="v => hoverPoint = v" />
            <template v-if="indicator">
              <div class="absolute pointer-events-none" :style="{ left: `calc(${indicator.x}% - 0.5px)`, bottom: '-4px' }"><div class="w-[1px] h-2 bg-black/70"></div></div>
              <div class="absolute pointer-events-none" :style="{ left: '-4px', bottom: `calc(${indicator.y}% - 0.5px)` }"><div class="w-2 h-[1px] bg-black/70"></div></div>
            </template>
          </div>
        </div>

        <div class="absolute top-0 bottom-0" :style="{ left: 0, width: leftBlankPx + 'px' }">
          <div class="absolute inset-0">
            <ColorPoint v-for="p in grayPoints" :key="'g'+p.name + p.hex" :color="p" :x="p.x" :y="p.y" />
          </div>
        </div>

        <div class="absolute left-0 bottom-0 -translate-y-1/2 -translate-x-6 text-xs text-gray-500">0</div>
        <div class="absolute left-0 bottom-1/2 -translate-y-1/2 -translate-x-6 text-xs text-gray-500">50</div>
        <div class="absolute left-0 top-0 -translate-y-1/2 -translate-x-6 text-xs text-gray-500">100</div>

        <div class="absolute left-0 top-1/2 -translate-x-10 -translate-y-1/2 [writing-mode:vertical-rl] text-sm text-gray-700">亮度</div>
        <div class="absolute right-0 top-1/2 translate-x-10 -translate-y-1/2 [writing-mode:vertical-rl] text-sm text-gray-700">亮度</div>
      </div>
      <div
        ref="barRef"
        class="absolute left-12 right-12 bottom-2 h-10 rounded-sm cursor-pointer select-none"
        @pointerdown="onDown"
        @wheel.passive="onBarWheel"
      >
        <div class="absolute inset-x-0 top-1/2 -translate-y-1/2 h-6 overflow-hidden rounded">
          <div class="w-full h-full" :style="{ background: `linear-gradient(to right, ${hueGradient})` }"></div>
        </div>
        <div class="absolute inset-y-0" style="left: calc(50% - 1px)"><div class="w-[2px] h-full bg-black/60"></div></div>
      </div>
    </div>
  </main>
  
</template>


