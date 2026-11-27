import type { JSX } from '@solidjs/web'
import {
  For,
  Show,
  createContext,
  createSignal,
  createUniqueId,
  merge,
  omit,
  useContext,
} from 'solid-js'

import { createController, useController } from './foundation/controller'
import { createChangeDetails } from './foundation/details'
import type { ChangeDetails, ChangeOptions } from './foundation/details'
import { registerComponent } from './foundation/registry'
import { renderPart } from './foundation/render'
import type { PartProps } from './foundation/render'
import { createControlledSignal } from './foundation/state'
import { defaultListFilter } from './listbox'
import type { ListAnnouncement, ListSeparator, MatchSegment, SearchFilter } from './listbox'

export type { ListAnnouncement, MatchSegment, SearchFilter }

export type CommandQueryChangeReason = 'input' | 'clear' | 'page-change' | 'programmatic'
export type CommandPagesChangeReason = 'push' | 'pop' | 'reset' | 'programmatic'
export type CommandValueChangeReason = 'item-press' | 'keyboard' | 'programmatic'
export type CommandChangeOptions = ChangeOptions<CommandValueChangeReason>

export type CommandActionDetails = {
  value: string
  event?: Event
}

export type CommandValueChangeDetails = ChangeDetails<CommandValueChangeReason>

export type CommandDataItem = {
  type?: 'item'
  value: string
  label: string
  keywords?: Array<string>
  shortcut?: string | Array<string>
  disabled?: boolean
  onSelect?: (details: CommandActionDetails) => void
}

export type CommandDataGroup = {
  type: 'group'
  label: string
  items: Array<CommandDataItem | ListSeparator>
}

export type CommandData = Array<CommandDataItem | CommandDataGroup | ListSeparator>

export type CommandApi = {
  setQuery: (query: string) => void
  clearQuery: () => void
  pushPage: (page: string) => void
  popPage: () => void
  setPages: (pages: Array<string>) => void
  highlight: (value: string | null) => void
  selectHighlighted: () => void
  focus: () => void
  getQuery: () => string
  getPages: () => Array<string>
}

export function createCommandController() {
  return createController<CommandApi>()
}

export type CommandController = ReturnType<typeof createCommandController>

export type CommandOptions = {
  query?: string
  defaultQuery?: string
  onQueryChange?: (query: string, details: ChangeDetails<CommandQueryChangeReason>) => void
  pages?: Array<string>
  defaultPages?: Array<string>
  onPagesChange?: (pages: Array<string>, details: ChangeDetails<CommandPagesChangeReason>) => void
  onSelect?: (details: CommandActionDetails) => void
  filter?: SearchFilter
  loop?: boolean
  items?: CommandData
  controller?: CommandController
  debug?: boolean
}

export type CommandState = {
  query: string
  pages: Array<string>
  page: string | undefined
  highlightedValue: string | null
  empty: boolean
}

export type CommandPrimitive = CommandState
export type CommandProps = CommandOptions &
  Omit<PartProps<'div', CommandState>, keyof CommandOptions | 'onSelect'>

export type CommandInputState = CommandState
export type CommandListState = CommandState
export type CommandEmptyState = CommandState
export type CommandStatusState = CommandState & { count: number }
export type CommandPageProps = { name: string }
export type CommandItemProps = {
  value: string
  label?: string
  keywords?: Array<string>
  disabled?: boolean
  onSelect?: (details: CommandActionDetails) => void
}
export type CommandItemState = {
  value: string
  label: string
  highlighted: boolean
  disabled: boolean
  visible: boolean
}
export type CommandItemTextState = CommandItemState
export type CommandItemIconProps = object
export type CommandItemIconState = CommandItemState
export type CommandShortcutProps = { keys?: string | Array<string> }
export type CommandShortcutState = CommandItemState

type RegisteredCommandItem = {
  value: string
  label: string
  keywords?: Array<string>
  disabled: boolean
  onSelect?: (details: CommandActionDetails) => void
}

type CommandContextValue = {
  listId: string
  state: () => CommandState
  api: CommandApi
  setQuery: (q: string, reason: CommandQueryChangeReason, event?: Event) => void
  isItemVisible: (label: string, keywords?: Array<string>) => boolean
  setHighlighted: (val: string | null) => void
  moveHighlight: (delta: 1 | -1) => void
  triggerSelect: (value: string, event?: Event) => void
  registerItem: (item: RegisteredCommandItem) => () => void
  getItems: () => Array<RegisteredCommandItem>
  items: () => CommandData | undefined
  setInputEl: (el: HTMLInputElement | null) => void
}

