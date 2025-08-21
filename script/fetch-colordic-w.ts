/// <reference types="node" />
import fs from 'fs/promises'
import path from 'path'
import { hex2oklch } from 'colorizr'

const URL_W = 'https://www.colordic.org/w'

type WaColor = {
  name: string
  reading: string
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

function parseColorsFromHtml(html: string): WaColor[] {
  const anchorRe = /<a[^>]*>([\s\S]*?)<\/a>/g
  const attrsRe = /<a([^>]*)>/
  const hrefHasSample = /href=\"[^\"]*\/colorsample\/[0-9]+\"/
  const titleAttr = /title=\"([^\"]*?)\"/
  const results: Map<string, WaColor> = new Map()

  for (let m: RegExpExecArray | null; (m = anchorRe.exec(html)); ) {
    const aTag = m[0]
    const attrsMatch = attrsRe.exec(aTag)
    if (!attrsMatch) continue
    const attrs = attrsMatch[1]
    if (!hrefHasSample.test(attrs)) continue
    const t = titleAttr.exec(attrs)
    if (!t) continue
    const title = t[1]
    const tm = title.match(/^\s*(.*?)\s+(.+?)\s+(#[0-9a-fA-F]{6})\s*$/)
    if (!tm) continue
    const hex = tm[3].toLowerCase()
    if (!results.has(hex)) results.set(hex, { name: tm[1], reading: tm[2], hex })
  }

  return Array.from(results.values())
}

async function main() {
  const cwd = process.cwd()
  const tmpDir = path.resolve(cwd, 'tmp')
  const dataDir = path.resolve(cwd, 'data')
  await ensureDir(tmpDir)
  await ensureDir(dataDir)

  const tmpFile = path.join(tmpDir, 'colordic-w.html')
  await downloadIfNeeded(URL_W, tmpFile)

  const html = await fs.readFile(tmpFile, 'utf8')
  const colors = parseColorsFromHtml(html)
  const withOklch = colors.map(c => {
    const oklch = hex2oklch(c.hex)
    return { ...c, oklch: [oklch.l, oklch.c, oklch.h] as [number, number, number] }
  })
  const outFile = path.join(dataDir, '和色大辞典.json')
  await fs.writeFile(outFile, JSON.stringify(withOklch, null, 2) + '\n', 'utf8')
  console.log(`Parsed ${withOklch.length} colors -> ${path.relative(cwd, outFile)}`)
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})


