import type { JSX } from "@solidjs/web"
import {
  createContext,
  createSignal,
  createUniqueId,
  omit,
  useContext,
} from "solid-js"
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

export type OTPInputPattern = "numeric" | "alphanumeric" | RegExp

export type OTPInputValueChangeReason = "input" | "paste" | "clear" | "programmatic"

export type OTPInputChangeOptions = ChangeOptions<OTPInputValueChangeReason>

export type OTPInputSlotData = {
  index: number
  char: string
  active: boolean
  caret: boolean
  filled: boolean
}

export type OTPInputApi = {
  setValue: (value: string, options?: OTPInputChangeOptions) => void
  clear: () => void
  focus: () => void
  getValue: () => string
}

export function createOTPInputController() {
  return createController<OTPInputApi>()
}

export type OTPInputController = ReturnType<typeof createOTPInputController>

export type OTPInputOptions = {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string, details: ChangeDetails<OTPInputValueChangeReason>) => void
  onComplete?: (value: string) => void
  maxLength?: number
  pattern?: OTPInputPattern
  disabled?: boolean
  readOnly?: boolean
  required?: boolean
  invalid?: boolean
  name?: string
  form?: string
  autoComplete?: string
  controller?: OTPInputController
  debug?: boolean
}

export type OTPInputState = {
  value: string
  maxLength: number
  focused: boolean
  activeIndex: number
  complete: boolean
  disabled: boolean
  readOnly: boolean
  invalid: boolean
  slots: OTPInputSlotData[]
}

export type OTPInputSlotProps = {
  index: number
}

export type OTPInputSlotState = OTPInputSlotData & {
  disabled: boolean
  invalid: boolean
}

function sanitizeOTP(raw: string, maxLength: number, pattern: OTPInputPattern): string {
  let chars = ""
  const re =
    pattern === "numeric"
      ? /^[0-9]$/
      : pattern === "alphanumeric"
        ? /^[a-zA-Z0-9]$/
        : pattern
  for (const ch of raw) {
    if (chars.length >= maxLength) break
    if (re.test(ch)) chars += ch
  }
  return chars
}

type OTPInputContextValue = {
  state: () => OTPInputState
  api: OTPInputApi
  focusInput: () => void
}

const OTPInputContext = createContext<OTPInputContextValue | null>(null)

function useOTPInput(part: string): OTPInputContextValue {
  const ctx = useContext(OTPInputContext)
  if (!ctx) throw new Error(`<OTPInput${part}> must be used inside <OTPInput>.`)
  return ctx
}

type InputForwardedProps = Pick<
  JSX.IntrinsicElements["input"],
  | "id"
  | "autofocus"
  | "aria-label"
  | "aria-labelledby"
  | "aria-describedby"
  | "aria-invalid"
>

