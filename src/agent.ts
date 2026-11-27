import { withSource } from "./foundation/details"
import {
  accessibleLabelOf,
  addChangeListener,
  confirmMessageOf,
  getRegisteredComponents,
  isHiddenFromAgent,
  type ObservedChange,
  type RegisteredComponent,
} from "./foundation/registry"

export type AgentComponent = {
  ref: string
  component: string
  label?: string
  row?: string
  [state: string]: unknown
  items?: { value: string; label: string }[]
  more?: number
  text?: string[]
  buttons?: string[]
  pending?: boolean
  error?: string
  section?: string
  confirm?: string
  offPage?: boolean
  source?: string
  actions: string[]
}

export type AgentChange = {
  component: string
  label?: string
  key: string
  value: unknown
}

export type AgentStep = {
  ref: string
  action: string
  args?: unknown[]
}

export type AgentAction = {
  ref: string
  component: string
  label?: string
  action: string
  args: unknown[]
  confirm?: string
}

type Allow = (action: AgentAction) => boolean | Promise<boolean>

function toAgentComponent(entry: RegisteredComponent): AgentComponent | null {
  const els = entry.getElements().filter((el): el is HTMLElement => el != null)
  if (isHiddenFromAgent(els)) return null
  const label = entry.getLabel?.() ?? accessibleLabelOf(els)
  const disabled = entry.getDisabled?.() ?? false
  const confirm = confirmMessageOf(els)
  const state = entry.getState()
  const items = entry.getItems?.()
  const text = entry.getText?.()
  const buttons = entry.getButtons?.()

  return {
    ref: entry.ref,
    component: entry.component,
    ...(label ? { label } : {}),
    ...state,
    ...(items && items.length > 0 ? { items } : {}),
    ...(text && text.length > 0 ? { text } : {}),
    ...(buttons && buttons.length > 0 ? { buttons } : {}),
    ...(confirm ? { confirm } : {}),
    actions: disabled ? [] : Object.keys(entry.actions),
  }
}

function resolveComponent(refOrLabel: string): RegisteredComponent | undefined {
  const all = getRegisteredComponents()
  const byRef = all.find((item) => item.ref === refOrLabel)
  if (byRef) return byRef

  const normalized = refOrLabel.trim().toLowerCase()
  const byLabel = all.find((item) => {
    const els = item.getElements().filter((el): el is HTMLElement => el != null)
    if (isHiddenFromAgent(els)) return false
    const label = (item.getLabel?.() ?? accessibleLabelOf(els))?.trim().toLowerCase()
    return label === normalized
  })
  if (byLabel) return byLabel

  return all.find((item) => item.component.toLowerCase() === normalized)
}

const allowMap = new WeakMap<
  object,
  (input: { steps: AgentStep[] }, allow?: Allow) => Promise<{
    ok: boolean
    changes: AgentChange[]
    components: AgentComponent[]
    error?: string
  }>
>()

