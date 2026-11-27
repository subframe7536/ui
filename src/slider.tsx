import {
  createContext,
  createSignal,
  createUniqueId,
  omit,
  useContext,
} from "solid-js"
import { useFieldControl } from "./field"
import { createController, useController } from "./foundation/controller"
import {
  createChangeDetails,
  type ChangeDetails,
  type ChangeOptions,
} from "./foundation/details"
import { registerComponent } from "./foundation/registry"
import { renderPart, type PartProps } from "./foundation/render"
import { createControlledSignal } from "./foundation/state"
import type { NumberFormat } from "./progress"

export type { NumberFormat }

export type SliderValueChangeReason = "drag" | "track" | "keyboard" | "programmatic"

export type SliderChangeOptions = ChangeOptions<SliderValueChangeReason>

export type SliderValueChangeDetails = ChangeDetails<SliderValueChangeReason> & {
  activeThumbIndex: number
}

export type SliderValueCommitDetails = SliderValueChangeDetails

export type SliderApi<T extends number | number[] = number> = {
  setValue: (value: T, options?: SliderChangeOptions) => void
  setThumbValue: (index: number, value: number, options?: SliderChangeOptions) => void
  getValues: () => number[]
}

export function createSliderController<T extends number | number[] = number>() {
  return createController<SliderApi<T>>()
}

export type SliderController<T extends number | number[] = number> = SliderApi<T>

export type SliderOptions<T extends number | number[] = number> = {
  value?: T
  defaultValue?: T
  onValueChange?: (value: T, details: SliderValueChangeDetails) => void
  onValueCommit?: (value: T, details: SliderValueCommitDetails) => void
  min?: number
  max?: number
  step?: number
  largeStep?: number
  minStepsBetweenValues?: number
  orientation?: "horizontal" | "vertical"
  format?: NumberFormat
  locale?: string
  disabled?: boolean
  readOnly?: boolean
  invalid?: boolean
  name?: string
  form?: string
  controller?: SliderController<T>
  debug?: boolean
}

export type SliderState = {
  values: number[]
  min: number
  max: number
  step: number
  orientation: "horizontal" | "vertical"
  dragging: boolean
  activeThumbIndex: number
  disabled: boolean
  readOnly: boolean
  invalid: boolean
}

export type SliderThumbProps = {
  index?: number
}

export type SliderThumbState = {
  index: number
  value: number
  percent: number
  dragging: boolean
  disabled: boolean
}

export type SliderValueState = SliderState & {
  formattedValues: string[]
  text: string
}

function toArray(val: number | number[] | undefined, fallback: number): number[] {
  if (val === undefined) return [fallback]
  return Array.isArray(val) ? [...val] : [val]
}

function snapValue(val: number, min: number, max: number, step: number): number {
  const clamped = Math.min(max, Math.max(min, val))
  if (step <= 0) return clamped
  const steps = Math.round((clamped - min) / step)
  const precision = Math.max(0, (step.toString().split(".")[1] ?? "").length)
  return Math.min(max, Math.max(min, Number((min + steps * step).toFixed(precision))))
}

function toPercent(val: number, min: number, max: number): number {
  if (max <= min) return 0
  return ((val - min) / (max - min)) * 100
}

type SliderContextValue = {
  id: string
  state: () => SliderState
  setThumbValue: (
    index: number,
    nextVal: number,
    reason: SliderValueChangeReason,
    event?: Event
  ) => void
  commitValue: (index: number, reason: SliderValueChangeReason, event?: Event) => void
  setDragging: (dragging: boolean, index?: number) => void
  largeStep: () => number
  formatValue: (v: number) => string
  name: () => string | undefined
  form: () => string | undefined
  registerTrack: (el: HTMLElement | null) => void
  getTrack: () => HTMLElement | null
  field: ReturnType<typeof useFieldControl>
}

const SliderContext = createContext<SliderContextValue | null>(null)

function useSlider(part: string): SliderContextValue {
  const ctx = useContext(SliderContext)
  if (!ctx) throw new Error(`<Slider${part}> must be used inside <Slider>.`)
  return ctx
}

