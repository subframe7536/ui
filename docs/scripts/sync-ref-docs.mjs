import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DOCS_DIR = path.resolve(__dirname, '..')
const REPO_ROOT = path.resolve(DOCS_DIR, '..')
const REF_ROOT = path.join(REPO_ROOT, 'ref/ui-sdk')
const REF_DOCS_CONTENT = path.join(REF_ROOT, 'apps/docs/content/docs')
const REF_EXAMPLES = path.join(REF_ROOT, 'examples')
const REF_SPECS = path.join(REF_ROOT, 'tests/specs')

const OUT_EXAMPLES = path.join(DOCS_DIR, 'src/examples')
const OUT_GENERATED = path.join(DOCS_DIR, 'src/generated')

fs.mkdirSync(OUT_GENERATED, { recursive: true })
fs.mkdirSync(OUT_EXAMPLES, { recursive: true })
const CUSTOM_EXAMPLES = path.join(DOCS_DIR, "src/examples-custom")
if (fs.existsSync(CUSTOM_EXAMPLES)) {
  fs.cpSync(CUSTOM_EXAMPLES, OUT_EXAMPLES, { recursive: true })
}

// ---------------------------------------------------------------------------
// 1. Parse CSS variables map from ref/ui-sdk/apps/docs/lib/css-variables.ts
// ---------------------------------------------------------------------------
function loadCssVariablesMap() {
  const file = path.join(REF_ROOT, 'apps/docs/lib/css-variables.ts')
  const src = fs.readFileSync(file, 'utf8')

  const positioned = [
    '--anchor-width',
    '--anchor-height',
    '--available-width',
    '--available-height',
    '--transform-origin',
    '--arrow-offset',
  ]
  const sheetMotion = ['--drawer-progress', '--drawer-dim', '--drawer-expand']
  const keyboard = [
    '--keyboard-inset',
    '--visual-viewport-width',
    '--visual-viewport-height',
    '--visual-viewport-top',
  ]

  const descMap = {}
  const descBlockMatch = src.match(/const descriptions[^=]*=\s*\{([\s\S]*?)\n\}/)
  if (descBlockMatch) {
    for (const m of descBlockMatch[1].matchAll(/["'](--[^"']+)["']\s*:\s*["']([^"']+)["']/g)) {
      descMap[m[1]] = m[2]
    }
  }

  const compMap = {}
  const compBlockMatch = src.match(/const components[^=]*=\s*\{([\s\S]*?)\n\}/)
  if (compBlockMatch) {
    const body = compBlockMatch[1]
    const entries = [...body.matchAll(/^\s{2}["']?([a-z-]+)["']?\s*:\s*/gm)]
    for (let i = 0; i < entries.length; i++) {
      const name = entries[i][1]
      const start = entries[i].index + entries[i][0].length
      const end = i + 1 < entries.length ? entries[i + 1].index : body.length
      const chunk = body.slice(start, end)
      const parts = {}

      if (chunk.includes('sheetPopup(')) {
        parts.content = [...positioned, ...sheetMotion, '--drawer-stack', '--sheet-backdrop']
        parts.viewport = [...keyboard]
      } else {
        for (const pm of chunk.matchAll(
          /part:\s*["']([^"']+)["'][\s\S]*?variables:\s*(\[[\s\S]*?\]|[a-zA-Z0-9_]+)/g,
        )) {
          const partName = pm[1]
          const valRaw = pm[2]
          const vars = []
          if (valRaw === 'positioned') {
            vars.push(...positioned)
          } else if (valRaw === 'sheetMotion') {
            vars.push(...sheetMotion)
          } else if (valRaw === 'keyboard') {
            vars.push(...keyboard)
          } else {
            if (valRaw.includes('...positioned')) vars.push(...positioned)
            if (valRaw.includes('...sheetMotion')) vars.push(...sheetMotion)
            if (valRaw.includes('...keyboard')) vars.push(...keyboard)
            for (const vm of valRaw.matchAll(/["'](--[^"']+)["']/g)) {
              vars.push(vm[1])
            }
          }
          parts[partName] = [...new Set([...(parts[partName] || []), ...vars])]
        }
      }
      compMap[name] = parts
    }
  }

  return { compMap, descMap }
}

const { compMap: CSS_VARS_MAP, descMap: CSS_VAR_DESCS } = loadCssVariablesMap()

function getCssVariables(component, part) {
  const comp = CSS_VARS_MAP[component]
  if (!comp) return []
  const vars = part ? comp[part] || [] : Object.values(comp).flat()
  return [...new Set(vars)].map((v) => ({
    name: v,
    description: CSS_VAR_DESCS[v] || '',
  }))
}

// ---------------------------------------------------------------------------
// 2. Extract Data Attributes per component/part from src/<comp>.tsx & core
// ---------------------------------------------------------------------------
const COMMON_DATA_ATTR_DESCS = {
  'data-slot': 'Identifies the part for styling.',
  'data-open': 'Present when open.',
  'data-closed': 'Present when closed.',
  'data-starting-style': 'Present on the first frame while opening for enter transitions.',
  'data-ending-style': 'Present while closing until the exit transition finishes.',
  'data-disabled': 'Present when disabled.',
  'data-readonly': 'Present when read-only.',
  'data-required': 'Present when required.',
  'data-invalid': 'Present when invalid.',
  'data-checked': 'Present when checked.',
  'data-unchecked': 'Present when unchecked.',
  'data-indeterminate': 'Present when in an indeterminate state.',
  'data-pressed': 'Present when pressed.',
  'data-selected': 'Present when selected.',
  'data-highlighted': 'Present when highlighted via pointer or keyboard.',
  'data-active': 'Present when active.',
  'data-focus': 'Present when focused.',
  'data-focus-visible': 'Present when focused via keyboard.',
  'data-dragging': 'Present while dragging.',
  'data-orientation': 'The layout orientation ("horizontal" or "vertical").',
  'data-side': 'The rendered side relative to the anchor ("top", "right", "bottom", "left").',
  'data-align': 'The rendered alignment relative to the anchor ("start", "center", "end").',
  'data-state': 'Current component state.',
  'data-empty': 'Present when the value is empty.',
  'data-filled': 'Present when a value is entered.',
  'data-placeholder': 'Present when showing placeholder text.',
  'data-multiple': 'Present when multiple items can be selected or open.',
  'data-nested': 'Present when nested inside another instance.',
  'data-nested-open': 'Present when a nested child overlay is open.',
  'data-swiping': 'Present while swiping.',
  'data-expanded': 'Present when expanded.',
  'data-collapsed': 'Present when collapsed.',
  'data-today': 'Present on today’s date cell.',
  'data-outside-month': 'Present on dates outside the visible month.',
  'data-in-range': 'Present on dates inside a selected range.',
  'data-range-start': 'Present on the start date of a selected range.',
  'data-range-end': 'Present on the end date of a selected range.',
  'data-unavailable': 'Present when a date is unavailable.',
  'data-loading': 'Present while loading.',
  'data-loaded': 'Present when loaded.',
  'data-error': 'Present when in an error state.',
  'data-current': 'Present on the current item or page.',
  'data-completed': 'Present on completed items.',
  'data-pending': 'Present on pending items.',
  'data-value': 'Current item or segment value.',
  'data-index': 'Zero-based item index.',
  'data-level': 'Nesting depth level.',
  'data-branch': 'Present on branch nodes with children.',
  'data-leaf': 'Present on leaf nodes without children.',
  'data-type': 'Toast or item variant type.',
  'data-position': 'Anchor or handle position.',
  'data-presentation': 'Active presentation mode ("popup", "dialog", or "sheet").',
  'data-instant': 'Present when transitions should be skipped.',
}

const dataAttrCache = new Map()

function getDataAttributes(component, part) {
  const key = `${component}:${part || '*'}`
  if (dataAttrCache.has(key)) return dataAttrCache.get(key)

  const found = new Set()
  const localSrc = path.join(REPO_ROOT, 'src', `${component}.tsx`)
  if (fs.existsSync(localSrc)) {
    const txt = fs.readFileSync(localSrc, 'utf8')
    const partPascal = (part || 'root')
      .split('-')
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join('')
    const compPascal = component
      .split('-')
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join('')
    const fnName = !part || part === 'root' ? compPascal : `${compPascal}${partPascal}`
    const fnRegex = new RegExp(`export function ${fnName}\\b[\\s\\S]*?(?=\\nexport function |$)`)
    const match = txt.match(fnRegex)
    const slice = match ? match[0] : ''
    for (const m of slice.matchAll(/['"](data-[a-z-]+)['"]\s*:/g)) {
      found.add(m[1])
    }
    for (const m of slice.matchAll(/\b(data-[a-z-]+)=/g)) {
      found.add(m[1])
    }
  }

  const coreDir = path.join(REF_ROOT, 'packages/core/src/components', component)
  if (fs.existsSync(coreDir) && found.size <= 1) {
    for (const f of fs.readdirSync(coreDir)) {
      if (!f.endsWith('.ts')) continue
      const txt = fs.readFileSync(path.join(coreDir, f), 'utf8')
      for (const m of txt.matchAll(/["'](data-[a-z-]+)["']\s*:/g)) {
        if (m[1] !== 'data-slot') found.add(m[1])
      }
    }
  }

  const slotName = !part || part === 'root' ? component : `${component}-${part}`
  const rows = [
    {
      name: `data-slot="${slotName}"`,
      description: COMMON_DATA_ATTR_DESCS['data-slot'],
    },
  ]
  for (const attr of [...found].sort()) {
    if (attr === 'data-slot') continue
    rows.push({
      name: attr,
      description: COMMON_DATA_ATTR_DESCS[attr] || 'State attribute reflected on the element.',
    })
  }
  dataAttrCache.set(key, rows)
  return rows
}

// ---------------------------------------------------------------------------
// 3. Parse TypeScript type definitions + JSDoc for TypeTable / StateTable / ReasonTable / ControllerTable
// ---------------------------------------------------------------------------
const tsFileCache = new Map()

function readRefTsFile(relPath) {
  const normalized = relPath.replace(/^(\.\.\/)+/, '')
  const fullPath = path.join(REF_ROOT, normalized)
  if (tsFileCache.has(fullPath)) return tsFileCache.get(fullPath)
  if (!fs.existsSync(fullPath)) {
    tsFileCache.set(fullPath, '')
    return ''
  }
  const content = fs.readFileSync(fullPath, 'utf8')
  tsFileCache.set(fullPath, content)
  return content
}

function cleanJsDoc(raw) {
  if (!raw) return ''
  const lines = raw
    .replace(/^\/\*\*/, '')
    .replace(/\*\/$/, '')
    .split('\n')
    .map((l) => l.replace(/^\s*\*\s?/, '').trim())
    .filter(
      (l) => !l.startsWith('@stable') && !l.startsWith('@internal') && !l.startsWith('@example'),
    )
  return lines.join(' ').replace(/\s+/g, ' ').trim()
}

function extractTsTypeRows(relPath, typeName) {
  const src = readRefTsFile(relPath)
  if (!src) return []

  const unionRe = new RegExp(
    `(?:export\\s+)?type\\s+${typeName}(?:<[^>]+>)?\\s*=\\s*([^\\{;]+?)(?=\\n\\n|\\n(?:export|type|interface|const|function|\\/\\*))`,
    's',
  )
  const objRe = new RegExp(
    `(?:export\\s+)?(?:type\\s+${typeName}(?:<[^>]+>)?\\s*=\\s*(?:[A-Za-z0-9_<> ,]+&\\s*)?|interface\\s+${typeName}(?:<[^>]+>)?(?:\\s+extends\\s+[^{]+)?\\s*)\\{`,
  )

  const objMatch = src.match(objRe)
  if (objMatch) {
    const startIdx = objMatch.index + objMatch[0].length
    let depth = 1
    let i = startIdx
    while (i < src.length && depth > 0) {
      if (src[i] === '{') depth++
      else if (src[i] === '}') depth--
      i++
    }
    const body = src.slice(startIdx, i - 1)
    return parseObjectTypeBody(body)
  }

  const unionMatch = src.match(unionRe)
  if (unionMatch) {
    const raw = unionMatch[1].trim()
    const members = [...raw.matchAll(/["']([^"']+)["']/g)].map((m) => m[1])
    if (members.length > 0) {
      return members.map((m) => ({
        name: `"${m}"`,
        type: 'reason',
        description: '',
      }))
    }
  }

  return []
}

function parseObjectTypeBody(body) {
  const rows = []
  const lines = body.split('\n')
  let docBuf = []
  let inDoc = false
  let braceDepth = 0
  let parenDepth = 0
  let currentProp = null

  const flushProp = () => {
    if (!currentProp) return
    const typeStr = currentProp.typeParts
      .join(' ')
      .replace(/;\s*$/, '')
      .replace(/,\s*$/, '')
      .replace(/\s+/g, ' ')
      .trim()
    rows.push({
      name: currentProp.name,
      optional: currentProp.optional,
      type: typeStr,
      description: currentProp.description,
    })
    currentProp = null
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue

    if (braceDepth === 0 && parenDepth === 0) {
      if (line.startsWith('/**')) {
        flushProp()
        inDoc = true
        docBuf = [line]
        if (line.endsWith('*/')) inDoc = false
        continue
      }
      if (inDoc) {
        docBuf.push(line)
        if (line.endsWith('*/')) inDoc = false
        continue
      }
      if (line.startsWith('//')) continue

      const propMatch = /^([a-zA-Z0-9_$]+)(\??)\s*(:|\()\s*(.*)$/.exec(line)
      if (propMatch) {
        flushProp()
        const [, propName, opt, sep, rest] = propMatch
        const typeHead = sep === '(' ? `(${rest}` : rest
        currentProp = {
          name: propName,
          optional: opt === '?',
          typeParts: [typeHead],
          description: cleanJsDoc(docBuf.join('\n')),
        }
        docBuf = []
        for (const ch of typeHead) {
          if (ch === '{') braceDepth++
          else if (ch === '}') braceDepth--
          else if (ch === '(') parenDepth++
          else if (ch === ')') parenDepth--
        }
        continue
      }
    }

    if (currentProp) {
      currentProp.typeParts.push(line)
      for (const ch of line) {
        if (ch === '{') braceDepth++
        else if (ch === '}') braceDepth--
        else if (ch === '(') parenDepth++
        else if (ch === ')') parenDepth--
      }
    }
  }
  flushProp()
  return rows
}

// ---------------------------------------------------------------------------
// 4. Parse SpecList from ref/ui-sdk/tests/specs/<spec>.spec.ts
// ---------------------------------------------------------------------------
const specCache = new Map()

function loadSpecGroups(specName) {
  if (specCache.has(specName)) return specCache.get(specName)
  const file = path.join(REF_SPECS, `${specName}.spec.ts`)
  if (!fs.existsSync(file)) {
    specCache.set(specName, [])
    return []
  }
  const src = fs.readFileSync(file, 'utf8')
  const groups = []
  let currentGroup = null

  for (const line of src.split('\n')) {
    const descMatch = /test\.describe\(\s*["'`]([^"'`]+)["'`]/.exec(line)
    if (descMatch) {
      currentGroup = { title: descMatch[1], tests: [] }
      groups.push(currentGroup)
      continue
    }
    const testMatch = /\btest\(\s*["'`]([^"'`]+)["'`]/.exec(line)
    if (testMatch) {
      if (!currentGroup) {
        currentGroup = { title: 'Behavior', tests: [] }
        groups.push(currentGroup)
      }
      currentGroup.tests.push(testMatch[1])
    }
  }
  specCache.set(specName, groups)
  return groups
}

// ---------------------------------------------------------------------------
// 5. Rewrite text & code references from @ui-sdk/solid -> @subf/ui
// ---------------------------------------------------------------------------
function rewriteCodeText(code) {
  return code
    .replace(/npm install @ui-sdk\/solid @ui-sdk\/core/g, 'pnpm add @subf/ui')
    .replace(/pnpm add @ui-sdk\/solid @ui-sdk\/core/g, 'pnpm add @subf/ui')
    .replace(/npm install @ui-sdk\/solid/g, 'pnpm add @subf/ui')
    .replace(/pnpm add @ui-sdk\/solid/g, 'pnpm add @subf/ui')
    .replace(/@ui-sdk\/solid/g, '@subf/ui')
    .replace(/@ui-sdk\/core\/([a-z-]+)/g, '@subf/ui/$1')
    .replace(/@ui-sdk\/core/g, '@subf/ui')
}

function rewriteInlineText(text) {
  return text
    .replace(/@ui-sdk\/solid/g, '@subf/ui')
    .replace(/@ui-sdk\/core\/([a-z-]+)/g, '@subf/ui/$1')
    .replace(/@ui-sdk\/core/g, '@subf/ui')
}

const INDEX_DIR_SLUGS = new Set([
  'guides',
  'agents',
  'agents/connect-an-agent',
  'core',
  'core/behaviors',
  'core/changelog',
])

function resolveDocHref(rawHref, currentSlug) {
  if (!rawHref) return rawHref
  if (
    rawHref.startsWith('http://') ||
    rawHref.startsWith('https://') ||
    rawHref.startsWith('mailto:')
  ) {
    return rawHref
  }
  if (rawHref.startsWith('#')) {
    return rawHref
  }
  const [pathPart, hashPart] = rawHref.split('#')
  let target = pathPart
  if (target === '/sink' || target === '/sink/') {
    return '#/sink'
  }
  if (target.startsWith('/docs/solid/')) {
    target = target.slice('/docs/solid/'.length)
  } else if (target === '/docs/solid') {
    target = 'index'
  } else if (target.startsWith('/docs/')) {
    target = target.slice('/docs/'.length)
  } else if (target.startsWith('./') || target.startsWith('../')) {
    const baseDir = INDEX_DIR_SLUGS.has(currentSlug)
      ? currentSlug
      : currentSlug.includes('/')
        ? path.posix.dirname(currentSlug)
        : ''
    target = path.posix.normalize(path.posix.join(baseDir, target))
  } else if (!target.startsWith('/')) {
    const baseDir = INDEX_DIR_SLUGS.has(currentSlug)
      ? currentSlug
      : currentSlug.includes('/')
        ? path.posix.dirname(currentSlug)
        : ''
    target = path.posix.normalize(path.posix.join(baseDir, target))
  } else {
    target = target.replace(/^\/+/, '')
  }
  target = target.replace(/\.mdx?$/, '').replace(/\/index$/, '').replace(/\/$/, '')
  if (!target || target === '.') target = 'index'
  return `#/docs/${target}${hashPart ? `#${hashPart}` : ''}`
}

function slugifyHeading(text) {
  return text
    .toLowerCase()
    .replace(/`([^`]+)`/g, '$1')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

// ---------------------------------------------------------------------------
// 6. Parse MDX into structured blocks
// ---------------------------------------------------------------------------
function parseMdx(raw, slug) {
  let content = raw.replace(/\r\n/g, '\n')
  let title = slug
  let description = ''

  if (content.startsWith('---\n')) {
    const end = content.indexOf('\n---\n', 4)
    if (end !== -1) {
      const fm = content.slice(4, end)
      const tm = /^title:\s*(.+)$/m.exec(fm)
      const dm = /^description:\s*(.+)$/m.exec(fm)
      if (tm) title = tm[1].trim().replace(/^["']|["']$/g, '')
      if (dm) description = dm[1].trim().replace(/^["']|["']$/g, '')
      content = content.slice(end + 5)
    }
  }

  // Strip top-level ESM imports and unwrap <Collapsible> / <FrameworkTabs> keeping solid content
  {
    let inFence = false
    content = content
      .split('\n')
      .filter((line) => {
        if (/^\s*```/.test(line)) {
          inFence = !inFence
          return true
        }
        return inFence || !/^import\s+/.test(line)
      })
      .join('\n')
  }
  content = content.replace(/<FrameworkTabs[^>]*>([\s\S]*?)<\/FrameworkTabs>/g, (_, inner) => {
    const solidTab =
      /<FrameworkTab[^>]*value=["']solid["'][^>]*>([\s\S]*?)<\/FrameworkTab>/.exec(inner) ||
      /<FrameworkTab[^>]*>([\s\S]*?)<\/FrameworkTab>/.exec(inner)
    return solidTab ? solidTab[1] : ''
  })
  content = content.replace(
    /<FrameworkContent[^>]*framework=["']([^"']+)["'][^>]*>([\s\S]*?)<\/FrameworkContent>/g,
    (_, fw, inner) => (fw === 'solid' ? inner : ''),
  )
  content = content.replace(/<\/?Collapsible[^>]*>/g, '')

  const blocks = []
  const lines = content.split('\n')
  let i = 0
  let pendingAnchorId = null

  const readUntil = (endPattern) => {
    const buf = []
    while (i < lines.length && !endPattern.test(lines[i])) {
      buf.push(lines[i])
      i++
    }
    if (i < lines.length) i++
    return buf.join('\n')
  }

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    if (!trimmed) {
      i++
      continue
    }

    const spanId = /^<span\s+id=["']([^"']+)["']\s*\/>$/.exec(trimmed)
    if (spanId) {
      pendingAnchorId = spanId[1]
      i++
      continue
    }

    const headingMatch = /^(#{2,4})\s+(.+)$/.exec(trimmed)
    if (headingMatch) {
      const level = headingMatch[1].length
      let text = headingMatch[2].trim()
      let id = pendingAnchorId
      pendingAnchorId = null
      const explicitId = /\s*\[#([^\]]+)\]$/.exec(text)
      if (explicitId) {
        id = explicitId[1]
        text = text.slice(0, explicitId.index).trim()
      }
      if (!id) id = slugifyHeading(text)
      blocks.push({ type: 'heading', level, id, text: rewriteInlineText(text) })
      i++
      continue
    }

    const fenceMatch = /^```([a-zA-Z0-9_-]*)(?:\s+(.*))?$/.exec(trimmed)
    if (fenceMatch) {
      const lang = fenceMatch[1] || 'text'
      const meta = fenceMatch[2] || ''
      const titleMatch = /title=["']([^"']+)["']/.exec(meta)
      i++
      const code = readUntil(/^```\s*$/)
      blocks.push({
        type: 'code',
        lang,
        title: titleMatch ? titleMatch[1] : undefined,
        code: rewriteCodeText(code),
      })
      continue
    }

    if (trimmed.startsWith('<StyleTabs')) {
      i++
      const inner = readUntil(/<\/StyleTabs>/)
      const tabs = []
      for (const cm of inner.matchAll(/```([a-zA-Z0-9_-]*)(?:[^\n]*)\n([\s\S]*?)```/g)) {
        const lang = cm[1] || 'css'
        const label = lang === 'css' ? 'CSS' : 'Tailwind'
        tabs.push({ label, lang, code: rewriteCodeText(cm[2].trimEnd()) })
      }
      if (tabs.length > 0) {
        blocks.push({ type: 'style-tabs', tabs })
      }
      continue
    }

    if (trimmed.startsWith('<Callout')) {
      const openTag = trimmed
      const typeM = /type=["']([^"']+)["']/.exec(openTag)
      const titleM = /title=["']([^"']+)["']/.exec(openTag)
      if (trimmed.includes('</Callout>')) {
        const inner = trimmed
          .replace(/^<Callout[^>]*>/, '')
          .replace(/<\/Callout>$/, '')
          .trim()
        blocks.push({
          type: 'callout',
          variant: typeM ? typeM[1] : 'info',
          title: titleM ? rewriteInlineText(titleM[1]) : undefined,
          text: rewriteInlineText(inner),
        })
        i++
      } else {
        i++
        const inner = readUntil(/<\/Callout>/).trim()
        blocks.push({
          type: 'callout',
          variant: typeM ? typeM[1] : 'info',
          title: titleM ? rewriteInlineText(titleM[1]) : undefined,
          text: rewriteInlineText(inner),
        })
      }
      continue
    }

    if (trimmed.startsWith('<Cards')) {
      i++
      const inner = readUntil(/<\/Cards>/)
      const cards = []
      for (const cm of inner.matchAll(/<Card\b([\s\S]*?)(?:\/>|<\/Card>)/g)) {
        const attrs = cm[1]
        const t = /title=["']([^"']+)["']/.exec(attrs)?.[1] || ''
        const h = /href=["']([^"']+)["']/.exec(attrs)?.[1] || ''
        const d = /description=["']([^"']+)["']/.exec(attrs)?.[1] || ''
        if (t) {
          cards.push({
            title: rewriteInlineText(t),
            href: resolveDocHref(h, slug),
            description: rewriteInlineText(d),
          })
        }
      }
      if (cards.length > 0) {
        blocks.push({ type: 'cards', cards })
      }
      continue
    }

    if (
      /^<(ComponentExample|ComponentGrid|ComponentCards|CssVariables|DataAttributes|TypeTable|StateTable|ReasonTable|ControllerTable|SpecList|ChangelogPosts|CopyPrompt|Video)\b/.test(
        trimmed,
      )
    ) {
      let tagText = trimmed
      while (!tagText.includes('/>') && !tagText.includes('</') && i + 1 < lines.length) {
        i++
        tagText += ' ' + lines[i].trim()
      }
      i++
      const tagName = /^<([A-Za-z0-9]+)/.exec(tagText)[1]
      const getAttr = (attr) => {
        const m = new RegExp(`${attr}=(?:"([^"]*)"|'([^']*)')`).exec(tagText)
        return m ? (m[1] ?? m[2]) : undefined
      }

      if (tagName === 'ComponentExample') {
        const name = getAttr('name')
        const caption = getAttr('caption')
        if (name) {
          blocks.push({
            type: 'example',
            name,
            caption: caption ? rewriteInlineText(caption) : undefined,
          })
        }
      } else if (tagName === 'ComponentGrid' || tagName === 'ComponentCards') {
        blocks.push({ type: 'component-grid' })
      } else if (tagName === 'ChangelogPosts') {
        blocks.push({
          type: 'cards',
          cards: [
            {
              title: 'Introducing UI SDK',
              href: '#/docs/core/changelog/introducing-ui-sdk',
              description: 'Architecture, headless primitives, and SolidJS 2 native adaptation.',
            },
          ],
        })
      } else if (tagName === 'CssVariables') {
        const comp = getAttr('component')
        const part = getAttr('part')
        const rows = getCssVariables(comp, part)
        if (rows.length > 0) {
          blocks.push({ type: 'css-variables', rows })
        }
      } else if (tagName === 'DataAttributes') {
        const comp = getAttr('component')
        const part = getAttr('part')
        const rows = getDataAttributes(comp, part)
        if (rows.length > 0) {
          blocks.push({ type: 'data-attributes', rows })
        }
      } else if (
        tagName === 'TypeTable' ||
        tagName === 'StateTable' ||
        tagName === 'ReasonTable' ||
        tagName === 'ControllerTable'
      ) {
        const p = getAttr('path')
        const n = getAttr('name')
        const rows = p && n ? extractTsTypeRows(p, n) : []
        if (rows.length > 0) {
          blocks.push({
            type: 'api-table',
            kind: tagName.replace('Table', '').toLowerCase(),
            name: n,
            rows,
          })
        }
      } else if (tagName === 'SpecList') {
        const spec = getAttr('spec')
        const onlyMatch = /only=\{\[([\s\S]*?)\]\}/.exec(tagText)
        const only = onlyMatch
          ? [...onlyMatch[1].matchAll(/["']([^"']+)["']/g)].map((m) => m[1])
          : null
        let groups = spec ? loadSpecGroups(spec) : []
        if (only && only.length > 0) {
          groups = groups.filter((g) => only.includes(g.title))
        }
        if (groups.length > 0) {
          blocks.push({ type: 'spec-list', groups })
        }
      }
      continue
    }

    if (
      trimmed.startsWith('|') &&
      i + 1 < lines.length &&
      /^\|[\s:-]+\|/.test(lines[i + 1].trim())
    ) {
      const splitRow = (r) =>
        r
          .trim()
          .replace(/^\|/, '')
          .replace(/\|$/, '')
          .split('|')
          .map((c) => rewriteInlineText(c.trim()))
      const headers = splitRow(trimmed)
      i += 2
      const rows = []
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        rows.push(splitRow(lines[i]))
        i++
      }
      blocks.push({ type: 'table', headers, rows })
      continue
    }

    if (/^[-*]\s+/.test(trimmed)) {
      const items = []
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        const rawItem = rewriteInlineText(lines[i].trim().replace(/^[-*]\s+/, ''))
        items.push(
          rawItem.replace(
            /\[([^\]]+)\]\(([^)]+)\)/g,
            (_, label, href) => `[${label}](${resolveDocHref(href, slug)})`,
          ),
        )
        i++
      }
      blocks.push({ type: 'list', ordered: false, items })
      continue
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items = []
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        const rawItem = rewriteInlineText(lines[i].trim().replace(/^\d+\.\s+/, ''))
        items.push(
          rawItem.replace(
            /\[([^\]]+)\]\(([^)]+)\)/g,
            (_, label, href) => `[${label}](${resolveDocHref(href, slug)})`,
          ),
        )
        i++
      }
      blocks.push({ type: 'list', ordered: true, items })
      continue
    }

    const paraLines = []
    while (i < lines.length) {
      const l = lines[i].trim()
      if (
        !l ||
        /^(#{2,4}\s|```|<StyleTabs|<Callout|<Cards|<span\s+id=|<ComponentExample|<ComponentGrid|<ComponentCards|<CssVariables|<DataAttributes|<TypeTable|<StateTable|<ReasonTable|<ControllerTable|<SpecList|<ChangelogPosts|<CopyPrompt|<Video|\|\s|[-*]\s+|\d+\.\s+)/.test(
          l,
        )
      ) {
        break
      }
      paraLines.push(l)
      i++
    }
    if (paraLines.length > 0) {
      const rawText = rewriteInlineText(paraLines.join(' '))
      const withLinks = rawText.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => {
        return `[${label}](${resolveDocHref(href, slug)})`
      })
      blocks.push({ type: 'paragraph', text: withLinks })
    } else {
      i++
    }
  }

  return { slug, title, description: rewriteInlineText(description), blocks }
}

