import { Portal } from '@solidjs/web'
import type { JSX } from '@solidjs/web'
import {
  Show,
  createContext,
  createSignal,
  createUniqueId,
  merge,
  omit,
  useContext,
} from 'solid-js'

import {
  Calendar,
  CalendarDay,
  CalendarGrid,
  CalendarHeading,
  CalendarMonthSelect,
  CalendarNext,
  CalendarPrevious,
  CalendarWeekday,
  CalendarWeekdays,
  CalendarWeeks,
  CalendarYearSelect,
} from './calendar'
import type {
  CalendarDayState,
  CalendarGridCell,
  CalendarGridState,
  CalendarHeadingState,
  CalendarMode,
  CalendarMonthChangeReason,
  CalendarSelectOption,
  CalendarSelectState,
  CalendarStepState,
  CalendarValue,
  CalendarWeekdayState,
  DateMatcher,
  DateMatchers,
  ISOMonth,
} from './calendar'
import { useFieldControl } from './field'
import { createController, useController } from './foundation/controller'
import { createChangeDetails } from './foundation/details'
import type { ChangeDetails, ChangeOptions } from './foundation/details'
import { useDismissLayer } from './foundation/dismissal'
import { usePopupPosition } from './foundation/popup'
import type { PortalProps, PositionProps, Side } from './foundation/popup'
import { registerComponent } from './foundation/registry'
import { renderPart } from './foundation/render'
import type { PartProps } from './foundation/render'
import { createControlledSignal } from './foundation/state'

export {
  CalendarDay,
  CalendarGrid,
  CalendarHeading,
  CalendarMonthSelect,
  CalendarNext,
  CalendarPrevious,
  CalendarWeekday,
  CalendarWeekdays,
  CalendarWeeks,
  CalendarYearSelect,
}
export type {
  CalendarDayState,
  CalendarGridCell,
  CalendarGridState,
  CalendarHeadingState,
  CalendarSelectOption,
  CalendarSelectState,
  CalendarStepState,
  CalendarWeekdayState,
  DateMatcher,
  DateMatchers,
  ISOMonth,
}

export type DatePickerMode = CalendarMode
export type DatePickerValue = CalendarValue
export type DatePickerOpenChangeReason =
  | 'trigger-press'
  | 'day-press'
  | 'preset'
  | 'escape-key'
  | 'outside-press'
  | 'programmatic'
export type DatePickerDismissReason = 'escape-key' | 'outside-press'
export type DatePickerValueChangeReason =
  | 'day-press'
  | 'input'
  | 'preset'
  | 'clear'
  | 'programmatic'
export type DatePickerMonthChangeReason = CalendarMonthChangeReason
export type DatePickerChangeOptions = ChangeOptions<DatePickerValueChangeReason>

export type DatePickerApi = {
  open: () => void
  close: () => void
  toggle: () => void
  setValue: (value: DatePickerValue, options?: DatePickerChangeOptions) => void
  clear: () => void
  getValue: () => DatePickerValue
  isOpen: () => boolean
}

export function createDatePickerController() {
  return createController<DatePickerApi>()
}

export type DatePickerController = ReturnType<typeof createDatePickerController>

export type DatePickerOptions = {
  mode?: DatePickerMode
  value?: DatePickerValue
  defaultValue?: DatePickerValue
  onValueChange?: (
    value: DatePickerValue,
    details: ChangeDetails<DatePickerValueChangeReason>,
  ) => void
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean, details: ChangeDetails<DatePickerOpenChangeReason>) => void
  month?: ISOMonth
  defaultMonth?: ISOMonth
  onMonthChange?: (month: ISOMonth, details: ChangeDetails<DatePickerMonthChangeReason>) => void
  min?: string
  max?: string
  disabledDates?: DateMatchers
  disabled?: boolean
  readOnly?: boolean
  invalid?: boolean
  placeholder?: string
  controller?: DatePickerController
  debug?: boolean
  children?: JSX.Element
}