export function Slider<T extends number | number[] = number>(
  props: SliderOptions<T> &
    Omit<PartProps<"div", SliderState>, keyof SliderOptions<T> | "defaultValue" | "onChange" | "onSelect">
) {
  const field = useFieldControl()
  const id = field?.controlId ?? `ui-slider-${createUniqueId()}`
  const min = () => props.min ?? 0
  const max = () => props.max ?? 100
  const step = () => props.step ?? 1
  const largeStep = () => props.largeStep ?? step() * 10
  const orientation = () => props.orientation ?? "horizontal"

  const isRange = () => Array.isArray(props.value ?? props.defaultValue)

  const [rawValue, setRawValue] = createControlledSignal<T>({
    value: () => props.value,
    defaultValue: () => props.defaultValue ?? (min() as T),
  })

  const [dragging, setDraggingState] = createSignal(false)
  const [activeThumbIndex, setActiveThumbIndex] = createSignal(-1)
  let trackEl: HTMLElement | null = null
  let rootEl: HTMLElement | null = null

  const disabled = () => !!props.disabled || !!field?.disabled()
  const readOnly = () => !!props.readOnly || !!field?.readOnly()
  const invalid = () => !!props.invalid || !!field?.invalid()

  const values = () => toArray(rawValue(), min())

  const state = (): SliderState => ({
    values: values(),
    min: min(),
    max: max(),
    step: step(),
    orientation: orientation(),
    dragging: dragging(),
    activeThumbIndex: activeThumbIndex(),
    disabled: disabled(),
    readOnly: readOnly(),
    invalid: invalid(),
  })

  const packValues = (arr: number[]): T => (isRange() ? (arr as T) : ((arr[0] ?? min()) as T))

  let emitChange:
    | ((change: {
        key: string
        previous: unknown
        value: unknown
        reason: string
        source: ChangeDetails["source"]
      }) => void)
    | undefined

  const updateValues = (
    arr: number[],
    thumbIdx: number,
    reason: SliderValueChangeReason,
    event?: Event
  ) => {
    const prev = rawValue()
    const packed = packValues(arr)
    const details: SliderValueChangeDetails = {
      ...createChangeDetails(reason, event),
      activeThumbIndex: thumbIdx,
    }
    props.onValueChange?.(packed, details)
    if (details.canceled) return
    setRawValue(packed)
    field?.setDirty(true)
    emitChange?.({
      key: "value",
      previous: prev,
      value: packed,
      reason,
      source: details.source,
    })
  }

  const setThumbValue = (
    index: number,
    nextVal: number,
    reason: SliderValueChangeReason,
    event?: Event
  ) => {
    if (disabled() || readOnly()) return
    const current = [...values()]
    const snapped = snapValue(nextVal, min(), max(), step())
    const minGap = (props.minStepsBetweenValues ?? 0) * step()
    const prev = current[index - 1]
    const next = current[index + 1]
    let bounded = snapped
    if (prev !== undefined && bounded < prev + minGap) bounded = prev + minGap
    if (next !== undefined && bounded > next - minGap) bounded = next - minGap
    current[index] = bounded
    updateValues(current, index, reason, event)
  }

  const commitValue = (index: number, reason: SliderValueChangeReason, event?: Event) => {
    const details: SliderValueCommitDetails = {
      ...createChangeDetails(reason, event),
      activeThumbIndex: index,
    }
    props.onValueCommit?.(packValues(values()), details)
    field?.setTouched(true)
  }

  const api: SliderApi<T> = {
    setValue: (val, options) => {
      const arr = toArray(val, min()).map((v) => snapValue(v, min(), max(), step()))
      updateValues(arr, 0, options?.reason ?? "programmatic", options?.event)
    },
    setThumbValue: (idx, val, options) => {
      setThumbValue(idx, val, options?.reason ?? "programmatic", options?.event)
    },
    getValues: () => values(),
  }

  useController(() => props.controller, api)

  const reg = registerComponent({
    component: "slider",
    getElements: () => [rootEl],
    getState: () => ({ values: values(), min: min(), max: max(), disabled: disabled() }),
    getDisabled: disabled,
    actions: {
      setValue: (v) => api.setValue(v as T),
    },
  })
  emitChange = reg.emit

  const formatValue = (v: number): string => {
    if (!props.format && !props.locale) return String(v)
    try {
      return new Intl.NumberFormat(props.locale, props.format).format(v)
    } catch {
      return String(v)
    }
  }

  const rest = omit(
    props,
    "value",
    "defaultValue",
    "onValueChange",
    "onValueCommit",
    "min",
    "max",
    "step",
    "largeStep",
    "minStepsBetweenValues",
    "orientation",
    "format",
    "locale",
    "disabled",
    "readOnly",
    "invalid",
    "name",
    "form",
    "controller",
    "debug"
  )

  return (
    <SliderContext
      value={{
        id,
        state,
        setThumbValue,
        commitValue,
        setDragging: (d, idx) => {
          setDraggingState(d)
          setActiveThumbIndex(d ? (idx ?? 0) : -1)
        },
        largeStep,
        formatValue,
        name: () => props.name ?? field?.name(),
        form: () => props.form,
        registerTrack: (el) => {
          trackEl = el
        },
        getTrack: () => trackEl,
        field,
      }}
    >
      {renderPart("div", rest, state, {
        ref: (el) => {
          rootEl = el
        },
        attrs: () => {
          const s = state()
          return {
            role: s.values.length > 1 ? "group" : undefined,
            "aria-labelledby": s.values.length > 1 ? field?.labelId : undefined,
            "data-orientation": s.orientation,
            "data-dragging": s.dragging ? "" : undefined,
            "data-disabled": s.disabled ? "" : undefined,
            "data-readonly": s.readOnly ? "" : undefined,
            "data-invalid": s.invalid ? "" : undefined,
          }
        },
      })}
    </SliderContext>
  )
}