// ---------------------------------------------------------------------------
// 7. Copy & transform all Solid examples + CSS + core/behaviors code sources
// ---------------------------------------------------------------------------
function transformExampleCode(src) {
  const runtimeCode = src
    .replace(/from\s+["']@ui-sdk\/solid\/async-options["']/g, `from '../_helpers/async-options'`)
    .replace(/from\s+["']@ui-sdk\/solid\/shortcuts["']/g, `from '../_helpers/shortcuts'`)
    .replace(/from\s+["']@ui-sdk\/solid\/color["']/g, `from '../_helpers/color'`)
    .replace(/from\s+["']@ui-sdk\/solid\/image["']/g, `from '../_helpers/image'`)
    .replace(/from\s+["']@ui-sdk\/solid\/([^"']+)["']/g, `from '@subf/ui/$1'`)
    .replace(/from\s+["']@ui-sdk\/core\/date["']/g, `from '../_helpers/date'`)
    .replace(/from\s+["']@ui-sdk\/core\/shortcuts["']/g, `from '../_helpers/shortcuts'`)
    .replace(/from\s+["']@ui-sdk\/core\/([^"']+)["']/g, `from '@subf/ui/$1'`)
    .replace(/from\s+["']@ui-sdk\/core["']/g, `from '@subf/ui/preferences'`)
    .replace(/from\s+["']\.\.\/\.\.\/\.\.\/shared\/solid\/log["']/g, `from '../../examples-custom/_helpers/log'`)
    .replace(
      /import\s*\{\s*confirm\s*\}\s*from\s*["']@subf\/ui\/alert-dialog["']/g,
      `import { confirm } from '../_helpers/confirm'`,
    )
    .replace(
      /(import\s*\{[\s\S]*?)\bcreateConfirm,\s*/g,
      `import { createConfirm } from '../_helpers/confirm'\n$1`,
    )

  const displayCode = src
    .replace(/@ui-sdk\/solid/g, '@subf/ui')
    .replace(/@ui-sdk\/core\/([a-z-]+)/g, '@subf/ui/$1')
    .replace(/@ui-sdk\/core/g, '@subf/ui')
    .replace(/\.\.\/\.\.\/\.\.\/shared\/solid\/log/g, './log')

  return { runtimeCode, displayCode }
}

function syncExamples() {
  const exampleDisplaySources = {}
  const cssChunks = []

  cssChunks.push(fs.readFileSync(path.join(REF_EXAMPLES, 'styles/tokens.css'), 'utf8'))
  cssChunks.push(fs.readFileSync(path.join(REF_EXAMPLES, 'styles/base.css'), 'utf8'))

  const compDirRoot = path.join(REF_EXAMPLES, 'components')
  let count = 0
  for (const comp of fs.readdirSync(compDirRoot).sort()) {
    const compDir = path.join(compDirRoot, comp)
    if (!fs.statSync(compDir).isDirectory()) continue

    const cssFile = path.join(compDir, `${comp}.css`)
    if (fs.existsSync(cssFile)) {
      cssChunks.push(`/* === ${comp}.css === */\n` + fs.readFileSync(cssFile, 'utf8'))
    }

    const solidDir = path.join(compDir, 'solid')
    if (!fs.existsSync(solidDir)) continue

    const outCompDir = path.join(OUT_EXAMPLES, comp)
    fs.mkdirSync(outCompDir, { recursive: true })

    for (const file of fs.readdirSync(solidDir).sort()) {
      if (!file.endsWith('.tsx')) continue
      const exName = file.replace(/\.tsx$/, '')
      const fullKey = `${comp}/${exName}`
      const raw = fs.readFileSync(path.join(solidDir, file), 'utf8')
      const { runtimeCode, displayCode } = transformExampleCode(raw)
      fs.writeFileSync(path.join(outCompDir, file), runtimeCode)
      exampleDisplaySources[fullKey] = displayCode
      count++
    }
  }

  // Shortcuts examples
  const shortcutsCss = path.join(REF_EXAMPLES, 'shortcuts/shortcuts.css')
  if (fs.existsSync(shortcutsCss)) {
    cssChunks.push(`/* === shortcuts.css === */\n` + fs.readFileSync(shortcutsCss, 'utf8'))
  }
  const shortcutsSolid = path.join(REF_EXAMPLES, 'shortcuts/solid')
  if (fs.existsSync(shortcutsSolid)) {
    const outDir = path.join(OUT_EXAMPLES, 'shortcuts')
    fs.mkdirSync(outDir, { recursive: true })
    for (const file of fs.readdirSync(shortcutsSolid).sort()) {
      if (!file.endsWith('.tsx')) continue
      const exName = file.replace(/\.tsx$/, '')
      const raw = fs.readFileSync(path.join(shortcutsSolid, file), 'utf8')
      const { runtimeCode, displayCode } = transformExampleCode(raw)
      fs.writeFileSync(path.join(outDir, file), runtimeCode)
      exampleDisplaySources[`shortcuts/${exName}`] = displayCode
      count++
    }
  }

  // Guides CSS & dark-mode example
  const guidesCss = path.join(REF_EXAMPLES, 'guides/guides.css')
  if (fs.existsSync(guidesCss)) {
    cssChunks.push(`/* === guides.css === */\n` + fs.readFileSync(guidesCss, 'utf8'))
  }
  const guidesOut = path.join(OUT_EXAMPLES, 'guides')
  fs.mkdirSync(guidesOut, { recursive: true })
  const darkModeRaw = fs.readFileSync(path.join(REF_EXAMPLES, 'guides/solid/dark-mode.tsx'), 'utf8')
  const { runtimeCode: dmRuntime, displayCode: dmDisplay } = transformExampleCode(
    darkModeRaw.replace(`from "../color-scheme"`, `from "./color-scheme"`),
  )
  fs.writeFileSync(
    path.join(guidesOut, 'color-scheme.ts'),
    `import { createColorScheme, createLocalStorage } from '@subf/ui/preferences'\n\nexport const colorScheme = createColorScheme({\n  storage: createLocalStorage('guides-color-scheme'),\n})\n`,
  )
  fs.writeFileSync(path.join(guidesOut, 'dark-mode.tsx'), dmRuntime)
  exampleDisplaySources['guides/dark-mode'] = dmDisplay
  count++

  // Include local hand-adapted Solid 2 guide & core examples in display sources if present
  for (const extra of [
    'guides/reactions',
    'guides/reactions-state',
    'guides/reactions-keyboard',
    'core/rating-agent',
  ]) {
    const localFile = path.join(OUT_EXAMPLES, `${extra}.tsx`)
    if (fs.existsSync(localFile)) {
      exampleDisplaySources[extra] = fs.readFileSync(localFile, 'utf8')
    }
  }

  // Include source code for behaviors/* and core/* reference examples from ref/ui-sdk
  for (const [folder, prefix] of [
    ['behaviors/react', 'behaviors'],
    ['core/react', 'core'],
  ]) {
    const dir = path.join(REF_EXAMPLES, folder)
    if (!fs.existsSync(dir)) continue
    for (const file of fs.readdirSync(dir).sort()) {
      if (!file.endsWith('.tsx')) continue
      const key = `${prefix}/${file.replace(/\.tsx$/, '')}`
      if (!exampleDisplaySources[key]) {
        const raw = fs.readFileSync(path.join(dir, file), 'utf8')
        exampleDisplaySources[key] = rewriteCodeText(raw)
      }
    }
  }

  fs.writeFileSync(path.join(OUT_EXAMPLES, 'examples.css'), cssChunks.join('\n\n'))
  return { count, exampleDisplaySources }
}

// ---------------------------------------------------------------------------
// 8. Sync all MDX pages (solid, guides, agents, core)
// ---------------------------------------------------------------------------
function syncDocs() {
  const pages = {}

  const addFile = (filePath, slug) => {
    if (!fs.existsSync(filePath)) return
    const raw = fs.readFileSync(filePath, 'utf8')
    pages[slug] = parseMdx(raw, slug)
  }

  const addDirRecursive = (dirPath, prefix) => {
    if (!fs.existsSync(dirPath)) return
    for (const entry of fs.readdirSync(dirPath, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(dirPath, entry.name)
      if (entry.isDirectory()) {
        addDirRecursive(full, prefix ? `${prefix}/${entry.name}` : entry.name)
      } else if (entry.name.endsWith('.mdx')) {
        const base = entry.name.replace(/\.mdx$/, '')
        let slug
        if (base === 'index') {
          slug = prefix || 'index'
        } else {
          slug = prefix ? `${prefix}/${base}` : base
        }
        addFile(full, slug)
      }
    }
  }

  // Solid root, utilities, components
  const solidRoot = path.join(REF_DOCS_CONTENT, 'solid')
  for (const file of fs.readdirSync(solidRoot).sort()) {
    if (file.endsWith('.mdx')) {
      addFile(path.join(solidRoot, file), file.replace(/\.mdx$/, ''))
    }
  }
  addDirRecursive(path.join(solidRoot, 'utilities'), 'utilities')
  for (const file of fs.readdirSync(path.join(solidRoot, 'components')).sort()) {
    if (file.endsWith('.mdx')) {
      addFile(path.join(solidRoot, 'components', file), `components/${file.replace(/\.mdx$/, '')}`)
    }
  }

  // Guides, Agents, Core
  addDirRecursive(path.join(REF_DOCS_CONTENT, 'guides'), 'guides')
  addDirRecursive(path.join(REF_DOCS_CONTENT, 'agents'), 'agents')
  addDirRecursive(path.join(REF_DOCS_CONTENT, 'core'), 'core')

  const nav = [
    {
      group: 'Get Started',
      items: ['index', 'installation', 'first-component'].map((s) => ({
        slug: s,
        title: pages[s]?.title || s,
      })),
    },
    {
      group: 'Using Components',
      items: [
        'parts-and-composition',
        'state-and-events',
        'styling-and-animation',
        'controllers',
        'popups',
        'lists-and-menus',
        'forms',
        'server-rendering',
      ].map((s) => ({
        slug: s,
        title: pages[s]?.title || s,
      })),
    },
    {
      group: 'Build Your Own',
      items: ['rendering', 'custom-parts'].map((s) => ({
        slug: s,
        title: pages[s]?.title || s,
      })),
    },
    {
      group: 'Utilities',
      items: ['utilities/async-options', 'utilities/shortcuts'].map((s) => ({
        slug: s,
        title: pages[s]?.title || s,
      })),
    },
    {
      group: 'Guides',
      items: ['guides', 'guides/build-a-component', 'guides/dark-mode'].map((s) => ({
        slug: s,
        title: pages[s]?.title || s,
      })),
    },
    {
      group: 'Agents',
      items: [
        'agents',
        'agents/build-with-an-agent',
        'agents/skills',
        'agents/connect-an-agent',
        'agents/connect-an-agent/guide',
        'agents/connect-an-agent/your-components',
        'agents/connect-an-agent/permissions',
        'agents/connect-an-agent/observe-changes',
        'agents/connect-an-agent/history-and-undo',
        'agents/connect-an-agent/run-on-your-server',
        'agents/connect-an-agent/webmcp',
        'agents/connect-an-agent/reference',
      ].map((s) => ({
        slug: s,
        title: pages[s]?.title || s,
      })),
    },
    {
      group: 'Core & Behaviors',
      items: [
        'core',
        'core/start',
        'core/build-a-component',
        'core/kernel/define-a-primitive',
        'core/kernel/render-a-primitive',
        'core/kernel/style-a-component',
        'core/kernel/handle-changes',
        'core/compose-behaviors',
        'core/customize-a-behavior',
        'core/reference',
        'core/text',
        'core/number',
        'core/date',
        'core/color',
        'core/image',
        'core/storage',
        'core/platform',
        'core/mobile',
        'core/observe',
        'core/testing',
        'core/behaviors',
        'core/behaviors/canvas',
        'core/behaviors/direct-manipulation',
        'core/behaviors/drag-and-drop',
        'core/behaviors/focus',
        'core/behaviors/lists',
        'core/behaviors/motion',
        'core/behaviors/popups',
        'core/behaviors/preferences',
        'core/behaviors/selection',
        'core/behaviors/trees',
        'core/changelog',
        'core/changelog/introducing-ui-sdk',
      ]
        .filter((s) => Boolean(pages[s]))
        .map((s) => ({
          slug: s,
          title: pages[s]?.title || s,
        })),
    },
    {
      group: 'Components',
      items: Object.keys(pages)
        .filter((s) => s.startsWith('components/'))
        .sort((a, b) => {
          if (a === 'components/index') return -1
          if (b === 'components/index') return 1
          return a.localeCompare(b)
        })
        .map((s) => ({
          slug: s,
          title: s === 'components/index' ? 'Overview' : pages[s].title,
        })),
    },
  ]

  return { pages, nav }
}

const { count: exampleCount, exampleDisplaySources } = syncExamples()
const { pages, nav } = syncDocs()

fs.writeFileSync(path.join(OUT_GENERATED, 'docs-data.json'), JSON.stringify(pages))
fs.writeFileSync(path.join(OUT_GENERATED, 'nav.json'), JSON.stringify(nav, null, 2))
fs.writeFileSync(
  path.join(OUT_GENERATED, 'example-sources.json'),
  JSON.stringify(exampleDisplaySources),
)

console.log(
  `Synced ${Object.keys(pages).length} docs pages, ${exampleCount} live Solid examples, and ${Object.keys(exampleDisplaySources).length} total example sources.`,
)
