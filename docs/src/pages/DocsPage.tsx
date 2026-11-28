import { For, Show, createMemo } from 'solid-js'

import { DocRenderer } from '../components/DocRenderer'
import type { DocPageData } from '../components/DocRenderer'
import docsDataRaw from '../generated/docs-data.json'
import navRaw from '../generated/nav.json'

type NavGroup = {
  group: string
  items: Array<{ slug: string; title: string }>
}

type DocSection = 'solid' | 'guides' | 'agents' | 'core'

const DOCS_PAGES = docsDataRaw as Record<string, DocPageData>
const NAV_GROUPS = navRaw as Array<NavGroup>

const FALLBACK_PAGE: DocPageData = {
  slug: 'index',
  title: 'Documentation',
  description: '',
  blocks: [],
}

const SECTION_GROUPS: Record<DocSection, Set<string>> = {
  solid: new Set(['Get Started', 'Using Components', 'Build Your Own', 'Utilities', 'Components']),
  guides: new Set(['Guides']),
  agents: new Set(['Agents']),
  core: new Set(['Core & Behaviors']),
}

function sectionForSlug(slug: string): DocSection {
  if (slug === 'guides' || slug.startsWith('guides/')) {
    return 'guides'
  }
  if (slug === 'agents' || slug.startsWith('agents/')) {
    return 'agents'
  }
  if (slug === 'core' || slug.startsWith('core/')) {
    return 'core'
  }
  return 'solid'
}

function sectionForHash(hash: string): DocSection {
  const slug = hash.startsWith('#/docs/') ? (hash.slice('#/docs/'.length).split('#')[0] ?? '') : ''
  return sectionForSlug(slug)
}

function groupsForSection(section: DocSection): Array<NavGroup> {
  const allowed = SECTION_GROUPS[section]
  return NAV_GROUPS.filter((g) => allowed.has(g.group))
}

export function DocsSidebar(props: { currentHash: string; onSelect?: () => void }) {
  const visibleGroups = createMemo(() => groupsForSection(sectionForHash(props.currentHash)))

  return (
    <nav aria-label="Documentation navigation">
      <For each={visibleGroups()}>
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

  const currentHash = createMemo(() => `#/docs/${normalizedSlug()}`)

  const sectionEntries = createMemo(() =>
    groupsForSection(sectionForSlug(normalizedSlug())).flatMap((g) =>
      g.items.map((item) => ({
        slug: item.slug,
        hash: `#/docs/${item.slug}`,
        title: item.title,
        group: g.group,
      })),
    ),
  )

  const pager = createMemo(() => {
    const entries = sectionEntries()
    const idx = entries.findIndex((item) => item.slug === normalizedSlug())
    return {
      prev: idx > 0 ? entries[idx - 1] : undefined,
      next: idx >= 0 && idx < entries.length - 1 ? entries[idx + 1] : undefined,
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
        <div class="docs-header-row">
          <h1 class="docs-title">{page().title}</h1>
          <div class="docs-header-nav" aria-label="Page navigation">
            <Show
              when={pager().prev}
              fallback={
                <span class="docs-nav-btn" aria-disabled="true">
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                  >
                    <path d="m12 19-7-7 7-7" />
                    <path d="M19 12H5" />
                  </svg>
                </span>
              }
            >
              {(prev) => (
                <a
                  href={prev().hash}
                  class="docs-nav-btn"
                  aria-label={`Previous: ${prev().title}`}
                  title={prev().title}
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                  >
                    <path d="m12 19-7-7 7-7" />
                    <path d="M19 12H5" />
                  </svg>
                </a>
              )}
            </Show>
            <Show
              when={pager().next}
              fallback={
                <span class="docs-nav-btn" aria-disabled="true">
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                </span>
              }
            >
              {(next) => (
                <a
                  href={next().hash}
                  class="docs-nav-btn"
                  aria-label={`Next: ${next().title}`}
                  title={next().title}
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                </a>
              )}
            </Show>
          </div>
        </div>
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
