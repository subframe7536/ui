import type { JSX } from '@solidjs/web'
import {
  createMemo,
  createContext,
  createSignal,
  createUniqueId,
  For,
  omit,
  useContext,
  Show,
} from 'solid-js'

import { createController, useController } from './foundation/controller'
import { createChangeDetails } from './foundation/details'
import type { ChangeDetails, ChangeOptions } from './foundation/details'
import { registerComponent } from './foundation/registry'
import { renderPart } from './foundation/render'
import type { PartProps } from './foundation/render'
import { createControlledSignal } from './foundation/state'

export type ISOMonth = `${number}-${string}`
export type CalendarMode = 'single' | 'multiple' | 'range'
export type CalendarValue = string | Array<string> | { start: string; end: string | null } | null
export type DateMatcher = string | ((date: string) => boolean) | { from?: string; to?: string }
export type DateMatchers = DateMatcher | Array<DateMatcher>

export type CalendarValueChangeReason = 'day-press' | 'keyboard' | 'clear' | 'programmatic'
export type CalendarMonthChangeReason = 'previous' | 'next' | 'select' | 'today' | 'programmatic'
export type CalendarFocusedChangeReason = 'keyboard' | 'pointer' | 'programmatic'
export type CalendarAnchorChangeReason = 'day-press' | 'programmatic'
export type CalendarChangeOptions = ChangeOptions<CalendarValueChangeReason>

export type CalendarGridCell = {
  date: string
  day: number
  month: number
  year: number
  outside: boolean
  today: boolean
  disabled: boolean
  selected: boolean
  rangeStart: boolean
  rangeEnd: boolean
  inRange: boolean
}

export type CalendarSelectOption = { value: number; label: string }

export type CalendarApi = {
  setValue: (value: CalendarValue, options?: CalendarChangeOptions) => void
  selectDate: (date: string) => void
  setMonth: (month: ISOMonth) => void
  nextMonth: () => void
  previousMonth: () => void
  goToToday: () => void
  getValue: () => CalendarValue
  getMonth: () => ISOMonth
}

export function createCalendarController() {
  return createController<CalendarApi>()
}

export type CalendarController = ReturnType<typeof createCalendarController>

export type CalendarOptions = {
  mode?: CalendarMode
  value?: CalendarValue
  defaultValue?: CalendarValue
  onValueChange?: (value: CalendarValue, details: ChangeDetails<CalendarValueChangeReason>) => void
  month?: ISOMonth
  defaultMonth?: ISOMonth
  onMonthChange?: (month: ISOMonth, details: ChangeDetails<CalendarMonthChangeReason>) => void
  min?: string
  max?: string
  disabledDates?: DateMatchers
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6
  locale?: string
  disabled?: boolean
  controller?: CalendarController
  debug?: boolean
}

export type CalendarState = {
  mode: CalendarMode
  value: CalendarValue
  month: ISOMonth
  year: number
  monthIndex: number
  focusedDate: string | null
  disabled: boolean
  weeks: Array<Array<CalendarGridCell>>
  weekdays: Array<string>
}

export type CalendarPrimitive = CalendarState
export type CalendarHeadingState = CalendarState & { text: string }
export type CalendarStepState = CalendarState & { disabled: boolean }
export type CalendarGridProps = { offset?: number }
export type CalendarGridState = CalendarState & {
  month: ISOMonth
  weeks: Array<Array<CalendarGridCell>>
}
export type CalendarWeekdayProps = { index?: number }
export type CalendarWeekdayState = { index: number; label: string }
export type CalendarDayProps = { date?: string; cell?: CalendarGridCell }
export type CalendarDayState = CalendarGridCell & { focused: boolean }
export type CalendarSelectState = CalendarState & { options: Array<CalendarSelectOption> }

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

export function toISOMonth(year: number, monthIndex: number): ISOMonth {
  return `${year}-${pad2(monthIndex + 1)}`
}

export function parseISOMonth(m: ISOMonth): { year: number; monthIndex: number } {
  const parts = m.split('-')
  const year = Number(parts[0]) || new Date().getFullYear()
  const monthIndex = Math.min(11, Math.max(0, (Number(parts[1]) || 1) - 1))
  return { year, monthIndex }
}

function addMonths(m: ISOMonth, delta: number): ISOMonth {
  const { year, monthIndex } = parseISOMonth(m)
  const d = new Date(year, monthIndex + delta, 1)
  return toISOMonth(d.getFullYear(), d.getMonth())
}

