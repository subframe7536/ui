import type { JSX } from '@solidjs/web'
import { For, Show, createContext, createSignal, createUniqueId, omit, useContext } from 'solid-js'

import { useFieldControl } from './field'
import { createController, useController } from './foundation/controller'
import { createChangeDetails } from './foundation/details'
import type { ChangeDetails, ChangeOptions } from './foundation/details'
import { useDismissLayer } from './foundation/dismissal'
import { usePopupPosition } from './foundation/popup'
import type { PortalProps, PositionProps, Side } from './foundation/popup'
import { registerComponent } from './foundation/registry'
import { SafePortal, renderPart } from './foundation/render'
import type { PartProps } from './foundation/render'
import { createControlledSignal } from './foundation/state'
import { defaultListFilter } from './listbox'
import type {
  ListAnnouncement,
  ListData,
  ListFilter,
  ListGroup,
  ListHighlightDetails,
  ListItem,
  ListSeparator,
  MatchSegment,
  SearchFilter,
} from './listbox'

export type {
  ListAnnouncement,
  ListData,
  ListFilter,
  ListGroup,
  ListHighlightDetails,
  ListItem,
  ListSeparator,
  MatchSegment,
  SearchFilter,
}

export type AutocompleteOpenChangeReason =
  | 'input-focus'
  | 'input-change'
  | 'trigger-press'
  | 'item-press'
  | 'escape-key'
  | 'outside-press'
  | 'programmatic'
export type AutocompleteDismissReason = 'escape-key' | 'outside-press'
export type AutocompleteValueChangeReason = 'input' | 'item-press' | 'clear' | 'programmatic'
export type AutocompleteChangeOptions = ChangeOptions<AutocompleteValueChangeReason>

export type AutocompleteValueChangeDetails = ChangeDetails<AutocompleteValueChangeReason> & {
  itemValue?: string
}

export type AutocompleteSubmitDetails = {
  value: string
  event?: Event
}

export type AutocompleteApi = {
  open: () => void
  close: () => void
  setValue: (value: string, options?: AutocompleteChangeOptions) => void
  clear: () => void
  focus: () => void
  getValue: () => string
  isOpen: () => boolean
}

export function createAutocompleteController() {
  return createController<AutocompleteApi>()
}

export type AutocompleteController = ReturnType<typeof createAutocompleteController>

export type AutocompleteOptions = {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string, details: AutocompleteValueChangeDetails) => void
  onSubmit?: (details: AutocompleteSubmitDetails) => void
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean, details: ChangeDetails<AutocompleteOpenChangeReason>) => void
  disabled?: boolean
  readOnly?: boolean
  required?: boolean
  invalid?: boolean
  placeholder?: string
  name?: string
  filter?: SearchFilter
  items?: Array<string | ListData[number]>
  controller?: AutocompleteController
  debug?: boolean
}

export type AutocompleteState = {
  value: string
  open: boolean
  highlightedValue: string | null
  empty: boolean
  disabled: boolean
  readOnly: boolean
  invalid: boolean
}

export type AutocompletePrimitive = AutocompleteState
export type AutocompleteProps = AutocompleteOptions & { children?: JSX.Element }
export type AutocompleteInputState = AutocompleteState
export type AutocompleteTriggerState = AutocompleteState
export type AutocompleteClearProps = { disabled?: boolean }
export type AutocompleteClearState = AutocompleteState
export type AutocompleteContentProps = PositionProps & PortalProps & { keepMounted?: boolean }
export type AutocompleteContentState = AutocompleteState & { side: Side }
export type AutocompleteArrowState = { side: Side }
export type AutocompleteItemProps = {
  value: string
  label?: string
  keywords?: Array<string>
  disabled?: boolean
}
export type AutocompleteItemState = {
  value: string
  label: string
  highlighted: boolean
  disabled: boolean
  visible: boolean
}
export type AutocompleteItemTextState = AutocompleteItemState
export type AutocompleteItemIconProps = object
export type AutocompleteItemIconState = AutocompleteItemState
export type AutocompleteEmptyState = AutocompleteState
export type AutocompleteStatusState = AutocompleteState & { count: number }

