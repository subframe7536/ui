import type { JSX } from '@solidjs/web'
import { createContext, createSignal, createUniqueId, For, omit, Show, useContext } from 'solid-js'

import { createController, useController } from './foundation/controller'
import { createChangeDetails } from './foundation/details'
import type { ChangeDetails, ChangeOptions } from './foundation/details'
import { registerComponent } from './foundation/registry'
import { renderPart } from './foundation/render'
import type { PartProps } from './foundation/render'
import { createControlledSignal } from './foundation/state'
import type { ListHighlightDetails } from './listbox'

export type { ListHighlightDetails }

export type TreeMode = 'single' | 'multiple'
export type TreeValue<T extends string = string> = T | Array<T> | null
export type TreeCheckedState = boolean | 'indeterminate'
export type TreeCheckStrategy = 'cascade' | 'independent'
export type TreeValueChangeReason = 'click' | 'keyboard' | 'programmatic' | 'clear'
export type TreeExpandedChangeReason = 'click' | 'keyboard' | 'programmatic'
export type TreeCheckedChangeReason = 'click' | 'keyboard' | 'programmatic'
export type TreeChangeOptions = ChangeOptions<TreeValueChangeReason>

export type TreeActionDetails = {
  value: string
  event?: Event
}

export type TreeAnnouncement = {
  message: string
}

export type TreeItemData<T extends string = string> = {
  value: T
  label: string
  disabled?: boolean
  children?: Array<TreeItemData<T>>
}

export type TreeCollectionNode<T extends string = string> = {
  value: T
  label: string
  parent: T | null
  depth: number
  disabled: boolean
  children: Array<T>
}

export type TreeCollection<T extends string = string> = {
  roots: Array<T>
  nodes: Map<T, TreeCollectionNode<T>>
}

export type TreeRow<T extends string = string> = {
  value: T
  label: string
  depth: number
  expanded: boolean
  hasChildren: boolean
  disabled: boolean
}

export function treeFromPaths(paths: Array<string>, separator = '/'): Array<TreeItemData> {
  const rootMap = new Map<string, TreeItemData>()
  for (const raw of paths) {
    const parts = raw.split(separator).filter(Boolean)
    let currentMap = rootMap
    let prefix = ''
    for (const part of parts) {
      prefix = prefix ? `${prefix}${separator}${part}` : part
      let node = currentMap.get(prefix)
      if (!node) {
        node = { value: prefix, label: part, children: [] }
        currentMap.set(prefix, node)
      }
      const nextMap = new Map<string, TreeItemData>()
      for (const child of node.children ?? []) {
        nextMap.set(child.value, child)
      }
      currentMap = {
        get: (k: string) => (node.children ?? []).find((c) => c.value === k),
        set: (_k: string, v: TreeItemData) => {
          node.children = [...(node.children ?? []), v]
          return nextMap
        },
      } as unknown as Map<string, TreeItemData>
    }
  }
  const clean = (items: Array<TreeItemData>): Array<TreeItemData> =>
    items.map((item) =>
      item.children && item.children.length > 0
        ? { ...item, children: clean(item.children) }
        : { value: item.value, label: item.label },
    )
  return clean([...rootMap.values()])
}

export function visibleTreeRows<T extends string = string>(
  items: Array<TreeItemData<T>>,
  expanded: Set<T> | Array<T>,
): Array<TreeRow<T>> {
  const expandedSet = expanded instanceof Set ? expanded : new Set(expanded)
  const rows: Array<TreeRow<T>> = []
  const walk = (nodes: Array<TreeItemData<T>>, depth: number) => {
    for (const node of nodes) {
      const hasChildren = !!node.children && node.children.length > 0
      const isExpanded = hasChildren && expandedSet.has(node.value)
      rows.push({
        value: node.value,
        label: node.label,
        depth,
        expanded: isExpanded,
        hasChildren,
        disabled: !!node.disabled,
      })
      if (isExpanded && node.children) {
        walk(node.children, depth + 1)
      }
    }
  }
  walk(items, 0)
  return rows
}

function collectDescendants<T extends string>(node: TreeItemData<T>): Array<T> {
  const out: Array<T> = []
  const walk = (n: TreeItemData<T>) => {
    for (const child of n.children ?? []) {
      out.push(child.value)
      walk(child)
    }
  }
  walk(node)
  return out
}

