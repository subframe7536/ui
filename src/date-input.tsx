import { createContext, createUniqueId, omit, useContext } from 'solid-js'

import type { DateMatcher, DateMatchers } from './calendar'
import { useFieldControl } from './field'
import { createController, useController } from './foundation/controller'
import { createChangeDetails } from './foundation/details'
import type { ChangeDetails, ChangeOptions } from './foundation/details'
import { registerComponent } from './foundation/registry'
import { renderPart } from './foundation/render'
import type { PartProps } from './foundation/render'
import { createControlledSignal } from './foundation/state'

export type { DateMatcher, DateMatchers }
export type HourCycle = 12 | 24
export type DateInputGranularity = 'day' | 'minute' | 'second'
export type DateInputSegmentType =
  | 'year'
  | 'month'
  | 'day'
  | 'hour'
  | 'minute'
  | 'second'
  | 'dayPeriod'
  | 'literal'
export type DateInputValueChangeReason = 'input' | 'step' | 'clear' | 'programmatic'
export type DateInputChangeOptions = ChangeOptions<DateInputValueChangeReason>

export type DateInputSegmentData = {
  type: DateInputSegmentType
  value: number | null
  text: string
  min?: number
  max?: number
  placeholder: string
}

export type DateInputApi = {
  setValue: (value: string | null, options?: DateInputChangeOptions) => void
  clear: () => void
  getValue: () => string | null
}

export function createDateInputController() {
  return createController<DateInputApi>()
}

export type DateInputController = ReturnType<typeof createDateInputController>

export type DateInputOptions = {
  value?: string | null
  defaultValue?: string | null
  onValueChange?: (value: string | null, details: ChangeDetails<DateInputValueChangeReason>) => void
  granularity?: DateInputGranularity
  hourCycle?: HourCycle
  min?: string
  max?: string
  disabledDates?: DateMatchers
  disabled?: boolean
  readOnly?: boolean
  required?: boolean
  invalid?: boolean
  name?: string
  controller?: DateInputController
  debug?: boolean
}

export type DateInputState = {
  value: string | null
  segments: Array<DateInputSegmentData>
  disabled: boolean
  readOnly: boolean
  invalid: boolean
}

export type DateInputPrimitive = DateInputState
export type DateInputSegmentProps = { segment: DateInputSegmentType }
export type DateInputSegmentState = DateInputSegmentData & {
  disabled: boolean
  readOnly: boolean
}

function pad(n: number, len = 2): string {
  return String(n).padStart(len, '0')
}

function parseDateParts(iso: string | null): {
  year: number | null
  month: number | null
  day: number | null
} {
  if (!iso) {
    return { year: null, month: null, day: null }
  }
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!m) {
    return { year: null, month: null, day: null }
  }
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) }
}

type DateInputContextValue = {
  state: () => DateInputState
  stepSegment: (type: DateInputSegmentType, delta: number, event?: Event) => void
  setSegmentValue: (type: DateInputSegmentType, num: number, event?: Event) => void
}

const DateInputContext = createContext<DateInputContextValue | null>(null)

function useDateInput(part: string): DateInputContextValue {
  const ctx = useContext(DateInputContext)
  if (!ctx) {
    throw new Error(`<DateInput${part}> must be used inside <DateInput>.`)
  }
  return ctx
}

