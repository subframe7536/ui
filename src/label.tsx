import { createUniqueId } from 'solid-js'

import { renderPart } from './foundation/render'
import type { PartProps } from './foundation/render'

export type LabelOptions = object

export type LabelProps = LabelOptions & PartProps<'label'>

/**
 * A native `<label>` that names any control by `for` or by wrapping it.
 * Clicking a label referencing a non-native ARIA control focuses and activates it.
 */
const emptyLabelState = () => ({})

export function Label(props: LabelProps) {
  const fallbackId = createUniqueId()

  return renderPart('label', props, emptyLabelState, {
    attrs: () => ({
      id: props.id ?? fallbackId,
    }),
    handlers: {
      onClick: (event: MouseEvent) => {
        const htmlFor = (props as Record<string, unknown>).for as string | undefined
        if (!htmlFor || typeof document === 'undefined') {
          return
        }
        const target = document.getElementById(htmlFor)
        if (!target) {
          return
        }
        const tag = target.tagName.toLowerCase()
        const isNativeLabelable =
          tag === 'input' ||
          tag === 'select' ||
          tag === 'textarea' ||
          tag === 'button' ||
          tag === 'meter' ||
          tag === 'output' ||
          tag === 'progress'
        if (!isNativeLabelable) {
          event.preventDefault()
          target.focus()
          target.click()
        }
      },
    },
  })
}
