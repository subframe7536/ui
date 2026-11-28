import { For, Match, Show, Switch, createSignal } from 'solid-js'
import type { JSX } from 'solid-js'

import { COMPONENTS } from '../data/components'

import { CodeBlock } from './CodeBlock'
import { ExampleViewer } from './ExampleViewer'

export type DocBlock =
  | { type: 'heading'; level: number; id: string; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'code'; lang: string; title?: string; code: string }
  | { type: 'style-tabs'; tabs: Array<{ label: string; lang: string; code: string }> }
  | { type: 'callout'; variant: string; title?: string; text: string }
  | { type: 'cards'; cards: Array<{ title: string; href: string; description: string }> }
  | { type: 'example'; name: string; caption?: string }
  | { type: 'component-grid' }
  | { type: 'css-variables'; rows: Array<{ name: string; description: string }> }
  | { type: 'data-attributes'; rows: Array<{ name: string; description: string }> }
  | {
      type: 'api-table'
      kind: string
      name: string
      rows: Array<{ name: string; optional?: boolean; type?: string; description?: string }>
    }
  | { type: 'spec-list'; groups: Array<{ title: string; tests: Array<string> }> }
  | { type: 'table'; headers: Array<string>; rows: Array<Array<string>> }
  | { type: 'list'; ordered: boolean; items: Array<string> }

export type DocPageData = {
  slug: string
  title: string
  description: string
  blocks: Array<DocBlock>
}

function renderInline(text: string): Array<JSX.Element> {
  const tokens: Array<JSX.Element> = []
  const re = /(\[[^\]]+\]\([^)]+\)|`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g
  let last = 0
  let match: RegExpExecArray | null
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      tokens.push(text.slice(last, match.index))
    }
    const token = match[0]
    if (token.startsWith('`')) {
      tokens.push(<code class="inline-code">{token.slice(1, -1)}</code>)
    } else if (token.startsWith('**')) {
      tokens.push(<strong>{token.slice(2, -2)}</strong>)
    } else if (token.startsWith('*')) {
      tokens.push(<em>{token.slice(1, -1)}</em>)
    } else if (token.startsWith('[')) {
      const m = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token)
      if (m && m[1] !== undefined && m[2] !== undefined) {
        const label = m[1]
        const href = m[2]
        const external = href.startsWith('http://') || href.startsWith('https://')
        tokens.push(
          <a
            href={href}
            class="doc-link"
            target={external ? '_blank' : undefined}
            rel={external ? 'noreferrer' : undefined}
          >
            {renderInline(label)}
          </a>,
        )
      } else {
        tokens.push(token)
      }
    }
    last = match.index + token.length
  }
  if (last < text.length) {
    tokens.push(text.slice(last))
  }
  return tokens
}

function StyleTabsBlock(props: { tabs: Array<{ label: string; lang: string; code: string }> }) {
  const [active, setActive] = createSignal(0)
  const current = () => props.tabs[active()] ?? props.tabs[0]

  return (
    <div class="style-tabs">
      <div class="style-tabs-bar" role="tablist">
        <For each={props.tabs}>
          {(tab, idx) => (
            <button
              type="button"
              role="tab"
              class="style-tab-btn"
              aria-selected={active() === idx() ? 'true' : 'false'}
              data-active={active() === idx() ? 'true' : undefined}
              onClick={() => setActive(idx())}
            >
              {tab.label}
            </button>
          )}
        </For>
      </div>
      <Show when={current()}>{(tab) => <CodeBlock title={tab().label} code={tab().code} />}</Show>
    </div>
  )
}