export function DateInput(
  props: DateInputOptions &
    Omit<PartProps<'div', DateInputState>, keyof DateInputOptions | 'defaultValue' | 'onChange'>,
) {
  const field = useFieldControl()
  const id = field?.controlId ?? `ui-date-input-${createUniqueId()}`

  const [value, setRawValue] = createControlledSignal<string | null>({
    value: () => props.value,
    defaultValue: () => props.defaultValue ?? null,
  })
  let rootEl: HTMLElement | null = null

  const disabled = () => !!props.disabled || !!field?.disabled()
  const readOnly = () => !!props.readOnly || !!field?.readOnly()
  const invalid = () => !!props.invalid || !!field?.invalid()

  const buildSegments = (): Array<DateInputSegmentData> => {
    const p = parseDateParts(value())
    return [
      {
        type: 'year',
        value: p.year,
        text: p.year !== null ? pad(p.year, 4) : 'yyyy',
        min: 1,
        max: 9999,
        placeholder: 'yyyy',
      },
      { type: 'literal', value: null, text: '-', placeholder: '-' },
      {
        type: 'month',
        value: p.month,
        text: p.month !== null ? pad(p.month) : 'mm',
        min: 1,
        max: 12,
        placeholder: 'mm',
      },
      { type: 'literal', value: null, text: '-', placeholder: '-' },
      {
        type: 'day',
        value: p.day,
        text: p.day !== null ? pad(p.day) : 'dd',
        min: 1,
        max: 31,
        placeholder: 'dd',
      },
    ]
  }

  const state = (): DateInputState => ({
    value: value(),
    segments: buildSegments(),
    disabled: disabled(),
    readOnly: readOnly(),
    invalid: invalid(),
  })

  const commit = (next: string | null, reason: DateInputValueChangeReason, event?: Event) => {
    const details = createChangeDetails(reason, event)
    props.onValueChange?.(next, details)
    if (details.canceled) {
      return
    }
    setRawValue(next)
    field?.setDirty(true)
  }

  const updateParts = (
    patch: Partial<{ year: number; month: number; day: number }>,
    reason: DateInputValueChangeReason,
    event?: Event,
  ) => {
    const now = new Date()
    const cur = parseDateParts(value())
    const year = Math.min(9999, Math.max(1, patch.year ?? cur.year ?? now.getFullYear()))
    const month = Math.min(12, Math.max(1, patch.month ?? cur.month ?? now.getMonth() + 1))
    const maxDay = new Date(year, month, 0).getDate()
    const day = Math.min(maxDay, Math.max(1, patch.day ?? cur.day ?? now.getDate()))
    commit(`${pad(year, 4)}-${pad(month)}-${pad(day)}`, reason, event)
  }

  const stepSegment = (type: DateInputSegmentType, delta: number, event?: Event) => {
    if (disabled() || readOnly()) {
      return
    }
    const cur = parseDateParts(value())
    const now = new Date()
    if (type === 'year') {
      updateParts({ year: (cur.year ?? now.getFullYear()) + delta }, 'step', event)
    } else if (type === 'month') {
      const next = (((cur.month ?? now.getMonth() + 1) - 1 + delta + 12) % 12) + 1
      updateParts({ month: next }, 'step', event)
    } else if (type === 'day') {
      const y = cur.year ?? now.getFullYear()
      const m = cur.month ?? now.getMonth() + 1
      const maxDay = new Date(y, m, 0).getDate()
      const next = (((cur.day ?? now.getDate()) - 1 + delta + maxDay) % maxDay) + 1
      updateParts({ day: next }, 'step', event)
    }
  }

  const setSegmentValue = (type: DateInputSegmentType, num: number, event?: Event) => {
    if (disabled() || readOnly()) {
      return
    }
    if (type === 'year') {
      updateParts({ year: num }, 'input', event)
    } else if (type === 'month') {
      updateParts({ month: num }, 'input', event)
    } else if (type === 'day') {
      updateParts({ day: num }, 'input', event)
    }
  }

  const api: DateInputApi = {
    setValue: (next, opts) => commit(next, opts?.reason ?? 'programmatic', opts?.event),
    clear: () => commit(null, 'clear'),
    getValue: () => value(),
  }

  useController(() => props.controller, api)

  registerComponent({
    component: 'date-input',
    getElements: () => [rootEl],
    getState: () => ({ value: value(), disabled: disabled() }),
    getDisabled: disabled,
    actions: {
      setValue: (v) => api.setValue(v ? String(v) : null),
      clear: () => api.clear(),
    },
  })

  const rest = omit(
    props,
    'value',
    'defaultValue',
    'onValueChange',
    'granularity',
    'hourCycle',
    'min',
    'max',
    'disabledDates',
    'disabled',
    'readOnly',
    'required',
    'invalid',
    'name',
    'controller',
    'debug',
  )

  return (
    <DateInputContext value={{ state, stepSegment, setSegmentValue }}>
      {renderPart('div', rest, state, {
        ref: (el) => {
          rootEl = el
        },
        attrs: () => ({
          id,
          role: 'group',
          'aria-labelledby': field?.labelId,
          'aria-describedby': field?.describedBy(),
          'aria-invalid': invalid() ? 'true' : undefined,
          'data-disabled': disabled() ? '' : undefined,
          'data-readonly': readOnly() ? '' : undefined,
          'data-invalid': invalid() ? '' : undefined,
        }),
      })}
    </DateInputContext>
  )
}

export function DateInputSegment(
  props: DateInputSegmentProps &
    Omit<PartProps<'span', DateInputSegmentState>, keyof DateInputSegmentProps>,
) {
  const ctx = useDateInput('Segment')
  const segState = (): DateInputSegmentState => {
    const s = ctx.state()
    const seg = s.segments.find((item) => item.type === props.segment) ?? {
      type: props.segment,
      value: null,
      text: '',
      placeholder: '',
    }
    return {
      ...seg,
      disabled: s.disabled,
      readOnly: s.readOnly,
    }
  }
  const rest = omit(props, 'segment')
  const resolvedProps: PartProps<'span', DateInputSegmentState> =
    props.children !== undefined ? rest : { ...rest, children: (s) => s.text }

  return renderPart('span', resolvedProps, segState, {
    attrs: () => {
      const s = segState()
      const isLiteral = s.type === 'literal'
      return {
        role: isLiteral ? undefined : 'spinbutton',
        tabindex: isLiteral || s.disabled ? undefined : 0,
        'aria-valuenow': s.value ?? undefined,
        'aria-valuemin': s.min,
        'aria-valuemax': s.max,
        'aria-label': isLiteral ? undefined : s.type,
        'data-segment': s.type,
        'data-placeholder': s.value === null && !isLiteral ? '' : undefined,
      }
    },
    handlers: {
      onKeyDown: (e: KeyboardEvent) => {
        if (props.segment === 'literal' || segState().disabled || segState().readOnly) {
          return
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault()
          ctx.stepSegment(props.segment, 1, e)
        } else if (e.key === 'ArrowDown') {
          e.preventDefault()
          ctx.stepSegment(props.segment, -1, e)
        }
      },
    },
  })
}