export type DatePickerState = {
  value: DatePickerValue
  open: boolean
  empty: boolean
  disabled: boolean
  readOnly: boolean
  invalid: boolean
}

export type DatePickerPrimitive = DatePickerState
export type DatePickerTriggerState = DatePickerState
export type DatePickerClearState = DatePickerState
export type DatePickerInputProps = { placeholder?: string }
export type DatePickerInputState = DatePickerState & { text: string }
export type DatePickerHintState = DatePickerState
export type DatePickerContentProps = PositionProps & PortalProps & { keepMounted?: boolean }
export type DatePickerContentState = DatePickerState & { side: Side }
export type DatePickerPresetProps = { value: DatePickerValue }
export type DatePickerPresetState = DatePickerState & { active: boolean }

function formatDatePickerValue(val: DatePickerValue): string {
  if (!val) {
    return ''
  }
  if (typeof val === 'string') {
    return val
  }
  if (Array.isArray(val)) {
    return val.join(', ')
  }
  return val.end ? `${val.start} – ${val.end}` : val.start
}

type DatePickerContextValue = {
  id: string
  state: () => DatePickerState
  api: DatePickerApi
  setOpen: (next: boolean, reason: DatePickerOpenChangeReason, event?: Event) => void
  setValue: (next: DatePickerValue, reason: DatePickerValueChangeReason, event?: Event) => void
  mode: () => DatePickerMode
  min: () => string | undefined
  max: () => string | undefined
  disabledDates: () => DateMatchers | undefined
  month: () => ISOMonth | undefined
  defaultMonth: () => ISOMonth | undefined
  onMonthChange: DatePickerOptions['onMonthChange']
  placeholder: () => string | undefined
  anchorEl: () => HTMLElement | null
  setAnchorEl: (el: HTMLElement | null) => void
  contentEl: () => HTMLElement | null
  setContentEl: (el: HTMLElement | null) => void
}

const DatePickerContext = createContext<DatePickerContextValue | null>(null)

function useDatePicker(part: string): DatePickerContextValue {
  const ctx = useContext(DatePickerContext)
  if (!ctx) {
    throw new Error(`<DatePicker${part}> must be used inside <DatePicker>.`)
  }
  return ctx
}

