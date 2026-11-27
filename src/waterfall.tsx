import { createContext, createSignal, createUniqueId, omit, useContext } from 'solid-js'

import { createController, useController } from './foundation/controller'
import { createChangeDetails } from './foundation/details'
import type { ChangeDetails, ChangeOptions } from './foundation/details'
import { registerComponent } from './foundation/registry'
import { renderPart } from './foundation/render'
import type { PartProps } from './foundation/render'
import { createControlledSignal } from './foundation/state'
import type { ListHighlightDetails } from './listbox'
import type { NumberFormat } from './progress'

export type { ListHighlightDetails, NumberFormat }

export type WaterfallValueChangeReason = 'click' | 'keyboard' | 'programmatic' | 'clear'
export type WaterfallExpandedChangeReason = 'click' | 'keyboard' | 'programmatic'
export type WaterfallChangeOptions = ChangeOptions<WaterfallValueChangeReason>

export type WaterfallDataItem = {
  id: string
  label: string
  start: number
  duration: number
  children?: Array<WaterfallDataItem>
}

export type WaterfallData = Array<WaterfallDataItem>

export type WaterfallDataRow = {
  id: string
  label: string
  start: number
  duration: number
  depth: number
  hasChildren: boolean
  expanded: boolean
}

export function visibleWaterfallRows(
  items: WaterfallData,
  expanded: Set<string> | Array<string>,
): Array<WaterfallDataRow> {
  const set = expanded instanceof Set ? expanded : new Set(expanded)
  const out: Array<WaterfallDataRow> = []
  const walk = (nodes: WaterfallData, depth: number) => {
    for (const n of nodes) {
      const hasChildren = !!n.children && n.children.length > 0
      const isExpanded = hasChildren && set.has(n.id)
      out.push({
        id: n.id,
        label: n.label,
        start: n.start,
        duration: n.duration,
        depth,
        hasChildren,
        expanded: isExpanded,
      })
      if (isExpanded && n.children) {
        walk(n.children, depth + 1)
      }
    }
  }
  walk(items, 0)
  return out
}

export type WaterfallBarLabelDetails = {
  start: number
  duration: number
  total: number
}

export type WaterfallTickData = {
  value: number
  percent: number
  label: string
}

export type WaterfallApi = {
  setValue: (id: string | null, options?: WaterfallChangeOptions) => void
  expand: (id: string) => void
  collapse: (id: string) => void
  toggleExpanded: (id: string) => void
  getValue: () => string | null
  getExpanded: () => Array<string>
}

export function createWaterfallController() {
  return createController<WaterfallApi>()
}

export type WaterfallController = ReturnType<typeof createWaterfallController>

export type WaterfallOptions = {
  value?: string | null
  defaultValue?: string | null
  onValueChange?: (value: string | null, details: ChangeDetails<WaterfallValueChangeReason>) => void
  expanded?: Array<string>
  defaultExpanded?: Array<string>
  onExpandedChange?: (
    expanded: Array<string>,
    details: ChangeDetails<WaterfallExpandedChangeReason>,
  ) => void
  min?: number
  max?: number
  unit?: string
  format?: NumberFormat
  controller?: WaterfallController
  debug?: boolean
}

export type WaterfallState = {
  value: string | null
  expanded: Array<string>
  highlightedValue: string | null
  min: number
  max: number
  span: number
}

export type WaterfallPrimitive = WaterfallState
export type WaterfallProps = WaterfallOptions &
  Omit<PartProps<'div', WaterfallState>, keyof WaterfallOptions | 'defaultValue' | 'onChange'>

export type WaterfallRowProps = {
  value: string
  start: number
  duration: number
  depth?: number
  hasChildren?: boolean
}

export type WaterfallRowPartProps = object
export type WaterfallRowState = {
  value: string
  start: number
  duration: number
  depth: number
  startPercent: number
  widthPercent: number
  selected: boolean
  expanded: boolean
  highlighted: boolean
  hasChildren: boolean
}

export type WaterfallAxisProps = { ticks?: number }
export type WaterfallAxisState = WaterfallState & { ticks: Array<WaterfallTickData> }
export type WaterfallTimeProps = { value: number }
export type WaterfallTimeState = { value: number; percent: number; text: string }

type WaterfallContextValue = {
  state: () => WaterfallState
  selectRow: (id: string, reason: WaterfallValueChangeReason, event?: Event) => void
  toggleExpand: (id: string, reason: WaterfallExpandedChangeReason, event?: Event) => void
  setHighlighted: (id: string | null) => void
  toPercent: (val: number) => number
  formatTime: (val: number) => string
}

const WaterfallContext = createContext<WaterfallContextValue | null>(null)
const WaterfallRowContext = createContext<(() => WaterfallRowState) | null>(null)

