import { createUniqueId } from "solid-js"
import { renderPart, type PartProps } from "./foundation/render"

export type LabelOptions = {}

export type LabelProps = LabelOptions & PartProps<"label", {}>

export function Label(props: LabelProps) {
  const fallbackId = createUniqueId()
  const state = () => ({})

  return renderPart("label", props, state, {
    attrs: () => ({
      id: props.id ?? fallbackId,
    }),
    handlers: {
      onClick: (event: MouseEvent) => {
        const htmlFor = (props as Record<string, unknown>).for as string | undefined
        if (!htmlFor || typeof document === "undefined") return
        const target = document.getElementById(htmlFor)
        if (!target) return
        const tag = target.tagName.toLowerCase()
        const isNativeLabelable =
          tag === "input" ||
          tag === "select" ||
          tag === "textarea" ||
          tag === "button" ||
          tag === "meter" ||
          tag === "output" ||
          tag === "progress"
        if (!isNativeLabelable) {
          event.preventDefault()
          target.focus()
          target.click()
        }
      },
    },
  })
}