export function DatePicker(props: DatePickerOptions) {
  const field = useFieldControl()
  const id = field?.controlId ?? `ui-date-picker-${createUniqueId()}`
  const mode = (): DatePickerMode => props.mode ?? 'single'

  const [value, setRawValue] = createControlledSignal<DatePickerValue>({
    value: () => props.value,
    defaultValue: () => props.defaultValue ?? (mode() === 'multiple' ? [] : null),
  })
  const [open, setRawOpen] = createControlledSignal<boolean>({
    value: () => props.open,
    defaultValue: () => !!props.defaultOpen,
  })
  const [anchorEl, setAnchorEl] = createSignal<HTMLElement | null>(null)
  const [contentEl, setContentEl] = createSignal<HTMLElement | null>(null)

  const disabled = () => !!props.disabled || !!field?.disabled()
  const readOnly = () => !!props.readOnly || !!field?.readOnly()
  const invalid = () => !!props.invalid || !!field?.invalid()

  const isEmpty = () => {
    const v = value()
    return !v || (Array.isArray(v) && v.length === 0)
  }

  const state = (): DatePickerState => ({
    value: value(),
    open: open(),
    empty: isEmpty(),
    disabled: disabled(),
    readOnly: readOnly(),
    invalid: invalid(),
  })

  const setOpen = (next: boolean, reason: DatePickerOpenChangeReason, event?: Event) => {
    if (next && disabled()) {
      return
    }
    if (open() === next) {
      return
    }
    const details = createChangeDetails(reason, event)
    props.onOpenChange?.(next, details)
    if (details.canceled) {
      return
    }
    setRawOpen(next)
  }

  const setValue = (next: DatePickerValue, reason: DatePickerValueChangeReason, event?: Event) => {
    const details = createChangeDetails(reason, event)
    props.onValueChange?.(next, details)
    if (details.canceled) {
      return
    }
    setRawValue(next)
    field?.setDirty(true)
  }

  const api: DatePickerApi = {
    open: () => setOpen(true, 'programmatic'),
    close: () => setOpen(false, 'programmatic'),
    toggle: () => setOpen(!open(), 'programmatic'),
    setValue: (next, opts) => setValue(next, opts?.reason ?? 'programmatic', opts?.event),
    clear: () => setValue(mode() === 'multiple' ? [] : null, 'clear'),
    getValue: () => value(),
    isOpen: () => open(),
  }

  useController(() => props.controller, api)

  registerComponent({
    component: 'date-picker',
    getElements: () => [anchorEl(), contentEl()],
    getState: () => ({ value: value(), open: open(), disabled: disabled() }),
    getDisabled: disabled,
    actions: {
      open: () => api.open(),
      close: () => api.close(),
      setValue: (v) => api.setValue(v as DatePickerValue),
      clear: () => api.clear(),
    },
  })

  useDismissLayer({
    active: open,
    getElements: () => [anchorEl(), contentEl()],
    onDismiss: (reason, event) => {
      setOpen(false, reason === 'escape-key' ? 'escape-key' : 'outside-press', event)
    },
  })

  return (
    <DatePickerContext
      value={{
        id,
        state,
        api,
        setOpen,
        setValue,
        mode,
        min: () => props.min,
        max: () => props.max,
        disabledDates: () => props.disabledDates,
        month: () => props.month,
        defaultMonth: () => props.defaultMonth,
        onMonthChange: (month, details) => props.onMonthChange?.(month, details),
        placeholder: () => props.placeholder,
        anchorEl,
        setAnchorEl,
        contentEl,
        setContentEl,
      }}
    >
      {props.children}
    </DatePickerContext>
  )
}

export function DatePickerTrigger(
  props: Omit<PartProps<'button', DatePickerTriggerState>, 'type'>,
) {
  const ctx = useDatePicker('Trigger')
  return renderPart('button', props, ctx.state, {
    ref: (el: HTMLElement) => ctx.setAnchorEl(el),
    attrs: () => ({
      type: 'button',
      disabled: ctx.state().disabled,
      'aria-expanded': ctx.state().open ? 'true' : 'false',
      'aria-haspopup': 'dialog',
      'data-open': ctx.state().open ? '' : undefined,
    }),
    handlers: {
      onClick: (e: MouseEvent) => ctx.setOpen(!ctx.state().open, 'trigger-press', e),
    },
  })
}

export function DatePickerInput(
  props: DatePickerInputProps &
    Omit<
      PartProps<'input', DatePickerInputState>,
      keyof DatePickerInputProps | 'type' | 'value' | 'readonly'
    >,
) {
  const ctx = useDatePicker('Input')
  const inputState = (): DatePickerInputState => ({
    ...ctx.state(),
    text: formatDatePickerValue(ctx.state().value),
  })
  const rest = omit(props, 'placeholder')
  return renderPart('input', rest, inputState, {
    ref: (el: HTMLElement) => ctx.setAnchorEl(el),
    attrs: () => ({
      id: ctx.id,
      type: 'text',
      value: inputState().text,
      placeholder: props.placeholder ?? ctx.placeholder() ?? 'YYYY-MM-DD',
      disabled: ctx.state().disabled,
      readonly: ctx.state().readOnly,
      'aria-invalid': ctx.state().invalid ? 'true' : undefined,
    }),
    handlers: {
      onInput: (e: InputEvent & { currentTarget: HTMLInputElement }) => {
        const raw = e.currentTarget.value.trim()
        if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
          ctx.setValue(raw, 'input', e)
        } else if (raw === '') {
          ctx.setValue(null, 'clear', e)
        }
      },
    },
  })
}

