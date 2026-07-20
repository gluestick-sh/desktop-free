#!/usr/bin/env node
/**
 * Locale maintenance for frontend/src/i18n/locales/*.json
 *
 *   npm run i18n:sync              Sync keys from en-US (add missing, drop stale)
 *   npm run i18n:check [locale…]   List strings still identical to en-US
 *   npm run i18n:fix [locale…]     Machine-translate those leftover English strings
 *   npm run i18n:generate          Full rebuild of non-zh locales via Google Translate
 *
 * Or: node scripts/i18n.mjs <sync|check|fix|generate> …
 *
 * Workflow: edit en-US.json → i18n:sync → i18n:fix (optional) → i18n:check
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { Converter } from 'opencc-js'

const LOCALES_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../src/i18n/locales',
)
const SOURCE_LOCALE = 'en-US'

/** BCP-47 → Google Translate language code. */
const GOOGLE_LANG_MAP = {
  'ja-JP': 'ja',
  'ko-KR': 'ko',
  'vi-VN': 'vi',
  'fr-FR': 'fr',
  'de-DE': 'de',
  'es-ES': 'es',
}

/** Maintained manually or via OpenCC — not Google-translated by default. */
const MANUAL_LOCALES = new Set(['zh-CN', 'zh-TW'])

/** Whole-string values that should stay identical to en-US. */
const KEEP_IDENTICAL_KEYS = new Set([
  'app.title',
  'pro.title',
  'footer.siteTitle',
  'doctor.check.git',
  'doctor.check.seven_zip',
  'doctor.check.innounp',
  'menu.localeZh',
  'settings.github.placeholder',
  'about.ok',
  'pro.badge',
  'theme.builtin.dracula',
  'theme.builtin.nord',
  'theme.builtin.solarized',
  'officialRecipes.items.vibe-coding.title',
  'officialRecipes.items.game-dev.title',
  'officialRecipes.items.cad-3d.title',
  'common.none',
  'common.dash',
])

/** Product / protocol / tool names kept verbatim (longest first). */
const PROPER_NOUNS = [
  'Gluestick Desktop Pro',
  'Gluestick Desktop',
  'Gluestick website',
  'Inno Setup',
  'Vibe Coding',
  'CAD / 3D',
  'Game Dev',
  'Java Dev',
  'VS Code',
  'Node.js',
  'OpenJDK',
  'PyCharm',
  'Miniconda',
  'FreeCAD',
  'Flaticon',
  'MinGit',
  'GitHub',
  'Blender',
  'innounp',
  'Godot',
  'Solarized',
  'Dracula',
  '7-Zip',
  'Maven',
  'Bucket',
  'WiX',
  'Nord',
  'Git',
  'PATH',
  'CLI',
  'CAS',
  'Pro',
].sort((a, b) => b.length - a.length)

const PROPER_NOUN_EXACT = new Set(PROPER_NOUNS)
const PLACEHOLDER_RE = /\{\{[^}]+\}\}/g
const TAG_RE = /<\/?(?:code|strong)>/g

function listLocaleCodes() {
  return fs
    .readdirSync(LOCALES_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.slice(0, -5))
    .sort()
}

function targetLocales() {
  return listLocaleCodes().filter((code) => code !== SOURCE_LOCALE)
}

function readLocale(code) {
  return JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, `${code}.json`), 'utf8'))
}

function readLocaleIfExists(code) {
  const filePath = path.join(LOCALES_DIR, `${code}.json`)
  if (!fs.existsSync(filePath)) return null
  return readLocale(code)
}

function writeLocale(code, data) {
  fs.writeFileSync(
    path.join(LOCALES_DIR, `${code}.json`),
    JSON.stringify(data, null, 2) + '\n',
  )
}

function flatten(obj, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, out)
    else out[key] = v
  }
  return out
}

function unflatten(flat) {
  const out = {}
  for (const [pathKey, value] of Object.entries(flat)) {
    const parts = pathKey.split('.')
    let cur = out
    for (let i = 0; i < parts.length - 1; i++) {
      cur[parts[i]] = cur[parts[i]] ?? {}
      cur = cur[parts[i]]
    }
    cur[parts[parts.length - 1]] = value
  }
  return out
}

function protectForTranslation(text) {
  const tokens = []
  let n = 0
  let protectedText = text
    .replace(PLACEHOLDER_RE, (m) => {
      const id = `__PH${n++}__`
      tokens.push({ id, value: m })
      return id
    })
    .replace(TAG_RE, (m) => {
      const id = `__TAG${n++}__`
      tokens.push({ id, value: m })
      return id
    })

  for (const term of PROPER_NOUNS) {
    if (!protectedText.includes(term)) continue
    const id = `__PN${n++}__`
    tokens.push({ id, value: term })
    protectedText = protectedText.split(term).join(id)
  }

  return { protectedText, tokens }
}