function findNode<T extends string>(
  items: Array<TreeItemData<T>>,
  value: T,
): TreeItemData<T> | undefined {
  for (const item of items) {
    if (item.value === value) {
      return item
    }
    if (item.children) {
      const found = findNode(item.children, value)
      if (found) {
        return found
      }
    }
  }
  return undefined
}

export function treeCheckedStates<T extends string = string>(
  items: Array<TreeItemData<T>>,
  checked: Array<T>,
  strategy: TreeCheckStrategy = 'cascade',
): Map<T, TreeCheckedState> {
  const checkedSet = new Set(checked)
  const result = new Map<T, TreeCheckedState>()

  const visit = (node: TreeItemData<T>): TreeCheckedState => {
    if (!node.children || node.children.length === 0 || strategy === 'independent') {
      const st: TreeCheckedState = checkedSet.has(node.value)
      result.set(node.value, st)
      return st
    }
    const childStates = node.children.map(visit)
    const allTrue = childStates.every((s) => s === true)
    const allFalse = childStates.every((s) => s === false)
    const st: TreeCheckedState = allTrue ? true : allFalse ? false : 'indeterminate'
    result.set(node.value, st)
    return st
  }

  for (const item of items) {
    visit(item)
  }
  return result
}

export function toggleTreeChecked<T extends string = string>(
  items: Array<TreeItemData<T>>,
  checked: Array<T>,
  value: T,
  strategy: TreeCheckStrategy = 'cascade',
): Array<T> {
  const set = new Set(checked)
  const states = treeCheckedStates(items, checked, strategy)
  const shouldCheck = states.get(value) !== true
  const node = findNode(items, value)

  if (strategy === 'independent' || !node?.children?.length) {
    if (shouldCheck) {
      set.add(value)
    } else {
      set.delete(value)
    }
    return [...set]
  }

  const targets = [value, ...collectDescendants(node)]
  for (const t of targets) {
    if (shouldCheck) {
      set.add(t)
    } else {
      set.delete(t)
    }
  }
  return [...set]
}

export type TreeApi<T extends string = string> = {
  setValue: (value: TreeValue<T>, options?: TreeChangeOptions) => void
  expand: (value: T) => void
  collapse: (value: T) => void
  toggleExpanded: (value: T) => void
  expandAll: () => void
  collapseAll: () => void
  toggleChecked: (value: T) => void
  getValue: () => TreeValue<T>
  getExpanded: () => Array<T>
  getChecked: () => Array<T>
}

export function createTreeController<T extends string = string>() {
  return createController<TreeApi<T>>()
}

export type TreeController<T extends string = string> = TreeApi<T>

export type TreeOptions<T extends string = string> = {
  items?: Array<TreeItemData<T>>
  value?: TreeValue<T>
  defaultValue?: TreeValue<T>
  onValueChange?: (value: TreeValue<T>, details: ChangeDetails<TreeValueChangeReason>) => void
  expanded?: Array<T>
  defaultExpanded?: Array<T>
  onExpandedChange?: (expanded: Array<T>, details: ChangeDetails<TreeExpandedChangeReason>) => void
  checked?: Array<T>
  defaultChecked?: Array<T>
  onCheckedChange?: (checked: Array<T>, details: ChangeDetails<TreeCheckedChangeReason>) => void
  checkStrategy?: TreeCheckStrategy
  multiple?: boolean
  disabled?: boolean
  onActivate?: (details: TreeActionDetails) => void
  controller?: TreeController<T>
  debug?: boolean
}

export type TreeState<T extends string = string> = {
  value: TreeValue<T>
  expanded: Array<T>
  checked: Array<T>
  highlightedValue: string | null
  multiple: boolean
  disabled: boolean
}

export type TreePrimitive = TreeState
export type TreeProps<T extends string = string> = TreeOptions<T> &
  Omit<PartProps<'div', TreeState<T>>, keyof TreeOptions<T> | 'defaultValue' | 'onChange'>

export type TreeItemProps<T extends string = string> = {
  value: T
  label?: string
  depth?: number
  hasChildren?: boolean
  disabled?: boolean
}

export type TreeItemPartProps = {}

export type TreeItemState = {
  value: string
  depth: number
  selected: boolean
  expanded: boolean
  checked: TreeCheckedState
  highlighted: boolean
  hasChildren: boolean
  disabled: boolean
}

export type TreeGroupProps = { value?: string }
export type TreeGroupState = { expanded: boolean }