const CommandContext = createContext<CommandContextValue | null>(null)
const CommandItemContext = createContext<(() => CommandItemState) | null>(null)
const CommandGroupLabelIdContext = createContext<string | undefined>(undefined)

function useCommand(part: string): CommandContextValue {
  const ctx = useContext(CommandContext)
  if (!ctx) {
    throw new Error(`<Command${part}> must be used inside <Command>.`)
  }
  return ctx
}

export function Command(props: CommandProps) {
  const listId = `ui-command-list-${createUniqueId()}`

  const [query, setRawQuery] = createControlledSignal<string>({
    value: () => props.query,
    defaultValue: () => props.defaultQuery ?? '',
  })
  const [pages, setRawPages] = createControlledSignal<Array<string>>({
    value: () => props.pages,
    defaultValue: () => props.defaultPages ?? [],
  })
  const [highlighted, setHighlighted] = createSignal<string | null>(null)

  let rootEl: HTMLElement | null = null
  let inputEl: HTMLInputElement | null = null
  const registered: Array<RegisteredCommandItem> = []

  const filterFn = () => props.filter ?? defaultListFilter

  const isItemVisible = (label: string, keywords?: Array<string>) => {
    const q = query()
    if (!q) {
      return true
    }
    return filterFn()(label, q, keywords)
  }

  const state = (): CommandState => {
    const visibleCount = registered.filter((i) => isItemVisible(i.label, i.keywords)).length
    return {
      query: query(),
      pages: pages(),
      page: pages().at(-1),
      highlightedValue: highlighted(),
      empty: visibleCount === 0,
    }
  }

  const setQuery = (next: string, reason: CommandQueryChangeReason, event?: Event) => {
    const details = createChangeDetails(reason, event)
    props.onQueryChange?.(next, details)
    if (details.canceled) {
      return
    }
    setRawQuery(next)
  }

  const setPages = (next: Array<string>, reason: CommandPagesChangeReason, event?: Event) => {
    const details = createChangeDetails(reason, event)
    props.onPagesChange?.(next, details)
    if (details.canceled) {
      return
    }
    setRawPages(next)
    setQuery('', 'page-change', event)
  }

  const moveHighlight = (delta: 1 | -1) => {
    const visible = registered.filter((i) => !i.disabled && isItemVisible(i.label, i.keywords))
    if (visible.length === 0) {
      return
    }
    const idx = visible.findIndex((i) => i.value === highlighted())
    const loop = props.loop ?? true
    let nextIdx = idx === -1 ? (delta === 1 ? 0 : visible.length - 1) : idx + delta
    if (nextIdx < 0) {
      nextIdx = loop ? visible.length - 1 : 0
    }
    if (nextIdx >= visible.length) {
      nextIdx = loop ? 0 : visible.length - 1
    }
    setHighlighted(visible[nextIdx]?.value ?? null)
  }

  const triggerSelect = (val: string, event?: Event) => {
    const item = registered.find((i) => i.value === val)
    if (item?.disabled) {
      return
    }
    const details: CommandActionDetails = { value: val, event }
    item?.onSelect?.(details)
    props.onSelect?.(details)
  }

  const api: CommandApi = {
    setQuery: (q) => setQuery(q, 'programmatic'),
    clearQuery: () => setQuery('', 'clear'),
    pushPage: (page) => setPages([...pages(), page], 'push'),
    popPage: () => {
      if (pages().length > 0) {
        setPages(pages().slice(0, -1), 'pop')
      }
    },
    setPages: (next) => setPages(next, 'programmatic'),
    highlight: (val) => setHighlighted(val),
    selectHighlighted: () => {
      const cur = highlighted()
      if (cur !== null) {
        triggerSelect(cur)
      }
    },
    focus: () => inputEl?.focus(),
    getQuery: () => query(),
    getPages: () => pages(),
  }

  useController(() => props.controller, api)

  registerComponent({
    component: 'command',
    getElements: () => [rootEl, inputEl],
    getState: () => ({ query: query(), pages: pages(), highlighted: highlighted() }),
    getItems: () => registered.map((i) => ({ value: i.value, label: i.label })),
    actions: {
      setQuery: (q) =>
        api.setQuery(typeof q === 'string' ? q : typeof q === 'number' ? String(q) : ''),
      select: (v) => triggerSelect(String(v)),
    },
  })

  const registerItem = (item: RegisteredCommandItem) => {
    registered.push(item)
    return () => {
      const idx = registered.indexOf(item)
      if (idx >= 0) {
        registered.splice(idx, 1)
      }
    }
  }

  const rest = omit(
    props,
    'query',
    'defaultQuery',
    'onQueryChange',
    'pages',
    'defaultPages',
    'onPagesChange',
    'onSelect',
    'filter',
    'loop',
    'items',
    'controller',
    'debug',
  )

  return (
    <CommandContext
      value={{
        listId,
        state,
        api,
        setQuery,
        isItemVisible,
        setHighlighted,
        moveHighlight,
        triggerSelect,
        registerItem,
        getItems: () => registered,
        items: () => props.items,
        setInputEl: (el) => {
          inputEl = el
        },
      }}
    >
      {renderPart('div', rest, state, {
        ref: (el) => {
          rootEl = el
        },
        attrs: () => ({
          'data-page': state().page,
          'data-empty': state().empty ? '' : undefined,
        }),
      })}
    </CommandContext>
  )
}

