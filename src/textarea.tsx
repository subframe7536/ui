import { createSignal, merge, omit } from 'solid-js'

import { useFieldControl } from './field'
import { useController } from './foundation/controller'
import { createChangeDetails } from './foundation/details'
import type { ChangeOptions } from './foundation/details'
import { registerComponent } from './foundation/registry'
import { renderPart } from './foundation/render'
import type { PartProps } from './foundation/render'
import { createControlledSignal } from './foundation/state'
import { createInputController } from './input'
import type {
  InputApi,
  InputController,
  InputGroupOptions,
  InputGroupState,
  InputOptions,
  InputProps,
  InputState,
  InputValueChangeReason,
  TextareaOptions,
  TextareaProps,
  TextareaState,
  TextareaSubmitDetails,
} from './input'

export function Textarea(props: TextareaProps) {
  const field = useFieldControl()
  let elRef: HTMLTextAreaElement | undefined
  const [focused, setFocused] = createSignal(false)

  const [value, setValue] = createControlledSignal<string>({
    value: () => props.value,
    defaultValue: () => props.defaultValue ?? '',
  })

  const isDisabled = () => !!props.disabled || (field?.disabled() ?? false)
  const isReadOnly = () => !!props.readOnly || (field?.readOnly() ?? false)
  const isRequired = () => !!props.required || (field?.required() ?? false)
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
    field?.setDirty(true)
    reg.emit({
      key: 'value',
      previous: prev,
      value: next,
      reason: details.reason,
      source: details.source,
    })
  }

  const api: InputApi = {
    setValue: (next, opts) =>
      applyValue(next, opts?.reason ?? 'imperative', opts?.event, opts?.source),
    clear: (opts) => applyValue('', opts?.reason ?? 'clear-press', opts?.event, opts?.source),
    focus: () => elRef?.focus(),
    getValue: value,
  }

  useController(() => props.controller, api)

  const reg = registerComponent({
    component: 'textarea',
    getElements: () => [elRef],
    getState: () => ({ value: value(), required: isRequired() }),
    getDisabled: () => isDisabled() || isReadOnly(),
    actions: {
      setValue: (next) =>
        api.setValue(
          typeof next === 'string' ? next : typeof next === 'number' ? String(next) : '',
        ),
      clear: () => api.clear(),
    },
  })

  const state = (): TextareaState => ({
    value: value(),
    empty: value().length === 0,
    focused: focused(),
    disabled: isDisabled(),
    readOnly: isReadOnly(),
    required: isRequired(),
    invalid: isInvalid(),
  })

  const rest = omit(
    props,
    'value',
    'defaultValue',
    'onValueChange',
    'disabled',
    'readOnly',
    'required',
    'invalid',
    'controller',
    'debug',
    'autoResize',
    'submitOnEnter',
    'onSubmit',
  )

  const ssrRest = merge(rest, {
    get children() {
      return value()
    },
  })
  const resolvedRest: PartProps<'textarea', TextareaState> =
    typeof window === 'undefined' ? ssrRest : rest
  return renderPart('textarea', resolvedRest, state, {
    ref: (el: HTMLTextAreaElement) => {
      elRef = el
    },
    attrs: () => {
      const s = state()
      return {
        id: props.id ?? field?.controlId,
        name: props.name ?? field?.name(),
        value: s.value,
        disabled: s.disabled || undefined,
        readonly: s.readOnly || undefined,
        required: s.required || undefined,
        'aria-invalid': s.invalid ? 'true' : undefined,
        'aria-describedby': field?.describedBy(),
        'data-slot': 'textarea',
        'data-filled': value().length > 0 ? '' : undefined,
        'data-empty': s.empty ? '' : undefined,
        'data-focused': s.focused ? '' : undefined,
        'data-disabled': s.disabled ? '' : undefined,
        'data-invalid': s.invalid ? '' : undefined,
      }
    },
    handlers: {
      onInput: (event: Event) => {
        const target = event.currentTarget as HTMLTextAreaElement
        applyValue(target.value, 'input-change', event)
        if (props.value !== undefined && target.value !== props.value) {
          target.value = props.value
        }
      },
      onKeyDown: (event: KeyboardEvent) => {
        if (props.submitOnEnter && event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault()
          props.onSubmit?.({ value: value(), event })
        }
      },
      onFocus: () => setFocused(true),
      onBlur: () => {
        setFocused(false)
        field?.setTouched(true)
      },
    },
  })
}

export {
  createInputController,
  type InputController,
  type InputGroupOptions,
  type InputGroupState,
  type InputOptions,
  type InputProps,
  type InputState,
  type InputValueChangeReason,
  type TextareaOptions,
  type TextareaProps,
  type TextareaState,
  type TextareaSubmitDetails,
}