type TreeContextValue = {
  id: string
  state: () => TreeState
  items: () => Array<TreeItemData>
  isSelected: (val: string) => boolean
  isExpanded: (val: string) => boolean
  getCheckedState: (val: string) => TreeCheckedState
  selectItem: (val: string, reason: TreeValueChangeReason, event?: Event) => void
  toggleExpand: (val: string, reason: TreeExpandedChangeReason, event?: Event) => void
  toggleCheck: (val: string, reason: TreeCheckedChangeReason, event?: Event) => void
  setHighlighted: (val: string | null) => void
  onActivate?: (details: TreeActionDetails) => void
}

const TreeContext = createContext<TreeContextValue | null>(null)
const TreeItemContext = createContext<(() => TreeItemState) | null>(null)

function useTree(part: string): TreeContextValue {
  const ctx = useContext(TreeContext)
  if (!ctx) {
    throw new Error(`<Tree${part}> must be used inside <Tree>.`)
  }
  return ctx
}

export function Tree<T extends string = string>(props: TreeProps<T>) {
  const id = `ui-tree-${createUniqueId()}`
  const isMultiple = () => !!props.multiple
  const strategy = (): TreeCheckStrategy => props.checkStrategy ?? 'cascade'

  const [value, setRawValue] = createControlledSignal<TreeValue<T>>({
    value: () => props.value,
    defaultValue: () => props.defaultValue ?? (isMultiple() ? ([] as Array<T>) : null),
  })
  const [expanded, setRawExpanded] = createControlledSignal<Array<T>>({
    value: () => props.expanded,
    defaultValue: () => props.defaultExpanded ?? [],
  })
  const [checked, setRawChecked] = createControlledSignal<Array<T>>({
    value: () => props.checked,
    defaultValue: () => props.defaultChecked ?? [],
  })
  const [highlighted, setHighlighted] = createSignal<string | null>(null)
  let rootEl: HTMLElement | null = null

  const disabled = () => !!props.disabled

  const isSelected = (val: string) => {
    const cur = value()
    return Array.isArray(cur) ? cur.includes(val as T) : cur === val
  }

  const isExpanded = (val: string) => expanded().includes(val as T)

  const getCheckedState = (val: string): TreeCheckedState => {
    if (props.items && props.items.length > 0) {
      return treeCheckedStates(props.items, checked(), strategy()).get(val as T) ?? false
    }
    return checked().includes(val as T)
  }

  const commitValue = (next: TreeValue<T>, reason: TreeValueChangeReason, event?: Event) => {
    const details = createChangeDetails(reason, event)
    props.onValueChange?.(next, details)
    if (details.canceled) {
      return
    }
    setRawValue(next)
  }

  const commitExpanded = (next: Array<T>, reason: TreeExpandedChangeReason, event?: Event) => {
    const details = createChangeDetails(reason, event)
    props.onExpandedChange?.(next, details)
    if (details.canceled) {
      return
    }
    setRawExpanded(next)
  }

  const commitChecked = (next: Array<T>, reason: TreeCheckedChangeReason, event?: Event) => {
    const details = createChangeDetails(reason, event)
    props.onCheckedChange?.(next, details)
    if (details.canceled) {
      return
    }
    setRawChecked(next)
  }

  const selectItem = (val: string, reason: TreeValueChangeReason, event?: Event) => {
    if (disabled()) {
      return
    }
    const cur = value()
    if (isMultiple()) {
      const arr = Array.isArray(cur) ? cur : []
      const next = arr.includes(val as T) ? arr.filter((v) => v !== val) : [...arr, val as T]
      commitValue(next, reason, event)
    } else {
      commitValue(val as T, reason, event)
    }
  }

  const toggleExpand = (val: string, reason: TreeExpandedChangeReason, event?: Event) => {
    const cur = expanded()
    const next = cur.includes(val as T) ? cur.filter((v) => v !== val) : [...cur, val as T]
    commitExpanded(next, reason, event)
  }

  const toggleCheck = (val: string, reason: TreeCheckedChangeReason, event?: Event) => {
    if (disabled()) {
      return
    }
    const next = props.items
      ? toggleTreeChecked(props.items, checked(), val as T, strategy())
      : checked().includes(val as T)
        ? checked().filter((v) => v !== val)
        : [...checked(), val as T]
    commitChecked(next, reason, event)
  }

  const collectAllBranchValues = (nodes: Array<TreeItemData<T>>): Array<T> => {
    const out: Array<T> = []
    for (const n of nodes) {
      if (n.children && n.children.length > 0) {
        out.push(n.value, ...collectAllBranchValues(n.children))
      }
    }
    return out
  }

  const api: TreeApi<T> = {
    setValue: (next, opts) => commitValue(next, opts?.reason ?? 'programmatic', opts?.event),
    expand: (val) => {
      if (!expanded().includes(val)) {
        commitExpanded([...expanded(), val], 'programmatic')
      }
    },
    collapse: (val) => {
      if (expanded().includes(val)) {
        commitExpanded(
          expanded().filter((v) => v !== val),
          'programmatic',
        )
      }
    },
    toggleExpanded: (val) => toggleExpand(val, 'programmatic'),
    expandAll: () => commitExpanded(collectAllBranchValues(props.items ?? []), 'programmatic'),
    collapseAll: () => commitExpanded([], 'programmatic'),
    toggleChecked: (val) => toggleCheck(val, 'programmatic'),
    getValue: () => value(),
    getExpanded: () => expanded(),
    getChecked: () => checked(),
  }

  useController(() => props.controller, api)

  const state = (): TreeState<T> => ({
    value: value(),
    expanded: expanded(),
    checked: checked(),
    highlightedValue: highlighted(),
    multiple: isMultiple(),
    disabled: disabled(),
  })

  registerComponent({
    component: 'tree',
    getElements: () => [rootEl],
    getState: () => ({
      value: value(),
      expanded: expanded(),
      checked: checked(),
      disabled: disabled(),
    }),
    getDisabled: disabled,
    actions: {
      expand: (v) => api.expand(String(v) as T),
      collapse: (v) => api.collapse(String(v) as T),
      select: (v) => selectItem(String(v), 'programmatic'),
    },
  })

  const rest = omit(
    props,
    'items',
    'value',
    'defaultValue',
    'onValueChange',
    'expanded',
    'defaultExpanded',
    'onExpandedChange',
    'checked',
    'defaultChecked',
    'onCheckedChange',
    'checkStrategy',
    'multiple',
    'disabled',
    'onActivate',
    'controller',
    'debug',
  )

  return (
    <TreeContext
      value={{
        id,
        state,
        items: () => props.items ?? [],
        isSelected,
        isExpanded,
        getCheckedState,
        selectItem,
        toggleExpand,
        toggleCheck,
        setHighlighted,
        onActivate: props.onActivate,
      }}
    >
      {renderPart('div', rest, state, {
        ref: (el) => {
          rootEl = el
        },
        attrs: () => ({
          id,
          role: 'tree',
          'aria-multiselectable': isMultiple() ? 'true' : undefined,
          'aria-disabled': disabled() ? 'true' : undefined,
          'data-disabled': disabled() ? '' : undefined,
        }),
      })}
    </TreeContext>
  )
}