export function DocRenderer(props: { blocks: Array<DocBlock> }) {
  return (
    <div class="doc-blocks">
      <For each={props.blocks}>
        {(block) => (
          <Switch>
            <Match when={block.type === 'heading' ? block : null}>
              {(b) => (
                <Switch
                  fallback={
                    <h4 id={b().id} class="docs-h4">
                      {renderInline(b().text)}
                    </h4>
                  }
                >
                  <Match when={b().level === 2}>
                    <h2 id={b().id} class="docs-h2">
                      {renderInline(b().text)}
                    </h2>
                  </Match>
                  <Match when={b().level === 3}>
                    <h3 id={b().id} class="docs-h3">
                      {renderInline(b().text)}
                    </h3>
                  </Match>
                </Switch>
              )}
            </Match>

            <Match when={block.type === 'paragraph' ? block : null}>
              {(b) => <p class="docs-p">{renderInline(b().text)}</p>}
            </Match>

            <Match when={block.type === 'code' ? block : null}>
              {(b) => <CodeBlock title={b().title ?? b().lang} code={b().code} />}
            </Match>

            <Match when={block.type === 'style-tabs' ? block : null}>
              {(b) => <StyleTabsBlock tabs={b().tabs} />}
            </Match>

            <Match when={block.type === 'callout' ? block : null}>
              {(b) => (
                <div class="callout" data-variant={b().variant}>
                  <Show when={b().title}>
                    {(t) => <div class="callout-title">{renderInline(t())}</div>}
                  </Show>
                  <div>{renderInline(b().text)}</div>
                </div>
              )}
            </Match>

            <Match when={block.type === 'cards' ? block : null}>
              {(b) => (
                <div class="doc-cards">
                  <For each={b().cards}>
                    {(card) => (
                      <a href={card.href} class="doc-card">
                        <div class="doc-card-title">{card.title}</div>
                        <Show when={card.description}>
                          <div class="doc-card-desc">{card.description}</div>
                        </Show>
                      </a>
                    )}
                  </For>
                </div>
              )}
            </Match>

            <Match when={block.type === 'example' ? block : null}>
              {(b) => <ExampleViewer name={b().name} caption={b().caption} />}
            </Match>

            <Match when={block.type === 'component-grid'}>
              <div class="directory-grid doc-component-grid">
                <For each={COMPONENTS}>
                  {(comp) => (
                    <a class="directory-item" href={`#/docs/components/${comp.slug}`}>
                      <span class="directory-item-name">{comp.name}</span>
                      <span class="directory-item-slug">/{comp.slug}</span>
                    </a>
                  )}
                </For>
              </div>
            </Match>

            <Match when={block.type === 'css-variables' ? block : null}>
              {(b) => (
                <div class="api-dl-wrap">
                  <dl class="api-dl">
                    <For each={b().rows}>
                      {(row) => (
                        <div class="api-dl-row">
                          <dt class="api-dl-dt">
                            <code class="inline-code">{row.name}</code>
                          </dt>
                          <Show when={row.description}>
                            <dd class="api-dl-dd">{renderInline(row.description)}</dd>
                          </Show>
                        </div>
                      )}
                    </For>
                  </dl>
                </div>
              )}
            </Match>

            <Match when={block.type === 'data-attributes' ? block : null}>
              {(b) => (
                <div class="api-dl-wrap">
                  <dl class="api-dl">
                    <For each={b().rows}>
                      {(row) => (
                        <div class="api-dl-row">
                          <dt class="api-dl-dt">
                            <code class="inline-code">{row.name}</code>
                          </dt>
                          <Show when={row.description}>
                            <dd class="api-dl-dd">{renderInline(row.description)}</dd>
                          </Show>
                        </div>
                      )}
                    </For>
                  </dl>
                </div>
              )}
            </Match>

            <Match when={block.type === 'api-table' ? block : null}>
              {(b) => (
                <div class="api-dl-wrap">
                  <dl class="api-dl" aria-label={b().name}>
                    <For each={b().rows}>
                      {(row) => (
                        <div class="api-dl-row">
                          <dt class="api-dl-dt">
                            <code class="api-prop-name">
                              {row.name}
                              {row.optional ? '?' : ''}
                            </code>
                            <Show when={row.type}>
                              {(t) => <code class="api-prop-type">{t()}</code>}
                            </Show>
                          </dt>
                          <Show when={row.description}>
                            {(d) => <dd class="api-dl-dd">{renderInline(d())}</dd>}
                          </Show>
                        </div>
                      )}
                    </For>
                  </dl>
                </div>
              )}
            </Match>

            <Match when={block.type === 'spec-list' ? block : null}>
              {(b) => (
                <div class="spec-list">
                  <For each={b().groups}>
                    {(group) => (
                      <div class="spec-group">
                        <h4 class="spec-group-title">{group.title}</h4>
                        <ul class="spec-group-items">
                          <For each={group.tests}>{(test) => <li>{test}</li>}</For>
                        </ul>
                      </div>
                    )}
                  </For>
                </div>
              )}
            </Match>

            <Match when={block.type === 'table' ? block : null}>
              {(b) => (
                <div class="api-table-wrap">
                  <table class="api-table">
                    <thead>
                      <tr>
                        <For each={b().headers}>{(h) => <th>{renderInline(h)}</th>}</For>
                      </tr>
                    </thead>
                    <tbody>
                      <For each={b().rows}>
                        {(row) => (
                          <tr>
                            <For each={row}>{(cell) => <td>{renderInline(cell)}</td>}</For>
                          </tr>
                        )}
                      </For>
                    </tbody>
                  </table>
                </div>
              )}
            </Match>

            <Match when={block.type === 'list' ? block : null}>
              {(b) => (
                <Show
                  when={b().ordered}
                  fallback={
                    <ul class="doc-list">
                      <For each={b().items}>{(item) => <li>{renderInline(item)}</li>}</For>
                    </ul>
                  }
                >
                  <ol class="doc-list doc-list-ordered">
                    <For each={b().items}>{(item) => <li>{renderInline(item)}</li>}</For>
                  </ol>
                </Show>
              )}
            </Match>
          </Switch>
        )}
      </For>
    </div>
  )
}
