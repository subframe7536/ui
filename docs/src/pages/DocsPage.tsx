import { For, Show, createEffect, createMemo, createSignal } from 'solid-js'

import { DocRenderer } from '../components/DocRenderer'
import type { DocPageData } from '../components/DocRenderer'
import docsDataRaw from '../generated/docs-data.json'
import navRaw from '../generated/nav.json'

type NavGroup = {
  group: string
  items: Array<{ slug: string; title: string }>
}

type DocSection = 'solid' | 'guides' | 'agents' | 'core'

type TocItem = {
  id: string
  label: string
  level: number
}

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

function revealCurrent(list: Element) {
  const link = list.querySelector('[aria-current="page"]')
  if (!link) {
    return
  }
  const box = list.getBoundingClientRect()
  const item = link.getBoundingClientRect()
  if (item.top >= box.top && item.bottom <= box.bottom) {
    return
  }
  list.scrollTop += item.top - box.top - (box.height - item.height) / 2
}

export function DocsSidebar(props: {
  currentHash: string
  tocItems?: Array<TocItem>
  activeId?: string
  onSelect?: () => void
}) {
  const visibleGroups = createMemo(() => groupsForSection(sectionForHash(props.currentHash)))
  let scroller: HTMLDivElement | undefined

  createEffect(
    () => props.currentHash,
    () => {
      const list = scroller
      if (!list) {
        return
      }
      let timeout: ReturnType<typeof setTimeout> | undefined
      const frame = requestAnimationFrame(() => {
        timeout = setTimeout(() => revealCurrent(list))
      })
      return () => {
        cancelAnimationFrame(frame)
        if (timeout !== undefined) {
          clearTimeout(timeout)
        }
      }
    },
  )

  return (
    <div class="docs-sidebar-wrap">
      <div ref={scroller} class="docs-sidebar-scroller">
        <nav aria-label="Docs">
          <ul class="sidebar-nodes">
            <For each={visibleGroups()}>
              {(group) => (
                <li class="sidebar-group">
                  <div class="sidebar-group-title">{group.group}</div>
                  <ul class="sidebar-list">
                    <For each={group.items}>
                      {(item) => {
                        const href = `#/docs/${item.slug}`
                        const isActive = () => props.currentHash === href
                        return (
                          <li>
                            <a
                              href={href}
                              class="sidebar-link"
                              aria-current={isActive() ? 'page' : undefined}
                              onClick={() => props.onSelect?.()}
                            >
                              {item.title}
                            </a>
                            <Show when={isActive() && (props.tocItems?.length ?? 0) > 1}>
                              <div class="sidebar-inline-toc">
                                <ul class="sidebar-inline-toc-list">
                                  <For each={props.tocItems}>
                                    {(heading) => (
                                      <li>
                                        <a
                                          href={`#${heading.id}`}
                                          class="sidebar-inline-toc-link"
                                          aria-current={
                                            props.activeId === heading.id ? 'location' : undefined
                                          }
                                          onClick={(e) => {
                                            e.preventDefault()
                                            document
                                              .getElementById(heading.id)
                                              ?.scrollIntoView({ behavior: 'smooth' })
                                          }}
                                        >
                                          {heading.label}
                                        </a>
                                      </li>
                                    )}
                                  </For>
                                </ul>
                              </div>
                            </Show>
                          </li>
                        )
                      }}
                    </For>
                  </ul>
                </li>
              )}
            </For>
          </ul>
        </nav>
      </div>
    </div>
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

  const tocItems = createMemo<Array<TocItem>>(() =>
    page()
      .blocks.filter(
        (b): b is Extract<DocPageData['blocks'][number], { type: 'heading' }> =>
          b.type === 'heading' && b.level >= 2 && b.level <= 3,
      )
      .map((h) => ({ id: h.id, label: h.text, level: h.level })),
  )

  const h2TocItems = createMemo(() => tocItems().filter((item) => item.level <= 2))
  const [activeId, setActiveId] = createSignal('')

  createEffect(
    () => tocItems(),
    (items) => {
      if (items.length === 0) {
        setActiveId('')
        return
      }
      setActiveId(items[0]?.id ?? '')

      const updateActive = () => {
        const threshold = 110
        let current = items[0]?.id ?? ''
        for (const item of items) {
          const el = document.getElementById(item.id)
          if (el && el.getBoundingClientRect().top <= threshold) {
            current = item.id
          }
        }
        setActiveId(current)
      }

      const frame = requestAnimationFrame(updateActive)
      window.addEventListener('scroll', updateActive, { passive: true })
      return () => {
        cancelAnimationFrame(frame)
        window.removeEventListener('scroll', updateActive)
      }
    },
  )

  return (
    <div data-docs="" class="container docs-layout">
      <div class="docs-layout-body">
        <aside class="docs-aside">
          <div class="docs-aside-sticky">
            <DocsSidebar
              currentHash={currentHash()}
              tocItems={h2TocItems()}
              activeId={activeId()}
            />
          </div>
        </aside>

        <div class="docs-main-wrap">
          <main class="docs-main">
            <div class="docs-article-wrap">
              <article class="docs-article">
                <header class="docs-article-header">
                  <div class="docs-header-row">
                    <h1 class="docs-title">{page().title}</h1>
                    <Show when={pager().prev || pager().next}>
                      <div class="docs-header-nav" aria-label="Page navigation">
                        <Show when={pager().prev}>
                          {(prev) => (
                            <a
                              href={prev().hash}
                              class="docs-nav-btn"
                              aria-label={`Previous: ${prev().title}`}
                              title={prev().title}
                            >
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="1.5"
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
                        <Show when={pager().next}>
                          {(next) => (
                            <a
                              href={next().hash}
                              class="docs-nav-btn"
                              aria-label={`Next: ${next().title}`}
                              title={next().title}
                            >
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="1.5"
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
                    </Show>
                  </div>
                  <Show when={page().description}>
                    <p class="docs-lead">{page().description}</p>
                  </Show>
                </header>

                <DocRenderer blocks={page().blocks} />

                <Show when={pager().prev || pager().next}>
                  <nav aria-label="Pages" class="docs-pager">
                    <Show when={pager().prev} fallback={<span />}>
                      {(prev) => (
                        <a href={prev().hash} class="pager-link pager-link-prev">
                          <span class="pager-label">Previous</span>
                          <span class="pager-title">{prev().title}</span>
                        </a>
                      )}
                    </Show>
                    <Show when={pager().next}>
                      {(next) => (
                        <a href={next().hash} class="pager-link pager-link-next">
                          <span class="pager-label">Next</span>
                          <span class="pager-title">{next().title}</span>
                        </a>
                      )}
                    </Show>
                  </nav>
                </Show>
              </article>
            </div>

            <div class="docs-toc-rail">
              <nav aria-label="On this page" class="docs-toc">
                <Show when={tocItems().length > 1}>
                  <div class="toc-title">On this page</div>
                  <ul class="toc-list">
                    <For each={tocItems()}>
                      {(item) => (
                        <li>
                          <a
                            href={`#${item.id}`}
                            class="toc-link"
                            data-depth={item.level > 2 ? '3' : '2'}
                            aria-current={activeId() === item.id ? 'location' : undefined}
                            onClick={(e) => {
                              e.preventDefault()
                              document
                                .getElementById(item.id)
                                ?.scrollIntoView({ behavior: 'smooth' })
                            }}
                          >
                            {item.label}
                          </a>
                        </li>
                      )}
                    </For>
                  </ul>
                  <div class="toc-divider" />
                </Show>
                <div class="toc-actions">
                  <Show when={tocItems().length > 1}>
                    <button
                      type="button"
                      class="toc-action"
                      onClick={() => {
                        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
                        window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
                      }}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        aria-hidden="true"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <path d="m16 12-4-4-4 4" />
                        <path d="M12 16V8" />
                      </svg>
                      Scroll to top
                    </button>
                  </Show>
                </div>
              </nav>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
