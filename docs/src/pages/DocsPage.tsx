import { For, Show, createMemo } from 'solid-js'

import { CodeBlock } from '../components/CodeBlock'
import { COMPONENT_CATEGORIES, COMPONENTS, getComponentDoc } from '../data/components'
import { GUIDES } from '../data/guides'
import { renderComponentDemo } from '../demos'

const GUIDE_GROUPS = ['Get Started', 'Using Components', 'Architecture'] as const

type NavEntry = { hash: string; title: string }

const ALL_NAV_ENTRIES: Array<NavEntry> = [
  ...GUIDES.map((g) => ({ hash: `#/docs/${g.slug}`, title: g.title })),
  ...COMPONENTS.map((c) => ({ hash: `#/docs/components/${c.slug}`, title: c.name })),
]

export function DocsSidebar(props: { currentHash: string; onSelect?: () => void }) {
  return (
    <nav aria-label="Documentation navigation">
      <For each={GUIDE_GROUPS}>
        {(group) => (
          <div class="sidebar-group">
            <h3 class="sidebar-group-title">{group}</h3>
            <ul class="sidebar-list">
              <For each={GUIDES.filter((g) => g.group === group)}>
                {(guide) => {
                  const href = `#/docs/${guide.slug}`
                  return (
                    <li>
                      <a
                        href={href}
                        class="sidebar-link"
                        data-active={props.currentHash === href ? 'true' : undefined}
                        onClick={() => props.onSelect?.()}
                      >
                        {guide.title}
                      </a>
                    </li>
                  )
                }}
              </For>
            </ul>
          </div>
        )}
      </For>

      <For each={COMPONENT_CATEGORIES}>
        {(category) => (
          <div class="sidebar-group">
            <h3 class="sidebar-group-title">{category}</h3>
            <ul class="sidebar-list">
              <For each={COMPONENTS.filter((c) => c.category === category)}>
                {(comp) => {
                  const href = `#/docs/components/${comp.slug}`
                  return (
                    <li>
                      <a
                        href={href}
                        class="sidebar-link"
                        data-active={props.currentHash === href ? 'true' : undefined}
                        onClick={() => props.onSelect?.()}
                      >
                        {comp.name}
                      </a>
                    </li>
                  )
                }}
              </For>
            </ul>
          </div>
        )}
      </For>
    </nav>
  )
}

