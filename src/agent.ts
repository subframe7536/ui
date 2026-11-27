import { withSource } from './foundation/details'
import {
  accessibleLabelOf,
  addChangeListener,
  confirmMessageOf,
  getRegisteredComponents,
  isHiddenFromAgent,
} from './foundation/registry'
import type { ObservedChange, RegisteredComponent } from './foundation/registry'

/**
 * One component as an agent sees it.
 */
export type AgentComponent = {
  ref: string
  component: string
  label?: string
  row?: string
  [state: string]: unknown
  items?: Array<{ value: string; label: string }>
  more?: number
  text?: Array<string>
  buttons?: Array<string>
  pending?: boolean
  error?: string
  section?: string
  confirm?: string
  offPage?: boolean
  source?: string
  actions: Array<string>
}

/**
 * A change an agent step made.
 */
export type AgentChange = {
  component: string
  label?: string
  key: string
  value: unknown
}

/**
 * One step for `act`.
 */
export type AgentStep = {
  ref: string
  action: string
  args?: Array<unknown>
}

/**
 * A resolved step passed to `allow` before execution.
 */
export type AgentAction = {
  ref: string
  component: string
  label?: string
  action: string
  args: Array<unknown>
  confirm?: string
}

type Allow = (action: AgentAction) => boolean | Promise<boolean>

function toAgentComponent(entry: RegisteredComponent): AgentComponent | null {
  const els = entry.getElements().filter((el): el is HTMLElement => el !== null && el !== undefined)
  if (isHiddenFromAgent(els)) {
    return null
  }
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
  if (byRef) {
    return byRef
  }

  const normalized = refOrLabel.trim().toLowerCase()
  const byLabel = all.find((item) => {
    const els = item
      .getElements()
      .filter((el): el is HTMLElement => el !== null && el !== undefined)
    if (isHiddenFromAgent(els)) {
      return false
    }
    const label = (item.getLabel?.() ?? accessibleLabelOf(els))?.trim().toLowerCase()
    return label === normalized
  })
  if (byLabel) {
    return byLabel
  }

  return all.find((item) => item.component.toLowerCase() === normalized)
}

const allowMap = new WeakMap<
  object,
  (
    input: { steps: Array<AgentStep> },
    allow?: Allow,
  ) => Promise<{
    ok: boolean
    changes: Array<AgentChange>
    components: Array<AgentComponent>
    error?: string
  }>
>()

/**
 * Creates an agent handle that inspects and drives mounted Solid 2 UI components
 * through their native APIs with `source: "agent"`.
 */
