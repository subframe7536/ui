import { For, Show, createMemo } from 'solid-js'

import { DocRenderer, type DocPageData } from '../components/DocRenderer'
import docsDataRaw from '../generated/docs-data.json'
import navRaw from '../generated/nav.json'

type NavGroup = {
  group: string
  items: Array<{ slug: string; title: string }>
}

const DOCS_PAGES = docsDataRaw as Record<string, DocPageData>
const NAV_GROUPS = navRaw as Array<NavGroup>

const FALLBACK_PAGE: DocPageData = {
  slug: 'index',
  title: 'Documentation',
  description: '',
  blocks: [],
}

const ALL_NAV_ENTRIES = NAV_GROUPS.flatMap((g) =>
  g.items.map((item) => ({
    slug: item.slug,
    hash: `#/docs/${item.slug}`,
    title: item.title,
    group: g.group,
  })),
)

export function DocsSidebar(props: { currentHash: string; onSelect?: () => void }) {
  return (
    <nav aria-label="Documentation navigation">
      <For each={NAV_GROUPS}>
        {(group) => (
          <div class="sidebar-group">
            <h3 class="sidebar-group-title">{group.group}</h3>
            <ul class="sidebar-list">
              <For each={group.items}>
                {(item) => {
                  const href = `#/docs/${item.slug}`
                  return (
                    <li>
                      <a
                        href={href}
                        class="sidebar-link"
                        data-active={props.currentHash === href ? 'true' : undefined}
                        onClick={() => props.onSelect?.()}
                      >
                        {item.title}
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
  const normalizedSlug = createMemo(() => {
    const clean = (props.route || 'index').split('#')[0]?.replace(/\/$/, '') ?? 'index'
    if (DOCS_PAGES[clean]) {
      return clean
    }
    if (DOCS_PAGES[`${clean}/index`]) {
      return `${clean}/index`
    }
    return 'index'
  })

  const page = createMemo<DocPageData>(
    () => DOCS_PAGES[normalizedSlug()] ?? DOCS_PAGES.index ?? FALLBACK_PAGE,
  )

  const currentNav = createMemo(() =>
    ALL_NAV_ENTRIES.find((item) => item.slug === normalizedSlug()),
  )

  const currentHash = createMemo(() => `#/docs/${normalizedSlug()}`)

  const pager = createMemo(() => {
    const idx = ALL_NAV_ENTRIES.findIndex((item) => item.slug === normalizedSlug())
    return {
      prev: idx > 0 ? ALL_NAV_ENTRIES[idx - 1] : undefined,
      next: idx >= 0 && idx < ALL_NAV_ENTRIES.length - 1 ? ALL_NAV_ENTRIES[idx + 1] : undefined,
    }
  })

  const tocItems = createMemo(() =>
    page()
      .blocks.filter(
        (b): b is Extract<DocPageData['blocks'][number], { type: 'heading' }> =>
          b.type === 'heading' && b.level === 2,
      )
      .map((h) => ({ id: h.id, label: h.text })),
  )

  return (
    <div class="container docs-shell">
      <aside class="docs-sidebar">
        <DocsSidebar currentHash={currentHash()} />
      </aside>

      <article class="docs-article">
        <p class="docs-eyebrow">{currentNav()?.group ?? 'Documentation'}</p>
        <h1 class="docs-title">{page().title}</h1>
        <Show when={page().description}>
          <p class="docs-lead">{page().description}</p>
        </Show>

        <DocRenderer blocks={page().blocks} />

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
