import { createSignal } from "solid-js"

export function createControlledSignal<T>(options: {
  value: () => T | undefined
  defaultValue: () => T
}): [get: () => T, set: (next: T) => void, isControlled: () => boolean] {
  const [internal, setInternal] = createSignal<{ value: T }>({
    value: options.defaultValue(),
  })
  const isControlled = () => options.value() !== undefined
  const get = (): T => {
    const controlled = options.value()
    return controlled !== undefined ? controlled : internal().value
  }
  const set = (next: T): void => {
    if (!isControlled()) {
      setInternal({ value: next })
    }
  }
  return [get, set, isControlled]
}
