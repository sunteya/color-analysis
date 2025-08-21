/// <reference types="node" />
import fs from 'fs/promises'
import path from 'path'
import { hex2oklch } from 'colorizr'
import YAML from 'yaml'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

type CNColor = { name: string; hex: string }

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
  const txt = await res.text()
  await fs.writeFile(destFile, txt, 'utf8')
}

function parseColorsFromYaml(yamlText: string): CNColor[] {
  const doc = YAML.parse(yamlText) as Array<{ name?: string; hex?: string }> | null
  if (!Array.isArray(doc)) return []
  const results: CNColor[] = []
  for (const item of doc) {
    if (!item) continue
    const name = item.name
    const hex = item.hex
    if (typeof name === 'string' && typeof hex === 'string' && /^#[0-9A-Fa-f]{6}$/.test(hex)) {
      results.push({ name, hex: hex.toLowerCase() })
    }
  }
  const uniq = new Map<string, CNColor>()
  for (const c of results) if (!uniq.has(c.hex)) uniq.set(c.hex, c)
  return Array.from(uniq.values())
}

async function main() {
  const URL = 'https://raw.githubusercontent.com/imoyao/GUSCSS/refs/heads/master/_data/colors.yml'
  const cwd = process.cwd()
  const tmpDir = path.resolve(cwd, 'tmp')
  const dataDir = path.resolve(cwd, 'data')
  await ensureDir(tmpDir)
  await ensureDir(dataDir)

  const tmpFile = path.join(tmpDir, 'guscss-colors.yml')
  await downloadIfNeeded(URL, tmpFile)

  const yaml = await fs.readFile(tmpFile, 'utf8')
  const colors = parseColorsFromYaml(yaml)
  const withOklch = colors.map(c => {
    const oklch = hex2oklch(c.hex)
    return { ...c, oklch: [oklch.l, oklch.c, oklch.h] as [number, number, number] }
  })
  const outFile = path.join(dataDir, '中国传统色.json')
  await fs.writeFile(outFile, JSON.stringify(withOklch, null, 2) + '\n', 'utf8')
  console.log(`Parsed ${withOklch.length} colors -> ${path.relative(cwd, outFile)}`)
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})


