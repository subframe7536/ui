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
import { formatDisplayShortcut, renderPart } from './foundation/render'
import type { PartProps } from './foundation/render'
import { createControlledSignal } from './foundation/state'
import { getMatchSegments, matchesListFilter } from './listbox'
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

export type CommandValueChangeDetails = ChangeDetails<
  'input' | 'keyboard' | 'pointer' | 'programmatic'
> & {
  index: number
}

export type CommandDataItem = {
  type?: 'item'
  value: string
  label: string
  keywords?: Array<string>
  shortcut?: string | Array<string>
  disabled?: boolean
  items?: CommandData
  onSelect?: (details: CommandActionDetails) => unknown
}

export type CommandDataGroup = {
  type: 'group'
  label: string
  items: CommandData
}

export type CommandData = Array<string | CommandDataItem | CommandDataGroup | ListSeparator>

export type CommandApi = {
  setQuery: (query: string) => void
  clearQuery: () => void
  pushPage: (page: string) => void
  popPage: () => void
  push: (page: string) => void
  pop: () => void
  setPages: (pages: Array<string>) => void
  highlight: (value: string | null) => void
  setValue: (value: string | null) => void
  selectHighlighted: () => void
  run: () => void
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
  value?: string | null
  defaultValue?: string | null
  onValueChange?: (value: string | null, details: CommandValueChangeDetails) => void
  pages?: Array<string>
  defaultPages?: Array<string>
  onPagesChange?: (pages: Array<string>, details: ChangeDetails<CommandPagesChangeReason>) => void
  onSelect?: (details: CommandActionDetails) => void
  onAction?: (value: string, details: CommandActionDetails) => void
  onLoadMore?: () => void
  status?: 'idle' | 'loading' | 'error'
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
  status: 'idle' | 'loading' | 'error'
  loading: boolean
}

export type CommandPrimitive = CommandState
export type CommandProps = CommandOptions &
  Omit<PartProps<'div', CommandState>, keyof CommandOptions | 'onSelect'>

export type CommandInputState = CommandState
export type CommandListState = CommandState & { items: CommandData }
export type CommandEmptyState = CommandState
export type CommandStatusState = CommandState & { count: number }
export type CommandPageProps = { name?: string; value?: string }
export type CommandItemProps = {
  value: string
  page?: string
  index?: number
  shortcut?: string | Array<string>
  label?: string
  keywords?: Array<string>
  disabled?: boolean
  onSelect?: (details: CommandActionDetails) => unknown
}
export type CommandItemState = {
  value: string
  label: string
  shortcut?: string | Array<string>
  highlighted: boolean
  disabled: boolean
  visible: boolean
  pending: boolean
  error: unknown
}
export type CommandItemTextState = CommandItemState & {
  segments: Array<MatchSegment>
}
export type CommandItemIconProps = object
export type CommandItemIconState = CommandItemState
export type CommandShortcutProps = { keys?: string | Array<string> }
export type CommandShortcutState = CommandItemState & { text: string }

type RegisteredCommandItem = {
  value: string
  label: string
  page?: string
  keywords?: Array<string>
  disabled: boolean
  onSelect?: (details: CommandActionDetails) => unknown
}