type RegisteredAutocompleteOption = {
  value: string
  label: string
  keywords?: Array<string>
  disabled: boolean
}

type AutocompleteContextValue = {
  id: string
  listId: string
  labelId: string
  state: () => AutocompleteState
  api: AutocompleteApi
  setOpen: (next: boolean, reason: AutocompleteOpenChangeReason, event?: Event) => void
  setValue: (
    next: string,
    reason: AutocompleteValueChangeReason,
    event?: Event,
    itemValue?: string,
  ) => void
  submit: (event?: Event) => void
  isItemVisible: (label: string, keywords?: Array<string>) => boolean
  setHighlighted: (val: string | null) => void
  moveHighlight: (delta: 1 | -1) => void
  registerOption: (opt: RegisteredAutocompleteOption) => () => void
  getOptions: () => Array<RegisteredAutocompleteOption>
  placeholder: () => string | undefined
  name: () => string | undefined
  required: () => boolean
  items: () => ListData | undefined
  inputEl: () => HTMLInputElement | null
  setInputEl: (el: HTMLInputElement | null) => void
  contentEl: () => HTMLElement | null
  setContentEl: (el: HTMLElement | null) => void
  arrowEl: () => HTMLElement | null
  setArrowEl: (el: HTMLElement | null) => void
  field: ReturnType<typeof useFieldControl>
}

const AutocompleteContext = createContext<AutocompleteContextValue | null>(null)
const AutocompleteItemContext = createContext<(() => AutocompleteItemState) | null>(null)
const AutocompleteGroupLabelIdContext = createContext<string | undefined>(undefined)

function useAutocomplete(part: string): AutocompleteContextValue {
  const ctx = useContext(AutocompleteContext)
  if (!ctx) {
    throw new Error(`<Autocomplete${part}> must be used inside <Autocomplete>.`)
  }
  return ctx
}