export function matchesDate(date: string, matchers?: DateMatchers): boolean {
  if (!matchers) {
    return false
  }
  const list = Array.isArray(matchers) ? matchers : [matchers]
  return list.some((m) => {
    if (typeof m === 'string') {
      return m === date
    }
    if (typeof m === 'function') {
      return m(date)
    }
    const afterFrom = !m.from || date >= m.from
    const beforeTo = !m.to || date <= m.to
    return afterFrom && beforeTo
  })
}

function buildMonthWeeks(
  month: ISOMonth,
  weekStartsOn: number,
  value: CalendarValue,
  min: string | undefined,
  max: string | undefined,
  disabledDates: DateMatchers | undefined,
  rootDisabled: boolean,
): Array<Array<CalendarGridCell>> {
  const { year, monthIndex } = parseISOMonth(month)
  const firstOfMonth = new Date(year, monthIndex, 1)
  const startOffset = (firstOfMonth.getDay() - weekStartsOn + 7) % 7
  const gridStart = new Date(year, monthIndex, 1 - startOffset)
  const todayStr = toISODate(new Date())

  const weeks: Array<Array<CalendarGridCell>> = []
  const cursor = new Date(gridStart)

  for (let w = 0; w < 6; w++) {
    const row: Array<CalendarGridCell> = []
    for (let d = 0; d < 7; d++) {
      const iso = toISODate(cursor)
      const isOutside = cursor.getMonth() !== monthIndex
      const isDisabled =
        rootDisabled ||
        (min !== undefined && iso < min) ||
        (max !== undefined && iso > max) ||
        matchesDate(iso, disabledDates)

      let selected = false
      let rangeStart = false
      let rangeEnd = false
      let inRange = false

      if (typeof value === 'string') {
        selected = value === iso
      } else if (Array.isArray(value)) {
        selected = value.includes(iso)
      } else if (value && typeof value === 'object') {
        rangeStart = value.start === iso
        rangeEnd = value.end === iso
        selected = rangeStart || rangeEnd
        inRange = !!value.end && iso > value.start && iso < value.end
      }

      row.push({
        date: iso,
        day: cursor.getDate(),
        month: cursor.getMonth(),
        year: cursor.getFullYear(),
        outside: isOutside,
        today: iso === todayStr,
        disabled: isDisabled,
        selected,
        rangeStart,
        rangeEnd,
        inRange,
      })
      cursor.setDate(cursor.getDate() + 1)
    }
    weeks.push(row)
  }
  return weeks
}

type CalendarContextValue = {
  id: string
  state: () => CalendarState
  api: CalendarApi
  selectDate: (date: string, reason: CalendarValueChangeReason, event?: Event) => void
  setMonth: (month: ISOMonth, reason: CalendarMonthChangeReason, event?: Event) => void
  setFocusedDate: (date: string | null) => void
  locale: () => string | undefined
}

const CalendarContext = createContext<CalendarContextValue | null>(null)
const CalendarCellContext = createContext<(() => CalendarGridCell) | null>(null)
const CalendarWeekdayContext = createContext<(() => CalendarWeekdayState) | null>(null)

function useCalendar(part: string): CalendarContextValue {
  const ctx = useContext(CalendarContext)
  if (!ctx) {
    throw new Error(`<Calendar${part}> must be used inside <Calendar>.`)
  }
  return ctx
}