export function TreeItems(props: {
  items?: Array<TreeItemData>
  renderItem?: (row: TreeRow) => JSX.Element
}) {
  const ctx = useTree('Items')
  const rows = () => visibleTreeRows(props.items ?? ctx.items(), ctx.state().expanded)
  return (
    <For each={rows()}>
      {(row) => (
        <Show
          when={props.renderItem}
          fallback={
            <TreeItem
              value={row.value}
              label={row.label}
              depth={row.depth}
              hasChildren={row.hasChildren}
              disabled={row.disabled}
            >
              <TreeItemIndicator />
              <TreeItemLabel>{row.label}</TreeItemLabel>
            </TreeItem>
          }
        >
          {props.renderItem(row)}
        </Show>
      )}
    </For>
  )
}

export function TreeItem<T extends string = string>(
  props: TreeItemProps<T> & Omit<PartProps<'div', TreeItemState>, keyof TreeItemProps<T>>,
) {
  const ctx = useTree('Item')
  const itemState = (): TreeItemState => ({
    value: props.value,
    depth: props.depth ?? 0,
    selected: ctx.isSelected(props.value),
    expanded: ctx.isExpanded(props.value),
    checked: ctx.getCheckedState(props.value),
    highlighted: ctx.state().highlightedValue === props.value,
    hasChildren: !!props.hasChildren,
    disabled: ctx.state().disabled || !!props.disabled,
  })
  const rest = omit(props, 'value', 'label', 'depth', 'hasChildren', 'disabled')

  return (
    <TreeItemContext value={itemState}>
      {renderPart('div', rest, itemState, {
        attrs: () => {
          const s = itemState()
          return {
            role: 'treeitem',
            tabindex: s.disabled ? -1 : 0,
            'aria-level': s.depth + 1,
            'aria-selected': s.selected ? 'true' : 'false',
            'aria-expanded': s.hasChildren ? (s.expanded ? 'true' : 'false') : undefined,
            'aria-disabled': s.disabled ? 'true' : undefined,
            'data-value': s.value,
            'data-depth': s.depth,
            'data-selected': s.selected ? '' : undefined,
            'data-expanded': s.expanded ? '' : undefined,
            'data-highlighted': s.highlighted ? '' : undefined,
            'data-disabled': s.disabled ? '' : undefined,
          }
        },
        handlers: {
          onClick: (e: MouseEvent) => {
            const s = itemState()
            if (s.disabled) {
              return
            }
            ctx.setHighlighted(s.value)
            ctx.selectItem(s.value, 'click', e)
            if (s.hasChildren) {
              ctx.toggleExpand(s.value, 'click', e)
            }
            ctx.onActivate?.({ value: s.value, event: e })
          },
          onKeyDown: (e: KeyboardEvent) => {
            const s = itemState()
            if (s.disabled) {
              return
            }
            if (e.key === 'ArrowRight' && s.hasChildren && !s.expanded) {
              e.preventDefault()
              ctx.toggleExpand(s.value, 'keyboard', e)
            } else if (e.key === 'ArrowLeft' && s.hasChildren && s.expanded) {
              e.preventDefault()
              ctx.toggleExpand(s.value, 'keyboard', e)
            } else if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              ctx.selectItem(s.value, 'keyboard', e)
              ctx.onActivate?.({ value: s.value, event: e })
            }
          },
        },
      })}
    </TreeItemContext>
  )
}

