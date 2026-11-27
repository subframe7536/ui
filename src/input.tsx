import { createContext, createSignal, omit, Show, useContext } from "solid-js"
import { useFieldControl } from "./field"
import { createController, useController } from "./foundation/controller"
import {
  createChangeDetails,
  type ChangeDetails,
  type ChangeOptions,
} from "./foundation/details"
import { registerComponent } from "./foundation/registry"
import { renderPart, type PartProps } from "./foundation/render"
import { createControlledSignal } from "./foundation/state"

export type InputValueChangeReason = "input-change" | "clear-press" | "imperative" | "reset"

export type InputApi = {
  setValue: (value: string, options?: ChangeOptions<InputValueChangeReason>) => void
  clear: (options?: ChangeOptions<InputValueChangeReason>) => void
  focus: () => void
  getValue: () => string
}

export function createInputController() {
  return createController<InputApi>()
}

export type InputController = ReturnType<typeof createInputController>

export type InputOptions = {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string, details: ChangeDetails<InputValueChangeReason>) => void
  disabled?: boolean
  readOnly?: boolean
  required?: boolean
  invalid?: boolean
  controller?: InputController
  debug?: boolean
}

export type InputState = {
  value: string
  empty: boolean
  focused: boolean
  disabled: boolean
  readOnly: boolean
  required: boolean
  invalid: boolean
}

export type InputProps = InputOptions &
  Omit<PartProps<"input", InputState>, "value" | "defaultValue" | "disabled" | "readOnly" | "required">

export type InputGroupOptions = { disabled?: boolean }
export type InputGroupState = {
  empty: boolean
  focused: boolean
  disabled: boolean
  invalid: boolean
}

export type TextareaSubmitDetails = { value: string; event: KeyboardEvent }

export type TextareaOptions = InputOptions & {
  submitOnEnter?: boolean
  onSubmit?: (details: TextareaSubmitDetails) => void
}

export type TextareaState = InputState

export type TextareaProps = TextareaOptions &
  Omit<
    PartProps<"textarea", TextareaState>,
    "value" | "defaultValue" | "disabled" | "readOnly" | "required" | "onSubmit"
  >

type InputGroupContextValue = {
  value: () => string
  focused: () => boolean
  disabled: () => boolean
  invalid: () => boolean
  clear: (event?: Event) => void
  bindControl: (handlers: {
    getValue: () => string
    isFocused: () => boolean
    isInvalid: () => boolean
    clear: (event?: Event) => void
  }) => void
}

const InputGroupContext = createContext<InputGroupContextValue | null>(null)

export function InputGroup(
  props: InputGroupOptions & Omit<PartProps<"div", InputGroupState>, keyof InputGroupOptions>
) {
  const field = useFieldControl()
  let bound:
    | {
        getValue: () => string
        isFocused: () => boolean
        isInvalid: () => boolean
        clear: (event?: Event) => void
      }
    | undefined

  const disabled = () => !!props.disabled || (field?.disabled() ?? false)
  const state = (): InputGroupState => ({
    empty: (bound?.getValue() ?? "").length === 0,
    focused: bound?.isFocused() ?? false,
    disabled: disabled(),
    invalid: bound?.isInvalid() ?? field?.invalid() ?? false,
  })

  const rest = omit(props, "disabled")

  return (
    <InputGroupContext
      value={{
        value: () => bound?.getValue() ?? "",
        focused: () => bound?.isFocused() ?? false,
        disabled,
        invalid: () => bound?.isInvalid() ?? field?.invalid() ?? false,
        clear: (event) => bound?.clear(event),
        bindControl: (h) => {
          bound = h
        },
      }}
    >
      {renderPart("div", rest, state, {
        attrs: () => {
          const s = state()
          return {
            "data-empty": s.empty ? "" : undefined,
            "data-focused": s.focused ? "" : undefined,
            "data-disabled": s.disabled ? "" : undefined,
            "data-invalid": s.invalid ? "" : undefined,
          }
        },
      })}
    </InputGroupContext>
  )
}