function restoreProtected(text, tokens) {
  let out = text
  for (const { id, value } of tokens) {
    out = out.replaceAll(id, value)
  }
  return out
}

function shouldSkipFullStringTranslate(text) {
  if (!text || typeof text !== 'string') return true
  if (text.includes('<code>') || text.includes('<strong>')) return false
  if (/^[\d\s\-–—·.,:;!?()[\]{}@#$%^&*+=|\\/<>~`"'«»…]+$/.test(text)) return true
  if (text.length <= 3 && /^[A-Za-z0-9.]+$/.test(text)) return true
  return PROPER_NOUN_EXACT.has(text)
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function googleTranslate(text, targetLang) {
  const url = new URL('https://translate.googleapis.com/translate_a/single')
  url.searchParams.set('client', 'gtx')
  url.searchParams.set('sl', 'en')
  url.searchParams.set('tl', targetLang)
  url.searchParams.set('dt', 't')
  url.searchParams.set('q', text)
  const res = await fetch(url.toString(), {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Gluestick/1.0)' },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  return data[0].map((part) => part[0]).join('')
}

function printHelp() {
  console.log(`Usage: node scripts/i18n.mjs <command> [args]

Commands:
  sync                 Align all locales to en-US keys (keep existing translations)
  check [locale…]      List keys still identical to en-US (likely untranslated)
  fix [locale…]        Machine-translate leftover English strings (after sync)
  generate             Full re-translate non-zh locales from en-US (rare)

npm aliases: i18n:sync | i18n:check | i18n:fix | i18n:generate`)
}

// ── sync ─────────────────────────────────────────────────────────────

function cmdSync() {
  const s2t = Converter({ from: 'cn', to: 'tw' })
  const en = readLocaleIfExists(SOURCE_LOCALE)
  if (!en) {
    console.error(`missing source: ${SOURCE_LOCALE}.json`)
    process.exit(1)
  }

  const enFlat = flatten(en)
  const zhCN = readLocaleIfExists('zh-CN')
  const zhCNFlat = zhCN ? flatten(zhCN) : {}

  console.log(`source: ${SOURCE_LOCALE}.json (${Object.keys(enFlat).length} keys)\n`)

  for (const code of targetLocales()) {
    const current = readLocaleIfExists(code)
    if (!current) {
      console.warn(`skip ${code}: file missing`)
      continue
    }

    const curFlat = flatten(current)
    const nextFlat = {}
    let added = 0
    let removed = 0
    let kept = 0

    for (const [key, enVal] of Object.entries(enFlat)) {
      if (key in curFlat) {
        nextFlat[key] = curFlat[key]
        kept++
      } else if (code === 'zh-TW' && zhCNFlat[key] && zhCNFlat[key] !== enVal) {
        nextFlat[key] = s2t(zhCNFlat[key])
        added++
      } else {
        nextFlat[key] = enVal
        added++
      }
    }

    for (const key of Object.keys(curFlat)) {
      if (!(key in enFlat)) removed++
    }

    writeLocale(code, unflatten(nextFlat))
    const parts = [`kept ${kept}`]
    if (added) parts.push(`+${added} new`)
    if (removed) parts.push(`-${removed} stale`)
    console.log(`${code}: ${parts.join(', ')}`)
  }

  console.log('\ndone')
}

// ── check ────────────────────────────────────────────────────────────

function cmdCheck(argv) {
  const enFlat = flatten(readLocale(SOURCE_LOCALE))
  const codes = argv.length ? argv : targetLocales()

  for (const code of codes) {
    const locFlat = flatten(readLocale(code))
    const same = []
    for (const [k, v] of Object.entries(enFlat)) {
      if (locFlat[k] === v) same.push({ key: k, en: v })
    }
    console.log(`\n=== ${code}: ${same.length} untranslated ===`)
    for (const { key, en: text } of same) {
      console.log(`${key}\t${String(text).slice(0, 80)}`)
    }
  }
}

// ── fix ──────────────────────────────────────────────────────────────

function fixBrokenPlaceholders(text, enText) {
  const enPh = [...enText.matchAll(PLACEHOLDER_RE)].map((m) => m[0])
  if (enPh.length === 0) return text
  const locPh = [...text.matchAll(PLACEHOLDER_RE)].map((m) => m[0])
  if (locPh.length !== enPh.length) return text
  let out = text
  for (let i = 0; i < enPh.length; i++) {
    if (locPh[i] !== enPh[i]) {
      out = out.replace(locPh[i], enPh[i])
    }
  }
  return out
}

function localesForGoogleFix(argv) {
  if (argv.length) return argv
  return targetLocales().filter((code) => GOOGLE_LANG_MAP[code])
}

async function cmdFix(argv) {
  const codes = localesForGoogleFix(argv)
  const enFlat = flatten(readLocale(SOURCE_LOCALE))

  for (const code of codes) {
    const lang = GOOGLE_LANG_MAP[code]
    if (!lang) {
      console.warn(`skip ${code}: unknown language code`)
      continue
    }

    const locFlat = flatten(readLocale(code))
    const toFix = []
    let placeholderFixes = 0

    for (const [key, enVal] of Object.entries(enFlat)) {
      const locVal = locFlat[key]
      if (typeof enVal !== 'string' || typeof locVal !== 'string') continue

      const fixedPh = fixBrokenPlaceholders(locVal, enVal)
      if (fixedPh !== locVal) {
        placeholderFixes++
        locFlat[key] = fixedPh
      }

      if (locFlat[key] === enVal && !KEEP_IDENTICAL_KEYS.has(key)) {
        toFix.push({ key, en: enVal })
      }
    }

    console.log(`\n[${code}] ${toFix.length} to translate, ${placeholderFixes} placeholder fixes`)

    let done = 0
    for (const { key, en: enText } of toFix) {
      const { protectedText, tokens } = protectForTranslation(enText)
      try {
        const translated = await googleTranslate(protectedText, lang)
        locFlat[key] = restoreProtected(translated, tokens)
      } catch (err) {
        console.warn(`  fail ${key}: ${err.message}`)
      }
      done++
      if (done % 10 === 0) {
        console.log(`  ${done}/${toFix.length}`)
        await sleep(150)
      } else {
        await sleep(60)
      }
    }

    writeLocale(code, unflatten(locFlat))
    console.log(`wrote ${code}.json`)
  }
}

// ── generate (full rebuild) ──────────────────────────────────────────

function collectStrings(obj, out = []) {
  for (const v of Object.values(obj)) {
    if (typeof v === 'string') out.push(v)
    else if (v && typeof v === 'object') collectStrings(v, out)
  }
  return out
}

function applyMap(obj, map) {
  if (typeof obj === 'string') return map.get(obj) ?? obj
  if (Array.isArray(obj)) return obj.map((x) => applyMap(x, map))
  const next = {}
  for (const [k, v] of Object.entries(obj)) {
    next[k] = applyMap(v, map)
  }
  return next
}

async function buildTranslationMap(strings, targetLang, label) {
  const unique = [...new Set(strings)]
  const map = new Map()
  let done = 0
  for (const s of unique) {
    if (shouldSkipFullStringTranslate(s)) {
      map.set(s, s)
      continue
    }
    try {
      const { protectedText, tokens } = protectForTranslation(s)
      const translated = await googleTranslate(protectedText, targetLang)
      map.set(s, restoreProtected(translated, tokens))
    } catch (err) {
      console.warn(`[${label}] fallback for: ${s.slice(0, 60)}… (${err.message})`)
      map.set(s, s)
    }
    done++
    if (done % 25 === 0) {
      console.log(`[${label}] ${done}/${unique.length}`)
      await sleep(200)
    } else {
      await sleep(50)
    }
  }
  return map
}

async function cmdGenerate() {
  const s2t = Converter({ from: 'cn', to: 'tw' })
  const en = readLocale(SOURCE_LOCALE)
  const zhCN = readLocale('zh-CN')
  const targets = targetLocales()
  const enStrings = collectStrings(en)

  if (targets.includes('zh-TW')) {
    const zhMap = new Map()
    for (const s of collectStrings(zhCN)) {
      zhMap.set(s, s2t(s))
    }
    writeLocale('zh-TW', applyMap(JSON.parse(JSON.stringify(zhCN)), zhMap))
    console.log('wrote zh-TW.json')
  }

  for (const code of targets) {
    if (MANUAL_LOCALES.has(code)) continue
    const lang = GOOGLE_LANG_MAP[code]
    if (!lang) {
      console.warn(`skip ${code}: add GOOGLE_LANG_MAP entry`)
      continue
    }
    console.log(`translating ${code} (${lang})…`)
    const map = await buildTranslationMap(enStrings, lang, code)
    writeLocale(code, applyMap(JSON.parse(JSON.stringify(en)), map))
    console.log(`wrote ${code}.json`)
  }
}

// ── main ─────────────────────────────────────────────────────────────

async function main() {
  const [cmd, ...argv] = process.argv.slice(2)
  if (!cmd || cmd === 'help' || cmd === '-h' || cmd === '--help') {
    printHelp()
    process.exit(cmd ? 0 : 1)
  }

  switch (cmd) {
    case 'sync':
      cmdSync()
      break
    case 'check':
      cmdCheck(argv)
      break
    case 'fix':
      await cmdFix(argv)
      break
    case 'generate':
      await cmdGenerate()
      break
    default:
      console.error(`unknown command: ${cmd}\n`)
      printHelp()
      process.exit(1)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
