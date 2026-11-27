import {
  createContext,
  createEffect,
  createSignal,
  omit,
  onCleanup,
  Show,
  useContext,
} from "solid-js"
import { createChangeDetails, type ChangeDetails } from "./foundation/details"
import { renderPart, type PartProps } from "./foundation/render"

export type AvatarLoadingStatus = "idle" | "loading" | "loaded" | "error"
export type AvatarLoadingStatusChangeReason = "load" | "error" | "reset"

export type AvatarOptions = {
  onLoadingStatusChange?: (
    status: AvatarLoadingStatus,
    details: ChangeDetails<AvatarLoadingStatusChangeReason>
  ) => void
  debug?: boolean
}

export type AvatarState = {
  status: AvatarLoadingStatus
}

export type AvatarPrimitive = AvatarState
export type AvatarFallbackProps = { delayMs?: number }

type AvatarContextValue = {
  state: () => AvatarState
  setStatus: (status: AvatarLoadingStatus, reason: AvatarLoadingStatusChangeReason, event?: Event) => void
}

const AvatarContext = createContext<AvatarContextValue | null>(null)

function useAvatar(part: string): AvatarContextValue {
  const ctx = useContext(AvatarContext)
  if (!ctx) throw new Error(`<Avatar${part}> must be used inside <Avatar>.`)
  return ctx
}

export function Avatar(
  props: AvatarOptions & Omit<PartProps<"span", AvatarState>, keyof AvatarOptions>
) {
  const [status, setRawStatus] = createSignal<AvatarLoadingStatus>("idle")
  const state = (): AvatarState => ({ status: status() })

  const setStatus = (
    next: AvatarLoadingStatus,
    reason: AvatarLoadingStatusChangeReason,
    event?: Event
  ) => {
    if (status() === next) return
    const details = createChangeDetails(reason, event)
    props.onLoadingStatusChange?.(next, details)
    if (details.canceled) return
    setRawStatus(next)
  }

  const rest = omit(props, "onLoadingStatusChange", "debug")

  return (
    <AvatarContext value={{ state, setStatus }}>
      {renderPart("span", rest, state, {
        attrs: () => ({ "data-status": status() }),
      })}
    </AvatarContext>
  )
}

export function AvatarImage(props: PartProps<"img", AvatarState>) {
  const ctx = useAvatar("Image")
  createEffect(
    () => props.src,
    (src) => {
      if (!src) ctx.setStatus("error", "reset")
      else ctx.setStatus("loading", "reset")
    }
  )

  return (
    <Show when={ctx.state().status !== "error"}>
      {renderPart("img", props, ctx.state, {
        attrs: () => ({
          "data-status": ctx.state().status,
        }),
        style: () => (ctx.state().status === "loaded" ? undefined : { display: "none" }),
        handlers: {
          onLoad: (e: Event) => ctx.setStatus("loaded", "load", e),
          onError: (e: Event) => ctx.setStatus("error", "error", e),
        },
      })}
    </Show>
  )
}

export function AvatarFallback(
  props: AvatarFallbackProps &
    Omit<PartProps<"span", AvatarState>, keyof AvatarFallbackProps>
) {
  const ctx = useAvatar("Fallback")
  const [canRender, setCanRender] = createSignal((props.delayMs ?? 0) <= 0)

  createEffect(
    () => props.delayMs,
    (delay) => {
      if (!delay || delay <= 0) {
        setCanRender(true)
        return
      }
      setCanRender(false)
      const timer = setTimeout(() => setCanRender(true), delay)
      onCleanup(() => clearTimeout(timer))
    }
  )

  const rest = omit(props, "delayMs")
  return (
    <Show when={canRender() && ctx.state().status !== "loaded"}>
      {renderPart("span", rest, ctx.state, {
        attrs: () => ({ "data-status": ctx.state().status }),
      })}
    </Show>
  )
}
