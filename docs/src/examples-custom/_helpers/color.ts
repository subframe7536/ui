export type ColorFormat = 'hex' | 'srgb' | 'rgb' | 'hsl' | 'hsb' | 'oklch'

export type ParsedColor = {
  r: number
  g: number
  b: number
  a: number
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}

function linearizeChannel(c: number): number {
  const v = c / 255
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
}

function toHexByte(n: number): string {
  return clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0')
}

export function parseColor(input: string): ParsedColor | null {
  const raw = input.trim().toLowerCase()
  const hexMatch = /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/.exec(raw)
  if (hexMatch) {
    const h = hexMatch[1] ?? ''
    if (h.length === 3 || h.length === 4) {
      const r = Number.parseInt((h[0] ?? '0') + (h[0] ?? '0'), 16)
      const g = Number.parseInt((h[1] ?? '0') + (h[1] ?? '0'), 16)
      const b = Number.parseInt((h[2] ?? '0') + (h[2] ?? '0'), 16)
      const a = h.length === 4 ? Number.parseInt((h[3] ?? 'f') + (h[3] ?? 'f'), 16) / 255 : 1
      return { r, g, b, a }
    }
    const r = Number.parseInt(h.slice(0, 2), 16)
    const g = Number.parseInt(h.slice(2, 4), 16)
    const b = Number.parseInt(h.slice(4, 6), 16)
    const a = h.length === 8 ? Number.parseInt(h.slice(6, 8), 16) / 255 : 1
    return { r, g, b, a }
  }
  const rgbMatch =
    /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[/,]\s*([\d.%]+))?\s*\)$/.exec(raw)
  if (rgbMatch) {
    const aRaw = rgbMatch[4]
    const a = aRaw
      ? aRaw.endsWith('%')
        ? Number.parseFloat(aRaw) / 100
        : Number.parseFloat(aRaw)
      : 1
    return {
      r: clamp(Math.round(Number.parseFloat(rgbMatch[1] ?? '0')), 0, 255),
      g: clamp(Math.round(Number.parseFloat(rgbMatch[2] ?? '0')), 0, 255),
      b: clamp(Math.round(Number.parseFloat(rgbMatch[3] ?? '0')), 0, 255),
      a: clamp(a, 0, 1),
    }
  }
  if (typeof document !== 'undefined') {
    const ctx = document.createElement('canvas').getContext('2d')
    if (ctx) {
      ctx.fillStyle = '#000000'
      ctx.fillStyle = input
      const normalized = ctx.fillStyle
      if (normalized.startsWith('#') || normalized.startsWith('rgb')) {
        return parseColor(normalized)
      }
    }
  }
  return { r: 14, g: 165, b: 233, a: 1 }
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  const d = max - min
  if (d === 0) {
    return [0, 0, Math.round(l * 100)]
  }
  const s = d / (1 - Math.abs(2 * l - 1))
  let h: number
  if (max === rn) {
    h = ((gn - bn) / d) % 6
  } else if (max === gn) {
    h = (bn - rn) / d + 2
  } else {
    h = (rn - gn) / d + 4
  }
  h = Math.round(h * 60)
  if (h < 0) {
    h += 360
  }
  return [h, Math.round(s * 100), Math.round(l * 100)]
}

function rgbToOklch(r: number, g: number, b: number): [number, number, number] {
  const lr = linearizeChannel(r)
  const lg = linearizeChannel(g)
  const lb = linearizeChannel(b)
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb)
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb)
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb)
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  const C = Math.hypot(A, B)
  let H = (Math.atan2(B, A) * 180) / Math.PI
  if (H < 0) {
    H += 360
  }
  return [Number(L.toFixed(3)), Number(C.toFixed(3)), Math.round(H)]
}

export function formatColor(color: ParsedColor, format: ColorFormat): string {
  const { r, g, b, a } = color
  if (format === 'hex') {
    return a < 1
      ? `#${toHexByte(r)}${toHexByte(g)}${toHexByte(b)}${toHexByte(a * 255)}`
      : `#${toHexByte(r)}${toHexByte(g)}${toHexByte(b)}`
  }
  if (format === 'srgb' || format === 'rgb') {
    return a < 1 ? `rgb(${r} ${g} ${b} / ${Math.round(a * 100)}%)` : `rgb(${r} ${g} ${b})`
  }
  if (format === 'hsl' || format === 'hsb') {
    const [h, s, l] = rgbToHsl(r, g, b)
    return a < 1 ? `hsl(${h} ${s}% ${l}% / ${Math.round(a * 100)}%)` : `hsl(${h} ${s}% ${l}%)`
  }
  const [L, C, H] = rgbToOklch(r, g, b)
  return a < 1 ? `oklch(${L} ${C} ${H} / ${Math.round(a * 100)}%)` : `oklch(${L} ${C} ${H})`
}