export function Autocomplete(props: AutocompleteProps) {
  const field = useFieldControl()
  const uid = createUniqueId()
  const id = field?.controlId ?? `ui-autocomplete-${uid}`
  const listId = `ui-autocomplete-list-${uid}`
  const labelId = field?.labelId ?? `ui-autocomplete-label-${uid}`

  const [value, setRawValue] = createControlledSignal<string>({
    value: () => props.value,
    defaultValue: () => props.defaultValue ?? '',
  })
  const [open, setRawOpen] = createControlledSignal<boolean>({
    value: () => props.open,
    defaultValue: () => !!props.defaultOpen,
  })
  const [highlighted, setHighlighted] = createSignal<string | null>(null)
  const [inputEl, setInputEl] = createSignal<HTMLInputElement | null>(null)
  const [contentEl, setContentEl] = createSignal<HTMLElement | null>(null)
  const [arrowEl, setArrowEl] = createSignal<HTMLElement | null>(null)

  const optionList: Array<RegisteredAutocompleteOption> = []

  const disabled = () => !!props.disabled || !!field?.disabled()
  const readOnly = () => !!props.readOnly || !!field?.readOnly()
  const invalid = () => !!props.invalid || !!field?.invalid()
  const filterFn = () => props.filter ?? defaultListFilter

  const state = (): AutocompleteState => ({
    value: value(),
    open: open(),
    highlightedValue: highlighted(),
    empty: value().length === 0,
    disabled: disabled(),
    readOnly: readOnly(),
    invalid: invalid(),
  })

  const emitRef: {
    fn?: (change: {
      key: string
      previous: unknown
      value: unknown
      reason: string
      source: ChangeDetails['source']
    }) => void
  } = {}

  const setOpen = (next: boolean, reason: AutocompleteOpenChangeReason, event?: Event) => {
    if (next && disabled()) {
      return
    }
    const prev = open()
    if (prev === next) {
      return
    }
    const details = createChangeDetails(reason, event)
    props.onOpenChange?.(next, details)
    if (details.canceled) {
      return
    }
    setRawOpen(next)
    emitRef.fn?.({ key: 'open', previous: prev, value: next, reason, source: details.source })
  }

  const setValue = (
    next: string,
    reason: AutocompleteValueChangeReason,
    event?: Event,
    itemValue?: string,
  ) => {
    const prev = value()
    const details: AutocompleteValueChangeDetails = {
      ...createChangeDetails(reason, event),
      itemValue,
    }
    props.onValueChange?.(next, details)
    if (details.canceled) {
      return
    }
    setRawValue(next)
    field?.setDirty(true)
    emitRef.fn?.({ key: 'value', previous: prev, value: next, reason, source: details.source })
  }

  const isItemVisible = (label: string, keywords?: Array<string>) => {
    const q = value()
    if (!q) {
      return true
    }
    return filterFn()(label, q, keywords)
  }

  const moveHighlight = (delta: 1 | -1) => {
    const visible = optionList.filter((o) => !o.disabled && isItemVisible(o.label, o.keywords))
    if (visible.length === 0) {
      return
    }
    const idx = visible.findIndex((o) => o.value === highlighted())
    let nextIdx = idx === -1 ? (delta === 1 ? 0 : visible.length - 1) : idx + delta
    if (nextIdx < 0) {
      nextIdx = visible.length - 1
    }
    if (nextIdx >= visible.length) {
      nextIdx = 0
    }
    setHighlighted(visible[nextIdx]?.value ?? null)
  }

  const submit = (event?: Event) => {
    props.onSubmit?.({ value: value(), event })
    setOpen(false, 'programmatic', event)
  }

  const api: AutocompleteApi = {
    open: () => setOpen(true, 'programmatic'),
    close: () => setOpen(false, 'programmatic'),
    setValue: (next, opts) => setValue(next, opts?.reason ?? 'programmatic', opts?.event),
    clear: () => setValue('', 'clear'),
    focus: () => inputEl()?.focus(),
    getValue: () => value(),
    isOpen: () => open(),
  }

  useController(() => props.controller, api)

  const reg = registerComponent({
    component: 'autocomplete',
    getElements: () => [inputEl(), contentEl()],
    getState: () => ({ value: value(), open: open(), disabled: disabled() }),
    getItems: () => optionList.map((o) => ({ value: o.value, label: o.label })),
    getDisabled: disabled,
    actions: {
      setValue: (v) =>
        api.setValue(typeof v === 'string' ? v : typeof v === 'number' ? String(v) : ''),
      clear: () => api.clear(),
    },
  })
  emitRef.fn = reg.emit

  useDismissLayer({
    active: open,
    getElements: () => [inputEl(), contentEl()],
    onDismiss: (reason, event) => {
      setOpen(false, reason === 'escape-key' ? 'escape-key' : 'outside-press', event)
    },
  })

  const registerOption = (opt: RegisteredAutocompleteOption) => {
    optionList.push(opt)
    return () => {
      const idx = optionList.indexOf(opt)
      if (idx >= 0) {
        optionList.splice(idx, 1)
      }
    }
  }

  return (
    <AutocompleteContext
      value={{
        id,
        listId,
        labelId,
        state,
        api,
        setOpen,
        setValue,
        submit,
        isItemVisible,
        setHighlighted,
        moveHighlight,
        registerOption,
        getOptions: () => optionList,
        placeholder: () => props.placeholder,
        name: () => props.name ?? field?.name(),
        required: () => !!props.required || !!field?.required(),
        items: () =>
          props.items?.map((entry) =>
            typeof entry === 'string' ? { value: entry, label: entry } : entry,
          ),
        inputEl,
        setInputEl,
        contentEl,
        setContentEl,
        arrowEl,
        setArrowEl,
        field,
      }}
    >
      {props.children}
    </AutocompleteContext>
  )
}