export function Input(props: InputProps) {
  const field = useFieldControl()
  const group = useContext(InputGroupContext)
  let inputEl: HTMLInputElement | undefined
  const [focused, setFocused] = createSignal(false)

  const [value, setValue] = createControlledSignal<string>({
    value: () => props.value,
    defaultValue: () => props.defaultValue ?? "",
  })

  const isDisabled = () => !!props.disabled || (group?.disabled() ?? false) || (field?.disabled() ?? false)
  const isReadOnly = () => !!props.readOnly || (field?.readOnly() ?? false)
  const isRequired = () => !!props.required || (field?.required() ?? false)
  const isInvalid = () => !!props.invalid || (field?.invalid() ?? false)

  const applyValue = (
    next: string,
    reason: InputValueChangeReason,
    event?: Event,
    source?: ChangeOptions["source"]
  ) => {
    const prev = value()
    if (prev === next) return
    const details = createChangeDetails(reason, event, source)
    props.onValueChange?.(next, details)
    if (details.canceled) return
    setValue(next)
    field?.setDirty(true)
    reg.emit({
      key: "value",
      previous: prev,
      value: next,
      reason: details.reason,
      source: details.source,
    })
  }

  const api: InputApi = {
    setValue: (next, opts) =>
      applyValue(next, opts?.reason ?? "imperative", opts?.event, opts?.source),
    clear: (opts) =>
      applyValue("", opts?.reason ?? "clear-press", opts?.event, opts?.source),
    focus: () => inputEl?.focus(),
    getValue: value,
  }

  useController(() => props.controller, api)

  group?.bindControl({
    getValue: value,
    isFocused: focused,
    isInvalid,
    clear: (event) => {
      applyValue("", "clear-press", event)
      inputEl?.focus()
    },
  })

  const reg = registerComponent({
    component: "input",
    getElements: () => [inputEl],
    getState: () => ({ value: value(), required: isRequired() }),
    getDisabled: () => isDisabled() || isReadOnly(),
    actions: {
      setValue: (next) => api.setValue(String(next ?? "")),
      clear: () => api.clear(),
    },
  })

  const state = (): InputState => ({
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
    "value",
    "defaultValue",
    "onValueChange",
    "disabled",
    "readOnly",
    "required",
    "invalid",
    "controller",
    "debug"
  )

  return renderPart("input", rest, state, {
    ref: (el: HTMLInputElement) => {
      inputEl = el
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
        "aria-invalid": s.invalid ? "true" : undefined,
        "aria-describedby": field?.describedBy(),
        "data-empty": s.empty ? "" : undefined,
        "data-focused": s.focused ? "" : undefined,
        "data-disabled": s.disabled ? "" : undefined,
        "data-invalid": s.invalid ? "" : undefined,
      }
    },
    handlers: {
      onInput: (event: Event) => {
        const target = event.currentTarget as HTMLInputElement
        applyValue(target.value, "input-change", event)
      },
      onFocus: () => setFocused(true),
      onBlur: () => {
        setFocused(false)
        field?.setTouched(true)
      },
    },
  })
}

export function InputClear(props: Omit<PartProps<"button", InputGroupState>, "type">) {
  const group = useContext(InputGroupContext)
  if (!group) throw new Error("<InputClear> must be used inside <InputGroup>.")
  const state = (): InputGroupState => ({
    empty: group.value().length === 0,
    focused: group.focused(),
    disabled: group.disabled(),
    invalid: group.invalid(),
  })
  return (
    <Show when={!state().empty}>
      {renderPart("button", props, state, {
        attrs: () => ({
          type: "button",
          "aria-label": "Clear",
          disabled: group.disabled() || undefined,
        }),
        handlers: {
          onClick: (event: MouseEvent) => group.clear(event),
        },
      })}
    </Show>
  )
}
