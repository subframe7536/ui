import { createContext, createSignal, omit, useContext } from 'solid-js'

import { useFieldControl } from './field'
import { createController, useController } from './foundation/controller'
import { createChangeDetails } from './foundation/details'
import type { ChangeDetails, ChangeOptions } from './foundation/details'
import { registerComponent } from './foundation/registry'
import { renderPart } from './foundation/render'
import type { PartProps } from './foundation/render'
import { createControlledSignal } from './foundation/state'
import type { InputValueChangeReason } from './input'

export type PasswordInputVisibleChangeReason = 'trigger-press' | 'imperative'

export type PasswordInputApi = {
  setValue: (value: string, options?: ChangeOptions<InputValueChangeReason>) => void
  setVisible: (visible: boolean, options?: ChangeOptions<PasswordInputVisibleChangeReason>) => void
  toggleVisible: () => void
  getValue: () => string
  isVisible: () => boolean
}

export function createPasswordInputController() {
  return createController<PasswordInputApi>()
}

export type PasswordInputController = ReturnType<typeof createPasswordInputController>

export type PasswordInputOptions = {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string, details: ChangeDetails<InputValueChangeReason>) => void
  visible?: boolean
  defaultVisible?: boolean
  onVisibleChange?: (
    visible: boolean,
    details: ChangeDetails<PasswordInputVisibleChangeReason>,
  ) => void
  disabled?: boolean
  readOnly?: boolean
  required?: boolean
  invalid?: boolean
  controller?: PasswordInputController
  debug?: boolean
}

export type PasswordInputState = {
  value: string
  visible: boolean
  focused: boolean
  disabled: boolean
  readOnly: boolean
  invalid: boolean
}

type PasswordContextValue = {
  state: () => PasswordInputState
  applyValue: (next: string, reason: InputValueChangeReason, event?: Event) => void
  toggleVisible: (event?: Event) => void
  setFocused: (v: boolean) => void
  setInputEl: (el: HTMLInputElement) => void
}

const PasswordInputContext = createContext<PasswordContextValue | null>(null)

function usePasswordContext(part: string): PasswordContextValue {
  const ctx = useContext(PasswordInputContext)
  if (!ctx) {
    throw new Error(`<PasswordInput${part}> must be used inside <PasswordInput>.`)
  }
  return ctx
}