export function DocsPage(props: { route: string }) {
  const isComponent = () => props.route.startsWith('components/')
  const slug = () =>
    isComponent() ? props.route.slice('components/'.length) : props.route || 'index'

  const componentDoc = createMemo(() => (isComponent() ? getComponentDoc(slug()) : undefined))
  const guideDoc = createMemo(() =>
    !isComponent() ? (GUIDES.find((g) => g.slug === slug()) ?? GUIDES[0]) : undefined,
  )

  const currentHash = createMemo(() =>
    isComponent() ? `#/docs/components/${slug()}` : `#/docs/${guideDoc()?.slug ?? 'index'}`,
  )

  const pager = createMemo(() => {
    const idx = ALL_NAV_ENTRIES.findIndex((item) => item.hash === currentHash())
    return {
      prev: idx > 0 ? ALL_NAV_ENTRIES[idx - 1] : undefined,
      next: idx >= 0 && idx < ALL_NAV_ENTRIES.length - 1 ? ALL_NAV_ENTRIES[idx + 1] : undefined,
    }
  })

  const tocItems = createMemo(() => {
    const comp = componentDoc()
    if (comp) {
      return [
        { id: 'preview', label: 'Live Preview' },
        { id: 'usage', label: 'Usage' },
        { id: 'parts', label: 'Exported Parts' },
        ...(comp.dataAttrs.length > 0 ? [{ id: 'data-attributes', label: 'Data Attributes' }] : []),
      ]
    }
    const guide = guideDoc()
    return guide ? guide.sections.map((s) => ({ id: s.id, label: s.heading })) : []
  })

  return (
    <div class="container docs-shell">
      <aside class="docs-sidebar">
        <DocsSidebar currentHash={currentHash()} />
      </aside>

      <article class="docs-article">
        <Show
          when={componentDoc()}
          fallback={
            <Show when={guideDoc()}>
              {(guide) => (
                <>
                  <p class="docs-eyebrow">{guide().group}</p>
                  <h1 class="docs-title">{guide().title}</h1>
                  <p class="docs-lead">{guide().description}</p>

                  <For each={guide().sections}>
                    {(sec) => (
                      <section>
                        <h2 id={sec.id} class="docs-h2">
                          {sec.heading}
                        </h2>
                        <For each={sec.paragraphs}>{(p) => <p class="docs-p">{p}</p>}</For>
                        <Show when={sec.callout}>
                          {(callout) => <div class="callout">{callout()}</div>}
                        </Show>
                        <Show when={sec.code}>
                          {(code) => <CodeBlock title={code().title} code={code().content} />}
                        </Show>
                      </section>
                    )}
                  </For>
                </>
              )}
            </Show>
          }
        >
          {(comp) => {
            const liveDemo = createMemo(() => renderComponentDemo(comp().slug))
            return (
              <>
                <p class="docs-eyebrow">{comp().category}</p>
                <h1 class="docs-title">{comp().name}</h1>
                <p class="docs-lead">{comp().summary}</p>

                <div class="docs-meta-row">
                  <span class="meta-pill">
                    import <strong>@subf/ui/{comp().slug}</strong>
                  </span>
                  <Show when={comp().controller}>
                    {(ctrl) => (
                      <span class="meta-pill">
                        controller <strong>{ctrl()}</strong>
                      </span>
                    )}
                  </Show>
                </div>

                <h2 id="preview" class="docs-h2">
                  Live Preview
                </h2>
                <Show
                  when={liveDemo()}
                  fallback={
                    <div class="callout">
                      Import directly from <code class="inline-code">@subf/ui/{comp().slug}</code>.
                      See the usage snippet and exported parts below for full composition details.
                    </div>
                  }
                >
                  {(demo) => (
                    <div class="preview-box">
                      <div class="preview-box-bar">
                        <span>@subf/ui/{comp().slug}</span>
                        <span>interactive solid 2</span>
                      </div>
                      <div class="preview-box-stage">{demo()}</div>
                    </div>
                  )}
                </Show>

                <h2 id="usage" class="docs-h2">
                  Usage
                </h2>
                <CodeBlock title={`${comp().slug}.tsx`} code={comp().example} />

                <h2 id="parts" class="docs-h2">
                  Exported Parts
                </h2>
                <div class="api-table-wrap">
                  <table class="api-table">
                    <thead>
                      <tr>
                        <th>Export</th>
                        <th>Entry Point</th>
                      </tr>
                    </thead>
                    <tbody>
                      <For each={comp().parts}>
                        {(part) => (
                          <tr>
                            <td>
                              <code class="inline-code">{part}</code>
                            </td>
                            <td>
                              <code class="inline-code">@subf/ui/{comp().slug}</code>
                            </td>
                          </tr>
                        )}
                      </For>
                    </tbody>
                  </table>
                </div>

                <Show when={comp().dataAttrs.length > 0}>
                  <h2 id="data-attributes" class="docs-h2">
                    Data Attributes
                  </h2>
                  <div class="ui-row">
                    <For each={comp().dataAttrs}>
                      {(attr) => <span class="ui-chip">{attr}</span>}
                    </For>
                  </div>
                </Show>
              </>
            )
          }}
        </Show>

        <nav class="docs-pager" aria-label="Pagination">
          <Show when={pager().prev}>
            {(prev) => (
              <a href={prev().hash} class="pager-link pager-link-prev">
                <span class="pager-label">← Previous</span>
                <span class="pager-title">{prev().title}</span>
              </a>
            )}
          </Show>
          <Show when={pager().next}>
            {(next) => (
              <a href={next().hash} class="pager-link pager-link-next">
                <span class="pager-label">Next →</span>
                <span class="pager-title">{next().title}</span>
              </a>
            )}
          </Show>
        </nav>
      </article>

      <aside class="docs-toc">
        <div class="toc-title">On this page</div>
        <ul class="toc-list">
          <For each={tocItems()}>
            {(item) => (
              <li>
                <a
                  href={`#${item.id}`}
                  class="toc-link"
                  onClick={(e) => {
                    e.preventDefault()
                    document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' })
                  }}
                >
                  {item.label}
                </a>
              </li>
            )}
          </For>
        </ul>
      </aside>
    </div>
  )
}