export function AutocompleteLabel(props: PartProps<'label', AutocompleteState>) {
  const ctx = useAutocomplete('Label')
  return renderPart('label', props, ctx.state, {
    attrs: () => ({ id: props.id ?? ctx.labelId, for: ctx.id }),
  })
}

export function AutocompleteInput(
  props: Omit<PartProps<'input', AutocompleteInputState>, 'type' | 'value'>,
) {
  const ctx = useAutocomplete('Input')
  return renderPart('input', props, ctx.state, {
    ref: (el: HTMLInputElement) => ctx.setInputEl(el),
    attrs: () => {
      const s = ctx.state()
      return {
        id: ctx.id,
        type: 'text',
        role: 'combobox',
        autocomplete: 'off',
        value: s.value,
        placeholder: props.placeholder ?? ctx.placeholder(),
        name: props.name ?? ctx.name(),
        required: props.required ?? (ctx.required() || undefined),
        disabled: s.disabled,
        readonly: s.readOnly,
        'aria-expanded': s.open ? 'true' : 'false',
        'aria-autocomplete': 'list',
        'aria-controls': ctx.listId,
        'aria-labelledby': ctx.labelId,
        'aria-describedby': ctx.field?.describedBy(),
        'aria-invalid': s.invalid ? 'true' : undefined,
        'data-open': s.open ? '' : undefined,
      }
    },
    handlers: {
      onFocus: (e: FocusEvent) => {
        if (!ctx.state().disabled) {
          ctx.setOpen(true, 'input-focus', e)
        }
      },
      onInput: (e: InputEvent & { currentTarget: HTMLInputElement }) => {
        ctx.setValue(e.currentTarget.value, 'input', e)
        if (!ctx.state().open) {
          ctx.setOpen(true, 'input-change', e)
        }
      },
      onKeyDown: (e: KeyboardEvent) => {
        const s = ctx.state()
        if (s.disabled) {
          return
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          if (!s.open) {
            ctx.setOpen(true, 'input-change', e)
          }
          ctx.moveHighlight(1)
        } else if (e.key === 'ArrowUp') {
          e.preventDefault()
          if (!s.open) {
            ctx.setOpen(true, 'input-change', e)
          }
          ctx.moveHighlight(-1)
        } else if (e.key === 'Enter') {
          if (s.open && s.highlightedValue) {
            e.preventDefault()
            const opt = ctx.getOptions().find((o) => o.value === s.highlightedValue)
            ctx.setValue(opt?.label ?? s.highlightedValue, 'item-press', e, s.highlightedValue)
            ctx.setOpen(false, 'item-press', e)
          } else {
            ctx.submit(e)
          }
        }
      },
    },
  })
}

export function AutocompleteTrigger(
  props: Omit<PartProps<'button', AutocompleteTriggerState>, 'type'>,
) {
  const ctx = useAutocomplete('Trigger')
  return renderPart('button', props, ctx.state, {
    attrs: () => ({
      type: 'button',
      tabindex: -1,
      disabled: ctx.state().disabled,
      'aria-expanded': ctx.state().open ? 'true' : 'false',
    }),
    handlers: {
      onClick: (e: MouseEvent) => ctx.setOpen(!ctx.state().open, 'trigger-press', e),
    },
  })
}

export function AutocompleteClear(
  props: AutocompleteClearProps &
    Omit<PartProps<'button', AutocompleteClearState>, keyof AutocompleteClearProps | 'type'>,
) {
  const ctx = useAutocomplete('Clear')
  const rest = omit(props, 'disabled')
  return (
    <Show when={!ctx.state().empty}>
      {renderPart('button', rest, ctx.state, {
        attrs: () => ({
          type: 'button',
          disabled: !!props.disabled || ctx.state().disabled,
          'aria-label': 'Clear',
        }),
        handlers: {
          onClick: () => ctx.api.clear(),
        },
      })}
    </Show>
  )
}

