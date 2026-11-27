import { omit } from "solid-js"
import { renderPart, type PartProps } from "./foundation/render"

export type SeparatorOrientation = "horizontal" | "vertical"

export type SeparatorOptions = {
  orientation?: SeparatorOrientation
  decorative?: boolean
}

export type SeparatorState = {
  orientation: SeparatorOrientation
  decorative: boolean
}

export type SeparatorProps = SeparatorOptions &
  Omit<PartProps<"div", SeparatorState>, keyof SeparatorOptions>

export function Separator(props: SeparatorProps) {
  const rest = omit(props, "orientation", "decorative")
  const state = (): SeparatorState => ({
    orientation: props.orientation ?? "horizontal",
    decorative: !!props.decorative,
  })

  return renderPart("div", rest, state, {
    attrs: () => {
      const s = state()
      return {
        role: s.decorative ? "none" : "separator",
        "aria-orientation": s.decorative ? undefined : s.orientation,
        "data-orientation": s.orientation,
      }
    },
  })
}