export function CommandInput(props: Omit<PartProps<'input', CommandInputState>, 'type' | 'value'>) {
  const ctx = useCommand('Input')
  return renderPart('input', props, ctx.state, {
    ref: (el: HTMLInputElement) => ctx.setInputEl(el),
    attrs: () => ({
      type: 'text',
      role: 'combobox',
      autocomplete: 'off',
      value: ctx.state().query,
      'aria-expanded': 'true',
      'aria-autocomplete': 'list',
      'aria-controls': ctx.listId,
    }),
    handlers: {
      onInput: (e: InputEvent & { currentTarget: HTMLInputElement }) => {
        ctx.setQuery(e.currentTarget.value, 'input', e)
      },
      onKeyDown: (e: KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          ctx.moveHighlight(1)
        } else if (e.key === 'ArrowUp') {
          e.preventDefault()
          ctx.moveHighlight(-1)
        } else if (e.key === 'Enter') {
          const highlighted = ctx.state().highlightedValue
          if (highlighted) {
            e.preventDefault()
            ctx.triggerSelect(highlighted, e)
          }
        } else if (
          e.key === 'Backspace' &&
          ctx.state().query === '' &&
          ctx.state().pages.length > 0
        ) {
          e.preventDefault()
          ctx.api.popPage()
        }
      },
    },
  })
}

export function CommandList(props: PartProps<'div', CommandListState>) {
  const ctx = useCommand('List')
  return renderPart('div', props, ctx.state, {
    attrs: () => ({ id: ctx.listId, role: 'listbox' }),
  })
}

export function CommandPage(
  props: CommandPageProps & Omit<PartProps<'div', CommandState>, keyof CommandPageProps>,
) {
  const ctx = useCommand('Page')
  const rest = omit(props, 'name')
  return (
    <Show when={ctx.state().page === props.name}>
      {renderPart('div', rest, ctx.state, {
        attrs: () => ({ 'data-page': props.name }),
      })}
    </Show>
  )
}

export function CommandItems(props: {
  items?: CommandData
  renderItem?: (item: CommandDataItem) => JSX.Element
}) {
  const ctx = useCommand('Items')
  const list = () => props.items ?? ctx.items() ?? []
  return (
    <For each={list()}>
      {(entry) => {
        if (entry.type === 'separator') {
          return <CommandSeparator />
        }
        if (entry.type === 'group') {
          return (
            <CommandGroup>
              <CommandGroupLabel>{entry.label}</CommandGroupLabel>
              <For each={entry.items}>
                {(sub) => {
                  if (sub.type === 'separator') {
                    return <CommandSeparator />
                  }
                  return props.renderItem ? (
                    props.renderItem(sub)
                  ) : (
                    <CommandItem
                      value={sub.value}
                      label={sub.label}
                      keywords={sub.keywords}
                      disabled={sub.disabled}
                      onSelect={sub.onSelect}
                    >
                      <CommandItemText>{sub.label}</CommandItemText>
                      <Show when={sub.shortcut}>
                        <CommandShortcut keys={sub.shortcut} />
                      </Show>
                    </CommandItem>
                  )
                }}
              </For>
            </CommandGroup>
          )
        }
        return props.renderItem ? (
          props.renderItem(entry)
        ) : (
          <CommandItem
            value={entry.value}
            label={entry.label}
            keywords={entry.keywords}
            disabled={entry.disabled}
            onSelect={entry.onSelect}
          >
            <CommandItemText>{entry.label}</CommandItemText>
            <Show when={entry.shortcut}>
              <CommandShortcut keys={entry.shortcut} />
            </Show>
          </CommandItem>
        )
      }}
    </For>
  )
}

