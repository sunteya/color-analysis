<script setup lang="ts">
import rawJP from '../../data/和色大辞典.json'
import rawYO from '../../data/洋色大辞典.json'
import rawCN from '../../data/中国传统色.json'
import ColorPoint from '~/components/ColorPoint.vue'
import EdgePoints from '~/components/EdgePoints.vue'
import GuideLine from '~/components/GuideLine.vue'
import { ref, computed, onBeforeUnmount, watch, onMounted } from 'vue'
import Colorizr, { isValidColor } from 'colorizr'

interface RawColor { name: string; hex: string; oklch: number[]; reading?: string }
type Base = RawColor & { h: number; c: number; l: number }
type Point = Base & { x: number; y: number }

const tabs = [
  { key: 'jp', label: '和色大辞典', data: rawJP as RawColor[] },
  { key: 'yo', label: '洋色大辞典', data: rawYO as RawColor[] },
  { key: 'cn', label: '中国传统色', data: rawCN as RawColor[] },
  { key: 'empty', label: '空', data: [] as RawColor[] },
]

const currentTab = ref<'jp' | 'yo' | 'cn' | 'empty'>('jp')
const currentLabel = computed(() => tabs.find(t => t.key === currentTab.value)!.label)
const checkedKeys = ref<('jp' | 'yo' | 'cn')[]>([])
const selected = computed<RawColor[]>(() => {
  if (checkedKeys.value.length === 0) return []
  return checkedKeys.value.flatMap(k => (tabs.find(t => t.key === k)!.data as RawColor[]))
})

onMounted(() => {
  const first = tabs.slice(0, 3)[0].key as 'jp' | 'yo' | 'cn'
  currentTab.value = first
  if (!checkedKeys.value.includes(first)) checkedKeys.value.push(first)
})

const base = computed<Base[]>(() => selected.value.map(c => { const [L, C, H] = c.oklch; return { ...c, h: H, c: C, l: L * 100 } }))

const chromaMin = ref(0)
const chromaMax = ref(0.37)
const chromaMinPct = ref(0)
const chromaMaxPct = ref(100)
watch(chromaMinPct, v => { if (v > chromaMaxPct.value) chromaMinPct.value = chromaMaxPct.value; chromaMin.value = (chromaMinPct.value / 100) * 0.37 })
watch(chromaMaxPct, v => { if (v < chromaMinPct.value) chromaMaxPct.value = chromaMinPct.value; chromaMax.value = (chromaMaxPct.value / 100) * 0.37 })
watch(chromaMin, v => { if (v > chromaMax.value) chromaMin.value = chromaMax.value })
watch(chromaMax, v => { if (v < chromaMin.value) chromaMax.value = chromaMin.value })

const hue = ref(0)
const chromaPoints = computed<Point[]>(() => base.value.filter(b => b.c > chromaMin.value && b.c <= chromaMax.value).map(b => { const nh = ((b.h + hue.value) % 360 + 360) % 360; return { ...b, x: (nh / 360) * 100, y: b.l } }))
const grayPoints = computed<Point[]>(() => base.value.filter(b => b.c <= chromaMin.value).map(b => ({ ...b, x: 50, y: b.l })))
const rightGrayPoints = computed<Point[]>(() => base.value.filter(b => b.c > chromaMax.value).map(b => ({ ...b, x: 50, y: b.l })))

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
    .map((_, i) => `oklch(70% 0.15 ${(((i * 10 - hue.value) % 360) + 360) % 360}deg)`) 
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

const hoverPoint = ref<{ x: number; y: number; hex: string } | null>(null)
  const indicator = computed(() => hoverPoint.value)