type CommandContextValue = {
  listId: string
  state: () => CommandState
  api: CommandApi
  setQuery: (q: string, reason: CommandQueryChangeReason, event?: Event) => void
  isItemVisible: (value: string, label: string, keywords?: Array<string>) => boolean
  setHighlighted: (
    val: string | null,
    reason?: 'input' | 'keyboard' | 'pointer' | 'programmatic',
    event?: Event,
  ) => void
  moveHighlight: (delta: 1 | -1) => void
  triggerSelect: (value: string, event?: Event) => void
  registerItem: (item: RegisteredCommandItem) => () => void
  getItems: () => Array<RegisteredCommandItem>
  items: () => CommandData | undefined
  filteredItems: () => CommandData
  isPending: (value: string) => boolean
  getError: (value: string) => unknown
  markComposedList: () => void
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

function findPageData(data: CommandData, page: string): CommandData | undefined {
  for (const entry of data) {
    if (typeof entry === 'string') {
      continue
    }
    if ('type' in entry && entry.type === 'group') {
      const found = findPageData(entry.items, page)
      if (found) {
        return found
      }
    } else if ('value' in entry && entry.value === page && entry.items) {
      return entry.items
    }
  }
  return undefined
}

function filterCommandData(
  data: CommandData,
  filter: SearchFilter | undefined,
  query: string,
): CommandData {
  if (!query.trim() || filter === false) {
    return data
  }
  const out: CommandData = []
  for (const entry of data) {
    if (typeof entry === 'string') {
      if (matchesListFilter(filter, { value: entry, label: entry }, query)) {
        out.push(entry)
      }
    } else if ('type' in entry && entry.type === 'separator') {
      // Keep separator only if items exist around it later
      if (out.length > 0) {
        out.push(entry)
      }
    } else if ('type' in entry && entry.type === 'group') {
      const sub = filterCommandData(entry.items, filter, query)
      if (sub.length > 0) {
        out.push({ ...entry, items: sub })
      }
    } else if ('value' in entry) {
      const label = entry.label ?? entry.value
      if (
        matchesListFilter(filter, { value: entry.value, label, keywords: entry.keywords }, query)
      ) {
        out.push(entry)
      }
    }
  }
  while (out.length > 0) {
    const last = out.at(-1)
    if (last && typeof last !== 'string' && 'type' in last && last.type === 'separator') {
      out.pop()
    } else {
      break
    }
  }
  return out
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
  const [highlighted, setRawHighlighted] = createControlledSignal<string | null>({
    value: () => props.value,
    defaultValue: () => props.defaultValue ?? null,
  })
  const [regVersion, setRegVersion] = createSignal(0)
  const [pendingMap, setPendingMap] = createSignal<Record<string, boolean>>({})
  const [errorMap, setErrorMap] = createSignal<Record<string, unknown>>({})

  let rootEl: HTMLElement | null = null
  let inputEl: HTMLInputElement | null = null
  const registered: Array<RegisteredCommandItem> = []
  let hasComposedList = false

  const isItemVisible = (value: string, label: string, keywords?: Array<string>) =>
    matchesListFilter(props.filter, { value, label, keywords }, query())

  const filteredItems = (): CommandData => {
    const raw = props.items
    if (!raw) {
      return []
    }
    const activePage = pages().at(-1)
    const scoped = activePage ? (findPageData(raw, activePage) ?? raw) : raw
    return filterCommandData(scoped, props.filter, query())
  }

  const getVisibleRegistered = () => {
    regVersion()
    return registered.filter((i) => isItemVisible(i.value, i.label, i.keywords))
  }

  const setHighlighted = (
    next: string | null,
    reason: 'input' | 'keyboard' | 'pointer' | 'programmatic' = 'programmatic',
    event?: Event,
  ) => {
    if (highlighted() === next) {
      return
    }
    const visible = getVisibleRegistered()
    const index = next === null ? -1 : visible.findIndex((i) => i.value === next)
    const details: CommandValueChangeDetails = {
      ...createChangeDetails(reason, event),
      index,
    }
    props.onValueChange?.(next, details)
    if (details.canceled) {
      return
    }
    setRawHighlighted(next)
  }

  const state = (): CommandState => {
    const visibleCount = props.items ? filteredItems().length : getVisibleRegistered().length
    const status = props.status ?? 'idle'
    return {
      query: query(),
      pages: pages(),
      page: pages().at(-1),
      highlightedValue: highlighted(),
      empty: visibleCount === 0,
      status,
      loading: status === 'loading',
    }
  }

  const setQuery = (next: string, reason: CommandQueryChangeReason, event?: Event) => {
    const details = createChangeDetails(reason, event)
    props.onQueryChange?.(next, details)
    if (details.canceled) {
      return
    }
    setRawQuery(next)
    const firstMatch = registered.find(
      (i) => !i.disabled && matchesListFilter(props.filter, i, next),
    )
    setHighlighted(firstMatch?.value ?? null, 'input', event)
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
    const visible = getVisibleRegistered().filter((i) => !i.disabled)
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
    setHighlighted(visible[nextIdx]?.value ?? null, 'keyboard')
  }

  const triggerSelect = (val: string, event?: Event) => {
    const item = registered.find((i) => i.value === val)
    if (item?.disabled || pendingMap()[val]) {
      return
    }
    if (item?.page) {
      setPages([...pages(), item.page], 'push', event)
      return
    }
    const details: CommandActionDetails = { value: val, event }
    const res = item?.onSelect?.(details)
    if (res instanceof Promise) {
      setPendingMap((prev) => ({ ...prev, [val]: true }))
      setErrorMap((prev) => {
        const next = { ...prev }
        delete next[val]
        return next
      })
      void res.then(
        () => {
          setPendingMap((prev) => ({ ...prev, [val]: false }))
        },
        (error: unknown) => {
          setPendingMap((prev) => ({ ...prev, [val]: false }))
          setErrorMap((prev) => ({ ...prev, [val]: error }))
        },
      )
    }
    props.onSelect?.(details)
    props.onAction?.(val, details)
  }

  const pushPage = (page: string) => setPages([...pages(), page], 'push')
  const popPage = () => {
    if (pages().length > 0) {
      setPages(pages().slice(0, -1), 'pop')
    }
  }
  const selectHighlighted = () => {
    const cur = highlighted()
    if (cur !== null) {
      triggerSelect(cur)
    }
  }

  const api: CommandApi = {
    setQuery: (q) => setQuery(q, 'programmatic'),
    clearQuery: () => setQuery('', 'clear'),
    pushPage,
    popPage,
    push: pushPage,
    pop: popPage,
    setPages: (next) => setPages(next, 'programmatic'),
    highlight: (val) => setHighlighted(val),
    setValue: (val) => setHighlighted(val),
    selectHighlighted,
    run: selectHighlighted,
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

  const bumpRegVersion = () => {
    queueMicrotask(() => setRegVersion((v) => v + 1))
  }

  const registerItem = (item: RegisteredCommandItem) => {
    registered.push(item)
    bumpRegVersion()
    return () => {
      const idx = registered.indexOf(item)
      if (idx >= 0) {
        registered.splice(idx, 1)
        bumpRegVersion()
      }
    }
  }

  const rest = omit(
    props,
    'query',
    'defaultQuery',
    'onQueryChange',
    'value',
    'defaultValue',
    'onValueChange',
    'pages',
    'defaultPages',
    'onPagesChange',
    'onSelect',
    'onAction',
    'onLoadMore',
    'status',
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
        getItems: () => {
          regVersion()
          return registered
        },
        items: () => props.items,
        filteredItems,
        isPending: (v) => !!pendingMap()[v],
        getError: (v) => errorMap()[v],
        markComposedList: () => {
          hasComposedList = true
        },
        setInputEl: (el) => {
          inputEl = el
        },
      }}
    >
      {renderPart(
        'div',
        merge(rest, {
          get children() {
            const rendered =
              typeof props.children === 'function' ? props.children(state()) : props.children
            const itemEntries = () => {
              const dataItems = props.items
              if (!dataItems || hasComposedList) {
                return []
              }
              const q = query().trim().toLowerCase()
              const valid = dataItems.filter(
                (entry): entry is string | CommandDataItem =>
                  typeof entry === 'string' ||
                  ((!('type' in entry) || entry.type !== 'separator') && !('items' in entry)),
              )
              if (!q) {
                return valid
              }
              return valid
                .filter((item) => {
                  const lbl = typeof item === 'string' ? item : (item.label ?? item.value)
                  const val = typeof item === 'string' ? item : item.value
                  return lbl.toLowerCase().includes(q) || val.toLowerCase().includes(q)
                })
                .toSorted((a, b) => {
                  const aLbl = typeof a === 'string' ? a : (a.label ?? a.value)
                  const bLbl = typeof b === 'string' ? b : (b.label ?? b.value)
                  const aStart = aLbl.toLowerCase().startsWith(q) ? 0 : 1
                  const bStart = bLbl.toLowerCase().startsWith(q) ? 0 : 1
                  return aStart - bStart
                })
            }
            return (
              <>
                {rendered}
                <Show when={props.items && !hasComposedList}>
                  <div id={listId} role="listbox" data-slot="command-list">
                    <For each={itemEntries()}>
                      {(item) => (
                        <CommandItem
                          value={typeof item === 'string' ? item : item.value}
                          disabled={typeof item === 'string' ? undefined : item.disabled}
                          shortcut={typeof item === 'string' ? undefined : item.shortcut}
                        >
                          {(() => (typeof item === 'string' ? item : (item.label ?? item.value)))()}
                        </CommandItem>
                      )}
                    </For>
                  </div>
                </Show>
              </>
            )
          },
        }),
        state,
        {
          ref: (el) => {
            rootEl = el
          },
          attrs: () => ({
            'data-slot': 'command',
            'data-page': state().page,
            'data-empty': state().empty ? '' : undefined,
            'data-loading': state().loading ? '' : undefined,
          }),
        },
      )}
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
      'data-slot': 'command-input',
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
  ctx.markComposedList()
  const listState = (): CommandListState => ({
    ...ctx.state(),
    items: ctx.filteredItems(),
  })
  return renderPart('div', props, listState, {
    attrs: () => ({ id: ctx.listId, role: 'listbox', 'data-slot': 'command-list' }),
  })
}

export function CommandPage(
  props: CommandPageProps & Omit<PartProps<'div', CommandState>, keyof CommandPageProps>,
) {
  const ctx = useCommand('Page')
  const pageId = () => props.value ?? props.name
  const rest = omit(props, 'name', 'value')
  return (
    <Show when={ctx.state().page === pageId()}>
      {renderPart('div', rest, ctx.state, {
        attrs: () => ({ 'data-slot': 'command-page', 'data-page': pageId() }),
      })}
    </Show>
  )
}

export function CommandItems(props: {
  items?: CommandData
  renderItem?: (item: CommandDataItem) => JSX.Element
}) {
  const ctx = useCommand('Items')
  const list = () => props.items ?? ctx.filteredItems()
  return (
    <For each={list()}>
      {(entry) => {
        if (typeof entry === 'string') {
          return <CommandItem value={entry}>{entry}</CommandItem>
        }
        if ('type' in entry && entry.type === 'separator') {
          return <CommandSeparator />
        }
        if ('type' in entry && entry.type === 'group') {
          return (
            <CommandGroup>
              <CommandGroupLabel>{entry.label}</CommandGroupLabel>
              <CommandItems items={entry.items} renderItem={props.renderItem} />
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
            shortcut={entry.shortcut}
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
        attrs: () => ({
          role: 'group',
          'data-slot': 'command-group',
          'aria-labelledby': labelId,
        }),
      })}
    </CommandGroupLabelIdContext>
  )
}

export function CommandGroupLabel(props: PartProps<'div', CommandState>) {
  const ctx = useCommand('GroupLabel')
  const labelId = useContext(CommandGroupLabelIdContext)
  return renderPart('div', props, ctx.state, {
    attrs: () => ({
      id: props.id ?? labelId,
      role: 'presentation',
      'data-slot': 'command-group-label',
    }),
  })
}

export function CommandSeparator(props: PartProps<'div', CommandState>) {
  const ctx = useCommand('Separator')
  return renderPart('div', props, ctx.state, {
    attrs: () => ({ role: 'separator', 'data-slot': 'command-separator' }),
  })
}

export function CommandItem(
  props: CommandItemProps &
    Omit<PartProps<'div', CommandItemState>, keyof CommandItemProps | 'onSelect'>,
) {
  const ctx = useCommand('Item')
  let cleanup: (() => void) | undefined
  const [domLabel, setDomLabel] = createSignal('')
  const label = () => props.label ?? (domLabel() || props.value)

  const itemState = (): CommandItemState => ({
    value: props.value,
    label: label(),
    shortcut: props.shortcut,
    highlighted: ctx.state().highlightedValue === props.value,
    disabled: !!props.disabled,
    visible: ctx.isItemVisible(props.value, label(), props.keywords),
    pending: ctx.isPending(props.value),
    error: ctx.getError(props.value),
  })

  const rest = omit(
    props,
    'value',
    'page',
    'index',
    'shortcut',
    'label',
    'keywords',
    'disabled',
    'onSelect',
  )

  return (
    <Show when={itemState().visible}>
      <CommandItemContext value={itemState}>
        {renderPart('div', rest, itemState, {
          ref: (el: HTMLElement | null) => {
            cleanup?.()
            if (el) {
              const readText = () => props.label || el.textContent?.trim() || props.value
              const opt: RegisteredCommandItem = {
                value: props.value,
                label: readText(),
                page: props.page,
                keywords: props.keywords,
                disabled: !!props.disabled,
                onSelect: props.onSelect,
              }
              cleanup = ctx.registerItem(opt)
              queueMicrotask(() => {
                const text = readText()
                if (text) {
                  opt.label = text
                  if (!props.label) {
                    setDomLabel(text)
                  }
                }
              })
            }
          },
          attrs: () => {
            const s = itemState()
            return {
              role: 'option',
              'data-slot': 'command-item',
              'aria-disabled': s.disabled ? 'true' : undefined,
              'aria-busy': s.pending ? 'true' : undefined,
              'data-value': s.value,
              'data-highlighted': s.highlighted ? '' : undefined,
              'data-disabled': s.disabled ? '' : undefined,
              'data-pending': s.pending ? '' : undefined,
            }
          },
          handlers: {
            onPointerMove: () => {
              if (!itemState().disabled) {
                ctx.setHighlighted(props.value, 'pointer')
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
  const ctx = useCommand('ItemText')
  const itemState = useContext(CommandItemContext)
  if (!itemState) {
    throw new Error('<CommandItemText> must be used inside <CommandItem>.')
  }
  const textState = (): CommandItemTextState => {
    const s = itemState()
    const sourceText = typeof props.children === 'string' ? props.children : s.label
    return {
      ...s,
      segments: getMatchSegments(sourceText, ctx.state().query),
    }
  }
  const hasMatch = () => textState().segments.some((seg) => seg.match)
  const resolvedProps: PartProps<'span', CommandItemTextState> = merge(props, {
    get children() {
      if (typeof props.children === 'function') {
        return props.children
      }
      if (typeof props.children === 'string' && ctx.state().query.trim()) {
        return (s: CommandItemTextState) => (
          <For each={s.segments}>
            {(seg) => (
              <Show when={seg.match} fallback={seg.text}>
                <mark>{seg.text}</mark>
              </Show>
            )}
          </For>
        )
      }
      return props.children
    },
  })
  return renderPart('span', resolvedProps, textState, {
    attrs: () => ({
      'data-slot': 'command-item-text',
      'data-matched': hasMatch() ? '' : undefined,
    }),
  })
}

export function CommandItemIcon(
  props: CommandItemIconProps & PartProps<'span', CommandItemIconState>,
) {
  const itemState = useContext(CommandItemContext)
  if (!itemState) {
    throw new Error('<CommandItemIcon> must be used inside <CommandItem>.')
  }
  return renderPart('span', props, itemState, {
    attrs: () => ({ 'aria-hidden': true, 'data-slot': 'command-item-icon' }),
  })
}

const fallbackCommandItemState = (): CommandItemState => ({
  value: '',
  label: '',
  highlighted: false,
  disabled: false,
  visible: true,
  pending: false,
  error: undefined,
})

export function CommandShortcut(
  props: CommandShortcutProps &
    Omit<PartProps<'kbd', CommandShortcutState>, keyof CommandShortcutProps>,
) {
  const itemState = useContext(CommandItemContext)
  const baseState = itemState ?? fallbackCommandItemState
  const rest = omit(props, 'keys')
  const text = () => {
    const raw = props.keys ?? baseState().shortcut
    if (!raw) {
      return ''
    }
    const joined = Array.isArray(raw) ? raw.join('+') : raw
    return formatDisplayShortcut(joined) ?? joined
  }
  const shortcutState = (): CommandShortcutState => ({
    ...baseState(),
    text: text(),
  })
  const resolvedProps: PartProps<'kbd', CommandShortcutState> = merge(rest, {
    get children() {
      return props.children ?? ((s: CommandShortcutState) => s.text)
    },
  })
  return renderPart('kbd', resolvedProps, shortcutState, {
    attrs: () => ({ 'data-slot': 'command-shortcut' }),
  })
}

export function CommandEmpty(props: PartProps<'div', CommandEmptyState>) {
  const ctx = useCommand('Empty')
  return (
    <Show when={ctx.state().empty && !ctx.state().loading}>
      {renderPart('div', props, ctx.state, {
        attrs: () => ({ role: 'status', 'data-slot': 'command-empty' }),
      })}
    </Show>
  )
}

export function CommandStatus(props: PartProps<'div', CommandStatusState>) {
  const ctx = useCommand('Status')
  const statusState = (): CommandStatusState => {
    const s = ctx.state()
    const count = ctx.items()
      ? ctx.filteredItems().length
      : ctx.getItems().filter((i) => ctx.isItemVisible(i.value, i.label, i.keywords)).length
    return {
      ...s,
      count,
    }
  }
  return renderPart('div', props, statusState, {
    attrs: () => ({ role: 'status', 'aria-live': 'polite', 'data-slot': 'command-status' }),
  })
}