export function Calendar(
  props: CalendarOptions &
    Omit<PartProps<'div', CalendarState>, keyof CalendarOptions | 'defaultValue' | 'onChange'>,
) {
  const id = `ui-calendar-${createUniqueId()}`
  const mode = (): CalendarMode => props.mode ?? 'single'
  const weekStartsOn = () => props.weekStartsOn ?? 0

  const today = new Date()
  const defaultMonth = (): ISOMonth =>
    props.defaultMonth ?? toISOMonth(today.getFullYear(), today.getMonth())

  const [value, setRawValue] = createControlledSignal<CalendarValue>({
    value: () => props.value,
    defaultValue: () => props.defaultValue ?? (mode() === 'multiple' ? [] : null),
  })
  const [month, setRawMonth] = createControlledSignal<ISOMonth>({
    value: () => props.month,
    defaultValue: defaultMonth,
  })
  const [focusedDate, setFocusedDate] = createSignal<string | null>(null)
  let rootEl: HTMLElement | null = null

  const disabled = () => !!props.disabled

  const weekdays = () => {
    const start = weekStartsOn()
    const base = new Date(2024, 0, 7 + start) // Sunday Jan 7, 2024
    const fmt = new Intl.DateTimeFormat(props.locale, { weekday: 'short' })
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base)
      d.setDate(base.getDate() + i)
      return fmt.format(d)
    })
  }

  const state = (): CalendarState => {
    const m = month()
    const { year, monthIndex } = parseISOMonth(m)
    const val = value()
    return {
      mode: mode(),
      value: val,
      month: m,
      year,
      monthIndex,
      focusedDate: focusedDate(),
      disabled: disabled(),
      weeks: buildMonthWeeks(
        m,
        weekStartsOn(),
        val,
        props.min,
        props.max,
        props.disabledDates,
        disabled(),
      ),
      weekdays: weekdays(),
    }
  }

  const commitValue = (next: CalendarValue, reason: CalendarValueChangeReason, event?: Event) => {
    const details = createChangeDetails(reason, event)
    props.onValueChange?.(next, details)
    if (details.canceled) {
      return
    }
    setRawValue(next)
  }

  const setMonth = (next: ISOMonth, reason: CalendarMonthChangeReason, event?: Event) => {
    const details = createChangeDetails(reason, event)
    props.onMonthChange?.(next, details)
    if (details.canceled) {
      return
    }
    setRawMonth(next)
  }

  const selectDate = (date: string, reason: CalendarValueChangeReason, event?: Event) => {
    if (disabled()) {
      return
    }
    const curMode = mode()
    const cur = value()
    if (curMode === 'multiple') {
      const arr = Array.isArray(cur) ? cur : []
      const next = arr.includes(date) ? arr.filter((d) => d !== date) : [...arr, date]
      commitValue(next, reason, event)
    } else if (curMode === 'range') {
      if (!cur || typeof cur !== 'object' || Array.isArray(cur) || cur.end !== null) {
        commitValue({ start: date, end: null }, reason, event)
      } else {
        const next =
          date < cur.start ? { start: date, end: cur.start } : { start: cur.start, end: date }
        commitValue(next, reason, event)
      }
    } else {
      commitValue(date, reason, event)
    }
  }

  const api: CalendarApi = {
    setValue: (next, opts) => commitValue(next, opts?.reason ?? 'programmatic', opts?.event),
    selectDate: (d) => selectDate(d, 'programmatic'),
    setMonth: (m) => setMonth(m, 'programmatic'),
    nextMonth: () => setMonth(addMonths(month(), 1), 'next'),
    previousMonth: () => setMonth(addMonths(month(), -1), 'previous'),
    goToToday: () => {
      const now = new Date()
      setMonth(toISOMonth(now.getFullYear(), now.getMonth()), 'today')
    },
    getValue: () => value(),
    getMonth: () => month(),
  }

  useController(() => props.controller, api)

  registerComponent({
    component: 'calendar',
    getElements: () => [rootEl],
    getState: () => ({ value: value(), month: month(), mode: mode(), disabled: disabled() }),
    getDisabled: disabled,
    actions: {
      selectDate: (d) => api.selectDate(String(d)),
      nextMonth: () => api.nextMonth(),
      previousMonth: () => api.previousMonth(),
    },
  })

  const rest = omit(
    props,
    'mode',
    'value',
    'defaultValue',
    'onValueChange',
    'month',
    'defaultMonth',
    'onMonthChange',
    'min',
    'max',
    'disabledDates',
    'weekStartsOn',
    'locale',
    'disabled',
    'controller',
    'debug',
  )

  return (
    <CalendarContext
      value={{
        id,
        state,
        api,
        selectDate,
        setMonth,
        setFocusedDate,
        locale: () => props.locale,
      }}
    >
      {renderPart('div', rest, state, {
        ref: (el) => {
          rootEl = el
        },
        attrs: () => ({
          id,
          role: 'application',
          'aria-label': props['aria-label'] ?? 'Calendar',
          'data-disabled': disabled() ? '' : undefined,
        }),
      })}
    </CalendarContext>
  )
}

export function CalendarHeading(props: PartProps<'div', CalendarHeadingState>) {
  const ctx = useCalendar('Heading')
  const headingState = (): CalendarHeadingState => {
    const s = ctx.state()
    const d = new Date(s.year, s.monthIndex, 1)
    const text = new Intl.DateTimeFormat(ctx.locale(), {
      month: 'long',
      year: 'numeric',
    }).format(d)
    return { ...s, text }
  }
  const resolvedProps: PartProps<'div', CalendarHeadingState> = {
    ...props,
    get children() {
      return props.children ?? ((s) => s.text)
    },
  }
  return renderPart('div', resolvedProps, headingState, {
    attrs: () => ({ 'aria-live': 'polite' }),
  })
}

