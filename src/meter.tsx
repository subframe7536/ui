import { createContext, createUniqueId, omit, useContext } from 'solid-js'

import { renderPart } from './foundation/render'
import type { PartProps } from './foundation/render'
import type { NumberFormat } from './progress'

export type MeterLabelDetails = {
  value: number
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
  format?: NumberFormat
  getValueLabel?: (details: MeterLabelDetails) => string
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
    const clamped = Math.min(hi, Math.max(lo, props.value))
    const percent = hi > lo ? ((clamped - lo) / (hi - lo)) * 100 : 0
    return { value: clamped, min: lo, max: hi, percent }
  }

  const formattedValue = () => {
    const s = state()
    if (props.getValueLabel) {
      return props.getValueLabel(s)
    }
    return new Intl.NumberFormat(undefined, props.format ?? { style: 'percent' }).format(
      s.percent / 100,
    )
  }

  const rest = omit(
    props,
    'value',
    'min',
    'max',
    'low',
    'high',
    'optimum',
    'format',
    'getValueLabel',
    'debug',
  )

  return (
    <MeterContext value={{ state, labelId, formattedValue }}>
      {renderPart('div', rest, state, {
        attrs: () => {
          const s = state()
          return {
            role: 'meter',
            'aria-valuemin': s.min,
            'aria-valuemax': s.max,
            'aria-valuenow': s.value,
            'aria-valuetext': formattedValue(),
            'aria-labelledby': labelId,
          }
        },
      })}
    </MeterContext>
  )
}

export function MeterTrack(props: PartProps<'div', MeterState>) {
  const ctx = useMeter('Track')
  return renderPart('div', props, ctx.state)
}

export function MeterIndicator(props: PartProps<'div', MeterState>) {
  const ctx = useMeter('Indicator')
  return renderPart('div', props, ctx.state, {
    style: () => ({ width: `${ctx.state().percent}%` }),
  })
}

export function MeterLabel(props: PartProps<'span', MeterState>) {
  const ctx = useMeter('Label')
  return renderPart('span', props, ctx.state, {
    attrs: () => ({ id: props.id ?? ctx.labelId }),
  })
}

export function MeterValue(props: PartProps<'span', MeterValueState>) {
  const ctx = useMeter('Value')
  const state = (): MeterValueState => ({ ...ctx.state(), text: ctx.formattedValue() })
  return renderPart(
    'span',
    {
      ...props,
      get children() {
        return props.children ?? ctx.formattedValue()
      },
    },
    state,
    {
      attrs: () => ({ 'aria-hidden': 'true' }),
    },
  )
}

export type { NumberFormat }
