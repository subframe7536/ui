import {
  untrack,
  createContext,
  createEffect,
  createSignal,
  createUniqueId,
  omit,
  Show,
  useContext,
} from 'solid-js'

import { useFieldControl } from './field'
import { createController, useController } from './foundation/controller'
import { createChangeDetails } from './foundation/details'
import type { ChangeDetails, ChangeOptions } from './foundation/details'
import { registerComponent } from './foundation/registry'
import { renderPart } from './foundation/render'
import type { PartProps } from './foundation/render'
import { createControlledSignal } from './foundation/state'
import type { NumberFormat } from './progress'

export type NumberInputValueChangeReason =
  | 'input'
  | 'increment'
  | 'decrement'
  | 'scrub'
  | 'wheel'
  | 'commit'
  | 'keyboard'
  | 'programmatic'
  | 'reset'

export type NumberInputChangeOptions = ChangeOptions<NumberInputValueChangeReason>

export type NumberInputApi = {
  setValue: (value: number | null, options?: NumberInputChangeOptions) => void
  increment: (amount?: number) => void
  decrement: (amount?: number) => void
  commit: () => void
  focus: () => void
  getValue: () => number | null
}

export function createNumberInputController() {
  return createController<NumberInputApi>()
}

export type NumberInputController = ReturnType<typeof createNumberInputController>

export type NumberInputOptions = {
  value?: number | null
  defaultValue?: number | null
  onValueChange?: (
    value: number | null,
    details: ChangeDetails<NumberInputValueChangeReason>,
  ) => void
  onValueCommit?: (
    value: number | null,
    details: ChangeDetails<NumberInputValueChangeReason>,
  ) => void
  min?: number
  max?: number
  step?: number
  smallStep?: number
  largeStep?: number
  format?: NumberFormat
  locale?: string
  allowWheelScrub?: boolean
  snapOnStep?: boolean
  disabled?: boolean
  readOnly?: boolean
  required?: boolean
  invalid?: boolean
  name?: string
  form?: string
  controller?: NumberInputController
  debug?: boolean
}

export type NumberInputState = {
  value: number | null
  inputValue: string
  disabled: boolean
  readOnly: boolean
  required: boolean
  invalid: boolean
  scrubbing: boolean
  canIncrement: boolean
  canDecrement: boolean
}

export type NumberInputButtonState = NumberInputState & {
  disabled: boolean
}

export type NumberInputButtonProps = {
  disabled?: boolean
}

export type NumberInputScrubAreaProps = {
  direction?: 'horizontal' | 'vertical'
  pixelSensitivity?: number
  teleportDistance?: number
}

function clampNumber(val: number, min: number | undefined, max: number | undefined): number {
  let next = val
  if (min !== undefined && next < min) {
    next = min
  }
  if (max !== undefined && next > max) {
    next = max
  }
  return next
}

function roundToStep(val: number, step: number): number {
  if (step <= 0) {
    return val
  }
  const precision = Math.max(0, (step.toString().split('.')[1] ?? '').length)
  return Number((Math.round(val / step) * step).toFixed(precision))
}

function formatNumber(val: number | null, locale?: string, format?: NumberFormat): string {
  if (val === null || Number.isNaN(val)) {
    return ''
  }
  if (typeof format === 'function') {
    return format(val)
  }
  if (!format && !locale) {
    return String(val)
  }
  try {
    return new Intl.NumberFormat(locale, format).format(val)
  } catch {
    return String(val)
  }
}

function parseNumberInput(raw: string): number | null {
  const cleaned = raw
    .trim()
    .replaceAll(',', '')
    .replaceAll(/[^0-9eE.+-]/g, '')
  if (!cleaned || cleaned === '-' || cleaned === '+' || cleaned === '.') {
    return null
  }
  const num = Number(cleaned)
  return Number.isFinite(num) ? num : null
}