export function OTPInput(
  props: OTPInputOptions &
    InputForwardedProps &
    Omit<
      PartProps<"div", OTPInputState>,
      keyof OTPInputOptions | keyof InputForwardedProps | "defaultValue" | "onChange" | "onSelect"
    >
) {
  const field = useFieldControl()
  const id = () => (typeof props.id === "string" ? props.id : undefined) ?? field?.controlId ?? `ui-otp-${createUniqueId()}`
  const maxLength = () => props.maxLength ?? 6
  const pattern = (): OTPInputPattern => props.pattern ?? "numeric"

  const [value, setRawValue] = createControlledSignal<string>({
    value: () => props.value,
    defaultValue: () => props.defaultValue ?? "",
  })

  const [focused, setFocused] = createSignal(false)
  const [selectionIndex, setSelectionIndex] = createSignal(0)
  let inputEl: HTMLInputElement | null = null
  let rootEl: HTMLElement | null = null

  const disabled = () => !!props.disabled || !!field?.disabled()
  const readOnly = () => !!props.readOnly || !!field?.readOnly()
  const invalid = () => !!props.invalid || !!field?.invalid()

  const state = (): OTPInputState => {
    const val = value()
    const len = maxLength()
    const isFocused = focused()
    const activeIdx = isFocused ? Math.min(selectionIndex(), len - 1) : -1
    const slots: OTPInputSlotData[] = Array.from({ length: len }, (_, index) => {
      const char = val[index] ?? ""
      const active = index === activeIdx
      return {
        index,
        char,
        active,
        caret: active && char === "",
        filled: char !== "",
      }
    })
    return {
      value: val,
      maxLength: len,
      focused: isFocused,
      activeIndex: activeIdx,
      complete: val.length >= len,
      disabled: disabled(),
      readOnly: readOnly(),
      invalid: invalid(),
      slots,
    }
  }

  let emitChange:
    | ((change: {
        key: string
        previous: unknown
        value: unknown
        reason: string
        source: ChangeDetails["source"]
      }) => void)
    | undefined

  const updateValue = (raw: string, reason: OTPInputValueChangeReason = "input", event?: Event) => {
    const next = sanitizeOTP(raw, maxLength(), pattern())
    const details = createChangeDetails(reason, event)
    props.onValueChange?.(next, details)
    if (details.canceled) return
    const prev = value()
    setRawValue(next)
    setSelectionIndex(Math.min(next.length, maxLength() - 1))
    field?.setDirty(true)
    emitChange?.({
      key: "value",
      previous: prev,
      value: next,
      reason,
      source: details.source,
    })
    if (next.length >= maxLength() && prev.length < maxLength()) {
      props.onComplete?.(next)
    }
  }

  const api: OTPInputApi = {
    setValue: (next, options) => updateValue(next, options?.reason ?? "programmatic", options?.event),
    clear: () => updateValue("", "clear"),
    focus: () => inputEl?.focus(),
    getValue: () => value(),
  }

  useController(() => props.controller, api)

  const reg = registerComponent({
    component: "otp-input",
    getElements: () => [rootEl, inputEl],
    getState: () => ({ value: value(), complete: state().complete, disabled: disabled() }),
    getDisabled: disabled,
    actions: {
      setValue: (v) => api.setValue(String(v ?? "")),
      clear: () => api.clear(),
    },
  })
  emitChange = reg.emit

  const rest = omit(
    props,
    "value",
    "defaultValue",
    "onValueChange",
    "onComplete",
    "maxLength",
    "pattern",
    "disabled",
    "readOnly",
    "required",
    "invalid",
    "name",
    "form",
    "autoComplete",
    "controller",
    "debug",
    "id",
    "autofocus",
    "aria-label",
    "aria-labelledby",
    "aria-describedby",
    "aria-invalid"
  )

  const combinedProps: PartProps<"div", OTPInputState> = {
    ...rest,
    children: (s: OTPInputState) => (
      <>
        {typeof props.children === "function" ? props.children(s) : props.children}
        <input
          ref={(el) => {
            inputEl = el
          }}
          id={id()}
          type="text"
          inputmode={pattern() === "numeric" ? "numeric" : "text"}
          autocomplete={props.autoComplete ?? "one-time-code"}
          maxlength={maxLength()}
          value={value()}
          name={props.name ?? field?.name()}
          form={props.form}
          disabled={disabled()}
          readonly={readOnly()}
          required={!!props.required || !!field?.required()}
          autofocus={props.autofocus}
          aria-label={props["aria-label"]}
          aria-labelledby={props["aria-labelledby"] ?? field?.labelId}
          aria-describedby={props["aria-describedby"] ?? field?.describedBy()}
          aria-invalid={props["aria-invalid"] ?? (invalid() ? "true" : undefined)}
          style={{
            position: "absolute",
            inset: "0",
            width: "100%",
            height: "100%",
            opacity: "0",
            border: "0",
            margin: "0",
            padding: "0",
          }}
          onFocus={(e) => {
            setFocused(true)
            setSelectionIndex(e.currentTarget.selectionStart ?? value().length)
          }}
          onBlur={() => {
            setFocused(false)
            field?.setTouched(true)
          }}
          onInput={(e) => {
            updateValue(e.currentTarget.value, "input", e)
          }}
          onPaste={(e) => {
            const pasted = e.clipboardData?.getData("text") ?? ""
            if (pasted) {
              e.preventDefault()
              updateValue(pasted, "paste", e)
            }
          }}
          onSelect={(e) => {
            setSelectionIndex(e.currentTarget.selectionStart ?? value().length)
          }}
        />
      </>
    ),
  }

  return (
    <OTPInputContext value={{ state, api, focusInput: () => inputEl?.focus() }}>
      {renderPart("div", combinedProps, state, {
        ref: (el) => {
          rootEl = el
        },
        style: () => ({ position: "relative" }),
        attrs: () => {
          const s = state()
          return {
            "data-focused": s.focused ? "" : undefined,
            "data-complete": s.complete ? "" : undefined,
            "data-disabled": s.disabled ? "" : undefined,
            "data-readonly": s.readOnly ? "" : undefined,
            "data-invalid": s.invalid ? "" : undefined,
          }
        },
        handlers: {
          onClick: () => inputEl?.focus(),
        },
      })}
    </OTPInputContext>
  )
}

export function OTPInputGroup(props: PartProps<"div", OTPInputState>) {
  const ctx = useOTPInput("Group")
  return renderPart("div", props, ctx.state, {
    attrs: () => ({ role: "group" }),
  })
}

export function OTPInputSlot(
  props: OTPInputSlotProps & Omit<PartProps<"div", OTPInputSlotState>, keyof OTPInputSlotProps>
) {
  const ctx = useOTPInput("Slot")
  const slotState = (): OTPInputSlotState => {
    const s = ctx.state()
    const slot = s.slots[props.index] ?? {
      index: props.index,
      char: "",
      active: false,
      caret: false,
      filled: false,
    }
    return {
      ...slot,
      disabled: s.disabled,
      invalid: s.invalid,
    }
  }

  const rest = omit(props, "index")
  const resolvedProps: PartProps<"div", OTPInputSlotState> =
    props.children !== undefined
      ? rest
      : { ...rest, children: (s: OTPInputSlotState) => s.char }

  return renderPart("div", resolvedProps, slotState, {
    attrs: () => {
      const s = slotState()
      return {
        "data-slot-index": s.index,
        "data-active": s.active ? "" : undefined,
        "data-caret": s.caret ? "" : undefined,
        "data-filled": s.filled ? "" : undefined,
        "data-disabled": s.disabled ? "" : undefined,
        "data-invalid": s.invalid ? "" : undefined,
      }
    },
  })
}

export function OTPInputSeparator(props: PartProps<"div", OTPInputState>) {
  const ctx = useOTPInput("Separator")
  return renderPart("div", props, ctx.state, {
    attrs: () => ({ role: "separator", "aria-hidden": true }),
  })
}
