import { createContext, createUniqueId, merge, omit, useContext } from 'solid-js'

import { renderPart } from './foundation/render'
import type { PartProps } from './foundation/render'

export type ProgressStatus = 'indeterminate' | 'progressing' | 'complete'
export type NumberFormat = Intl.NumberFormatOptions | ((value: number) => string)

export type GaugeLabelDetails<Value extends number | null = number | null> = {
  formatted: string
  min: number
  max: number
  percent: number | Extract<Value, null>
}

export type ProgressOptions = {
  value?: number | null
  min?: number
  max?: number
  locale?: string
  format?: NumberFormat
  getValueLabel?: (value: number | null, details: GaugeLabelDetails) => string
  debug?: boolean
}

export type ProgressState = {
  value: number | null
  min: number
  max: number
  percent: number | null
  status: ProgressStatus
}

export type ProgressValueState = ProgressState & { text: string }

type ProgressContextValue = {
  state: () => ProgressState
  labelId: string
  formattedValue: () => string
}

const ProgressContext = createContext<ProgressContextValue | null>(null)

function useProgress(part: string): ProgressContextValue {
  const ctx = useContext(ProgressContext)
  if (!ctx) {
    throw new Error(`<Progress${part}> must be used inside <Progress>.`)
  }
  return ctx
}

export function Progress(
  props: ProgressOptions & Omit<PartProps<'div', ProgressState>, keyof ProgressOptions>,
) {
  const labelId = `ui-progress-label-${createUniqueId()}`
  const min = () => props.min ?? 0
  const max = () => props.max ?? 100

  const state = (): ProgressState => {
    const lo = min()
    const hi = max()
    const val = props.value ?? null
    if (val === null || Number.isNaN(val)) {
      return { value: null, min: lo, max: hi, percent: null, status: 'indeterminate' }
    }
    const clamped = Math.min(hi, Math.max(lo, val))
    const pct = hi > lo ? ((clamped - lo) / (hi - lo)) * 100 : 0
    return {
      value: clamped,
      min: lo,
      max: hi,
      percent: pct,
      status: clamped >= hi ? 'complete' : 'progressing',
    }
  }

  const formattedValue = () => {
    const s = state()
    if (s.value === null || s.percent === null) {
      return ''
    }
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

  const rest = omit(props, 'value', 'min', 'max', 'locale', 'format', 'getValueLabel', 'debug')

  return (
    <ProgressContext value={{ state, labelId, formattedValue }}>
      {renderPart('div', rest, state, {
        attrs: () => {
          const s = state()
          return {
            role: 'progressbar',
            'data-slot': 'progress',
            'aria-valuemin': s.min,
            'aria-valuemax': s.max,
            'aria-valuenow': s.value ?? undefined,
            'aria-valuetext': ariaValueText(),
            'aria-labelledby': labelId,
            'data-status': s.status,
            'data-indeterminate': s.status === 'indeterminate' ? '' : undefined,
            'data-complete': s.status === 'complete' ? '' : undefined,
          }
        },
        style: () => {
          const pct = state().percent
          return pct === null ? undefined : { '--progress-value': `${pct}%` }
        },
      })}
    </ProgressContext>
  )
}

export function ProgressTrack(props: PartProps<'div', ProgressState>) {
  const ctx = useProgress('Track')
  return renderPart('div', props, ctx.state, {
    attrs: () => ({ 'data-slot': 'progress-track', 'data-status': ctx.state().status }),
  })
}

export function ProgressIndicator(props: PartProps<'div', ProgressState>) {
  const ctx = useProgress('Indicator')
  return renderPart('div', props, ctx.state, {
    attrs: () => ({ 'data-slot': 'progress-indicator', 'data-status': ctx.state().status }),
    style: () => {
      const pct = ctx.state().percent
      return pct === null ? undefined : { 'inset-inline-start': 0, width: `${pct}%` }
    },
  })
}

export function ProgressLabel(props: PartProps<'span', ProgressState>) {
  const ctx = useProgress('Label')
  return renderPart('span', props, ctx.state, {
    attrs: () => ({ id: props.id ?? ctx.labelId, 'data-slot': 'progress-label' }),
  })
}

export function ProgressValue(props: PartProps<'span', ProgressValueState>) {
  const ctx = useProgress('Value')
  const state = (): ProgressValueState => ({ ...ctx.state(), text: ctx.formattedValue() })
  return renderPart(
    'span',
    merge(props, {
      get children() {
        return props.children ?? ctx.formattedValue()
      },
    }),
    state,
    {
      attrs: () => ({ 'aria-hidden': 'true', 'data-slot': 'progress-value' }),
    },
  )
}