type NumberInputContextValue = {
  id: string
  state: () => NumberInputState
  api: NumberInputApi
  min: () => number | undefined
  max: () => number | undefined
  step: () => number
  smallStep: () => number
  largeStep: () => number
  name: () => string | undefined
  form: () => string | undefined
  allowWheelScrub: () => boolean
  scrubbing: () => boolean
  setScrubbing: (v: boolean) => void
  scrubCursorPos: () => { x: number; y: number }
  setScrubCursorPos: (pos: { x: number; y: number }) => void
  setInputText: (text: string) => void
  registerInputEl: (el: HTMLInputElement | null) => void
  handleStep: (delta: number, reason: NumberInputValueChangeReason) => void
  commitValue: (reason?: NumberInputValueChangeReason, event?: Event) => void
  field: ReturnType<typeof useFieldControl>
}

const NumberInputContext = createContext<NumberInputContextValue | null>(null)

function useNumberInput(part: string): NumberInputContextValue {
  const ctx = useContext(NumberInputContext)
  if (!ctx) {
    throw new Error(`<NumberInput${part}> must be used inside <NumberInput>.`)
  }
  return ctx
}

export function NumberInput(
  props: NumberInputOptions &
    Omit<
      PartProps<'div', NumberInputState>,
      keyof NumberInputOptions | 'defaultValue' | 'onChange' | 'onSelect'
    >,
) {
  const field = useFieldControl()
  const id = field?.controlId ?? `ui-number-input-${createUniqueId()}`

  const [value, setRawValue] = createControlledSignal<number | null>({
    value: () => props.value,
    defaultValue: () => props.defaultValue ?? null,
  })

  const [inputText, setInputText] = createSignal(
    untrack(() =>
      formatNumber(props.value ?? props.defaultValue ?? null, props.locale, props.format),
    ),
  )
  const [scrubbing, setScrubbing] = createSignal(false)
  const [scrubCursorPos, setScrubCursorPos] = createSignal({ x: 0, y: 0 })
  let inputEl: HTMLInputElement | null = null
  let rootEl: HTMLElement | null = null
  let committedValue: number | null = untrack(() => value())
  let hasPendingChange = false

  createEffect(
    () => [value(), props.locale, props.format] as const,
    ([v, locale, format]) => {
      if (typeof document === 'undefined' || document.activeElement !== inputEl) {
        setInputText(formatNumber(v, locale, format))
        if (!hasPendingChange) {
          committedValue = v
        }
      }
    },
  )

  const disabled = () => !!props.disabled || !!field?.disabled()
  const readOnly = () => !!props.readOnly || !!field?.readOnly()
  const required = () => !!props.required || !!field?.required()
  const invalid = () => !!props.invalid || !!field?.invalid()
  const step = () => props.step ?? 1
  const smallStep = () => props.smallStep ?? step() * 0.1
  const largeStep = () => props.largeStep ?? step() * 10

  const state = (): NumberInputState => {
    const v = value()
    const isDisabled = disabled()
    const isReadOnly = readOnly()
    return {
      value: v,
      inputValue: inputText(),
      disabled: isDisabled,
      readOnly: isReadOnly,
      required: required(),
      invalid: invalid(),
      scrubbing: scrubbing(),
      canIncrement:
        !isDisabled && !isReadOnly && (props.max === undefined || v === null || v < props.max),
      canDecrement:
        !isDisabled && !isReadOnly && (props.min === undefined || v === null || v > props.min),
    }
  }

  const emitRef: {
    fn?: (change: {
      key: string
      previous: unknown
      value: unknown
      reason: string
      source: ChangeDetails['source']
    }) => void
  } = {}

  const updateValue = (
    next: number | null,
    reason: NumberInputValueChangeReason = 'programmatic',
    event?: Event,
  ) => {
    const prev = value()
    const clamped = next === null ? null : clampNumber(next, props.min, props.max)
    const details = createChangeDetails(reason, event)
    props.onValueChange?.(clamped, details)
    if (details.canceled) {
      return
    }
    setRawValue(clamped)
    setInputText(formatNumber(clamped, props.locale, props.format))
    if (clamped !== prev) {
      if (reason === 'programmatic') {
        committedValue = clamped
        hasPendingChange = false
      } else {
        hasPendingChange = true
      }
    }
    field?.setDirty(true)
    emitRef.fn?.({
      key: 'value',
      previous: prev,
      value: clamped,
      reason,
      source: details.source,
    })
  }

  const commitValue = (reason: NumberInputValueChangeReason = 'commit', event?: Event) => {
    const parsed = parseNumberInput(inputText())
    const finalVal = parsed === null ? null : clampNumber(parsed, props.min, props.max)
    const details = createChangeDetails(reason, event)
    if (finalVal !== value()) {
      props.onValueChange?.(finalVal, details)
      if (!details.canceled) {
        setRawValue(finalVal)
        hasPendingChange = true
      }
    }
    const nextVal = value()
    setInputText(formatNumber(nextVal, props.locale, props.format))
    if (hasPendingChange && nextVal !== committedValue) {
      committedValue = nextVal
      hasPendingChange = false
      props.onValueCommit?.(nextVal, details)
    } else {
      hasPendingChange = false
    }
    field?.setTouched(true)
  }

  const handleStep = (delta: number, reason: NumberInputValueChangeReason) => {
    if (disabled() || readOnly()) {
      return
    }
    const current = value() ?? (props.min !== undefined ? props.min : 0)
    let next = current + delta
    if (props.snapOnStep) {
      next = roundToStep(next, Math.abs(delta))
    } else {
      const precision = Math.max(
        0,
        (Math.abs(delta).toString().split('.')[1] ?? '').length,
        (current.toString().split('.')[1] ?? '').length,
      )
      next = Number(next.toFixed(Math.min(precision, 10)))
    }
    updateValue(next, reason)
  }

  const api: NumberInputApi = {
    setValue: (next, options) =>
      updateValue(next, options?.reason ?? 'programmatic', options?.event),
    increment: (amount) => handleStep(amount ?? step(), 'increment'),
    decrement: (amount) => handleStep(-(amount ?? step()), 'decrement'),
    commit: () => commitValue('commit'),
    focus: () => inputEl?.focus(),
    getValue: () => value(),
  }

  useController(() => props.controller, api)

  const reg = registerComponent({
    component: 'number-input',
    getElements: () => [rootEl, inputEl],
    getState: () => ({ value: value(), disabled: disabled() }),
    getDisabled: disabled,
    actions: {
      setValue: (v) => api.setValue(v as number | null),
      increment: () => api.increment(),
      decrement: () => api.decrement(),
    },
  })
  emitRef.fn = reg.emit

  const rest = omit(
    props,
    'value',
    'defaultValue',
    'onValueChange',
    'onValueCommit',
    'min',
    'max',
    'step',
    'smallStep',
    'largeStep',
    'format',
    'locale',
    'allowWheelScrub',
    'snapOnStep',
    'disabled',
    'readOnly',
    'required',
    'invalid',
    'name',
    'form',
    'controller',
    'debug',
  )

  return (
    <NumberInputContext
      value={{
        id,
        state,
        api,
        min: () => props.min,
        max: () => props.max,
        step,
        smallStep,
        largeStep,
        name: () => props.name ?? field?.name(),
        form: () => props.form,
        allowWheelScrub: () => !!props.allowWheelScrub,
        scrubbing,
        setScrubbing,
        scrubCursorPos,
        setScrubCursorPos,
        setInputText,
        registerInputEl: (el) => {
          inputEl = el
        },
        handleStep,
        commitValue,
        field,
      }}
    >
      {renderPart('div', rest, state, {
        ref: (el) => {
          rootEl = el
        },
        attrs: () => {
          const s = state()
          return {
            'data-disabled': s.disabled ? '' : undefined,
            'data-readonly': s.readOnly ? '' : undefined,
            'data-invalid': s.invalid ? '' : undefined,
            'data-scrubbing': s.scrubbing ? '' : undefined,
          }
        },
      })}
      <Show when={props.name}>
        <input type="hidden" name={props.name} form={props.form} value={value() ?? ''} />
      </Show>
    </NumberInputContext>
  )
}

