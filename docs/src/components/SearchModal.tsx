import { For, Show, createEffect, createMemo, createSignal } from 'solid-js'

import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
  Dialog,
  DialogBackdrop,
  DialogContent,
} from '../../../src'
import docsDataRaw from '../generated/docs-data.json'
import navRaw from '../generated/nav.json'

import type { DocPageData } from './DocRenderer'

type NavGroup = {
  group: string
  items: Array<{ slug: string; title: string }>
}

type SearchEntry = {
  slug: string
  title: string
  group: string
  description: string
  keywords: string
}

const DOCS_PAGES = docsDataRaw as Record<string, DocPageData>
const NAV_GROUPS = navRaw as Array<NavGroup>

const GUIDE_ENTRIES: Array<SearchEntry> = NAV_GROUPS.filter(
  (g) => g.group !== 'Components',
).flatMap((g) =>
  g.items.map((item) => {
    const desc = DOCS_PAGES[item.slug]?.description ?? ''
    return {
      slug: item.slug,
      title: item.title,
      group: g.group,
      description: desc,
      keywords: `${item.title} ${item.slug} ${g.group} ${desc}`.toLowerCase(),
    }
  }),
)

const COMPONENT_ENTRIES: Array<SearchEntry> = NAV_GROUPS.filter(
  (g) => g.group === 'Components',
).flatMap((g) =>
  g.items.map((item) => {
    const desc = DOCS_PAGES[item.slug]?.description ?? ''
    return {
      slug: item.slug,
      title: item.title,
      group: g.group,
      description: desc,
      keywords: `${item.title} ${item.slug} ${desc}`.toLowerCase(),
    }
  }),
)

export function SearchModal(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onNavigate: (hash: string) => void
}) {
  const [query, setQuery] = createSignal('')

  createEffect(
    () => props.open,
    (isOpen) => {
      if (isOpen) {
        setQuery('')
      }
    },
  )

  const filteredGuides = createMemo(() => {
    const q = query().trim().toLowerCase()
    if (!q) {
      return GUIDE_ENTRIES.slice(0, 12)
    }
    return GUIDE_ENTRIES.filter((g) => g.keywords.includes(q))
  })

  const filteredComponents = createMemo(() => {
    const q = query().trim().toLowerCase()
    if (!q) {
      return COMPONENT_ENTRIES.slice(0, 16)
    }
    return COMPONENT_ENTRIES.filter((c) => c.keywords.includes(q))
  })

  const select = (hash: string) => {
    props.onOpenChange(false)
    props.onNavigate(hash)
  }

  return (
    <Dialog open={props.open} onOpenChange={(next) => props.onOpenChange(next)}>
      <DialogBackdrop class="ui-backdrop" />
      <DialogContent class="ui-dialog search-dialog">
        <Command query={query()} onQueryChange={(v) => setQuery(v)}>
          <div class="search-input-wrap">
            <span class="ui-state-pill">/</span>
            <CommandInput
              class="search-input"
              placeholder="Search 119 docs pages & 55 components..."
            />
            <button
              type="button"
              class="search-close-btn"
              onClick={() => props.onOpenChange(false)}
              aria-label="Close search"
            >
              <span class="search-close-desktop">ESC</span>
              <span class="search-close-mobile" aria-hidden="true">
                ×
              </span>
            </button>
          </div>
          <CommandList class="search-list">
            <Show when={filteredGuides().length > 0}>
              <>
                <div class="search-group-label">Docs &amp; Guides</div>
                <For each={filteredGuides()}>
                  {(guide) => (
                    <CommandItem
                      class="ui-command-item"
                      value={`guide-${guide.slug}`}
                      onSelect={() => select(`#/docs/${guide.slug}`)}
                    >
                      <span class="search-item-label">{guide.title}</span>
                      <span class="ui-state-pill search-item-meta">{guide.group}</span>
                    </CommandItem>
                  )}
                </For>
              </>
            </Show>
            <Show when={filteredComponents().length > 0}>
              <>
                <div class="search-group-label">Components</div>
                <For each={filteredComponents()}>
                  {(comp) => (
                    <CommandItem
                      class="ui-command-item"
                      value={`comp-${comp.slug}`}
                      onSelect={() => select(`#/docs/${comp.slug}`)}
                    >
                      <span class="search-item-label">{comp.title}</span>
                      <span class="ui-state-pill search-item-meta">
                        @subf/ui/{comp.slug.replace(/^components\//, '')}
                      </span>
                    </CommandItem>
                  )}
                </For>
              </>
            </Show>
            <Show when={filteredGuides().length === 0 && filteredComponents().length === 0}>
              <CommandEmpty class="search-empty">No matching docs or components.</CommandEmpty>
            </Show>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
