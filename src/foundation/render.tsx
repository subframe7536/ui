import { dynamic } from '@solidjs/web'
import type { JSX } from '@solidjs/web'
import { createMemo, omit } from 'solid-js'

/**
 * Custom element renderer: receives the props to spread and the part's state.
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

/**
 * Composes multiple Solid ref callbacks / ref arrays into a single ref callback.
 */
export function composeRefs<T extends Element>(...refs: Array<unknown>): (el: T) => void {
  return (el: T) => {
    for (const ref of refs) {
      if (typeof ref === 'function') {
        ;(ref as (el: T) => void)(el)
      }
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

export type PartInternalProps = {
  attrs?: () => Record<string, unknown>
  style?: () => Record<string, string | number | undefined> | undefined
  handlers?: Record<string, (event: never) => void>
  ref?: (el: never) => void
}

/**
 * Renders a component part natively in Solid 2 with full support for:
 * - `class` as value or `(state) => ClassValue`
 * - `style` as string/object or `(state) => string | CSSProperties`
 * - `children` as JSX.Element or `(state) => JSX.Element`
 * - `render` as `(props, state) => JSX.Element`
 * - Composed event handlers (user handler runs first) and refs.
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

  const mergedProps = createMemo(() => {
    const currentState = state()
    const attrs = internal.attrs ? internal.attrs() : {}
    const partStyle = internal.style ? internal.style() : undefined

    const rawClass = userProps.class
    const resolvedClass = typeof rawClass === 'function' ? rawClass(currentState) : rawClass

    const rawStyle = userProps.style
    const resolvedUserStyle = typeof rawStyle === 'function' ? rawStyle(currentState) : rawStyle
    const resolvedStyle = mergeStyleValues(resolvedUserStyle, partStyle)

    const out: Record<string, unknown> = {
      ...attrs,
      ...passthrough,
    }

    if (resolvedClass !== undefined) {
      out.class = resolvedClass
    }
    if (resolvedStyle !== undefined) {
      out.style = resolvedStyle
    }

    // Compose event handlers so user handlers run before internal handlers.
    if (internal.handlers) {
      for (const [key, handler] of Object.entries(internal.handlers)) {
        out[key] = composeHandlers((passthrough as Record<string, unknown>)[key], handler)
      }
    }

    if (internal.ref || userProps.ref) {
      out.ref = composeRefs(internal.ref, userProps.ref)
    }

    return out
  })

  const resolvedChildren = () => {
    const ch = userProps.children
    return typeof ch === 'function' ? ch(state()) : ch
  }

  const customRender = userProps.render
  if (customRender) {
    // oxlint-disable-next-line subf/solid-reactivity
    return (() => {
      const propsWithChildren = {
        ...mergedProps(),
        get children() {
          return resolvedChildren()
        },
      }
      return customRender(propsWithChildren, state())
    }) as unknown as JSX.Element
  }

  const TagComponent = elementForTag(tag)
  return <TagComponent {...mergedProps()}>{resolvedChildren()}</TagComponent>
}