export function NumberInputGroup(props: PartProps<'div', NumberInputState>) {
  const ctx = useNumberInput('Group')
  return renderPart('div', props, ctx.state, {
    attrs: () => {
      const s = ctx.state()
      return {
        role: 'group',
        'data-disabled': s.disabled ? '' : undefined,
        'data-readonly': s.readOnly ? '' : undefined,
        'data-invalid': s.invalid ? '' : undefined,
      }
    },
  })
}

export function NumberInputControl(
  props: Omit<PartProps<'input', NumberInputState>, 'type' | 'value' | 'defaultValue' | 'readonly'>,
) {
  const ctx = useNumberInput('Control')
  return renderPart('input', props, ctx.state, {
    ref: (el) => ctx.registerInputEl(el),
    attrs: () => {
      const s = ctx.state()
      return {
        id: ctx.id,
        type: 'text',
        inputmode: 'decimal',
        autocomplete: 'off',
        autocorrect: 'off',
        spellcheck: false,
        role: 'spinbutton',
        value: s.inputValue,
        form: ctx.form(),
        disabled: s.disabled,
        readonly: s.readOnly,
        required: s.required,
        'aria-valuenow': s.value ?? undefined,
        'aria-valuemin': ctx.min(),
        'aria-valuemax': ctx.max(),
        'aria-invalid': s.invalid ? 'true' : undefined,
        'aria-required': s.required ? 'true' : undefined,
        'aria-labelledby': ctx.field?.labelId,
        'aria-describedby': ctx.field?.describedBy(),
        'data-disabled': s.disabled ? '' : undefined,
        'data-readonly': s.readOnly ? '' : undefined,
        'data-invalid': s.invalid ? '' : undefined,
      }
    },
    handlers: {
      onInput: (e: InputEvent & { currentTarget: HTMLInputElement }) => {
        ctx.setInputText(e.currentTarget.value)
        const parsed = parseNumberInput(e.currentTarget.value)
        if (parsed !== null || e.currentTarget.value.trim() === '') {
          ctx.api.setValue(parsed, { reason: 'input', event: e })
          ctx.setInputText(e.currentTarget.value)
        }
      },
      onBlur: (e: FocusEvent) => {
        ctx.commitValue('commit', e)
      },
      onKeyDown: (e: KeyboardEvent) => {
        if (ctx.state().disabled || ctx.state().readOnly) {
          return
        }
        const multiplier = e.shiftKey ? ctx.largeStep() : e.altKey ? ctx.smallStep() : ctx.step()
        if (e.key === 'ArrowUp') {
          e.preventDefault()
          ctx.handleStep(multiplier, 'keyboard')
        } else if (e.key === 'ArrowDown') {
          e.preventDefault()
          ctx.handleStep(-multiplier, 'keyboard')
        } else if (e.key === 'Home') {
          const minVal = ctx.min()
          if (minVal !== undefined) {
            e.preventDefault()
            ctx.api.setValue(minVal, { reason: 'keyboard', event: e })
          }
        } else if (e.key === 'End') {
          const maxVal = ctx.max()
          if (maxVal !== undefined) {
            e.preventDefault()
            ctx.api.setValue(maxVal, { reason: 'keyboard', event: e })
          }
        } else if (e.key === 'Enter') {
          ctx.commitValue('commit', e)
        }
      },
      onWheel: (e: WheelEvent) => {
        if (!ctx.allowWheelScrub() || ctx.state().disabled || ctx.state().readOnly) {
          return
        }
        if (document.activeElement !== e.currentTarget) {
          return
        }
        e.preventDefault()
        const delta = e.deltaY < 0 ? ctx.step() : -ctx.step()
        ctx.handleStep(delta, 'wheel')
      },
    },
  })
}

