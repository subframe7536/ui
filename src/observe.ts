import {
  addChangeListener,
  elementsOfRef,
  type ObservedChange,
} from "./foundation/registry"
import { withSource } from "./foundation/details"

/**
 * Subscribes to every component state change on the page (user or agent).
 * Returns an unsubscribe function.
 * @stable
 */
export function observe(
  listener: (change: ObservedChange) => void,
  options: {
    /** Hears only components with a part inside this element, or the element it returns. */
    within?: Element | (() => Element | null | undefined)
    /** Hears every live step of an interaction instead of only committed changes. */
    live?: boolean
  } = {}
): () => void {
  const { within } = options
  if (!within) {
    return addChangeListener((change) => listener(change))
  }
  return addChangeListener((change, elements) => {
    const root = typeof within === "function" ? within() : within
    if (root && elements.some((el) => root.contains(el))) {
      listener(change)
    }
  })
}

/**
 * Returns the primary DOM element of a component identified by its `ref`
 * from `observe()` or `agent.snapshot()`.
 * @stable
 */
export function elementOf(ref: string): HTMLElement | undefined {
  const elements = elementsOfRef(ref)
  return (
    elements.find(
      (el) => !elements.some((other) => other !== el && other.contains(el))
    ) ?? elements[0]
  )
}

export { withSource }
export type { ObservedChange }