export function createAgent(options: { within?: Element | (() => Element | null | undefined) } = {}) {
  const inScope = (entry: RegisteredComponent): boolean => {
    if (!options.within) return true
    const root = typeof options.within === "function" ? options.within() : options.within
    if (!root) return false
    return entry
      .getElements()
      .some((el) => el != null && root.contains(el))
  }

  const snapshot = (): AgentComponent[] =>
    getRegisteredComponents()
      .filter(inScope)
      .map(toAgentComponent)
      .filter((item): item is AgentComponent => item !== null)

  const query = (params: {
    text?: string
    within?: string
    kind?: string
    closed?: boolean
    from?: number
  } = {}): AgentComponent[] => {
    let list = snapshot()
    if (params.kind) {
      const k = params.kind.toLowerCase()
      list = list.filter((item) => item.component.toLowerCase() === k)
    }
    if (params.text) {
      const needle = params.text.toLowerCase()
      list = list.filter(
        (item) =>
          item.label?.toLowerCase().includes(needle) ||
          item.text?.some((t) => t.toLowerCase().includes(needle)) ||
          item.items?.some((i) => i.label.toLowerCase().includes(needle))
      )
    }
    if (params.within) {
      const needle = params.within.toLowerCase()
      list = list.filter(
        (item) =>
          item.ref.toLowerCase() === needle ||
          item.label?.toLowerCase() === needle
      )
    }
    if (params.from && params.from > 0) {
      list = list.slice(params.from)
    }
    return list
  }

  const runAct = async (input: { steps: AgentStep[] }, allow?: Allow) => {
    const changes: AgentChange[] = []
    const stop = addChangeListener((change) => {
      changes.push({
        component: change.component,
        label: change.label,
        key: change.key,
        value: change.value,
      })
    })

    try {
      for (const step of input.steps) {
        const target = resolveComponent(step.ref)
        if (!target || !inScope(target)) {
          return {
            ok: false,
            changes,
            components: snapshot(),
            error: `Component "${step.ref}" not found.`,
          }
        }
        const els = target.getElements().filter((el): el is HTMLElement => el != null)
        const label = target.getLabel?.() ?? accessibleLabelOf(els)
        const confirm = confirmMessageOf(els)
        const args = step.args ?? []

        if (allow) {
          const permitted = await allow({
            ref: target.ref,
            component: target.component,
            label,
            action: step.action,
            args,
            confirm,
          })
          if (!permitted) {
            return {
              ok: false,
              changes,
              components: snapshot(),
              error: `Action "${step.action}" on "${label ?? target.ref}" was denied.`,
            }
          }
        }

        if (step.action === "expect") {
          const state = target.getState()
          const expected = args[0]
          const matched = Object.values(state).some((v) => Object.is(v, expected))
          if (!matched) {
            return {
              ok: false,
              changes,
              components: snapshot(),
              error: `Expectation failed on "${label ?? target.ref}".`,
            }
          }
          continue
        }

        const handler = target.actions[step.action]
        if (typeof handler !== "function") {
          return {
            ok: false,
            changes,
            components: snapshot(),
            error: `Action "${step.action}" is not available on "${target.component}".`,
          }
        }

        await withSource("agent", () => handler(...args))
      }

      return {
        ok: true,
        changes,
        components: snapshot(),
      }
    } finally {
      stop()
    }
  }

  const agent = {
    snapshot,
    query,
    act: (input: { steps: AgentStep[] }) => runAct(input),
  }

  allowMap.set(agent, runAct)
  return agent
}

export const agentTools = [
  {
    name: "act",
    description:
      "Runs steps in order on live UI components by ref, label, or component kind and returns all state changes.",
    inputSchema: {
      type: "object",
      properties: {
        steps: {
          type: "array",
          items: {
            type: "object",
            properties: {
              ref: { type: "string" },
              action: { type: "string" },
              args: { type: "array", items: {} },
            },
            required: ["ref", "action"],
            additionalProperties: false,
          },
        },
      },
      required: ["steps"],
      additionalProperties: false,
    },
  },
  {
    name: "query",
    description: "Finds mounted components by text, kind, or within a specific component.",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string" },
        within: { type: "string" },
        kind: { type: "string" },
        closed: { type: "boolean" },
        from: { type: "integer" },
      },
    },
  },
  {
    name: "snapshot",
    description: "Lists currently mounted UI components with their refs, labels, states, and actions.",
    inputSchema: { type: "object", properties: {} },
  },
] as const

export function registerTools(
  agent: ReturnType<typeof createAgent>,
  { allow }: { allow: Allow }
): () => void {
  if (typeof allow !== "function") {
    throw new Error("registerTools needs an `allow` that decides each step.")
  }
  const context = (
    globalThis.document as
      | {
          modelContext?: {
            registerTool: (tool: object, options: object) => Promise<void>
          }
        }
      | undefined
  )?.modelContext

  const controller = new AbortController()
  const runWithAllow = allowMap.get(agent)

  for (const tool of agentTools) {
    context
      ?.registerTool(
        {
          ...tool,
          annotations: {
            readOnlyHint: tool.name === "snapshot",
            untrustedContentHint: true,
            consequentialHint: tool.name === "act",
          },
          execute: (input: any) => {
            if (tool.name === "snapshot") return agent.snapshot()
            if (tool.name === "query") return agent.query(input)
            return runWithAllow ? runWithAllow(input, allow) : agent.act(input)
          },
        },
        { signal: controller.signal }
      )
      .catch(() => {})
  }

  return () => controller.abort()
}

export type { ObservedChange }
