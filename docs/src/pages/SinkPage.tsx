import { For, createMemo, createSignal, Show } from 'solid-js'

import { SegmentedControl, SegmentedControlItem, createAgent } from '../../../src'
import { COMPONENTS } from '../data/components'
import type { ComponentCategory } from '../data/components'
import { DEMO_REGISTRY, renderComponentDemo } from '../demos'

type FilterOption = 'All' | ComponentCategory

const FILTER_OPTIONS: Array<FilterOption> = [
  'All',
  'Actions & Toggles',
  'Forms & Inputs',
  'Selection & Pickers',
  'Overlays & Popups',
  'Navigation & Layout',
  'Data & Display',
]

export function SinkPage() {
  const [filter, setFilter] = createSignal<FilterOption>('All')
  const [agentSnapshot, setAgentSnapshot] = createSignal<
    Array<{ ref: string; component: string; state: unknown }>
  >([])

  const visibleDemos = createMemo(() => {
    const f = filter()
    return COMPONENTS.filter((c) => c.slug in DEMO_REGISTRY && (f === 'All' || c.category === f))
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
        Interactive showcase of live <code class="inline-code">@subf/ui</code> primitives side by
        side, plus a live <code class="inline-code">@subf/ui/agent</code> registry inspector.
      </p>

      <div style={{ 'margin-bottom': '24px', 'overflow-x': 'auto' }}>
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
        <For each={visibleDemos()}>
          {(comp) => (
            <div class="bento-tile">
              <div class="bento-tile-head">
                <span class="bento-tile-title">{comp.name}</span>
                <a class="bento-tile-link" href={`#/docs/components/${comp.slug}`}>
                  /{comp.slug} →
                </a>
              </div>
              <div class="bento-tile-body">{renderComponentDemo(comp.slug)}</div>
            </div>
          )}
        </For>
      </div>

      <div class="editorial-rule" />

      <div class="ui-row" style={{ 'justify-content': 'space-between', 'margin-bottom': '16px' }}>
        <div>
          <h2 style={{ margin: 0, 'font-size': '22px', 'font-weight': 500 }}>
            Agent Registry Inspector
          </h2>
          <p style={{ margin: '4px 0 0', color: 'var(--subtle)', 'font-size': '14px' }}>
            Calls <code class="inline-code">createAgent().snapshot()</code> from{' '}
            <code class="inline-code">@subf/ui/agent</code> to inspect every mounted component on
            this page.
          </p>
        </div>
        <button type="button" class="btn-primary" onClick={refreshRegistry}>
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
                    <td>
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
