import { createContext, createUniqueId, omit, useContext } from 'solid-js'

import type { HourCycle } from './date-input'
import { useFieldControl } from './field'
import { createController, useController } from './foundation/controller'
import { createChangeDetails } from './foundation/details'
import type { ChangeDetails, ChangeOptions } from './foundation/details'
import { registerComponent } from './foundation/registry'
import { renderPart } from './foundation/render'
import type { PartProps } from './foundation/render'
import { createControlledSignal } from './foundation/state'

export type { HourCycle }
export type TimeInputGranularity = 'hour' | 'minute' | 'second'
export type TimeInputSegmentType = 'hour' | 'minute' | 'second' | 'dayPeriod' | 'literal'
export type TimeInputValueChangeReason = 'input' | 'step' | 'clear' | 'programmatic'
export type TimeInputChangeOptions = ChangeOptions<TimeInputValueChangeReason>

export type TimeInputSegmentData = {
  type: TimeInputSegmentType
  value: number | null
  text: string
  min?: number
  max?: number
  placeholder: string
}

export type TimeInputApi = {
  setValue: (value: string | null, options?: TimeInputChangeOptions) => void
  clear: () => void
  getValue: () => string | null
}

export function createTimeInputController() {
  return createController<TimeInputApi>()
}

export type TimeInputController = ReturnType<typeof createTimeInputController>

export type TimeInputOptions = {
  value?: string | null
  defaultValue?: string | null
  onValueChange?: (value: string | null, details: ChangeDetails<TimeInputValueChangeReason>) => void
  granularity?: TimeInputGranularity
  hourCycle?: HourCycle
  min?: string
  max?: string
  disabled?: boolean
  readOnly?: boolean
  required?: boolean
  invalid?: boolean
  name?: string
  controller?: TimeInputController
  debug?: boolean
}

export type TimeInputState = {
  value: string | null
  segments: Array<TimeInputSegmentData>
  disabled: boolean
  readOnly: boolean
  invalid: boolean
}

export type TimeInputPrimitive = TimeInputState
export type TimeInputSegmentProps = { segment: TimeInputSegmentType }
export type TimeInputSegmentState = TimeInputSegmentData & {
  disabled: boolean
  readOnly: boolean
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function parseTimeParts(str: string | null): {
  hour: number | null
  minute: number | null
  second: number | null
} {
  if (!str) {
    return { hour: null, minute: null, second: null }
  }
  const m = /^(\d{2}):(\d{2})(?::(\d{2}))?/.exec(str)
  if (!m) {
    return { hour: null, minute: null, second: null }
  }
  return {
    hour: Number(m[1]),
    minute: Number(m[2]),
    second: m[3] !== undefined ? Number(m[3]) : 0,
  }
}

type TimeInputContextValue = {
  state: () => TimeInputState
  stepSegment: (type: TimeInputSegmentType, delta: number, event?: Event) => void
}

const TimeInputContext = createContext<TimeInputContextValue | null>(null)

function useTimeInput(part: string): TimeInputContextValue {
  const ctx = useContext(TimeInputContext)
  if (!ctx) {
    throw new Error(`<TimeInput${part}> must be used inside <TimeInput>.`)
  }
  return ctx
}

export function TimeInput(
  props: TimeInputOptions &
    Omit<PartProps<'div', TimeInputState>, keyof TimeInputOptions | 'defaultValue' | 'onChange'>,
) {
  const field = useFieldControl()
  const id = field?.controlId ?? `ui-time-input-${createUniqueId()}`

  const [value, setRawValue] = createControlledSignal<string | null>({
    value: () => props.value,
    defaultValue: () => props.defaultValue ?? null,
  })
  let rootEl: HTMLElement | null = null

  const disabled = () => !!props.disabled || !!field?.disabled()
  const readOnly = () => !!props.readOnly || !!field?.readOnly()
  const invalid = () => !!props.invalid || !!field?.invalid()
  const granularity = (): TimeInputGranularity => props.granularity ?? 'minute'

  const buildSegments = (): Array<TimeInputSegmentData> => {
    const p = parseTimeParts(value())
    const list: Array<TimeInputSegmentData> = [
      {
        type: 'hour',
        value: p.hour,
        text: p.hour !== null ? pad2(p.hour) : '--',
        min: 0,
        max: 23,
        placeholder: '--',
      },
      { type: 'literal', value: null, text: ':', placeholder: ':' },
      {
        type: 'minute',
        value: p.minute,
        text: p.minute !== null ? pad2(p.minute) : '--',
        min: 0,
        max: 59,
        placeholder: '--',
      },
    ]
    if (granularity() === 'second') {
      list.push(
        { type: 'literal', value: null, text: ':', placeholder: ':' },
        {
          type: 'second',
          value: p.second,
          text: p.second !== null ? pad2(p.second) : '--',
          min: 0,
          max: 59,
          placeholder: '--',
        },
      )
    }
    return list
  }

  const state = (): TimeInputState => ({
    value: value(),
    segments: buildSegments(),
    disabled: disabled(),
    readOnly: readOnly(),
    invalid: invalid(),
  })

  const commit = (next: string | null, reason: TimeInputValueChangeReason, event?: Event) => {
    const details = createChangeDetails(reason, event)
    props.onValueChange?.(next, details)
    if (details.canceled) {
      return
    }
    setRawValue(next)
    field?.setDirty(true)
  }

  const stepSegment = (type: TimeInputSegmentType, delta: number, event?: Event) => {
    if (disabled() || readOnly()) {
      return
    }
    const cur = parseTimeParts(value())
    let hour = cur.hour ?? 0
    let minute = cur.minute ?? 0
    let second = cur.second ?? 0
    if (type === 'hour') {
      hour = (hour + delta + 24) % 24
    } else if (type === 'minute') {
      minute = (minute + delta + 60) % 60
    } else if (type === 'second') {
      second = (second + delta + 60) % 60
    }
    const next =
      granularity() === 'second'
        ? `${pad2(hour)}:${pad2(minute)}:${pad2(second)}`
        : `${pad2(hour)}:${pad2(minute)}`
    commit(next, 'step', event)
  }

  const api: TimeInputApi = {
    setValue: (next, opts) => commit(next, opts?.reason ?? 'programmatic', opts?.event),
    clear: () => commit(null, 'clear'),
    getValue: () => value(),
  }

  useController(() => props.controller, api)

  registerComponent({
    component: 'time-input',
    getElements: () => [rootEl],
    getState: () => ({ value: value(), disabled: disabled() }),
    getDisabled: disabled,
    actions: {
      setValue: (v) =>
        api.setValue(
          v ? (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '') : null,
        ),
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
    'disabled',
    'readOnly',
    'required',
    'invalid',
    'name',
    'controller',
    'debug',
  )

  return (
    <TimeInputContext value={{ state, stepSegment }}>
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
    </TimeInputContext>
  )
}

export function TimeInputSegment(
  props: TimeInputSegmentProps &
    Omit<PartProps<'span', TimeInputSegmentState>, keyof TimeInputSegmentProps>,
) {
  const ctx = useTimeInput('Segment')
  const segState = (): TimeInputSegmentState => {
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
  const resolvedProps: PartProps<'span', TimeInputSegmentState> = {
    ...rest,
    get children() {
      return props.children ?? ((s) => s.text)
    },
  }

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