export function NumberInputIncrement(
  props: NumberInputButtonProps &
    Omit<PartProps<'button', NumberInputButtonState>, keyof NumberInputButtonProps>,
) {
  const ctx = useNumberInput('Increment')
  const btnState = (): NumberInputButtonState => {
    const s = ctx.state()
    return { ...s, disabled: !!props.disabled || !s.canIncrement }
  }
  const rest = omit(props, 'disabled')

  return renderPart('button', rest, btnState, {
    attrs: () => {
      const s = btnState()
      return {
        type: 'button',
        tabindex: -1,
        disabled: s.disabled,
        'aria-label': 'Increment',
        'data-disabled': s.disabled ? '' : undefined,
      }
    },
    handlers: {
      onClick: (e: MouseEvent) => {
        if (btnState().disabled) {
          return
        }
        const delta = e.shiftKey ? ctx.largeStep() : e.altKey ? ctx.smallStep() : ctx.step()
        ctx.handleStep(delta, 'increment')
      },
    },
  })
}

export function NumberInputDecrement(
  props: NumberInputButtonProps &
    Omit<PartProps<'button', NumberInputButtonState>, keyof NumberInputButtonProps>,
) {
  const ctx = useNumberInput('Decrement')
  const btnState = (): NumberInputButtonState => {
    const s = ctx.state()
    return { ...s, disabled: !!props.disabled || !s.canDecrement }
  }
  const rest = omit(props, 'disabled')

  return renderPart('button', rest, btnState, {
    attrs: () => {
      const s = btnState()
      return {
        type: 'button',
        tabindex: -1,
        disabled: s.disabled,
        'aria-label': 'Decrement',
        'data-disabled': s.disabled ? '' : undefined,
      }
    },
    handlers: {
      onClick: (e: MouseEvent) => {
        if (btnState().disabled) {
          return
        }
        const delta = e.shiftKey ? ctx.largeStep() : e.altKey ? ctx.smallStep() : ctx.step()
        ctx.handleStep(-delta, 'decrement')
      },
    },
  })
}

