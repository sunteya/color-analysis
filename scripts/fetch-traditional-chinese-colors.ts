/// <reference types="node" />
import fs from 'fs/promises'
import path from 'path'
import { hexToRgb, rgbToHsl } from '../src/lib/utils'

type TradColor = {
  name: string
  hex: string
}

async function ensureDir(dirPath: string) {
  await fs.mkdir(dirPath, { recursive: true })
}

async function fileExists(filePath: string) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

async function downloadIfNeeded(url: string, destFile: string) {
  if (await fileExists(destFile)) return
  const res = await fetch(url, { headers: { 'user-agent': 'color-analysis/1.0' } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const html = await res.text()
  await fs.writeFile(destFile, html, 'utf8')
}

function parseColorsFromHtml(html: string): TradColor[] {
  const doc = html
  const colorArticles = doc.match(/<article id="[^"]+">[\s\S]*?<\/article>/g) || []
  const results: TradColor[] = []

  for (const block of colorArticles) {
    const nameMatch = block.match(/<h1>([^<]+)<\/h1>/)
    const hexMatch = block.match(/<p>\s*(#[0-9A-Fa-f]{6})\s*<\/p>/)
    if (nameMatch && hexMatch) {
      results.push({ name: nameMatch[1], hex: hexMatch[1].toLowerCase() })
    }
  }

  // De-duplicate by hex preserving the first occurrence
  const uniq = new Map<string, TradColor>()
  for (const c of results) if (!uniq.has(c.hex)) uniq.set(c.hex, c)
  return Array.from(uniq.values())
}

async function main() {
  const URL = 'https://boxingp.github.io/traditional-chinese-colors/'
  const cwd = process.cwd()
  const tmpDir = path.resolve(cwd, 'tmp')
  const dataDir = path.resolve(cwd, 'data')
  await ensureDir(tmpDir)
  await ensureDir(dataDir)

  const tmpFile = path.join(tmpDir, 'traditional-chinese-colors.html')
  await downloadIfNeeded(URL, tmpFile)

  const html = await fs.readFile(tmpFile, 'utf8')
  const colors = parseColorsFromHtml(html)
  const withHsl = colors.map(c => {
    const { r, g, b } = hexToRgb(c.hex)
    const { h, s, l } = rgbToHsl(r, g, b)
    return { ...c, h, s, l }
  })
  const outFile = path.join(dataDir, '中国传统颜色.json')
  await fs.writeFile(outFile, JSON.stringify(withHsl, null, 2) + '\n', 'utf8')
  console.log(`Parsed ${withHsl.length} colors -> ${path.relative(cwd, outFile)}`)
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})