export function DatePickerClear(props: Omit<PartProps<'button', DatePickerClearState>, 'type'>) {
  const ctx = useDatePicker('Clear')
  return (
    <Show when={!ctx.state().empty}>
      {renderPart('button', props, ctx.state, {
        attrs: () => ({
          type: 'button',
          disabled: ctx.state().disabled,
          'aria-label': 'Clear date',
        }),
        handlers: {
          onClick: () => ctx.api.clear(),
        },
      })}
    </Show>
  )
}

export function DatePickerHint(props: PartProps<'span', DatePickerHintState>) {
  const ctx = useDatePicker('Hint')
  return renderPart('span', props, ctx.state)
}

export function DatePickerPreset(
  props: DatePickerPresetProps &
    Omit<PartProps<'button', DatePickerPresetState>, keyof DatePickerPresetProps | 'type'>,
) {
  const ctx = useDatePicker('Preset')
  const presetState = (): DatePickerPresetState => ({
    ...ctx.state(),
    active: JSON.stringify(ctx.state().value) === JSON.stringify(props.value),
  })
  const rest = omit(props, 'value')
  return renderPart('button', rest, presetState, {
    attrs: () => ({
      type: 'button',
      'data-active': presetState().active ? '' : undefined,
    }),
    handlers: {
      onClick: (e: MouseEvent) => {
        ctx.setValue(props.value, 'preset', e)
        ctx.setOpen(false, 'preset', e)
      },
    },
  })
}

export function DatePickerContent(
  props: DatePickerContentProps &
    Omit<PartProps<'div', DatePickerContentState>, keyof DatePickerContentProps>,
) {
  const ctx = useDatePicker('Content')
  const pos = usePopupPosition({
    open: () => ctx.state().open,
    reference: () => ctx.anchorEl() ?? undefined,
    floating: () => ctx.contentEl() ?? undefined,
    side: () => props.side ?? 'bottom',
    align: () => props.align ?? 'start',
    sideOffset: () => props.sideOffset ?? 4,
    alignOffset: () => props.alignOffset ?? 0,
    collisionPadding: () => props.collisionPadding ?? 8,
  })
  const contentState = (): DatePickerContentState => ({
    ...ctx.state(),
    side: pos.side(),
  })
  const rest = omit(
    props,
    'side',
    'align',
    'sideOffset',
    'alignOffset',
    'collisionPadding',
    'container',
    'keepMounted',
  )

  const wrappedProps: PartProps<'div', DatePickerContentState> = merge(rest, {
    children: (s: DatePickerContentState) => (
      <Calendar
        mode={ctx.mode()}
        value={ctx.state().value}
        onValueChange={(val, details) => {
          ctx.setValue(val, 'day-press', details.event)
          if (ctx.mode() === 'single') {
            ctx.setOpen(false, 'day-press', details.event)
          }
        }}
        month={ctx.month()}
        defaultMonth={ctx.defaultMonth()}
        onMonthChange={ctx.onMonthChange}
        min={ctx.min()}
        max={ctx.max()}
        disabledDates={ctx.disabledDates()}
        disabled={ctx.state().disabled}
      >
        {typeof props.children === 'function' ? props.children(s) : props.children}
      </Calendar>
    ),
  })

  return (
    <Show when={ctx.state().open || !!props.keepMounted}>
      <Portal mount={props.container ?? undefined}>
        {renderPart('div', wrappedProps, contentState, {
          ref: (el: HTMLElement) => ctx.setContentEl(el),
          attrs: () => ({
            role: 'dialog',
            'data-open': ctx.state().open ? '' : undefined,
            'data-side': pos.side(),
          }),
          style: () => ({
            ...pos.style(),
            display: ctx.state().open ? undefined : 'none',
          }),
        })}
      </Portal>
    </Show>
  )
}
