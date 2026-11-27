import {
  createSignal,
  createContext,
  createUniqueId,
  For,
  merge,
  omit,
  Show,
  useContext,
} from 'solid-js'

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
  key?: string
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
  locale?: string
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
export type DateInputSegmentProps = { segment: DateInputSegmentType | DateInputSegmentData }
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
  const [draftParts, setDraftParts] = createSignal<{
    year?: number
    month?: number
    day?: number
  }>({})
  const [typingBuf, setTypingBuf] = createSignal<Record<string, string>>({})
  let rootEl: HTMLElement | null = null

  const disabled = () => !!props.disabled || !!field?.disabled()
  const readOnly = () => !!props.readOnly || !!field?.readOnly()
  const invalid = () => !!props.invalid || !!field?.invalid()

  const buildSegments = (): Array<DateInputSegmentData> => {
    const p = parseDateParts(value())
    const d = draftParts()
    const yearVal = p.year ?? d.year ?? null
    const monthVal = p.month ?? d.month ?? null
    const dayVal = p.day ?? d.day ?? null
    const yearSeg: DateInputSegmentData = {
      key: 'year',
      type: 'year',
      value: yearVal,
      text: yearVal !== null ? pad(yearVal, 4) : 'yyyy',
      min: 1,
      max: 9999,
      placeholder: 'yyyy',
    }
    const monthSeg: DateInputSegmentData = {
      key: 'month',
      type: 'month',
      value: monthVal,
      text: monthVal !== null ? pad(monthVal) : 'mm',
      min: 1,
      max: 12,
      placeholder: 'mm',
    }
    const daySeg: DateInputSegmentData = {
      key: 'day',
      type: 'day',
      value: dayVal,
      text: dayVal !== null ? pad(dayVal) : 'dd',
      min: 1,
      max: 31,
      placeholder: 'dd',
    }
    if (props.locale?.startsWith('en-US')) {
      return [
        monthSeg,
        { key: 'literal-0', type: 'literal', value: null, text: '/', placeholder: '/' },
        daySeg,
        { key: 'literal-1', type: 'literal', value: null, text: '/', placeholder: '/' },
        yearSeg,
      ]
    }
    return [
      yearSeg,
      { key: 'literal-0', type: 'literal', value: null, text: '-', placeholder: '-' },
      monthSeg,
      { key: 'literal-1', type: 'literal', value: null, text: '-', placeholder: '-' },
      daySeg,
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

  const focusNextSegment = (currentEl: HTMLElement) => {
    if (!rootEl) {
      return
    }
    const inputs = Array.from(rootEl.querySelectorAll<HTMLInputElement>('input[role="spinbutton"]'))
    const idx = inputs.indexOf(currentEl as HTMLInputElement)
    if (idx >= 0 && idx + 1 < inputs.length) {
      inputs[idx + 1]?.focus()
    }
  }

  const handleBeforeInput = (type: DateInputSegmentType, e: InputEvent) => {
    if (
      disabled() ||
      readOnly() ||
      e.inputType !== 'insertText' ||
      !e.data ||
      !/^\d+$/.test(e.data)
    ) {
      return
    }
    e.preventDefault()
    const maxLen = type === 'year' ? 4 : 2
    const prevBuf = typingBuf()[type] ?? ''
    const nextBuf = (prevBuf + e.data).slice(-maxLen)
    const num = Number(nextBuf)
    const parsed = parseDateParts(value())
    const cur = {
      year: parsed.year ?? draftParts().year,
      month: parsed.month ?? draftParts().month,
      day: parsed.day ?? draftParts().day,
      [type]: num,
    }
    const advance =
      nextBuf.length >= maxLen || (type === 'month' && num > 1) || (type === 'day' && num > 3)
    setTypingBuf((b) => ({ ...b, [type]: advance ? '' : nextBuf }))
    if (cur.year !== undefined && cur.month !== undefined && cur.day !== undefined && advance) {
      setDraftParts({})
      updateParts({ year: cur.year, month: cur.month, day: cur.day }, 'input', e)
    } else {
      setDraftParts(cur)
    }
    if (advance && e.currentTarget instanceof HTMLElement) {
      focusNextSegment(e.currentTarget)
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
    'disabledDates',
    'disabled',
    'readOnly',
    'required',
    'invalid',
    'name',
    'locale',
    'controller',
    'debug',
  )

  const resolvedRoot: PartProps<'div', DateInputState> = merge(rest, {
    get children() {
      const hasCustom = props.children !== undefined
      return (
        <>
          <Show
            when={hasCustom}
            fallback={
              <For
                each={
                  props.locale?.startsWith('en-US')
                    ? (['month', 'day', 'year'] as const)
                    : (['year', 'month', 'day'] as const)
                }
              >
                {(segType, idx) => {
                  const seg = () =>
                    state().segments.find((x) => x.type === segType) ?? {
                      type: segType,
                      value: null,
                      text: '',
                      min: 0,
                      max: 0,
                      placeholder: '',
                    }
                  return (
                    <>
                      <Show when={idx() > 0}>
                        <span aria-hidden="true" data-segment="literal" data-type="literal">
                          /
                        </span>
                      </Show>
                      <input
                        id={idx() === 0 ? field?.controlId : undefined}
                        type="text"
                        role="spinbutton"
                        value={seg().text}
                        readonly={readOnly()}
                        disabled={disabled()}
                        aria-valuenow={seg().value ?? undefined}
                        aria-valuemin={seg().min}
                        aria-valuemax={seg().max}
                        aria-label={segType}
                        data-segment={segType}
                        data-type={segType}
                        onBeforeInput={(e) => handleBeforeInput(segType, e)}
                        onKeyDown={(e) => {
                          if (e.key === 'ArrowUp') {
                            e.preventDefault()
                            stepSegment(segType, 1, e)
                          } else if (e.key === 'ArrowDown') {
                            e.preventDefault()
                            stepSegment(segType, -1, e)
                          }
                        }}
                      />
                    </>
                  )
                }}
              </For>
            }
          >
            {typeof props.children === 'function' ? props.children(state()) : props.children}
          </Show>
          <input type="hidden" name={props.name} value={value() ?? ''} />
        </>
      )
    },
  })

  return (
    <DateInputContext value={{ state, stepSegment, setSegmentValue }}>
      {renderPart('div', resolvedRoot, state, {
        ref: (el) => {
          rootEl = el
        },
        attrs: () => ({
          id: field ? undefined : id,
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
    Omit<PartProps<'input', DateInputSegmentState>, keyof DateInputSegmentProps | 'type'>,
) {
  const ctx = useDateInput('Segment')
  const segType = (): DateInputSegmentType =>
    typeof props.segment === 'string' ? props.segment : props.segment.type
  const segData = (): DateInputSegmentData => {
    if (typeof props.segment !== 'string') {
      return props.segment
    }
    return (
      ctx.state().segments.find((item) => item.type === props.segment) ?? {
        type: props.segment,
        value: null,
        text: '',
        placeholder: '',
      }
    )
  }
  const segState = (): DateInputSegmentState => {
    const s = ctx.state()
    return {
      ...segData(),
      disabled: s.disabled,
      readOnly: s.readOnly,
    }
  }
  const rest = omit(props, 'segment')
  return (
    <Show
      when={segType() !== 'literal'}
      fallback={renderPart(
        'span',
        merge(rest as unknown as PartProps<'span', DateInputSegmentState>, {
          get children() {
            return props.children ?? segData().text
          },
        }),
        segState,
        {
          attrs: () => ({
            'aria-hidden': 'true',
            'data-segment': 'literal',
            'data-type': 'literal',
          }),
        },
      )}
    >
      {renderPart('input', rest, segState, {
        attrs: () => {
          const s = segState()
          return {
            type: 'text',
            role: 'spinbutton',
            value: s.text,
            readonly: s.readOnly || undefined,
            disabled: s.disabled || undefined,
            'aria-valuenow': s.value ?? undefined,
            'aria-valuemin': s.min,
            'aria-valuemax': s.max,
            'aria-label': s.type,
            'data-segment': s.type,
            'data-type': s.type,
            'data-placeholder': s.value === null ? '' : undefined,
          }
        },
        handlers: {
          onKeyDown: (e: KeyboardEvent) => {
            const t = segType()
            if (e.key === 'ArrowUp') {
              e.preventDefault()
              ctx.stepSegment(t, 1, e)
            } else if (e.key === 'ArrowDown') {
              e.preventDefault()
              ctx.stepSegment(t, -1, e)
            }
          },
        },
      })}
    </Show>
  )
}
