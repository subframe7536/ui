import { createContext, omit, useContext } from "solid-js"
import { createController, useController } from "./foundation/controller"
import {
  createChangeDetails,
  type ChangeDetails,
  type ChangeOptions,
} from "./foundation/details"
import { registerComponent } from "./foundation/registry"
import { renderPart, type PartProps } from "./foundation/render"
import { createControlledSignal } from "./foundation/state"

export type SwitchCheckedChangeReason = "press" | "imperative" | "reset"

export type SwitchApi = {
  setChecked: (
    checked: boolean,
    options?: ChangeOptions<SwitchCheckedChangeReason>
  ) => void
  toggle: (options?: ChangeOptions<SwitchCheckedChangeReason>) => void
  isChecked: () => boolean
}

export function createSwitchController() {
  return createController<SwitchApi>()
}

export type SwitchController = ReturnType<typeof createSwitchController>

export type SwitchOptions = {
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (
    checked: boolean,
    details: ChangeDetails<SwitchCheckedChangeReason>
  ) => void
  disabled?: boolean
  readOnly?: boolean
  required?: boolean
  name?: string
  value?: string
  form?: string
  controller?: SwitchController
  debug?: boolean
}

export type SwitchState = {
  checked: boolean
  disabled: boolean
  readOnly: boolean
  required: boolean
}

export type SwitchThumbState = SwitchState

const SwitchContext = createContext<() => SwitchState>(() => ({
  checked: false,
  disabled: false,
  readOnly: false,
  required: false,
}))

export function Switch(
  props: SwitchOptions &
    Omit<PartProps<"button", SwitchState>, "value" | "onChange" | "type">
) {
  let rootEl: HTMLElement | undefined
  const [checked, setChecked] = createControlledSignal<boolean>({
    value: () => props.checked,
    defaultValue: () => !!props.defaultChecked,
  })

  const state = (): SwitchState => ({
    checked: checked(),
    disabled: !!props.disabled,
    readOnly: !!props.readOnly,
    required: !!props.required,
  })

  const applyChecked = (
    next: boolean,
    reason: SwitchCheckedChangeReason,
    event?: Event,
    source?: ChangeOptions["source"]
  ) => {
    if (props.disabled || props.readOnly) return
    const prev = checked()
    if (prev === next) return
    const details = createChangeDetails(reason, event, source)
    props.onCheckedChange?.(next, details)
    if (details.canceled) return
    setChecked(next)
    reg.emit({
      key: "checked",
      previous: prev,
      value: next,
      reason: details.reason,
      source: details.source,
    })
  }

  const api: SwitchApi = {
    setChecked: (next, options) =>
      applyChecked(next, options?.reason ?? "imperative", options?.event, options?.source),
    toggle: (options) =>
      applyChecked(!checked(), options?.reason ?? "imperative", options?.event, options?.source),
    isChecked: checked,
  }

  useController(() => props.controller, api)

  const reg = registerComponent({
    component: "switch",
    getElements: () => [rootEl],
    getState: () => ({ checked: checked(), required: !!props.required }),
    getDisabled: () => !!props.disabled || !!props.readOnly,
    actions: {
      setChecked: (next) => api.setChecked(Boolean(next)),
      toggle: () => api.toggle(),
    },
  })

  const rest = omit(
    props,
    "checked",
    "defaultChecked",
    "onCheckedChange",
    "disabled",
    "readOnly",
    "required",
    "name",
    "value",
    "form",
    "controller",
    "debug"
  )

  return (
    <SwitchContext value={state}>
      {renderPart("button", rest, state, {
        ref: (el: HTMLElement) => {
          rootEl = el
        },
        attrs: () => {
          const s = state()
          return {
            type: "button",
            role: "switch",
            "aria-checked": s.checked ? "true" : "false",
            "aria-readonly": s.readOnly ? "true" : undefined,
            "aria-required": s.required ? "true" : undefined,
            disabled: s.disabled || undefined,
            "data-state": s.checked ? "checked" : "unchecked",
            "data-checked": s.checked ? "" : undefined,
            "data-unchecked": !s.checked ? "" : undefined,
            "data-disabled": s.disabled ? "" : undefined,
            "data-readonly": s.readOnly ? "" : undefined,
            "data-required": s.required ? "" : undefined,
          }
        },
        handlers: {
          onClick: (event: MouseEvent) => applyChecked(!checked(), "press", event),
        },
      })}
      <input
        type="checkbox"
        aria-hidden="true"
        tabindex={-1}
        name={props.name}
        value={props.value ?? "on"}
        form={props.form}
        checked={checked()}
        disabled={props.disabled}
        required={props.required}
        readonly
        style={{
          position: "absolute",
          width: "1px",
          height: "1px",
          margin: "-1px",
          padding: "0",
          overflow: "hidden",
          clip: "rect(0, 0, 0, 0)",
          "white-space": "nowrap",
          border: "0",
          "pointer-events": "none",
        }}
      />
    </SwitchContext>
  )
}

export function SwitchThumb(props: PartProps<"span", SwitchThumbState>) {
  const state = useContext(SwitchContext)
  return renderPart("span", props, state, {
    attrs: () => {
      const s = state()
      return {
        "data-state": s.checked ? "checked" : "unchecked",
        "data-checked": s.checked ? "" : undefined,
        "data-unchecked": !s.checked ? "" : undefined,
        "data-disabled": s.disabled ? "" : undefined,
      }
    },
  })
}