export function CommandGroup(props: PartProps<'div', CommandState>) {
  const ctx = useCommand('Group')
  const labelId = `ui-command-group-${createUniqueId()}`
  return (
    <CommandGroupLabelIdContext value={labelId}>
      {renderPart('div', props, ctx.state, {
        attrs: () => ({ role: 'group', 'aria-labelledby': labelId }),
      })}
    </CommandGroupLabelIdContext>
  )
}

export function CommandGroupLabel(props: PartProps<'div', CommandState>) {
  const ctx = useCommand('GroupLabel')
  const labelId = useContext(CommandGroupLabelIdContext)
  return renderPart('div', props, ctx.state, {
    attrs: () => ({ id: props.id ?? labelId, role: 'presentation' }),
  })
}

export function CommandSeparator(props: PartProps<'div', CommandState>) {
  const ctx = useCommand('Separator')
  return renderPart('div', props, ctx.state, { attrs: () => ({ role: 'separator' }) })
}

export function CommandItem(
  props: CommandItemProps &
    Omit<PartProps<'div', CommandItemState>, keyof CommandItemProps | 'onSelect'>,
) {
  const ctx = useCommand('Item')
  let cleanup: (() => void) | undefined
  const label = () => props.label ?? props.value

  const itemState = (): CommandItemState => ({
    value: props.value,
    label: label(),
    highlighted: ctx.state().highlightedValue === props.value,
    disabled: !!props.disabled,
    visible: ctx.isItemVisible(label(), props.keywords),
  })

  const rest = omit(props, 'value', 'label', 'keywords', 'disabled', 'onSelect')

  return (
    <Show when={itemState().visible}>
      <CommandItemContext value={itemState}>
        {renderPart('div', rest, itemState, {
          ref: (el: HTMLElement | null) => {
            cleanup?.()
            if (el) {
              cleanup = ctx.registerItem({
                value: props.value,
                label: props.label ?? el.textContent?.trim() ?? props.value,
                keywords: props.keywords,
                disabled: !!props.disabled,
                onSelect: props.onSelect,
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
              ctx.triggerSelect(props.value, e)
            },
          },
        })}
      </CommandItemContext>
    </Show>
  )
}

export function CommandItemText(props: PartProps<'span', CommandItemTextState>) {
  const itemState = useContext(CommandItemContext)
  if (!itemState) {
    throw new Error('<CommandItemText> must be used inside <CommandItem>.')
  }
  return renderPart('span', props, itemState)
}

export function CommandItemIcon(
  props: CommandItemIconProps & PartProps<'span', CommandItemIconState>,
) {
  const itemState = useContext(CommandItemContext)
  if (!itemState) {
    throw new Error('<CommandItemIcon> must be used inside <CommandItem>.')
  }
  return renderPart('span', props, itemState, { attrs: () => ({ 'aria-hidden': true }) })
}

const fallbackCommandItemState = (): CommandItemState => ({
  value: '',
  label: '',
  highlighted: false,
  disabled: false,
  visible: true,
})

export function CommandShortcut(
  props: CommandShortcutProps &
    Omit<PartProps<'kbd', CommandShortcutState>, keyof CommandShortcutProps>,
) {
  const itemState = useContext(CommandItemContext)
  const state = itemState ?? fallbackCommandItemState
  const rest = omit(props, 'keys')
  const text = () => (Array.isArray(props.keys) ? props.keys.join('+') : (props.keys ?? ''))
  const resolvedProps: PartProps<'kbd', CommandShortcutState> = merge(rest, {
    get children() {
      return props.children ?? text()
    },
  })
  return renderPart('kbd', resolvedProps, state)
}

export function CommandEmpty(props: PartProps<'div', CommandEmptyState>) {
  const ctx = useCommand('Empty')
  const hasVisible = () => ctx.getItems().some((i) => ctx.isItemVisible(i.label, i.keywords))
  return (
    <Show when={!hasVisible()}>
      {renderPart('div', props, ctx.state, { attrs: () => ({ role: 'status' }) })}
    </Show>
  )
}

export function CommandStatus(props: PartProps<'div', CommandStatusState>) {
  const ctx = useCommand('Status')
  const statusState = (): CommandStatusState => ({
    ...ctx.state(),
    count: ctx.getItems().filter((i) => ctx.isItemVisible(i.label, i.keywords)).length,
  })
  return renderPart('div', props, statusState, {
    attrs: () => ({ role: 'status', 'aria-live': 'polite' }),
  })
}
