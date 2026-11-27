import type { JSX } from "@solidjs/web"
import {
  createContext,
  createSignal,
  createUniqueId,
  For,
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
import type {
  TextEditorAdapter,
  TextRange,
  Token,
  TokenInsert,
} from "./trigger-menu"

export type { TextEditorAdapter, TextRange, Token, TokenInsert }

export type TokenDeletion = {
  token: Token
  reason: "backspace" | "remove" | "programmatic"
}

export type TokenInputValue = {
  text: string
  tokens: Token[]
}

export type TokenCodec = {
  serialize: (value: TokenInputValue) => string
  deserialize: (text: string) => TokenInputValue
}

export type UndoStackOptions = {
  maxEntries?: number
}

export type TokenInputValueChangeReason =
  | "input"
  | "insert"
  | "delete"
  | "clear"
  | "undo"
  | "redo"
  | "programmatic"

export type TokenInputChangeOptions = ChangeOptions<TokenInputValueChangeReason>

export type TokenInputValueChangeDetails = ChangeDetails<TokenInputValueChangeReason> & {
  deleted?: TokenDeletion
}

export type TokenInputSubmitDetails = {
  value: TokenInputValue
  text: string
  event?: Event
}

export type TokenInputApi = {
  setValue: (value: TokenInputValue, options?: TokenInputChangeOptions) => void
  setText: (text: string, options?: TokenInputChangeOptions) => void
  insertToken: (token: TokenInsert) => Token
  removeToken: (id: string) => void
  clear: () => void
  undo: () => void
  redo: () => void
  submit: () => void
  focus: () => void
  getValue: () => TokenInputValue
  adapter: TextEditorAdapter
}

export function createTokenInputController() {
  return createController<TokenInputApi>()
}

export type TokenInputController = ReturnType<typeof createTokenInputController>

export type TokenInputOptions = {
  value?: TokenInputValue
  defaultValue?: TokenInputValue
  onValueChange?: (value: TokenInputValue, details: TokenInputValueChangeDetails) => void
  onSubmit?: (details: TokenInputSubmitDetails) => void
  codec?: TokenCodec
  undo?: boolean | UndoStackOptions
  multiline?: boolean
  disabled?: boolean
  readOnly?: boolean
  invalid?: boolean
  placeholder?: string
  name?: string
  controller?: TokenInputController
  debug?: boolean
}

export type TokenInputProps = TokenInputOptions &
  Omit<
    PartProps<"div", TokenInputEditorState>,
    keyof TokenInputOptions | "defaultValue" | "onChange" | "onSubmit"
  >

export type TokenInputEditorProps = {
  placeholder?: string
}

export type TokenInputEditorState = {
  value: TokenInputValue
  text: string
  tokens: Token[]
  empty: boolean
  focused: boolean
  disabled: boolean
  readOnly: boolean
  invalid: boolean
  canUndo: boolean
  canRedo: boolean
}

export type TokenInputTokenProps = {
  token?: Token
}

export type TokenInputTokenState = {
  token: Token
  disabled: boolean
}

export const defaultCodec: TokenCodec = {
  serialize: (val) => toText(val),
  deserialize: (text) => fromText(text),
}

export function fromText(text: string): TokenInputValue {
  return { text, tokens: [] }
}

export function toLabel(token: Pick<Token, "label" | "value">): string {
  return token.label || token.value || ""
}

export function toText(value: TokenInputValue): string {
  const tokenText = value.tokens.map((t) => toLabel(t)).join(" ")
  if (!tokenText) return value.text
  if (!value.text) return tokenText
  return `${tokenText} ${value.text}`
}

type TokenInputContextValue = {
  id: string
  state: () => TokenInputEditorState
  api: TokenInputApi
  placeholder: () => string | undefined
  multiline: () => boolean
  setFocused: (v: boolean) => void
  registerEditor: (el: HTMLInputElement | HTMLTextAreaElement | null) => void
  field: ReturnType<typeof useFieldControl>
}

const TokenInputContext = createContext<TokenInputContextValue | null>(null)
const CurrentTokenContext = createContext<(() => Token) | null>(null)

function useTokenInput(part: string): TokenInputContextValue {
  const ctx = useContext(TokenInputContext)
  if (!ctx) throw new Error(`<TokenInput${part}> must be used inside <TokenInput>.`)
  return ctx
}

export function TokenInput(props: TokenInputProps) {
  const field = useFieldControl()
  const id = field?.controlId ?? `ui-token-input-${createUniqueId()}`

  const [value, setRawValue] = createControlledSignal<TokenInputValue>({
    value: () => props.value,
    defaultValue: () => props.defaultValue ?? { text: "", tokens: [] },
  })

  const [focused, setFocused] = createSignal(false)
  const [undoStack, setUndoStack] = createSignal<TokenInputValue[]>([])
  const [redoStack, setRedoStack] = createSignal<TokenInputValue[]>([])

  let editorEl: HTMLInputElement | HTMLTextAreaElement | null = null
  let rootEl: HTMLElement | null = null
  let tokenSeq = 0

  const disabled = () => !!props.disabled || !!field?.disabled()
  const readOnly = () => !!props.readOnly || !!field?.readOnly()
  const invalid = () => !!props.invalid || !!field?.invalid()
  const maxUndo = () =>
    typeof props.undo === "object" ? (props.undo.maxEntries ?? 50) : props.undo === false ? 0 : 50

  const state = (): TokenInputEditorState => {
    const val = value()
    return {
      value: val,
      text: val.text,
      tokens: val.tokens,
      empty: val.text.length === 0 && val.tokens.length === 0,
      focused: focused(),
      disabled: disabled(),
      readOnly: readOnly(),
      invalid: invalid(),
      canUndo: undoStack().length > 0,
      canRedo: redoStack().length > 0,
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

  const commit = (
    next: TokenInputValue,
    reason: TokenInputValueChangeReason,
    event?: Event,
    deleted?: TokenDeletion,
    recordUndo = true
  ) => {
    const prev = value()
    const details: TokenInputValueChangeDetails = {
      ...createChangeDetails(reason, event),
      deleted,
    }
    props.onValueChange?.(next, details)
    if (details.canceled) return
    if (recordUndo && maxUndo() > 0) {
      setUndoStack((stack) => [...stack.slice(-(maxUndo() - 1)), prev])
      setRedoStack([])
    }
    setRawValue(next)
    field?.setDirty(true)
    emitChange?.({
      key: "value",
      previous: prev,
      value: next,
      reason,
      source: details.source,
    })
  }

  const insertToken = (input: TokenInsert): Token => {
    const token: Token =
      typeof input === "string"
        ? { id: `tok-${++tokenSeq}`, label: input, value: input }
        : { id: input.id || `tok-${++tokenSeq}`, label: input.label, value: input.value }
    const cur = value()
    commit({ text: cur.text, tokens: [...cur.tokens, token] }, "insert")
    return token
  }

  const removeToken = (targetId: string, reason: TokenDeletion["reason"] = "remove") => {
    const cur = value()
    const target = cur.tokens.find((t: Token) => t.id === targetId)
    if (!target) return
    commit(
      { text: cur.text, tokens: cur.tokens.filter((t: Token) => t.id !== targetId) },
      "delete",
      undefined,
      { token: target, reason }
    )
  }

  const adapter: TextEditorAdapter = {
    getValue: () => value().text,
    getCaret: () => editorEl?.selectionStart ?? value().text.length,
    replace: (range, replacement) => {
      const text = value().text
      const nextText = text.slice(0, range.start) + replacement + text.slice(range.end)
      commit({ ...value(), text: nextText }, "input")
    },
  }

  const api: TokenInputApi = {
    setValue: (next, options) => commit(next, options?.reason ?? "programmatic", options?.event),
    setText: (text, options) => commit({ ...value(), text }, options?.reason ?? "input", options?.event),
    insertToken,
    removeToken: (targetId) => removeToken(targetId, "programmatic"),
    clear: () => commit({ text: "", tokens: [] }, "clear"),
    undo: () => {
      const stack = undoStack()
      const prev = stack.at(-1)
      if (!prev) return
      setUndoStack(stack.slice(0, -1))
      setRedoStack((r) => [...r, value()])
      commit(prev, "undo", undefined, undefined, false)
    },
    redo: () => {
      const stack = redoStack()
      const next = stack.at(-1)
      if (!next) return
      setRedoStack(stack.slice(0, -1))
      setUndoStack((u) => [...u, value()])
      commit(next, "redo", undefined, undefined, false)
    },
    submit: () => {
      const val = value()
      const codec = props.codec ?? defaultCodec
      props.onSubmit?.({ value: val, text: codec.serialize(val) })
    },
    focus: () => editorEl?.focus(),
    getValue: () => value(),
    adapter,
  }

  useController(() => props.controller, api)

  const reg = registerComponent({
    component: "token-input",
    getElements: () => [rootEl, editorEl],
    getState: () => ({ text: value().text, tokens: value().tokens.length, disabled: disabled() }),
    getDisabled: disabled,
    actions: {
      setText: (t) => api.setText(String(t ?? "")),
      submit: () => api.submit(),
      clear: () => api.clear(),
    },
  })
  emitChange = reg.emit

  const rest = omit(
    props,
    "value",
    "defaultValue",
    "onValueChange",
    "onSubmit",
    "codec",
    "undo",
    "multiline",
    "disabled",
    "readOnly",
    "invalid",
    "placeholder",
    "name",
    "controller",
    "debug"
  )

  return (
    <TokenInputContext
      value={{
        id,
        state,
        api,
        placeholder: () => props.placeholder,
        multiline: () => !!props.multiline,
        setFocused,
        registerEditor: (el) => {
          editorEl = el
        },
        field,
      }}
    >
      {renderPart("div", rest, state, {
        ref: (el) => {
          rootEl = el
        },
        attrs: () => {
          const s = state()
          return {
            "data-empty": s.empty ? "" : undefined,
            "data-focused": s.focused ? "" : undefined,
            "data-disabled": s.disabled ? "" : undefined,
            "data-readonly": s.readOnly ? "" : undefined,
            "data-invalid": s.invalid ? "" : undefined,
          }
        },
      })}
    </TokenInputContext>
  )
}

export function TokenInputEditor(
  props: TokenInputEditorProps &
    Omit<PartProps<"div", TokenInputEditorState>, keyof TokenInputEditorProps | "children"> & {
      children?: JSX.Element | ((token: Token) => JSX.Element)
    }
) {
  const ctx = useTokenInput("Editor")
  const rest = omit(props, "placeholder", "children")

  const handleKeyDown = (
    e: KeyboardEvent & { currentTarget: HTMLInputElement | HTMLTextAreaElement }
  ) => {
    const s = ctx.state()
    if (s.disabled || s.readOnly) return
    if (
      e.key === "Backspace" &&
      e.currentTarget.selectionStart === 0 &&
      e.currentTarget.selectionEnd === 0 &&
      s.tokens.length > 0
    ) {
      const last = s.tokens.at(-1)
      if (last) {
        e.preventDefault()
        ctx.api.removeToken(last.id)
      }
    } else if (e.key === "Enter" && !e.shiftKey && !ctx.multiline()) {
      e.preventDefault()
      ctx.api.submit()
    } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
      e.preventDefault()
      if (e.shiftKey) ctx.api.redo()
      else ctx.api.undo()
    }
  }

  const combinedProps: PartProps<"div", TokenInputEditorState> = {
    ...rest,
    children: (
      <>
        <For each={ctx.state().tokens}>
          {(token) => (
            <CurrentTokenContext value={() => token}>
              {typeof props.children === "function" ? props.children(token) : props.children}
            </CurrentTokenContext>
          )}
        </For>
        {ctx.multiline() ? (
          <textarea
            ref={(el) => ctx.registerEditor(el)}
            id={ctx.id}
            value={ctx.state().text}
            placeholder={props.placeholder ?? ctx.placeholder()}
            disabled={ctx.state().disabled}
            readonly={ctx.state().readOnly}
            aria-labelledby={ctx.field?.labelId}
            aria-describedby={ctx.field?.describedBy()}
            aria-invalid={ctx.state().invalid ? "true" : undefined}
            onFocus={() => ctx.setFocused(true)}
            onBlur={() => {
              ctx.setFocused(false)
              ctx.field?.setTouched(true)
            }}
            onInput={(e) => ctx.api.setText(e.currentTarget.value, { reason: "input", event: e })}
            onKeyDown={handleKeyDown}
          />
        ) : (
          <input
            ref={(el) => ctx.registerEditor(el)}
            id={ctx.id}
            type="text"
            value={ctx.state().text}
            placeholder={props.placeholder ?? ctx.placeholder()}
            disabled={ctx.state().disabled}
            readonly={ctx.state().readOnly}
            aria-labelledby={ctx.field?.labelId}
            aria-describedby={ctx.field?.describedBy()}
            aria-invalid={ctx.state().invalid ? "true" : undefined}
            onFocus={() => ctx.setFocused(true)}
            onBlur={() => {
              ctx.setFocused(false)
              ctx.field?.setTouched(true)
            }}
            onInput={(e) => ctx.api.setText(e.currentTarget.value, { reason: "input", event: e })}
            onKeyDown={handleKeyDown}
          />
        )}
      </>
    ),
  }

  return renderPart("div", combinedProps, ctx.state, {
    attrs: () => ({
      "data-focused": ctx.state().focused ? "" : undefined,
    }),
    handlers: {
      onClick: () => ctx.api.focus(),
    },
  })
}

export function TokenInputToken(
  props: TokenInputTokenProps & Omit<PartProps<"span", TokenInputTokenState>, keyof TokenInputTokenProps>
) {
  const ctx = useTokenInput("Token")
  const ctxToken = useContext(CurrentTokenContext)
  const getToken = (): Token => {
    const t = props.token ?? ctxToken?.()
    if (!t) {
      throw new Error("<TokenInputToken> must receive a token prop or be rendered inside <TokenInputEditor>.")
    }
    return t
  }
  const tokenState = (): TokenInputTokenState => ({
    token: getToken(),
    disabled: ctx.state().disabled,
  })
  const rest = omit(props, "token")
  const resolvedProps: PartProps<"span", TokenInputTokenState> =
    props.children !== undefined
      ? rest
      : { ...rest, children: (s: TokenInputTokenState) => toLabel(s.token) }

  return (
    <CurrentTokenContext value={getToken}>
      {renderPart("span", resolvedProps, tokenState, {
        attrs: () => {
          const s = tokenState()
          return {
            "data-token-id": s.token.id,
            "data-disabled": s.disabled ? "" : undefined,
          }
        },
      })}
    </CurrentTokenContext>
  )
}

export function TokenInputTokenRemove(
  props: TokenInputTokenProps & Omit<PartProps<"button", TokenInputTokenState>, keyof TokenInputTokenProps>
) {
  const ctx = useTokenInput("TokenRemove")
  const ctxToken = useContext(CurrentTokenContext)
  const getToken = (): Token => {
    const t = props.token ?? ctxToken?.()
    if (!t) throw new Error("<TokenInputTokenRemove> must be inside <TokenInputToken>.")
    return t
  }
  const tokenState = (): TokenInputTokenState => ({
    token: getToken(),
    disabled: ctx.state().disabled || ctx.state().readOnly,
  })
  const rest = omit(props, "token")

  return renderPart("button", rest, tokenState, {
    attrs: () => {
      const s = tokenState()
      return {
        type: "button",
        disabled: s.disabled,
        "aria-label": `Remove ${toLabel(s.token)}`,
        "data-disabled": s.disabled ? "" : undefined,
      }
    },
    handlers: {
      onClick: (e: MouseEvent) => {
        e.stopPropagation()
        ctx.api.removeToken(tokenState().token.id)
      },
    },
  })
}