export function createAgent(
  options: { within?: Element | (() => Element | null | undefined) } = {},
) {
  const inScope = (entry: RegisteredComponent): boolean => {
    if (!options.within) {
      return true
    }
    const root = typeof options.within === 'function' ? options.within() : options.within
    if (!root) {
      return false
    }
    return entry.getElements().some((el) => el !== null && el !== undefined && root.contains(el))
  }

  const seen = new Map<string, AgentComponent>()

  const snapshot = (): Array<AgentComponent> => {
    const entries = getRegisteredComponents().filter(inScope)
    const sorted = [...entries].sort((a, b) => {
      const elA = a.getElements().find((el): el is HTMLElement => !!el && el.isConnected)
      const elB = b.getElements().find((el): el is HTMLElement => !!el && el.isConnected)
      if (!elA || !elB || elA === elB) {
        return 0
      }
      const pos = elA.compareDocumentPosition(elB)
      if (pos & Node.DOCUMENT_POSITION_FOLLOWING) {
        return -1
      }
      if (pos & Node.DOCUMENT_POSITION_PRECEDING) {
        return 1
      }
      return 0
    })
    const live = sorted
      .map(toAgentComponent)
      .filter((item): item is AgentComponent => item !== null)
    const liveRefs = new Set<string>()
    for (const item of live) {
      liveRefs.add(item.ref)
      seen.set(item.ref, item)
    }
    const offPage: Array<AgentComponent> = []
    for (const [ref, prev] of seen) {
      if (!liveRefs.has(ref)) {
        offPage.push({ ...prev, offPage: true, actions: [] })
      }
    }
    return [...live, ...offPage]
  }

  const query = (
    params: {
      text?: string
      within?: string
      kind?: string
      closed?: boolean
      from?: number
    } = {},
  ): Array<AgentComponent> => {
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
          item.items?.some((i) => i.label.toLowerCase().includes(needle)),
      )
    }
    if (params.within) {
      const needle = params.within.toLowerCase()
      list = list.filter(
        (item) => item.ref.toLowerCase() === needle || item.label?.toLowerCase() === needle,
      )
    }
    if (params.from && params.from > 0) {
      list = list.slice(params.from)
    }
    return list
  }

  const runAct = async (input: { steps: Array<AgentStep> }, allow?: Allow) => {
    const changes: Array<AgentChange> = []
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
        const els = target
          .getElements()
          .filter((el): el is HTMLElement => el !== null && el !== undefined)
        const label = target.getLabel?.() ?? accessibleLabelOf(els)
        const confirm = confirmMessageOf(els)
        const args = step.args ?? []

        if (allow) {
          // oxlint-disable-next-line eslint/no-await-in-loop
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

        if (step.action === 'expect') {
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
        if (typeof handler !== 'function') {
          return {
            ok: false,
            changes,
            components: snapshot(),
            error: `Action "${step.action}" is not available on "${target.component}".`,
          }
        }

        // oxlint-disable-next-line eslint/no-await-in-loop
        await withSource('agent', () => handler(...args))
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
    act: (input: { steps: Array<AgentStep> }) => runAct(input),
  }

  allowMap.set(agent, runAct)
  return agent
}

/**
 * JSON Schema definitions of `createAgent`'s tools for LLM APIs and WebMCP.
 */
export const agentTools = [
  {
    name: 'act',
    description:
      'Runs steps in order on live UI components by ref, label, or component kind and returns all state changes.',
    inputSchema: {
      type: 'object',
      properties: {
        steps: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              ref: { type: 'string' },
              action: { type: 'string' },
              args: { type: 'array', items: {} },
            },
            required: ['ref', 'action'],
            additionalProperties: false,
          },
        },
      },
      required: ['steps'],
      additionalProperties: false,
    },
  },
  {
    name: 'query',
    description: 'Finds mounted components by text, kind, or within a specific component.',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string' },
        within: { type: 'string' },
        kind: { type: 'string' },
        closed: { type: 'boolean' },
        from: { type: 'integer' },
      },
    },
  },
  {
    name: 'snapshot',
    description:
      'Lists currently mounted UI components with their refs, labels, states, and actions.',
    inputSchema: { type: 'object', properties: {} },
  },
] as const

/**
 * Registers `agentTools` with browser WebMCP (`document.modelContext`) guarded by `allow`.
 */
export function registerTools(
  agent: ReturnType<typeof createAgent>,
  { allow }: { allow: Allow },
): () => void {
  if (typeof allow !== 'function') {
    throw new TypeError('registerTools needs an `allow` that decides each step.')
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
            readOnlyHint: tool.name === 'snapshot',
            untrustedContentHint: true,
            consequentialHint: tool.name === 'act',
          },
          execute: (input: Record<string, unknown>) => {
            if (tool.name === 'snapshot') {
              return agent.snapshot()
            }
            if (tool.name === 'query') {
              return agent.query(input)
            }
            return runWithAllow
              ? runWithAllow(input as { steps: Array<AgentStep> }, allow)
              : agent.act(input as { steps: Array<AgentStep> })
          },
        },
        { signal: controller.signal },
      )
      .catch(() => {})
  }

  return () => controller.abort()
}

export type { ObservedChange }
