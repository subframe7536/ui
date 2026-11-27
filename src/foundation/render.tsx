import { dynamic, type JSX } from "@solidjs/web"
import { createMemo, omit } from "solid-js"

export type RenderProp<State = {}> = (
  props: Record<string, any>,
  state: State
) => JSX.Element

export type PartProps<Tag extends keyof JSX.IntrinsicElements, State = {}> = Omit<
  JSX.IntrinsicElements[Tag],
  "class" | "style" | "children"
> & {
  class?: JSX.ClassValue | ((state: State) => JSX.ClassValue)
  style?:
    | JSX.CSSProperties
    | string
    | ((state: State) => JSX.CSSProperties | string | undefined)
  render?: RenderProp<State>
  children?: JSX.Element | ((state: State) => JSX.Element)
}

export function callHandler(handler: unknown, event: Event, ...extra: unknown[]): unknown {
  if (Array.isArray(handler)) {
    return (handler[0] as (...args: unknown[]) => unknown)(handler[1], event, ...extra)
  }
  if (typeof handler === "function") {
    return (handler as (...args: unknown[]) => unknown)(event, ...extra)
  }
  return undefined
}

export function composeRefs<T extends Element>(
  ...refs: Array<((el: T) => void) | T | undefined | null | unknown>
): (el: T) => void {
  return (el: T) => {
    for (const ref of refs) {
      if (typeof ref === "function") {
        ;(ref as (el: T) => void)(el)
      }
    }
  }
}

export function composeHandlers<E extends Event>(
  userHandler: unknown,
  internalHandler?: (event: E) => void
): ((event: E) => void) | undefined {
  if (!userHandler && !internalHandler) return undefined
  if (!userHandler) return internalHandler
  if (!internalHandler) return (event: E) => void callHandler(userHandler, event)
  return (event: E) => {
    callHandler(userHandler, event)
    if (!event.defaultPrevented) {
      internalHandler(event)
    }
  }
}

function parseStyleString(css: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const decl of css.split(";")) {
    const idx = decl.indexOf(":")
    if (idx > 0) {
      out[decl.slice(0, idx).trim()] = decl.slice(idx + 1).trim()
    }
  }
  return out
}

function mergeStyleValues(
  user: JSX.CSSProperties | string | undefined,
  part?: Record<string, string | number | undefined>
): JSX.CSSProperties | string | undefined {
  if (!part || Object.keys(part).length === 0) return user
  if (!user) return part as JSX.CSSProperties
  const base = typeof user === "string" ? parseStyleString(user) : { ...user }
  return { ...base, ...part } as JSX.CSSProperties
}

const tagCache = new Map<string, (props: Record<string, any>) => JSX.Element>()

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
  handlers?: Record<string, (event: any) => void>
  ref?: (el: any) => void
}

export function renderPart<Tag extends keyof JSX.IntrinsicElements, State extends object>(
  tag: Tag,
  userProps: PartProps<Tag, State>,
  state: () => State,
  internal: PartInternalProps = {}
): JSX.Element {
  const passthrough = omit(userProps as Record<string, any>, "render", "class", "style", "children", "ref")

  const mergedProps = createMemo(() => {
    const currentState = state()
    const attrs = internal.attrs ? internal.attrs() : {}
    const partStyle = internal.style ? internal.style() : undefined

    const rawClass = userProps.class
    const resolvedClass =
      typeof rawClass === "function"
        ? (rawClass as (s: State) => JSX.ClassValue)(currentState)
        : rawClass

    const rawStyle = userProps.style
    const resolvedUserStyle =
      typeof rawStyle === "function"
        ? (rawStyle as (s: State) => JSX.CSSProperties | string | undefined)(currentState)
        : rawStyle
    const resolvedStyle = mergeStyleValues(resolvedUserStyle, partStyle)

    const out: Record<string, any> = {
      ...attrs,
      ...passthrough,
    }

    if (resolvedClass !== undefined) {
      out.class = resolvedClass
    }
    if (resolvedStyle !== undefined) {
      out.style = resolvedStyle
    }

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
    return typeof ch === "function"
      ? (ch as (s: State) => JSX.Element)(state())
      : ch
  }

  if (userProps.render) {
    return (() => {
      const propsWithChildren = {
        ...mergedProps(),
        get children() {
          return resolvedChildren()
        },
      }
      return userProps.render!(propsWithChildren, state())
    }) as unknown as JSX.Element
  }

  const TagComponent = elementForTag(tag as string)
  return (
    <TagComponent {...mergedProps()}>
      {resolvedChildren()}
    </TagComponent>
  )
}