function pointerToValue(e: PointerEvent, ctx: SliderContextValue): number {
  const track = ctx.getTrack()
  const s = ctx.state()
  if (!track) return s.min
  const rect = track.getBoundingClientRect()
  const ratio =
    s.orientation === "vertical"
      ? rect.height > 0
        ? (rect.bottom - e.clientY) / rect.height
        : 0
      : rect.width > 0
        ? (e.clientX - rect.left) / rect.width
        : 0
  const clamped = Math.min(1, Math.max(0, ratio))
  return s.min + clamped * (s.max - s.min)
}

export function SliderControl(props: PartProps<"div", SliderState>) {
  const ctx = useSlider("Control")
  return renderPart("div", props, ctx.state, {
    attrs: () => {
      const s = ctx.state()
      return {
        "data-orientation": s.orientation,
        "data-dragging": s.dragging ? "" : undefined,
        "data-disabled": s.disabled ? "" : undefined,
      }
    },
    handlers: {
      onPointerDown: (e: PointerEvent) => {
        const s = ctx.state()
        if (s.disabled || s.readOnly || e.button !== 0) return
        const targetVal = pointerToValue(e, ctx)
        let closest = 0
        let minDist = Infinity
        s.values.forEach((v, i) => {
          const dist = Math.abs(v - targetVal)
          if (dist < minDist) {
            minDist = dist
            closest = i
          }
        })
        ctx.setDragging(true, closest)
        ctx.setThumbValue(closest, targetVal, "track", e)

        const onMove = (ev: PointerEvent) => {
          ctx.setThumbValue(closest, pointerToValue(ev, ctx), "drag", ev)
        }
        const onUp = (ev: PointerEvent) => {
          ctx.setDragging(false)
          ctx.commitValue(closest, "drag", ev)
          window.removeEventListener("pointermove", onMove)
          window.removeEventListener("pointerup", onUp)
        }
        window.addEventListener("pointermove", onMove)
        window.addEventListener("pointerup", onUp)
      },
    },
  })
}

export function SliderTrack(props: PartProps<"div", SliderState>) {
  const ctx = useSlider("Track")
  return renderPart("div", props, ctx.state, {
    ref: (el) => ctx.registerTrack(el),
    attrs: () => ({
      "data-orientation": ctx.state().orientation,
      "data-disabled": ctx.state().disabled ? "" : undefined,
    }),
  })
}