export function TreeGroup(
  props: TreeGroupProps & Omit<PartProps<'div', TreeGroupState>, keyof TreeGroupProps>,
) {
  const ctx = useTree('Group')
  const parent = useContext(TreeItemContext)
  const val = () => props.value ?? parent?.().value
  const groupState = (): TreeGroupState => ({
    expanded: val() ? ctx.isExpanded(val()!) : true,
  })
  const rest = omit(props, 'value')
  return (
    <Show when={groupState().expanded}>
      {renderPart('div', rest, groupState, {
        attrs: () => ({ role: 'group' }),
      })}
    </Show>
  )
}

export function TreeItemIndicator(props: TreeItemPartProps & PartProps<'span', TreeItemState>) {
  const itemState = useContext(TreeItemContext)
  if (!itemState) {
    throw new Error('<TreeItemIndicator> must be used inside <TreeItem>.')
  }
  return renderPart('span', props, itemState, {
    attrs: () => ({
      'aria-hidden': true,
      'data-expanded': itemState().expanded ? '' : undefined,
      'data-leaf': !itemState().hasChildren ? '' : undefined,
    }),
  })
}

export function TreeItemLabel(props: TreeItemPartProps & PartProps<'span', TreeItemState>) {
  const itemState = useContext(TreeItemContext)
  if (!itemState) {
    throw new Error('<TreeItemLabel> must be used inside <TreeItem>.')
  }
  return renderPart('span', props, itemState)
}

export function TreeItemCheckbox(
  props: TreeItemPartProps & Omit<PartProps<'button', TreeItemState>, 'type'>,
) {
  const ctx = useTree('ItemCheckbox')
  const itemState = useContext(TreeItemContext)
  if (!itemState) {
    throw new Error('<TreeItemCheckbox> must be used inside <TreeItem>.')
  }
  return renderPart('button', props, itemState, {
    attrs: () => {
      const s = itemState()
      return {
        type: 'button',
        role: 'checkbox',
        disabled: s.disabled,
        'aria-checked': s.checked === 'indeterminate' ? 'mixed' : s.checked ? 'true' : 'false',
        'data-checked': s.checked === true ? '' : undefined,
        'data-indeterminate': s.checked === 'indeterminate' ? '' : undefined,
      }
    },
    handlers: {
      onClick: (e: MouseEvent) => {
        e.stopPropagation()
        if (itemState().disabled) {
          return
        }
        ctx.toggleCheck(itemState().value, 'click', e)
      },
    },
  })
}