export function PasswordInput(
  props: PasswordInputOptions &
    Omit<PartProps<'div', PasswordInputState>, 'defaultValue' | 'onChange'>,
) {
  const field = useFieldControl()
  let rootEl: HTMLElement | undefined
  let inputEl: HTMLInputElement | undefined
  const [focused, setFocused] = createSignal(false)

  const [value, setValue] = createControlledSignal<string>({
    value: () => props.value,
    defaultValue: () => props.defaultValue ?? '',
  })
  const [visible, setVisible] = createControlledSignal<boolean>({
    value: () => props.visible,
    defaultValue: () => !!props.defaultVisible,
  })

  const isDisabled = () => !!props.disabled || (field?.disabled() ?? false)
  const isReadOnly = () => !!props.readOnly || (field?.readOnly() ?? false)
  const isInvalid = () => !!props.invalid || (field?.invalid() ?? false)

  const applyValue = (
    next: string,
    reason: InputValueChangeReason,
    event?: Event,
    source?: ChangeOptions['source'],
  ) => {
    const prev = value()
    if (prev === next) {
      return
    }
    const details = createChangeDetails(reason, event, source)
    props.onValueChange?.(next, details)
    if (details.canceled) {
      return
    }
    setValue(next)
    reg.emit({
      key: 'value',
      previous: '[redacted]',
      value: '[redacted]',
      reason: details.reason,
      source: details.source,
    })
  }

  const applyVisible = (
    next: boolean,
    reason: PasswordInputVisibleChangeReason,
    event?: Event,
    source?: ChangeOptions['source'],
  ) => {
    const prev = visible()
    if (prev === next) {
      return
    }
    const details = createChangeDetails(reason, event, source)
    props.onVisibleChange?.(next, details)
    if (details.canceled) {
      return
    }
    setVisible(next)
  }

  const api: PasswordInputApi = {
    setValue: (next, opts) =>
      applyValue(next, opts?.reason ?? 'imperative', opts?.event, opts?.source),
    setVisible: (next, opts) =>
      applyVisible(next, opts?.reason ?? 'imperative', opts?.event, opts?.source),
    toggleVisible: () => applyVisible(!visible(), 'imperative'),
    getValue: value,
    isVisible: visible,
  }

  useController(() => props.controller, api)

  const reg = registerComponent({
    component: 'password-input',
    getElements: () => [inputEl, rootEl],
    getState: () => ({ value: value() ? '[redacted]' : '', visible: visible() }),
    getDisabled: () => isDisabled() || isReadOnly(),
    actions: {
      setValue: (next) =>
        api.setValue(
          typeof next === 'string' ? next : typeof next === 'number' ? String(next) : '',
        ),
      toggleVisible: () => api.toggleVisible(),
    },
  })

  const state = (): PasswordInputState => ({
    value: value(),
    visible: visible(),
    focused: focused(),
    disabled: isDisabled(),
    readOnly: isReadOnly(),
    invalid: isInvalid(),
  })

  const rest = omit(
    props,
    'value',
    'defaultValue',
    'onValueChange',
    'visible',
    'defaultVisible',
    'onVisibleChange',
    'disabled',
    'readOnly',
    'required',
    'invalid',
    'controller',
    'debug',
  )

  return (
    <PasswordInputContext
      value={{
        state,
        applyValue,
        toggleVisible: (event) => applyVisible(!visible(), 'trigger-press', event),
        setFocused,
        setInputEl: (el) => {
          inputEl = el
        },
      }}
    >
      {renderPart('div', rest, state, {
        ref: (el: HTMLElement) => {
          rootEl = el
        },
        attrs: () => {
          const s = state()
          return {
            'data-visible': s.visible ? '' : undefined,
            'data-focused': s.focused ? '' : undefined,
            'data-disabled': s.disabled ? '' : undefined,
            'data-invalid': s.invalid ? '' : undefined,
          }
        },
      })}
    </PasswordInputContext>
  )
}

export function PasswordInputControl(
  props: Omit<PartProps<'input', PasswordInputState>, 'type' | 'value'>,
) {
  const ctx = usePasswordContext('Control')
  const field = useFieldControl()
  return renderPart('input', props, ctx.state, {
    ref: ctx.setInputEl,
    attrs: () => {
      const s = ctx.state()
      return {
        id: props.id ?? field?.controlId,
        name: props.name ?? field?.name(),
        type: s.visible ? 'text' : 'password',
        value: s.value,
        disabled: s.disabled || undefined,
        readonly: s.readOnly || undefined,
        'aria-invalid': s.invalid ? 'true' : undefined,
        'aria-describedby': field?.describedBy(),
      }
    },
    handlers: {
      onInput: (event: Event) => {
        ctx.applyValue((event.currentTarget as HTMLInputElement).value, 'input-change', event)
      },
      onFocus: () => ctx.setFocused(true),
      onBlur: () => ctx.setFocused(false),
    },
  })
}

export function PasswordInputToggle(props: Omit<PartProps<'button', PasswordInputState>, 'type'>) {
  const ctx = usePasswordContext('Toggle')
  return renderPart('button', props, ctx.state, {
    attrs: () => {
      const s = ctx.state()
      return {
        type: 'button',
        'aria-pressed': s.visible ? 'true' : 'false',
        'aria-label': s.visible ? 'Hide password' : 'Show password',
        disabled: s.disabled || undefined,
        'data-visible': s.visible ? '' : undefined,
      }
    },
    handlers: {
      onClick: (event: MouseEvent) => ctx.toggleVisible(event),
    },
  })
}

export type { InputValueChangeReason }
