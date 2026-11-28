import { createContext, createUniqueId, merge, omit, useContext } from 'solid-js'

import { renderPart } from './foundation/render'
import type { PartProps } from './foundation/render'
import type { NumberFormat } from './progress'

export type MeterLabelDetails = {
  formatted: string
  min: number
  max: number
  percent: number
}

export type MeterOptions = {
  value: number
  min?: number
  max?: number
  low?: number
  high?: number
  optimum?: number
  locale?: string
  format?: NumberFormat
  getValueLabel?: (value: number, details: MeterLabelDetails) => string
  debug?: boolean
}

export type MeterState = {
  value: number
  min: number
  max: number
  percent: number
}

export type MeterValueState = MeterState & { text: string }

type MeterContextValue = {
  state: () => MeterState
  labelId: string
  formattedValue: () => string
}

const MeterContext = createContext<MeterContextValue | null>(null)

function useMeter(part: string): MeterContextValue {
  const ctx = useContext(MeterContext)
  if (!ctx) {
    throw new Error(`<Meter${part}> must be used inside <Meter>.`)
  }
  return ctx
}

export function Meter(
  props: MeterOptions & Omit<PartProps<'div', MeterState>, keyof MeterOptions>,
) {
  const labelId = `ui-meter-label-${createUniqueId()}`
  const min = () => props.min ?? 0
  const max = () => props.max ?? 100

  const state = (): MeterState => {
    const lo = min()
    const hi = max()
    const rawVal =
      typeof props.value === 'number' && Number.isFinite(props.value) ? props.value : lo
    const clamped = Math.min(hi, Math.max(lo, rawVal))
    const percent = hi > lo ? ((clamped - lo) / (hi - lo)) * 100 : rawVal >= hi ? 100 : 0
    return { value: rawVal, min: lo, max: hi, percent }
  }

  const formattedValue = () => {
    const s = state()
    const fmt = props.format
    if (typeof fmt === 'function') {
      return fmt(s.value)
    }
    const locale = props.locale ?? (typeof document === 'undefined' ? 'en' : undefined)
    if (fmt && fmt.style !== 'percent') {
      return new Intl.NumberFormat(locale, fmt).format(s.value)
    }
    return new Intl.NumberFormat(locale, fmt ?? { style: 'percent' }).format(s.percent / 100)
  }

  const ariaValueText = () => {
    const s = state()
    const formatted = formattedValue()
    if (!props.getValueLabel) {
      return formatted || undefined
    }
    return props.getValueLabel(s.value, {
      formatted,
      min: s.min,
      max: s.max,
      percent: s.percent,
    })
  }

  const rest = omit(
    props,
    'value',
    'min',
    'max',
    'low',
    'high',
    'optimum',
    'locale',
    'format',
    'getValueLabel',
    'debug',
  )

  return (
    <MeterContext value={{ state, labelId, formattedValue }}>
      {renderPart('div', rest, state, {
        attrs: () => {
          const s = state()
          const clamped = Math.min(s.max, Math.max(s.min, s.value))
          return {
            role: 'meter',
            'data-slot': 'meter',
            'aria-valuemin': s.min,
            'aria-valuemax': s.max,
            'aria-valuenow': clamped,
            'aria-valuetext': ariaValueText(),
            'aria-labelledby': labelId,
          }
        },
        style: () => ({ '--meter-value': `${Math.round(state().percent * 1e4) / 1e4}%` }),
      })}
    </MeterContext>
  )
}

export function MeterTrack(props: PartProps<'div', MeterState>) {
  const ctx = useMeter('Track')
  return renderPart('div', props, ctx.state, {
    attrs: () => ({ 'data-slot': 'meter-track' }),
  })
}

export function MeterIndicator(props: PartProps<'div', MeterState>) {
  const ctx = useMeter('Indicator')
  return renderPart('div', props, ctx.state, {
    attrs: () => ({ 'data-slot': 'meter-indicator' }),
    style: () => ({
      'inset-inline-start': 0,
      width: `${Math.round(ctx.state().percent * 1e4) / 1e4}%`,
    }),
  })
}

export function MeterLabel(props: PartProps<'span', MeterState>) {
  const ctx = useMeter('Label')
  return renderPart('span', props, ctx.state, {
    attrs: () => ({ id: props.id ?? ctx.labelId, 'data-slot': 'meter-label' }),
  })
}

export function MeterValue(props: PartProps<'span', MeterValueState>) {
  const ctx = useMeter('Value')
  const state = (): MeterValueState => ({ ...ctx.state(), text: ctx.formattedValue() })
  return renderPart(
    'span',
    merge(props, {
      get children() {
        return props.children ?? ctx.formattedValue()
      },
    }),
    state,
    {
      attrs: () => ({ 'aria-hidden': 'true', 'data-slot': 'meter-value' }),
    },
  )
}

export type { NumberFormat }
