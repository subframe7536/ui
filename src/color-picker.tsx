import { createContext, createSignal, createUniqueId, omit, useContext, untrack } from 'solid-js'

import { useFieldControl } from './field'
import { createController, useController } from './foundation/controller'
import { createChangeDetails } from './foundation/details'
import type { ChangeDetails, ChangeOptions } from './foundation/details'
import { registerComponent } from './foundation/registry'
import { renderPart } from './foundation/render'
import type { PartProps } from './foundation/render'
import { createControlledSignal } from './foundation/state'

export type ColorFormat = 'hex' | 'rgb' | 'hsl' | 'hsb' | 'oklch'
export type ColorPickerSpace = 'hsl' | 'hsb' | 'rgb'
export type ColorGamut = 'srgb' | 'p3'
export type ColorChannel =
  | 'hue'
  | 'saturation'
  | 'brightness'
  | 'lightness'
  | 'alpha'
  | 'red'
  | 'green'
  | 'blue'

export type Color = {
  h: number
  s: number
  v: number
  a: number
  hex: string
}

export type ColorPickerValueChangeReason =
  | 'area'
  | 'slider'
  | 'input'
  | 'swatch'
  | 'eyedropper'
  | 'programmatic'
export type ColorPickerChangeOptions = ChangeOptions<ColorPickerValueChangeReason>
export type ColorPickerValueChangeDetails = ChangeDetails<ColorPickerValueChangeReason>
export type ColorPickerValueCommitDetails = ColorPickerValueChangeDetails

export type ColorPickerApi = {
  setValue: (hex: string, options?: ColorPickerChangeOptions) => void
  setChannel: (channel: ColorChannel, value: number) => void
  getValue: () => string
  getColor: () => Color
}

export function createColorPickerController() {
  return createController<ColorPickerApi>()
}

export type ColorPickerController = ReturnType<typeof createColorPickerController>

export type ColorPickerOptions = {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string, details: ColorPickerValueChangeDetails) => void
  onValueCommit?: (value: string, details: ColorPickerValueCommitDetails) => void
  format?: ColorFormat
  space?: ColorPickerSpace
  gamut?: ColorGamut
  disabled?: boolean
  readOnly?: boolean
  controller?: ColorPickerController
  debug?: boolean
}

export type ColorPickerState = {
  value: string
  color: Color
  format: ColorFormat
  disabled: boolean
  readOnly: boolean
}

export type ColorPickerPrimitive = ColorPickerState
export type ColorPickerAreaProps = { xChannel?: ColorChannel; yChannel?: ColorChannel }
export type ColorPickerSliderProps = {
  channel: ColorChannel
  orientation?: 'horizontal' | 'vertical'
}
export type ColorPickerSliderState = ColorPickerState & {
  channel: ColorChannel
  channelValue: number
  min: number
  max: number
  percent: number
}
export type ColorPickerChannelInputProps = { channel: ColorChannel }
export type ColorPickerSwatchItemProps = { value: string; label?: string }
export type ColorPickerSwatchItemState = { value: string; selected: boolean; disabled: boolean }

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

const toHexByte = (n: number) => n.toString(16).padStart(2, '0')