export function CalendarPrevious(props: Omit<PartProps<'button', CalendarStepState>, 'type'>) {
  const ctx = useCalendar('Previous')
  const stepState = (): CalendarStepState => ({
    ...ctx.state(),
    disabled: ctx.state().disabled,
  })
  return renderPart('button', props, stepState, {
    attrs: () => ({
      type: 'button',
      disabled: stepState().disabled,
      'aria-label': 'Previous month',
    }),
    handlers: {
      onClick: () => ctx.api.previousMonth(),
    },
  })
}

export function CalendarNext(props: Omit<PartProps<'button', CalendarStepState>, 'type'>) {
  const ctx = useCalendar('Next')
  const stepState = (): CalendarStepState => ({
    ...ctx.state(),
    disabled: ctx.state().disabled,
  })
  return renderPart('button', props, stepState, {
    attrs: () => ({
      type: 'button',
      disabled: stepState().disabled,
      'aria-label': 'Next month',
    }),
    handlers: {
      onClick: () => ctx.api.nextMonth(),
    },
  })
}

export function CalendarMonthSelect(
  props: Omit<PartProps<'select', CalendarSelectState>, 'value'>,
) {
  const ctx = useCalendar('MonthSelect')
  const selectState = (): CalendarSelectState => {
    const s = ctx.state()
    const fmt = new Intl.DateTimeFormat(ctx.locale(), { month: 'long' })
    const options = Array.from({ length: 12 }, (_, i) => ({
      value: i,
      label: fmt.format(new Date(2024, i, 1)),
    }))
    return { ...s, options }
  }
  const resolvedProps: PartProps<'select', CalendarSelectState> = {
    ...props,
    get children() {
      return (
        <Show
          when={props.children !== undefined}
          fallback={
            <For each={selectState().options}>
              {(opt) => <option value={opt.value}>{opt.label}</option>}
            </For>
          }
        >
          {typeof props.children === 'function' ? props.children(selectState()) : props.children}
        </Show>
      )
    },
  }

  return renderPart('select', resolvedProps, selectState, {
    attrs: () => ({
      value: ctx.state().monthIndex,
      disabled: ctx.state().disabled,
      'aria-label': 'Month',
    }),
    handlers: {
      onChange: (e: Event & { currentTarget: HTMLSelectElement }) => {
        const nextMonth = Number(e.currentTarget.value)
        ctx.setMonth(toISOMonth(ctx.state().year, nextMonth), 'select', e)
      },
    },
  })
}

export function CalendarYearSelect(
  props: { fromYear?: number; toYear?: number } & Omit<
    PartProps<'select', CalendarSelectState>,
    'value'
  >,
) {
  const ctx = useCalendar('YearSelect')
  const selectState = (): CalendarSelectState => {
    const s = ctx.state()
    const from = props.fromYear ?? s.year - 10
    const to = props.toYear ?? s.year + 10
    const options: Array<CalendarSelectOption> = []
    for (let y = from; y <= to; y++) {
      options.push({ value: y, label: String(y) })
    }
    return { ...s, options }
  }
  const rest = omit(props, 'fromYear', 'toYear')
  const resolvedProps: PartProps<'select', CalendarSelectState> = {
    ...rest,
    get children() {
      return (
        <Show
          when={props.children !== undefined}
          fallback={
            <For each={selectState().options}>
              {(opt) => <option value={opt.value}>{opt.label}</option>}
            </For>
          }
        >
          {typeof props.children === 'function' ? props.children(selectState()) : props.children}
        </Show>
      )
    },
  }

  return renderPart('select', resolvedProps, selectState, {
    attrs: () => ({
      value: ctx.state().year,
      disabled: ctx.state().disabled,
      'aria-label': 'Year',
    }),
    handlers: {
      onChange: (e: Event & { currentTarget: HTMLSelectElement }) => {
        const nextYear = Number(e.currentTarget.value)
        ctx.setMonth(toISOMonth(nextYear, ctx.state().monthIndex), 'select', e)
      },
    },
  })
}

