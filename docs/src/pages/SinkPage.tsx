import { For, Show, createMemo, createSignal } from 'solid-js'

import { SegmentedControl, SegmentedControlItem, createAgent } from '../../../src'
import { ExampleViewer } from '../components/ExampleViewer'
import { COMPONENTS } from '../data/components'
import type { ComponentCategory } from '../data/components'

type FilterOption = 'All' | ComponentCategory

const FILTER_OPTIONS: Array<FilterOption> = [
  'All',
  'Actions & Toggles',
  'Forms & Inputs',
  'Selection & Pickers',
  'Overlays & Popups',
  'Navigation & Layout',
  'Data & Display',
  'Utilities & Runtime',
]

export function SinkPage() {
  const [filter, setFilter] = createSignal<FilterOption>('All')
  const [agentSnapshot, setAgentSnapshot] = createSignal<
    Array<{ ref: string; component: string; state: unknown }>
  >([])

  const visibleComponents = createMemo(() => {
    const f = filter()
    return COMPONENTS.filter((c) => f === 'All' || c.category === f)
  })

  const refreshRegistry = () => {
    const entries = createAgent().snapshot()
    setAgentSnapshot(
      entries.map((entry) => ({
        ref: entry.ref,
        component: entry.component,
        state: entry.state,
      })),
    )
  }

  return (
    <main class="container home-main">
      <p class="docs-eyebrow">Playground</p>
      <h1 class="section-heading">Kitchen Sink</h1>
      <p class="section-lead">
        Interactive showcase of all {COMPONENTS.length} live{' '}
        <code class="inline-code">@subf/ui</code> components side by side, plus a live{' '}
        <code class="inline-code">@subf/ui/agent</code> registry inspector.
      </p>

      <div class="sink-filter-bar">
        <SegmentedControl class="ui-segmented" value={filter()} onValueChange={(v) => setFilter(v)}>
          <For each={FILTER_OPTIONS}>
            {(opt) => (
              <SegmentedControlItem class="ui-segmented-item" value={opt}>
                {opt}
              </SegmentedControlItem>
            )}
          </For>
        </SegmentedControl>
      </div>

      <div class="bento-grid">
        <For each={visibleComponents()}>
          {(comp) => (
            <div class="bento-tile">
              <div class="bento-tile-head">
                <span class="bento-tile-title">{comp.name}</span>
                <a class="bento-tile-link" href={`#/docs/components/${comp.slug}`}>
                  /{comp.slug} →
                </a>
              </div>
              <div class="bento-tile-body">
                <ExampleViewer name={`${comp.slug}/basic`} />
              </div>
            </div>
          )}
        </For>
      </div>

      <div class="editorial-rule" />

      <div class="sink-inspector-head">
        <div>
          <h2 class="sink-inspector-title">Agent Registry Inspector</h2>
          <p class="sink-inspector-desc">
            Calls <code class="inline-code">createAgent().snapshot()</code> from{' '}
            <code class="inline-code">@subf/ui/agent</code> to inspect every mounted component on
            this page.
          </p>
        </div>
        <button type="button" class="btn-primary sink-inspector-btn" onClick={refreshRegistry}>
          Inspect Mounted Components
        </button>
      </div>

      <Show when={agentSnapshot().length > 0}>
        <div class="api-table-wrap">
          <table class="api-table">
            <thead>
              <tr>
                <th>Ref</th>
                <th>Component</th>
                <th>Live State Snapshot</th>
              </tr>
            </thead>
            <tbody>
              <For each={agentSnapshot()}>
                {(row) => (
                  <tr>
                    <td>
                      <code class="inline-code">{row.ref}</code>
                    </td>
                    <td>{row.component}</td>
                    <td class="sink-state-cell">
                      <code class="inline-code">{JSON.stringify(row.state)}</code>
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>
      </Show>
    </main>
  )
}
