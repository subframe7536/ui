import { createEffect, createSignal, untrack } from 'solid-js'
import type { Signal } from 'solid-js'

const attachSymbol = Symbol.for('ui-sdk.controller.attach')
const detachSymbol = Symbol.for('ui-sdk.controller.detach')
const attachedSymbol = Symbol.for('ui-sdk.controller.attached')

const methodName = (key: PropertyKey) =>
  typeof key === 'string' &&
  /^[a-z]/.test(key) &&
  !/^(internal|then|toJSON)$/.test(key) &&
  !(key in {})

export function isControllerAttached(controller: unknown): boolean {
  return !!(controller as { [attachedSymbol]?: boolean } | undefined)?.[attachedSymbol]
}

export function attachController(controller: unknown, api: unknown): void {
  ;(controller as { [attachSymbol]?: (api: unknown) => void } | undefined)?.[attachSymbol]?.(api)
}

export function detachController(controller: unknown, api: unknown): void {
  ;(controller as { [detachSymbol]?: (api: unknown) => void } | undefined)?.[detachSymbol]?.(api)
}

/**
 * Creates an imperative controller handle that can be passed to a component's
 * `controller` prop and called from anywhere.
 */
export function createController<Api extends object>(): Api {
  let current: Api | undefined
  const methods = new Map<PropertyKey, (...args: Array<unknown>) => unknown>()

  const read = (key: PropertyKey) =>
    key === 'internal' ? undefined : (current as Record<PropertyKey, unknown> | undefined)?.[key]

  const forward = (key: PropertyKey) => {
    let fn = methods.get(key)
    if (fn) {
      return fn
    }
    fn = (...args: Array<unknown>) => {
      const value = read(key)
      if (typeof value === 'function') {
        return value.apply(current, args)
      }
      return undefined
    }
    methods.set(key, fn)
    return fn
  }

  const valueOf = (key: PropertyKey) => {
    if (!current) {
      return methodName(key) ? forward(key) : undefined
    }
    const value = read(key)
    return typeof value === 'function' ? forward(key) : value
  }

  const isMember = (key: PropertyKey) =>
    key !== 'internal' && !!current && Object.hasOwn(current, key)

  return new Proxy(Object.create(null) as Api, {
    get(_, key) {
      if (key === attachSymbol) {
        return (api: Api) => {
          current = api
        }
      }
      if (key === attachedSymbol) {
        return current !== undefined
      }
      if (key === detachSymbol) {
        return (api: Api) => {
          if (current === api) {
            current = undefined
          }
        }
      }
      return valueOf(key)
    },
    has: (_, key) => isMember(key),
    ownKeys: () => (current ? Reflect.ownKeys(current).filter(isMember) : []),
    getOwnPropertyDescriptor: (_, key) =>
      isMember(key) ? { value: valueOf(key), enumerable: true, configurable: true } : undefined,
  })
}

/**
 * Connects a component's API object to an optional `controller` prop for the
 * lifetime of the component.
 */
export function useController<Api extends object>(
  controller: () => Api | undefined,
  api: Api,
): void {
  createEffect(controller, (ctrl) => {
    if (!ctrl) {
      return
    }
    attachController(ctrl, api)
    return () => detachController(ctrl, api)
  })
}

// External trigger-to-component registry keyed by controller object.
const controlledTargets = new WeakMap<object, Signal<unknown>>()

function targetSignal(controller: object): Signal<unknown> {
  let sig = controlledTargets.get(controller)
  if (!sig) {
    const [get, set] = createSignal<unknown>(undefined)
    sig = [get, set]
    controlledTargets.set(controller, sig)
  }
  return sig
}

/**
 * Resolves a target context from either an explicit `controller` prop or the
 * nearest ancestor context.
 */
export function useControllerTarget<T>(
  controller: () => object | undefined,
  nearest: T | null,
): () => T | undefined {
  return () => {
    const ctrl = controller()
    if (ctrl) {
      return (targetSignal(ctrl)[0]() as T | undefined) ?? nearest ?? undefined
    }
    return nearest ?? undefined
  }
}

/**
 * Registers a component context with its `controller` so external triggers
 * (e.g., outside `<Dialog>` or `<Popover>`) can bind to it reactively.
 */
export function useControllerEntry(controller: () => object | undefined, value: unknown): void {
  createEffect(controller, (ctrl) => {
    if (!ctrl) {
      return
    }
    const [get, set] = targetSignal(ctrl)
    set(() => value)
    return () => {
      if (untrack(get) === value) {
        set(undefined)
      }
    }
  })
}
