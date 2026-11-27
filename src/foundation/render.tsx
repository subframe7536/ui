import { Portal, dynamic } from '@solidjs/web'
import type { JSX } from '@solidjs/web'
import { Show, isStatic, merge, omit, untrack } from 'solid-js'

/**
 * Renders children in place on the server (SSR) and through a Solid `<Portal>` on the client.
 */
export function SafePortal(props: {
  mount?: Element | ShadowRoot
  children: JSX.Element
}): JSX.Element {
  return (
    <Show when={typeof document !== 'undefined'} fallback={props.children}>
      <Portal mount={props.mount}>{props.children}</Portal>
    </Show>
  )
}

const ARIA_MODIFIER_MAP: Record<string, string> = {
  mod: 'Control',
  ctrl: 'Control',
  control: 'Control',
  meta: 'Meta',
  cmd: 'Meta',
  alt: 'Alt',
  option: 'Alt',
  shift: 'Shift',
}

const DISPLAY_MODIFIER_MAP: Record<string, string> = {
  mod: 'Ctrl',
  ctrl: 'Ctrl',
  control: 'Ctrl',
  meta: 'Meta',
  cmd: 'Cmd',
  alt: 'Alt',
  option: 'Alt',
  shift: 'Shift',
}

/**
 * Formats a shortcut string (e.g. `"mod+k"`) into an ARIA `aria-keyshortcuts` value (`"Control+K"`).
 */
export function formatAriaKeyShortcuts(shortcut: string | undefined): string | undefined {
  if (!shortcut) {
    return undefined
  }
  return shortcut
    .split('+')
    .map((part) => {
      const lower = part.trim().toLowerCase()
      if (lower in ARIA_MODIFIER_MAP) {
        return ARIA_MODIFIER_MAP[lower]
      }
      return part.trim().length === 1 ? part.trim().toUpperCase() : part.trim()
    })
    .join('+')
}

/**
 * Formats a shortcut string (e.g. `"mod+k"`) into a platform-neutral display label (`"Ctrl+K"`).
 */
export function formatDisplayShortcut(shortcut: string | undefined): string | undefined {
  if (!shortcut) {
    return undefined
  }
  return shortcut
    .split('+')
    .map((part) => {
      const lower = part.trim().toLowerCase()
      if (lower in DISPLAY_MODIFIER_MAP) {
        return DISPLAY_MODIFIER_MAP[lower]
      }
      return part.trim().length === 1 ? part.trim().toUpperCase() : part.trim()
    })
    .join('+')
}

/**
 * Custom element renderer: receives the reactive props proxy to spread and the reactive part state.
 */
export type RenderProp<State = object> = (
  props: Record<string, unknown>,
  state: State,
) => JSX.Element

/**
 * Props every part takes: its element's props, `render`, and class names,
 * styles and children that may be functions of the part's state.
 */
export type PartProps<Tag extends keyof JSX.IntrinsicElements, State = object> = Omit<
  JSX.IntrinsicElements[Tag],
  'class' | 'style' | 'children'
> & {
  /** Class names, or a function of the part's state that returns them. */
  class?: JSX.ClassValue | ((state: State) => JSX.ClassValue)
  /** Styles, or a function of the part's state that returns them. */
  style?: JSX.CSSProperties | string | ((state: State) => JSX.CSSProperties | string | undefined)
  /** Renders your own element: a function of the props to spread and the part's state. */
  render?: RenderProp<State>
  /** Content, or a function of the part's state that returns it. */
  children?: JSX.Element | ((state: State) => JSX.Element)
}

/**
 * Calls a Solid event handler prop (plain function or bound `[handler, data]` tuple).
 */
export function callHandler(handler: unknown, event: Event, ...extra: Array<unknown>): unknown {
  if (Array.isArray(handler)) {
    return (handler[0] as (...args: Array<unknown>) => unknown)(handler[1], event, ...extra)
  }
  if (typeof handler === 'function') {
    return (handler as (...args: Array<unknown>) => unknown)(event, ...extra)
  }
  return undefined
}

function applyRef<T extends Element>(ref: unknown, el: T): void {
  if (Array.isArray(ref)) {
    for (const item of ref) {
      applyRef(item, el)
    }
  } else if (typeof ref === 'function') {
    ;(ref as (el: T) => void)(el)
  }
}

/**
 * Composes multiple Solid ref callbacks / ref arrays into a single ref callback.
 */
export function composeRefs<T extends Element>(...refs: Array<unknown>): (el: T) => void {
  return (el: T) => {
    for (const ref of refs) {
      applyRef(ref, el)
    }
  }
}

/**
 * Composes a user event handler (runs first) with an internal handler.
 * If the user handler calls `event.preventDefault()`, the internal handler is skipped.
 */
export function composeHandlers<E extends Event>(
  userHandler: unknown,
  internalHandler?: (event: E) => void,
): ((event: E) => void) | undefined {
  if (!userHandler && !internalHandler) {
    return undefined
  }
  if (!userHandler) {
    return internalHandler
  }
  if (!internalHandler) {
    return (event: E) => void callHandler(userHandler, event)
  }
  return (event: E) => {
    callHandler(userHandler, event)
    if (!event.defaultPrevented) {
      internalHandler(event)
    }
  }
}

