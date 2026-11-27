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
import { COMPONENTS } from '../data/components'
import { GUIDES } from '../data/guides'

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
      return GUIDES
    }
    return GUIDES.filter(
      (g) => g.title.toLowerCase().includes(q) || g.description.toLowerCase().includes(q),
    )
  })

  const filteredComponents = createMemo(() => {
    const q = query().trim().toLowerCase()
    if (!q) {
      return COMPONENTS.slice(0, 14)
    }
    return COMPONENTS.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        c.summary.toLowerCase().includes(q),
    )
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
            <CommandInput class="search-input" placeholder="Search guides and 56 components..." />
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
                <div class="search-group-label">Guides</div>
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
                      onSelect={() => select(`#/docs/components/${comp.slug}`)}
                    >
                      <span class="search-item-label">{comp.name}</span>
                      <span class="ui-state-pill search-item-meta">@subf/ui/{comp.slug}</span>
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