export function NumberInputScrubArea(
  props: NumberInputScrubAreaProps &
    Omit<PartProps<'span', NumberInputState>, keyof NumberInputScrubAreaProps>,
) {
  const ctx = useNumberInput('ScrubArea')
  const direction = () => props.direction ?? 'horizontal'
  const sensitivity = () => props.pixelSensitivity ?? 2
  const rest = omit(props, 'direction', 'pixelSensitivity', 'teleportDistance')

  return renderPart('span', rest, ctx.state, {
    attrs: () => ({
      role: 'presentation',
      'data-scrubbing': ctx.scrubbing() ? '' : undefined,
      'data-direction': direction(),
    }),
    style: () => ({
      cursor: direction() === 'horizontal' ? 'ew-resize' : 'ns-resize',
      'user-select': 'none',
    }),
    handlers: {
      onPointerDown: (e: PointerEvent) => {
        if (ctx.state().disabled || ctx.state().readOnly || e.button !== 0) {
          return
        }
        e.preventDefault()
        ctx.setScrubbing(true)
        let lastX = e.clientX
        let lastY = e.clientY
        let accum = 0
        ctx.setScrubCursorPos({ x: e.clientX, y: e.clientY })

        const onMove = (ev: PointerEvent) => {
          const dx = ev.clientX - lastX
          const dy = lastY - ev.clientY
          lastX = ev.clientX
          lastY = ev.clientY
          ctx.setScrubCursorPos({ x: ev.clientX, y: ev.clientY })
          accum += direction() === 'horizontal' ? dx : dy
          const steps = Math.trunc(accum / sensitivity())
          if (steps !== 0) {
            accum -= steps * sensitivity()
            const unit = ev.shiftKey ? ctx.largeStep() : ev.altKey ? ctx.smallStep() : ctx.step()
            ctx.handleStep(steps * unit, 'scrub')
          }
        }
        const onUp = (ev: PointerEvent) => {
          ctx.setScrubbing(false)
          ctx.commitValue('scrub', ev)
          window.removeEventListener('pointermove', onMove)
          window.removeEventListener('pointerup', onUp)
        }
        window.addEventListener('pointermove', onMove)
        window.addEventListener('pointerup', onUp)
      },
    },
  })
}

export function NumberInputScrubAreaCursor(props: PartProps<'span', NumberInputState>) {
  const ctx = useNumberInput('ScrubAreaCursor')
  return (
    <Show when={ctx.scrubbing()}>
      {renderPart('span', props, ctx.state, {
        attrs: () => ({
          'aria-hidden': true,
          'data-scrubbing': '',
        }),
        style: () => {
          const pos = ctx.scrubCursorPos()
          return {
            position: 'fixed',
            left: `${pos.x}px`,
            top: `${pos.y}px`,
            'pointer-events': 'none',
            transform: 'translate(-50%, -50%)',
          }
        },
      })}
    </Show>
  )
}