function useWaterfall(part: string): WaterfallContextValue {
  const ctx = useContext(WaterfallContext)
  if (!ctx) {
    throw new Error(`<Waterfall${part}> must be used inside <Waterfall>.`)
  }
  return ctx
}

function useWaterfallRow(part: string): () => WaterfallRowState {
  const ctx = useContext(WaterfallRowContext)
  if (!ctx) {
    throw new Error(`<Waterfall${part}> must be used inside <WaterfallRow>.`)
  }
  return ctx
}

export function Waterfall(props: WaterfallProps) {
  const id = `ui-waterfall-${createUniqueId()}`
  const [value, setRawValue] = createControlledSignal<string | null>({
    value: () => props.value,
    defaultValue: () => props.defaultValue ?? null,
  })
  const [expanded, setRawExpanded] = createControlledSignal<Array<string>>({
    value: () => props.expanded,
    defaultValue: () => props.defaultExpanded ?? [],
  })
  const [highlighted, setHighlighted] = createSignal<string | null>(null)
  let rootEl: HTMLElement | null = null

  const min = () => props.min ?? 0
  const max = () => props.max ?? 1000
  const span = () => Math.max(0.0001, max() - min())

  const state = (): WaterfallState => ({
    value: value(),
    expanded: expanded(),
    highlightedValue: highlighted(),
    min: min(),
    max: max(),
    span: span(),
  })

  const selectRow = (next: string | null, reason: WaterfallValueChangeReason, event?: Event) => {
    const details = createChangeDetails(reason, event)
    props.onValueChange?.(next, details)
    if (details.canceled) {
      return
    }
    setRawValue(next)
  }

  const toggleExpand = (target: string, reason: WaterfallExpandedChangeReason, event?: Event) => {
    const cur = expanded()
    const next = cur.includes(target) ? cur.filter((x) => x !== target) : [...cur, target]
    const details = createChangeDetails(reason, event)
    props.onExpandedChange?.(next, details)
    if (details.canceled) {
      return
    }
    setRawExpanded(next)
  }

  const toPercent = (v: number) => Math.min(100, Math.max(0, ((v - min()) / span()) * 100))

  const formatTime = (v: number) => {
    const num = props.format
      ? new Intl.NumberFormat(undefined, props.format).format(v)
      : String(Math.round(v))
    return props.unit ? `${num}${props.unit}` : `${num}ms`
  }

  const api: WaterfallApi = {
    setValue: (next, opts) => selectRow(next, opts?.reason ?? 'programmatic', opts?.event),
    expand: (target) => {
      if (!expanded().includes(target)) {
        toggleExpand(target, 'programmatic')
      }
    },
    collapse: (target) => {
      if (expanded().includes(target)) {
        toggleExpand(target, 'programmatic')
      }
    },
    toggleExpanded: (target) => toggleExpand(target, 'programmatic'),
    getValue: () => value(),
    getExpanded: () => expanded(),
  }

  useController(() => props.controller, api)

  registerComponent({
    component: 'waterfall',
    getElements: () => [rootEl],
    getState: () => ({ value: value(), expanded: expanded(), min: min(), max: max() }),
    actions: {
      select: (v) =>
        api.setValue(
          v ? (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '') : null,
        ),
    },
  })

  const rest = omit(
    props,
    'value',
    'defaultValue',
    'onValueChange',
    'expanded',
    'defaultExpanded',
    'onExpandedChange',
    'min',
    'max',
    'unit',
    'format',
    'controller',
    'debug',
  )

  return (
    <WaterfallContext
      value={{ state, selectRow, toggleExpand, setHighlighted, toPercent, formatTime }}
    >
      {renderPart('div', rest, state, {
        ref: (el) => {
          rootEl = el
        },
        attrs: () => ({ id, role: 'treegrid' }),
      })}
    </WaterfallContext>
  )
}

export function WaterfallHeaderRow(props: PartProps<'div', WaterfallState>) {
  const ctx = useWaterfall('HeaderRow')
  return renderPart('div', props, ctx.state, { attrs: () => ({ role: 'row' }) })
}

export function WaterfallColumnHeader(props: PartProps<'div', WaterfallState>) {
  const ctx = useWaterfall('ColumnHeader')
  return renderPart('div', props, ctx.state, { attrs: () => ({ role: 'columnheader' }) })
}