export function AutocompleteContent(
  props: AutocompleteContentProps &
    Omit<PartProps<'div', AutocompleteContentState>, keyof AutocompleteContentProps>,
) {
  const ctx = useAutocomplete('Content')
  const pos = usePopupPosition({
    open: () => ctx.state().open,
    reference: () => ctx.inputEl() ?? undefined,
    floating: () => ctx.contentEl() ?? undefined,
    arrow: () => ctx.arrowEl() ?? undefined,
    side: () => props.side ?? 'bottom',
    align: () => props.align ?? 'start',
    sideOffset: () => props.sideOffset ?? 4,
    alignOffset: () => props.alignOffset ?? 0,
    collisionPadding: () => props.collisionPadding ?? 8,
  })

  const contentState = (): AutocompleteContentState => ({
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

  return (
    <Show when={ctx.state().open || !!props.keepMounted}>
      <SafePortal mount={props.container ?? undefined}>
        {renderPart('div', rest, contentState, {
          ref: (el: HTMLElement) => ctx.setContentEl(el),
          attrs: () => ({
            'data-slot': 'autocomplete-content',
            'data-open': ctx.state().open ? '' : undefined,
            'data-side': pos.side(),
          }),
          style: () => ({
            ...pos.style(),
            display: ctx.state().open ? undefined : 'none',
          }),
        })}
      </SafePortal>
    </Show>
  )
}

export function AutocompleteArrow(props: PartProps<'div', AutocompleteArrowState>) {
  const ctx = useAutocomplete('Arrow')
  return renderPart('div', props, () => ({ side: 'bottom' as Side }), {
    ref: (el: HTMLElement) => ctx.setArrowEl(el),
    attrs: () => ({ 'aria-hidden': true }),
  })
}

export function AutocompleteList(props: PartProps<'div', AutocompleteState>) {
  const ctx = useAutocomplete('List')
  return renderPart('div', props, ctx.state, {
    attrs: () => ({ id: ctx.listId, role: 'listbox' }),
  })
}

export function AutocompleteItems(props: {
  items?: ListData
  renderItem?: (item: ListItem) => JSX.Element
}) {
  const ctx = useAutocomplete('Items')
  const list = () => props.items ?? ctx.items() ?? []
  return (
    <For each={list()}>
      {(entry) => {
        if (entry.type === 'separator') {
          return <AutocompleteSeparator />
        }
        if (entry.type === 'group') {
          return (
            <AutocompleteGroup>
              <AutocompleteGroupLabel>{entry.label}</AutocompleteGroupLabel>
              <For each={entry.items}>
                {(sub) => {
                  if (sub.type === 'separator') {
                    return <AutocompleteSeparator />
                  }
                  return props.renderItem ? (
                    props.renderItem(sub)
                  ) : (
                    <AutocompleteItem
                      value={sub.value}
                      label={sub.label}
                      keywords={sub.keywords}
                      disabled={sub.disabled}
                    >
                      <AutocompleteItemText>{sub.label ?? sub.value}</AutocompleteItemText>
                    </AutocompleteItem>
                  )
                }}
              </For>
            </AutocompleteGroup>
          )
        }
        return props.renderItem ? (
          props.renderItem(entry)
        ) : (
          <AutocompleteItem
            value={entry.value}
            label={entry.label}
            keywords={entry.keywords}
            disabled={entry.disabled}
          >
            <AutocompleteItemText>{entry.label ?? entry.value}</AutocompleteItemText>
          </AutocompleteItem>
        )
      }}
    </For>
  )
}

export function AutocompleteGroup(props: PartProps<'div', AutocompleteState>) {
  const ctx = useAutocomplete('Group')
  const labelId = `ui-autocomplete-group-${createUniqueId()}`
  return (
    <AutocompleteGroupLabelIdContext value={labelId}>
      {renderPart('div', props, ctx.state, {
        attrs: () => ({ role: 'group', 'aria-labelledby': labelId }),
      })}
    </AutocompleteGroupLabelIdContext>
  )
}

export function AutocompleteGroupLabel(props: PartProps<'div', AutocompleteState>) {
  const ctx = useAutocomplete('GroupLabel')
  const labelId = useContext(AutocompleteGroupLabelIdContext)
  return renderPart('div', props, ctx.state, {
    attrs: () => ({ id: props.id ?? labelId, role: 'presentation' }),
  })
}

export function AutocompleteSeparator(props: PartProps<'div', AutocompleteState>) {
  const ctx = useAutocomplete('Separator')
  return renderPart('div', props, ctx.state, { attrs: () => ({ role: 'separator' }) })
}

export function AutocompleteItem(
  props: AutocompleteItemProps &
    Omit<PartProps<'div', AutocompleteItemState>, keyof AutocompleteItemProps>,
) {
  const ctx = useAutocomplete('Item')
  let cleanup: (() => void) | undefined
  const label = () => props.label ?? props.value

  const itemState = (): AutocompleteItemState => ({
    value: props.value,
    label: label(),
    highlighted: ctx.state().highlightedValue === props.value,
    disabled: ctx.state().disabled || !!props.disabled,
    visible: ctx.isItemVisible(label(), props.keywords),
  })

  const rest = omit(props, 'value', 'label', 'keywords', 'disabled')

  return (
    <Show when={itemState().visible}>
      <AutocompleteItemContext value={itemState}>
        {renderPart('div', rest, itemState, {
          ref: (el: HTMLElement | null) => {
            cleanup?.()
            if (el) {
              cleanup = ctx.registerOption({
                value: props.value,
                label: props.label ?? el.textContent?.trim() ?? props.value,
                keywords: props.keywords,
                disabled: !!props.disabled,
              })
            }
          },
          attrs: () => {
            const s = itemState()
            return {
              role: 'option',
              'aria-disabled': s.disabled ? 'true' : undefined,
              'data-value': s.value,
              'data-highlighted': s.highlighted ? '' : undefined,
              'data-disabled': s.disabled ? '' : undefined,
            }
          },
          handlers: {
            onPointerMove: () => {
              if (!itemState().disabled) {
                ctx.setHighlighted(props.value)
              }
            },
            onClick: (e: MouseEvent) => {
              if (itemState().disabled) {
                return
              }
              ctx.setValue(itemState().label, 'item-press', e, props.value)
              ctx.setOpen(false, 'item-press', e)
            },
          },
        })}
      </AutocompleteItemContext>
    </Show>
  )
}

export function AutocompleteItemText(props: PartProps<'span', AutocompleteItemTextState>) {
  const itemState = useContext(AutocompleteItemContext)
  if (!itemState) {
    throw new Error('<AutocompleteItemText> must be used inside <AutocompleteItem>.')
  }
  return renderPart('span', props, itemState)
}

export function AutocompleteItemIcon(
  props: AutocompleteItemIconProps & PartProps<'span', AutocompleteItemIconState>,
) {
  const itemState = useContext(AutocompleteItemContext)
  if (!itemState) {
    throw new Error('<AutocompleteItemIcon> must be used inside <AutocompleteItem>.')
  }
  return renderPart('span', props, itemState, { attrs: () => ({ 'aria-hidden': true }) })
}

export function AutocompleteEmpty(props: PartProps<'div', AutocompleteEmptyState>) {
  const ctx = useAutocomplete('Empty')
  const hasVisible = () => ctx.getOptions().some((o) => ctx.isItemVisible(o.label, o.keywords))
  return (
    <Show when={!hasVisible()}>
      {renderPart('div', props, ctx.state, { attrs: () => ({ role: 'status' }) })}
    </Show>
  )
}

export function AutocompleteStatus(props: PartProps<'div', AutocompleteStatusState>) {
  const ctx = useAutocomplete('Status')
  const statusState = (): AutocompleteStatusState => ({
    ...ctx.state(),
    count: ctx.getOptions().filter((o) => ctx.isItemVisible(o.label, o.keywords)).length,
  })
  return renderPart('div', props, statusState, {
    attrs: () => ({ role: 'status', 'aria-live': 'polite' }),
  })
}