export function SliderIndicator(props: PartProps<"div", SliderState>) {
  const ctx = useSlider("Indicator")
  return renderPart("div", props, ctx.state, {
    attrs: () => ({
      "data-orientation": ctx.state().orientation,
      "data-disabled": ctx.state().disabled ? "" : undefined,
    }),
    style: () => {
      const s = ctx.state()
      const start =
        s.values.length > 1 ? toPercent(s.values[0] ?? s.min, s.min, s.max) : 0
      const end = toPercent(s.values.at(-1) ?? s.min, s.min, s.max)
      const size = Math.max(0, end - start)
      return s.orientation === "vertical"
        ? { bottom: `${start}%`, height: `${size}%` }
        : { left: `${start}%`, width: `${size}%` }
    },
  })
}

export function SliderThumb(
  props: SliderThumbProps & Omit<PartProps<"div", SliderThumbState>, keyof SliderThumbProps>
) {
  const ctx = useSlider("Thumb")
  const index = () => props.index ?? 0
  const thumbState = (): SliderThumbState => {
    const s = ctx.state()
    const idx = index()
    const val = s.values[idx] ?? s.min
    return {
      index: idx,
      value: val,
      percent: toPercent(val, s.min, s.max),
      dragging: s.dragging && s.activeThumbIndex === idx,
      disabled: s.disabled,
    }
  }
  const rest = omit(props, "index")

  return renderPart("div", rest, thumbState, {
    attrs: () => {
      const ts = thumbState()
      const s = ctx.state()
      return {
        id: s.values.length === 1 ? ctx.id : `${ctx.id}-thumb-${ts.index}`,
        role: "slider",
        tabindex: s.disabled ? -1 : 0,
        "aria-valuemin": s.min,
        "aria-valuemax": s.max,
        "aria-valuenow": ts.value,
        "aria-valuetext": ctx.formatValue(ts.value),
        "aria-orientation": s.orientation,
        "aria-disabled": s.disabled ? "true" : undefined,
        "aria-readonly": s.readOnly ? "true" : undefined,
        "aria-labelledby": s.values.length === 1 ? ctx.field?.labelId : undefined,
        "aria-describedby": ctx.field?.describedBy(),
        "data-index": ts.index,
        "data-dragging": ts.dragging ? "" : undefined,
        "data-disabled": ts.disabled ? "" : undefined,
      }
    },
    style: () => {
      const ts = thumbState()
      const s = ctx.state()
      return s.orientation === "vertical"
        ? { bottom: `${ts.percent}%` }
        : { left: `${ts.percent}%` }
    },
    handlers: {
      onKeyDown: (e: KeyboardEvent) => {
        const s = ctx.state()
        const ts = thumbState()
        if (s.disabled || s.readOnly) return
        let next: number | null = null
        if (e.key === "ArrowRight" || e.key === "ArrowUp") next = ts.value + s.step
        else if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = ts.value - s.step
        else if (e.key === "PageUp") next = ts.value + ctx.largeStep()
        else if (e.key === "PageDown") next = ts.value - ctx.largeStep()
        else if (e.key === "Home") next = s.min
        else if (e.key === "End") next = s.max
        if (next !== null) {
          e.preventDefault()
          ctx.setThumbValue(ts.index, next, "keyboard", e)
          ctx.commitValue(ts.index, "keyboard", e)
        }
      },
    },
  })
}

export function SliderValue(props: PartProps<"output", SliderValueState>) {
  const ctx = useSlider("Value")
  const valueState = (): SliderValueState => {
    const s = ctx.state()
    const formattedValues = s.values.map((v) => ctx.formatValue(v))
    return {
      ...s,
      formattedValues,
      text: formattedValues.join(" – "),
    }
  }

  const resolvedProps: PartProps<"output", SliderValueState> =
    props.children !== undefined
      ? props
      : { ...props, children: (s: SliderValueState) => s.text }

  return renderPart("output", resolvedProps, valueState, {
    attrs: () => ({
      "aria-live": "off",
    }),
  })
}