function hsvToHex(h: number, s: number, v: number): string {
  const sn = clamp(s, 0, 100) / 100
  const vn = clamp(v, 0, 100) / 100
  const c = vn * sn
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = vn - c
  let r: number
  let g: number
  let b: number
  const hh = ((h % 360) + 360) % 360
  if (hh < 60) {
    ;[r, g, b] = [c, x, 0]
  } else if (hh < 120) {
    ;[r, g, b] = [x, c, 0]
  } else if (hh < 180) {
    ;[r, g, b] = [0, c, x]
  } else if (hh < 240) {
    ;[r, g, b] = [0, x, c]
  } else if (hh < 300) {
    ;[r, g, b] = [x, 0, c]
  } else {
    ;[r, g, b] = [c, 0, x]
  }
  const toHex = (n: number) =>
    Math.round((n + m) * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function parseHexToColor(raw: string): Color {
  const cleaned = raw.trim().replace(/^#/, '')
  const full =
    cleaned.length === 3
      ? cleaned
          .split('')
          .map((c) => c + c)
          .join('')
      : cleaned.slice(0, 6).padEnd(6, '0')
  const r = Number.parseInt(full.slice(0, 2), 16) / 255 || 0
  const g = Number.parseInt(full.slice(2, 4), 16) / 255 || 0
  const b = Number.parseInt(full.slice(4, 6), 16) / 255 || 0
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  let h = 0
  if (d !== 0) {
    if (max === r) {
      h = 60 * (((g - b) / d) % 6)
    } else if (max === g) {
      h = 60 * ((b - r) / d + 2)
    } else {
      h = 60 * ((r - g) / d + 4)
    }
  }
  if (h < 0) {
    h += 360
  }
  const s = max === 0 ? 0 : (d / max) * 100
  const v = max * 100
  return {
    h: Math.round(h),
    s: Math.round(s),
    v: Math.round(v),
    a: 1,
    hex: `#${full.toLowerCase()}`,
  }
}

function channelRange(ch: ColorChannel): { min: number; max: number } {
  if (ch === 'hue') {
    return { min: 0, max: 360 }
  }
  if (ch === 'alpha') {
    return { min: 0, max: 1 }
  }
  if (ch === 'red' || ch === 'green' || ch === 'blue') {
    return { min: 0, max: 255 }
  }
  return { min: 0, max: 100 }
}

function readChannel(color: Color, ch: ColorChannel): number {
  if (ch === 'hue') {
    return color.h
  }
  if (ch === 'saturation') {
    return color.s
  }
  if (ch === 'brightness' || ch === 'lightness') {
    return color.v
  }
  if (ch === 'alpha') {
    return color.a
  }
  const hex = color.hex.replace(/^#/, '')
  if (ch === 'red') {
    return Number.parseInt(hex.slice(0, 2), 16) || 0
  }
  if (ch === 'green') {
    return Number.parseInt(hex.slice(2, 4), 16) || 0
  }
  return Number.parseInt(hex.slice(4, 6), 16) || 0
}

type ColorPickerContextValue = {
  id: string
  state: () => ColorPickerState
  setHex: (hex: string, reason: ColorPickerValueChangeReason, event?: Event) => void
  setHSVA: (
    patch: Partial<{ h: number; s: number; v: number; a: number }>,
    reason: ColorPickerValueChangeReason,
    event?: Event,
  ) => void
  setChannel: (
    ch: ColorChannel,
    val: number,
    reason: ColorPickerValueChangeReason,
    event?: Event,
  ) => void
  commit: (reason: ColorPickerValueChangeReason, event?: Event) => void
}

const ColorPickerContext = createContext<ColorPickerContextValue | null>(null)
const ColorSliderContext = createContext<(() => ColorPickerSliderState) | null>(null)

function useColorPicker(part: string): ColorPickerContextValue {
  const ctx = useContext(ColorPickerContext)
  if (!ctx) {
    throw new Error(`<ColorPicker${part}> must be used inside <ColorPicker>.`)
  }
  return ctx
}

export function ColorPicker(
  props: ColorPickerOptions &
    Omit<
      PartProps<'div', ColorPickerState>,
      keyof ColorPickerOptions | 'defaultValue' | 'onChange'
    >,
) {
  const field = useFieldControl()
  const id = field?.controlId ?? `ui-color-picker-${createUniqueId()}`

  const [hex, setRawHex] = createControlledSignal<string>({
    value: () => props.value,
    defaultValue: () => props.defaultValue ?? '#3b82f6',
  })
  const [alpha, setAlpha] = createSignal(1)
  let rootEl: HTMLElement | null = null

  const disabled = () => !!props.disabled || !!field?.disabled()
  const readOnly = () => !!props.readOnly || !!field?.readOnly()

  const color = (): Color => ({ ...parseHexToColor(hex()), a: alpha() })

  const state = (): ColorPickerState => ({
    value: hex(),
    color: color(),
    format: props.format ?? 'hex',
    disabled: disabled(),
    readOnly: readOnly(),
  })

  const setHex = (nextHex: string, reason: ColorPickerValueChangeReason, event?: Event) => {
    if (disabled() || readOnly()) {
      return
    }
    const normalized = nextHex.startsWith('#') ? nextHex.toLowerCase() : `#${nextHex.toLowerCase()}`
    const details = createChangeDetails(reason, event)
    props.onValueChange?.(normalized, details)
    if (details.canceled) {
      return
    }
    setRawHex(normalized)
    field?.setDirty(true)
  }

  const setHSVA = (
    patch: Partial<{ h: number; s: number; v: number; a: number }>,
    reason: ColorPickerValueChangeReason,
    event?: Event,
  ) => {
    const cur = color()
    const h = patch.h !== undefined ? clamp(patch.h, 0, 360) : cur.h
    const s = patch.s !== undefined ? clamp(patch.s, 0, 100) : cur.s
    const v = patch.v !== undefined ? clamp(patch.v, 0, 100) : cur.v
    if (patch.a !== undefined) {
      setAlpha(clamp(patch.a, 0, 1))
    }
    setHex(hsvToHex(h, s, v), reason, event)
  }

  const setChannel = (
    ch: ColorChannel,
    val: number,
    reason: ColorPickerValueChangeReason,
    event?: Event,
  ) => {
    if (ch === 'hue') {
      setHSVA({ h: val }, reason, event)
    } else if (ch === 'saturation') {
      setHSVA({ s: val }, reason, event)
    } else if (ch === 'brightness' || ch === 'lightness') {
      setHSVA({ v: val }, reason, event)
    } else if (ch === 'alpha') {
      setHSVA({ a: val }, reason, event)
    } else {
      const cur = color()
      const r = ch === 'red' ? clamp(Math.round(val), 0, 255) : readChannel(cur, 'red')
      const g = ch === 'green' ? clamp(Math.round(val), 0, 255) : readChannel(cur, 'green')
      const b = ch === 'blue' ? clamp(Math.round(val), 0, 255) : readChannel(cur, 'blue')
      setHex(`#${toHexByte(r)}${toHexByte(g)}${toHexByte(b)}`, reason, event)
    }
  }

  const commit = (reason: ColorPickerValueChangeReason, event?: Event) => {
    props.onValueCommit?.(hex(), createChangeDetails(reason, event))
  }

  const api: ColorPickerApi = {
    setValue: (next, opts) => setHex(next, opts?.reason ?? 'programmatic', opts?.event),
    setChannel: (ch, val) => setChannel(ch, val, 'programmatic'),
    getValue: () => hex(),
    getColor: color,
  }

  useController(() => props.controller, api)

  registerComponent({
    component: 'color-picker',
    getElements: () => [rootEl],
    getState: () => ({ value: hex(), disabled: disabled() }),
    getDisabled: disabled,
    actions: {
      setValue: (v) =>
        api.setValue(typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '#000000'),
    },
  })

  const rest = omit(
    props,
    'value',
    'defaultValue',
    'onValueChange',
    'onValueCommit',
    'format',
    'space',
    'gamut',
    'disabled',
    'readOnly',
    'controller',
    'debug',
  )

  return (
    <ColorPickerContext value={{ id, state, setHex, setHSVA, setChannel, commit }}>
      {renderPart('div', rest, state, {
        ref: (el) => {
          rootEl = el
        },
        attrs: () => ({
          id,
          'data-disabled': disabled() ? '' : undefined,
        }),
      })}
    </ColorPickerContext>
  )
}

export function ColorPickerArea(
  props: ColorPickerAreaProps &
    Omit<PartProps<'div', ColorPickerState>, keyof ColorPickerAreaProps>,
) {
  const ctx = useColorPicker('Area')
  const rest = omit(props, 'xChannel', 'yChannel')
  return renderPart('div', rest, ctx.state, {
    style: () => ({ position: 'relative' }),
    handlers: {
      onPointerDown: (e: PointerEvent & { currentTarget: HTMLElement }) => {
        if (ctx.state().disabled || ctx.state().readOnly || e.button !== 0) {
          return
        }
        const el = e.currentTarget
        const update = (ev: PointerEvent) => {
          const rect = el.getBoundingClientRect()
          const s =
            rect.width > 0 ? clamp(((ev.clientX - rect.left) / rect.width) * 100, 0, 100) : 0
          const v =
            rect.height > 0 ? clamp((1 - (ev.clientY - rect.top) / rect.height) * 100, 0, 100) : 0
          ctx.setHSVA({ s, v }, 'area', ev)
        }
        update(e)
        const onUp = (ev: PointerEvent) => {
          ctx.commit('area', ev)
          window.removeEventListener('pointermove', update)
          window.removeEventListener('pointerup', onUp)
        }
        window.addEventListener('pointermove', update)
        window.addEventListener('pointerup', onUp)
      },
    },
  })
}

export function ColorPickerAreaCanvas(props: PartProps<'div', ColorPickerState>) {
  const ctx = useColorPicker('AreaCanvas')
  return renderPart('div', props, ctx.state, {
    style: () => ({
      background: `hsl(${ctx.state().color.h}, 100%, 50%)`,
    }),
  })
}

export function ColorPickerAreaThumb(props: PartProps<'div', ColorPickerState>) {
  const ctx = useColorPicker('AreaThumb')
  return renderPart('div', props, ctx.state, {
    attrs: () => ({ role: 'slider', tabindex: ctx.state().disabled ? -1 : 0 }),
    style: () => ({
      position: 'absolute',
      left: `${ctx.state().color.s}%`,
      top: `${100 - ctx.state().color.v}%`,
    }),
  })
}

export function ColorPickerSlider(
  props: ColorPickerSliderProps &
    Omit<PartProps<'div', ColorPickerSliderState>, keyof ColorPickerSliderProps>,
) {
  const ctx = useColorPicker('Slider')
  const sliderState = (): ColorPickerSliderState => {
    const s = ctx.state()
    const { min, max } = channelRange(props.channel)
    const channelValue = readChannel(s.color, props.channel)
    const percent = max > min ? ((channelValue - min) / (max - min)) * 100 : 0
    return { ...s, channel: props.channel, channelValue, min, max, percent }
  }
  const rest = omit(props, 'channel', 'orientation')
  return (
    <ColorSliderContext value={sliderState}>
      {renderPart('div', rest, sliderState, {
        style: () => ({ position: 'relative' }),
        attrs: () => ({
          'data-channel': props.channel,
          'data-orientation': props.orientation ?? 'horizontal',
        }),
        handlers: {
          onPointerDown: (e: PointerEvent & { currentTarget: HTMLElement }) => {
            if (ctx.state().disabled || ctx.state().readOnly || e.button !== 0) {
              return
            }
            const el = e.currentTarget
            const { min, max } = channelRange(props.channel)
            const update = (ev: PointerEvent) => {
              const rect = el.getBoundingClientRect()
              const ratio =
                props.orientation === 'vertical'
                  ? rect.height > 0
                    ? clamp((rect.bottom - ev.clientY) / rect.height, 0, 1)
                    : 0
                  : rect.width > 0
                    ? clamp((ev.clientX - rect.left) / rect.width, 0, 1)
                    : 0
              ctx.setChannel(props.channel, min + ratio * (max - min), 'slider', ev)
            }
            update(e)
            const onUp = (ev: PointerEvent) => {
              ctx.commit('slider', ev)
              window.removeEventListener('pointermove', update)
              window.removeEventListener('pointerup', onUp)
            }
            window.addEventListener('pointermove', update)
            window.addEventListener('pointerup', onUp)
          },
        },
      })}
    </ColorSliderContext>
  )
}

export function ColorPickerSliderThumb(props: PartProps<'div', ColorPickerSliderState>) {
  const sliderState = useContext(ColorSliderContext)
  if (!sliderState) {
    throw new Error('<ColorPickerSliderThumb> must be inside <ColorPickerSlider>.')
  }
  return renderPart('div', props, sliderState, {
    attrs: () => ({
      role: 'slider',
      tabindex: sliderState().disabled ? -1 : 0,
      'aria-valuemin': sliderState().min,
      'aria-valuemax': sliderState().max,
      'aria-valuenow': sliderState().channelValue,
    }),
    style: () => ({
      position: 'absolute',
      left: `${sliderState().percent}%`,
    }),
  })
}

export function ColorPickerInput(
  props: Omit<PartProps<'input', ColorPickerState>, 'type' | 'value'>,
) {
  const ctx = useColorPicker('Input')
  return renderPart('input', props, ctx.state, {
    attrs: () => ({
      type: 'text',
      value: ctx.state().value,
      disabled: ctx.state().disabled,
      readonly: ctx.state().readOnly,
      'aria-label': 'Color value',
    }),
    handlers: {
      onInput: (e: InputEvent & { currentTarget: HTMLInputElement }) => {
        const val = e.currentTarget.value.trim()
        if (/^#?[0-9a-fA-F]{6}$/.test(val)) {
          ctx.setHex(val, 'input', e)
        }
      },
    },
  })
}

export function ColorPickerChannelInput(
  props: ColorPickerChannelInputProps &
    Omit<
      PartProps<'input', ColorPickerState>,
      keyof ColorPickerChannelInputProps | 'type' | 'value'
    >,
) {
  const ctx = useColorPicker('ChannelInput')
  const rest = omit(props, 'channel')
  return renderPart('input', rest, ctx.state, {
    attrs: () => ({
      type: 'number',
      value: readChannel(ctx.state().color, props.channel),
      min: channelRange(props.channel).min,
      max: channelRange(props.channel).max,
      disabled: ctx.state().disabled,
      readonly: ctx.state().readOnly,
      'aria-label': props.channel,
    }),
    handlers: {
      onInput: (e: InputEvent & { currentTarget: HTMLInputElement }) => {
        const num = Number(e.currentTarget.value)
        if (Number.isFinite(num)) {
          ctx.setChannel(props.channel, num, 'input', e)
        }
      },
    },
  })
}

export function ColorPickerSwatch(props: PartProps<'span', ColorPickerState>) {
  const ctx = useColorPicker('Swatch')
  return renderPart('span', props, ctx.state, {
    style: () => ({ background: ctx.state().value }),
  })
}

type SwatchesContextValue = {
  registerValue: (value: string) => number
  hasSelected: () => boolean
}

const ColorSwatchesContext = createContext<SwatchesContextValue | null>(null)

export function ColorPickerSwatches(props: PartProps<'div', ColorPickerState>) {
  const ctx = useColorPicker('Swatches')
  const values: Array<string> = []
  return (
    <ColorSwatchesContext
      value={{
        registerValue: (value: string) => {
          const idx = values.length
          values.push(value.toLowerCase())
          return idx
        },
        hasSelected: () => {
          const cur = ctx.state().value.toLowerCase()
          return values.includes(cur)
        },
      }}
    >
      {renderPart('div', props, ctx.state, { attrs: () => ({ role: 'listbox' }) })}
    </ColorSwatchesContext>
  )
}

export function ColorPickerSwatchItem(
  props: ColorPickerSwatchItemProps &
    Omit<
      PartProps<'button', ColorPickerSwatchItemState>,
      keyof ColorPickerSwatchItemProps | 'type'
    >,
) {
  const ctx = useColorPicker('SwatchItem')
  const swatches = useContext(ColorSwatchesContext)
  const index = swatches ? swatches.registerValue(untrack(() => props.value)) : 0
  const itemState = (): ColorPickerSwatchItemState => ({
    value: props.value,
    selected: ctx.state().value.toLowerCase() === props.value.toLowerCase(),
    disabled: ctx.state().disabled,
  })
  const rest = omit(props, 'value', 'label')
  return renderPart('button', rest, itemState, {
    attrs: () => {
      const s = itemState()
      const isTabStop = !s.disabled && (s.selected || (!swatches?.hasSelected() && index === 0))
      return {
        type: 'button',
        role: 'option',
        tabindex: isTabStop ? 0 : -1,
        disabled: s.disabled,
        'aria-label': props.label ?? props.value,
        'aria-selected': s.selected ? 'true' : 'false',
        'data-selected': s.selected ? '' : undefined,
      }
    },
    style: () => ({ background: props.value }),
    handlers: {
      onClick: (e: MouseEvent) => ctx.setHex(props.value, 'swatch', e),
    },
  })
}

export function ColorPickerEyeDropper(props: Omit<PartProps<'button', ColorPickerState>, 'type'>) {
  const ctx = useColorPicker('EyeDropper')
  return renderPart('button', props, ctx.state, {
    attrs: () => ({
      type: 'button',
      disabled: ctx.state().disabled,
      'aria-label': 'Pick color from screen',
    }),
    handlers: {
      onClick: async (e: MouseEvent) => {
        const EyeDropperCtor = (
          window as unknown as {
            EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }> }
          }
        ).EyeDropper
        if (!EyeDropperCtor) {
          return
        }
        try {
          const result = await new EyeDropperCtor().open()
          ctx.setHex(result.sRGBHex, 'eyedropper', e)
        } catch {
          // user cancelled
        }
      },
    },
  })
}