function parseStyleString(css: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const decl of css.split(';')) {
    const idx = decl.indexOf(':')
    if (idx > 0) {
      out[decl.slice(0, idx).trim()] = decl.slice(idx + 1).trim()
    }
  }
  return out
}

function mergeStyleValues(
  user: JSX.CSSProperties | string | undefined,
  part?: Record<string, string | number | undefined>,
): JSX.CSSProperties | string | undefined {
  if (!part || Object.keys(part).length === 0) {
    return user
  }
  if (!user) {
    return part
  }
  const base = typeof user === 'string' ? parseStyleString(user) : { ...user }
  return { ...base, ...part }
}

const tagCache = new Map<string, (props: Record<string, unknown>) => JSX.Element>()

function elementForTag(tag: string) {
  let comp = tagCache.get(tag)
  if (!comp) {
    comp = dynamic(() => tag, { static: true })
    tagCache.set(tag, comp)
  }
  return comp
}

const emptyAttrs: Record<string, unknown> = {}

export type PartInternalProps = {
  attrs?: () => Record<string, unknown>
  style?: () => Record<string, string | number | undefined> | undefined
  handlers?: Record<string, (event: never) => void>
  ref?: (el: never) => void
}

/**
 * Renders a component part natively in Solid 2 with zero-copy `merge()`/`omit()`
 * prop composition, native array refs, `isStatic()` fast paths, and fine-grained
 * reactive `render` / `class` / `style` / `children` support.
 */
export function renderPart<Tag extends keyof JSX.IntrinsicElements, State extends object>(
  tag: Tag,
  userProps: PartProps<Tag, State>,
  state: () => State,
  internal: PartInternalProps = {},
): JSX.Element {
  const passthrough = omit(
    userProps as Record<string, unknown>,
    'render',
    'class',
    'style',
    'children',
    'ref',
  )
  const reactiveState = merge(state) as State

  const overrides: Record<string, unknown> = {}

  if (isStatic(userProps, 'class')) {
    const rawClass = untrack(() => userProps.class)
    if (typeof rawClass === 'function') {
      Object.defineProperty(overrides, 'class', {
        enumerable: true,
        configurable: true,
        get: () => rawClass(state()),
      })
    } else if (rawClass !== undefined) {
      overrides.class = rawClass
    }
  } else {
    Object.defineProperty(overrides, 'class', {
      enumerable: true,
      configurable: true,
      get: () => {
        const raw = userProps.class
        return typeof raw === 'function' ? raw(state()) : raw
      },
    })
  }

  if (!internal.style && isStatic(userProps, 'style')) {
    const rawStyle = untrack(() => userProps.style)
    if (typeof rawStyle === 'function') {
      Object.defineProperty(overrides, 'style', {
        enumerable: true,
        configurable: true,
        get: () => rawStyle(state()),
      })
    } else if (rawStyle !== undefined) {
      overrides.style = rawStyle
    }
  } else {
    Object.defineProperty(overrides, 'style', {
      enumerable: true,
      configurable: true,
      get: () => {
        const raw = userProps.style
        const userStyle = typeof raw === 'function' ? raw(state()) : raw
        return mergeStyleValues(userStyle, internal.style?.())
      },
    })
  }

  if (isStatic(userProps, 'ref')) {
    const userRef = untrack(() => userProps.ref)
    if (internal.ref && userRef) {
      overrides.ref = [internal.ref, userRef]
    } else if (internal.ref ?? userRef) {
      overrides.ref = internal.ref ?? userRef
    }
  } else {
    Object.defineProperty(overrides, 'ref', {
      enumerable: true,
      configurable: true,
      get: () => {
        const userRef = userProps.ref
        if (internal.ref && userRef) {
          return [internal.ref, userRef]
        }
        return internal.ref ?? userRef
      },
    })
  }

  // Stable event wrappers: read the user handler lazily at event time so
  // handler composition never allocates per state update or tracks during render.
  if (internal.handlers) {
    for (const [key, handler] of Object.entries(internal.handlers)) {
      overrides[key] = (event: Event) => {
        const userHandler = (passthrough as Record<string, unknown>)[key]
        if (userHandler) {
          callHandler(userHandler, event)
        }
        if (!event.defaultPrevented) {
          handler(event as never)
        }
      }
    }
  }

  const mergedProps = merge(internal.attrs ?? emptyAttrs, passthrough, overrides)

  const resolveChildren = () => {
    const ch = userProps.children
    return typeof ch === 'function' ? ch(reactiveState) : ch
  }

  if (isStatic(userProps, 'render')) {
    const customRender = untrack(() => userProps.render)
    if (customRender) {
      const propsWithChildren = merge(mergedProps, {
        get children() {
          return resolveChildren()
        },
      })
      return customRender(propsWithChildren, reactiveState)
    }
    const TagComponent = elementForTag(tag)
    return <TagComponent {...mergedProps}>{resolveChildren()}</TagComponent>
  }

  const TagComponent = elementForTag(tag)
  const propsWithChildren = merge(mergedProps, {
    get children() {
      return resolveChildren()
    },
  })
  return (
    <>
      {(() => {
        const fn = userProps.render
        return (
          <>
            {fn ? (
              fn(propsWithChildren, reactiveState)
            ) : (
              <TagComponent {...mergedProps}>{resolveChildren()}</TagComponent>
            )}
          </>
        )
      })()}
    </>
  )
}