export function WaterfallAxis(
  props: WaterfallAxisProps & Omit<PartProps<'div', WaterfallAxisState>, keyof WaterfallAxisProps>,
) {
  const ctx = useWaterfall('Axis')
  const axisState = (): WaterfallAxisState => {
    const s = ctx.state()
    const count = Math.max(2, props.ticks ?? 5)
    const ticks: Array<WaterfallTickData> = Array.from({ length: count }, (_, i) => {
      const ratio = i / (count - 1)
      const val = s.min + ratio * s.span
      return { value: val, percent: ratio * 100, label: ctx.formatTime(val) }
    })
    return { ...s, ticks }
  }
  const rest = omit(props, 'ticks')
  return renderPart('div', rest, axisState, { style: () => ({ position: 'relative' }) })
}

export function WaterfallTick(
  props: WaterfallTimeProps & Omit<PartProps<'span', WaterfallTimeState>, keyof WaterfallTimeProps>,
) {
  const ctx = useWaterfall('Tick')
  const tickState = (): WaterfallTimeState => ({
    value: props.value,
    percent: ctx.toPercent(props.value),
    text: ctx.formatTime(props.value),
  })
  const rest = omit(props, 'value')
  const resolvedProps: PartProps<'span', WaterfallTimeState> = {
    ...rest,
    get children() {
      return props.children ?? ((s) => s.text)
    },
  }
  return renderPart('span', resolvedProps, tickState, {
    style: () => ({ position: 'absolute', left: `${tickState().percent}%` }),
  })
}

export function WaterfallMark(
  props: WaterfallTimeProps & Omit<PartProps<'div', WaterfallTimeState>, keyof WaterfallTimeProps>,
) {
  const ctx = useWaterfall('Mark')
  const markState = (): WaterfallTimeState => ({
    value: props.value,
    percent: ctx.toPercent(props.value),
    text: ctx.formatTime(props.value),
  })
  const rest = omit(props, 'value')
  return renderPart('div', rest, markState, {
    attrs: () => ({ 'aria-hidden': true }),
    style: () => ({ position: 'absolute', left: `${markState().percent}%` }),
  })
}

export function WaterfallRow(
  props: WaterfallRowProps & Omit<PartProps<'div', WaterfallRowState>, keyof WaterfallRowProps>,
) {
  const ctx = useWaterfall('Row')
  const rowState = (): WaterfallRowState => {
    const s = ctx.state()
    const startPercent = ctx.toPercent(props.start)
    const endPercent = ctx.toPercent(props.start + props.duration)
    return {
      value: props.value,
      start: props.start,
      duration: props.duration,
      depth: props.depth ?? 0,
      startPercent,
      widthPercent: Math.max(0, endPercent - startPercent),
      selected: s.value === props.value,
      expanded: s.expanded.includes(props.value),
      highlighted: s.highlightedValue === props.value,
      hasChildren: !!props.hasChildren,
    }
  }
  const rest = omit(props, 'value', 'start', 'duration', 'depth', 'hasChildren')

  return (
    <WaterfallRowContext value={rowState}>
      {renderPart('div', rest, rowState, {
        attrs: () => {
          const s = rowState()
          return {
            role: 'row',
            tabindex: 0,
            'aria-level': s.depth + 1,
            'aria-selected': s.selected ? 'true' : 'false',
            'aria-expanded': s.hasChildren ? (s.expanded ? 'true' : 'false') : undefined,
            'data-selected': s.selected ? '' : undefined,
            'data-expanded': s.expanded ? '' : undefined,
          }
        },
        handlers: {
          onClick: (e: MouseEvent) => {
            ctx.selectRow(props.value, 'click', e)
            if (props.hasChildren) {
              ctx.toggleExpand(props.value, 'click', e)
            }
          },
        },
      })}
    </WaterfallRowContext>
  )
}

export function WaterfallRowHeader(
  props: WaterfallRowPartProps & PartProps<'div', WaterfallRowState>,
) {
  const state = useWaterfallRow('RowHeader')
  return renderPart('div', props, state, { attrs: () => ({ role: 'rowheader' }) })
}

export function WaterfallCell(props: WaterfallRowPartProps & PartProps<'div', WaterfallRowState>) {
  const state = useWaterfallRow('Cell')
  return renderPart('div', props, state, {
    attrs: () => ({ role: 'gridcell' }),
    style: () => ({ position: 'relative' }),
  })
}

export function WaterfallBar(props: WaterfallRowPartProps & PartProps<'div', WaterfallRowState>) {
  const state = useWaterfallRow('Bar')
  return renderPart('div', props, state, {
    style: () => ({
      position: 'absolute',
      left: `${state().startPercent}%`,
      width: `${state().widthPercent}%`,
    }),
  })
}

export function WaterfallIndicator(
  props: WaterfallRowPartProps & PartProps<'span', WaterfallRowState>,
) {
  const state = useWaterfallRow('Indicator')
  return renderPart('span', props, state, {
    attrs: () => ({
      'aria-hidden': true,
      'data-expanded': state().expanded ? '' : undefined,
    }),
  })
}