const leftBlankPx: number = 40
const rightBlankPx: number = 40

  const batchOpen = ref(false)
  const batchText = ref('')
  const customBatchBase = ref<{ name: string; hex: string; h: number; c: number; l: number }[]>([])
  function parseHex(text: string): string | null {
    const t = text.trim()
    const hex = t.startsWith('#') ? t : `#${t}`
    return isValidColor(hex) ? hex : null
  }
  function confirmBatch() {
    const lines = batchText.value.split(/\r?\n/).map(l => l.trim()).filter(l => l)
    const items: { name: string; hex: string; h: number; c: number; l: number }[] = []
    let idx = 1
    for (const line of lines) {
      let name = ''
      let colorText = ''
      const m = line.match(/^(.*?)\s*[:=]\s*(.+)$/)
      if (m) {
        name = m[1].trim()
        colorText = m[2].trim()
      } else {
        colorText = line
      }
      const hex = parseHex(colorText)
      if (!hex) continue
      const color = new Colorizr(hex)
      const { l: L, c: C, h: H } = color.oklch
      items.push({ name: name || `自定义${idx++}`, hex, h: H, c: C, l: L * 100 })
    }
    customBatchBase.value = items
    batchOpen.value = false
  }
  const customBatchChromaPoints = computed(() => customBatchBase.value
    .filter(b => b.c > chromaMin.value && b.c <= chromaMax.value)
    .map(b => { const nh = ((b.h + hue.value) % 360 + 360) % 360; return { ...b, x: (nh / 360) * 100, y: b.l } }))
  const customBatchGrayPoints = computed(() => customBatchBase.value
    .filter(b => b.c <= chromaMin.value)
    .map(b => ({ ...b, x: 50, y: b.l })))
  const customBatchRightGrayPoints = computed(() => customBatchBase.value
    .filter(b => b.c > chromaMax.value)
    .map(b => ({ ...b, x: 50, y: b.l })))

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
    <div class="navbar bg-base-100 shadow">
      <div class="navbar-start">
        <div class="join">
          <button
            v-for="t in tabs.slice(0,3)"
            :key="t.key"
            class="btn btn-sm join-item btn-ghost"
            @click="() => { const k = t.key as any; checkedKeys.splice(0, checkedKeys.length, k); currentTab = k }"
          >
            <input
              type="checkbox"
              class="checkbox checkbox-xs mr-2"
              :checked="checkedKeys.includes(t.key as any)"
              @click.stop
              @change.stop="e => { const k = t.key as any; const c = (e.target as HTMLInputElement).checked; if (c) { if (!checkedKeys.includes(k)) checkedKeys.push(k) } else { const i = checkedKeys.indexOf(k); if (i > -1) checkedKeys.splice(i, 1) } }"
            />
            {{ t.label }}
          </button>
        </div>
      </div>
      <div class="navbar-end">
        <button class="btn btn-sm" @click="batchOpen = true">批量输入</button>
      </div>
    </div>
    <div class="flex items-center gap-4 px-1">
      <div class="text-sm text-gray-700">色度 C</div>
      <div class="flex items-center gap-2">
        <input v-model.number="chromaMinPct" type="range" min="0" max="100" step="1" class="range range-xs w-40" />
        <div class="w-10 text-right text-xs text-gray-600">{{ Math.round(chromaMinPct) }}%</div>
      </div>
      <div class="flex items-center gap-2">
        <input v-model.number="chromaMaxPct" type="range" min="0" max="100" step="1" class="range range-xs w-40" />
        <div class="w-10 text-right text-xs text-gray-600">{{ Math.round(chromaMaxPct) }}%</div>
      </div>
    </div>
    <div class="relative w-full h-[600px] rounded-box bg-base-100 shadow">
      <div ref="plotRef" class="absolute left-12 right-12 top-8 bottom-24" @pointerdown="onPlotDown" @wheel.passive="onWheel">
        <div class="absolute left-0 right-0 bottom-0 h-px bg-gray-400"></div>
        <div class="absolute left-0 top-0 bottom-0 w-px bg-gray-400"></div>
        <div class="absolute right-0 top-0 bottom-0 w-px bg-gray-400"></div>
        <div class="absolute top-0 bottom-0 w-px bg-gray-400" :style="{ left: leftBlankPx + 'px' }"></div>
        <div class="absolute top-0 bottom-0 w-px bg-gray-400" :style="{ right: rightBlankPx + 'px' }"></div>
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

        <div class="absolute top-0 bottom-0" :style="{ left: leftBlankPx + 'px', right: rightBlankPx + 'px' }">
          <div class="absolute -bottom-6 left-0 text-xs text-gray-500">{{ labelDeg(0) }}</div>
          <div class="absolute -bottom-6 left-[33.33%] -translate-x-1/2 text-xs text-gray-500">{{ labelDeg(120) }}</div>
          <div class="absolute -bottom-6 left-[66.66%] -translate-x-1/2 text-xs text-gray-500">{{ labelDeg(240) }}</div>
          <div class="absolute -bottom-6 right-0 text-xs text-gray-500">{{ labelDeg(360) }}</div>

          <div class="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-10 text-sm text-gray-700">色相</div>

          <div class="absolute inset-0">
            <ColorPoint v-for="p in chromaPoints" :key="p.name + p.hex" :color="p" :x="p.x" :y="p.y" @hover="v => hoverPoint = v" />
            <ColorPoint v-for="p in customBatchChromaPoints" :key="'c'+p.name + p.hex" :color="{ name: p.name, hex: p.hex }" :x="p.x" :y="p.y" :highlight="true" @hover="v => hoverPoint = v" />
            <template v-if="indicator">
              <div class="absolute pointer-events-none" :style="{ left: `calc(${indicator.x}% - 0.5px)`, bottom: '-4px' }"><div class="w-[1px] h-2 bg-black/70"></div></div>
              <div class="absolute pointer-events-none" :style="{ left: '-4px', bottom: `calc(${indicator.y}% - 0.5px)` }"><div class="w-2 h-[1px] bg-black/70"></div></div>
            </template>
          </div>
        </div>

        <div class="absolute top-0 bottom-0" :style="{ left: 0, width: leftBlankPx + 'px' }">
          <EdgePoints :points="grayPoints" :custom-points="customBatchGrayPoints" />
        </div>

        <div class="absolute top-0 bottom-0" :style="{ right: 0, width: rightBlankPx + 'px' }">
          <EdgePoints :points="rightGrayPoints" :custom-points="customBatchRightGrayPoints" />
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

    <div :class="['modal', { 'modal-open': batchOpen }]" @click.self="batchOpen = false">
      <div class="modal-box">
        <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" @click="batchOpen = false">✕</button>
        <div class="font-medium">批量输入颜色</div>
        <div class="text-sm text-gray-600 mt-2 mb-3">每行一种颜色，支持 “名字=颜色”、“名字: 颜色” 或仅填写颜色（#RGB 或 #RRGGBB）。</div>
        <textarea v-model="batchText" class="textarea textarea-bordered w-full h-56 font-mono text-sm" placeholder="示例:\n樱花=#ffb3c1\n天蓝: #87ceeb\n#222\n0077ff"></textarea>
        <div class="modal-action">
          <button class="btn" @click="batchOpen = false">取消</button>
          <button class="btn btn-primary" @click="confirmBatch">确定</button>
        </div>
      </div>
    </div>
  </main>
</template>