export function CalendarGrid(
  props: CalendarGridProps & Omit<PartProps<'table', CalendarGridState>, keyof CalendarGridProps>,
) {
  const ctx = useCalendar('Grid')
  const gridState = (): CalendarGridState => ctx.state()
  const rest = omit(props, 'offset')
  return renderPart('table', rest, gridState, {
    attrs: () => ({ role: 'grid' }),
  })
}

export function CalendarWeekdays(props: {
  children?: JSX.Element | ((label: string, index: () => number) => JSX.Element)
}) {
  const ctx = useCalendar('Weekdays')
  return (
    <thead>
      <tr>
        <For each={ctx.state().weekdays}>
          {(label, idx) => {
            const weekdayState = createMemo(() => ({ index: idx(), label }))
            return (
              <CalendarWeekdayContext value={weekdayState}>
                {typeof props.children === 'function'
                  ? props.children(label, idx)
                  : (props.children ?? <CalendarWeekday />)}
              </CalendarWeekdayContext>
            )
          }}
        </For>
      </tr>
    </thead>
  )
}

export function CalendarWeekday(
  props: CalendarWeekdayProps &
    Omit<PartProps<'th', CalendarWeekdayState>, keyof CalendarWeekdayProps>,
) {
  const ctx = useCalendar('Weekday')
  const wdCtx = useContext(CalendarWeekdayContext)
  const wdState = (): CalendarWeekdayState => {
    if (wdCtx) {
      return wdCtx()
    }
    const idx = props.index ?? 0
    return { index: idx, label: ctx.state().weekdays[idx] ?? '' }
  }
  const rest = omit(props, 'index')
  const resolvedProps: PartProps<'th', CalendarWeekdayState> = {
    ...rest,
    get children() {
      return props.children ?? ((s) => s.label)
    },
  }
  return renderPart('th', resolvedProps, wdState, {
    attrs: () => ({ scope: 'col' }),
  })
}

export function CalendarWeeks(props: {
  children?: JSX.Element | ((cell: CalendarGridCell) => JSX.Element)
}) {
  const ctx = useCalendar('Weeks')
  return (
    <tbody>
      <For each={ctx.state().weeks}>
        {(week) => (
          <tr>
            <For each={week}>
              {(cell) => (
                <td role="gridcell">
                  <CalendarCellContext value={() => cell}>
                    {typeof props.children === 'function'
                      ? props.children(cell)
                      : (props.children ?? <CalendarDay />)}
                  </CalendarCellContext>
                </td>
              )}
            </For>
          </tr>
        )}
      </For>
    </tbody>
  )
}

export function CalendarDay(
  props: CalendarDayProps &
    Omit<PartProps<'button', CalendarDayState>, keyof CalendarDayProps | 'type'>,
) {
  const ctx = useCalendar('Day')
  const cellCtx = useContext(CalendarCellContext)
  const dayState = (): CalendarDayState => {
    const cell = props.cell ??
      cellCtx?.() ?? {
        date: props.date ?? '',
        day: Number((props.date ?? '').split('-')[2]) || 1,
        month: 0,
        year: 2024,
        outside: false,
        today: false,
        disabled: ctx.state().disabled,
        selected: false,
        rangeStart: false,
        rangeEnd: false,
        inRange: false,
      }
    return {
      ...cell,
      focused: ctx.state().focusedDate === cell.date,
    }
  }
  const rest = omit(props, 'date', 'cell')
  const resolvedProps: PartProps<'button', CalendarDayState> = {
    ...rest,
    get children() {
      return props.children ?? ((s) => String(s.day))
    },
  }

  return renderPart('button', resolvedProps, dayState, {
    attrs: () => {
      const s = dayState()
      return {
        type: 'button',
        disabled: s.disabled,
        'aria-selected': s.selected ? 'true' : 'false',
        'aria-current': s.today ? 'date' : undefined,
        'data-date': s.date,
        'data-today': s.today ? '' : undefined,
        'data-outside': s.outside ? '' : undefined,
        'data-selected': s.selected ? '' : undefined,
        'data-range-start': s.rangeStart ? '' : undefined,
        'data-range-end': s.rangeEnd ? '' : undefined,
        'data-in-range': s.inRange ? '' : undefined,
        'data-disabled': s.disabled ? '' : undefined,
      }
    },
    handlers: {
      onFocus: () => ctx.setFocusedDate(dayState().date),
      onClick: (e: MouseEvent) => {
        const s = dayState()
        if (!s.disabled && s.date) {
          ctx.selectDate(s.date, 'day-press', e)
        }
      },
    },
  })
}
