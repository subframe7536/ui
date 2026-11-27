import { Match, Switch, createEffect, createSignal, onSettled } from 'solid-js'

import { Drawer, DrawerBackdrop, DrawerClose, DrawerContent, DrawerTitle } from '../../src'

import { SearchModal } from './components/SearchModal'
import { DocsPage, DocsSidebar } from './pages/DocsPage'
import { HomePage } from './pages/HomePage'
import { SinkPage } from './pages/SinkPage'

type ColorScheme = 'system' | 'light' | 'dark'

function readHash(): string {
  const raw = window.location.hash
  return raw && raw.startsWith('#/') ? raw : '#/'
}

function nextTheme(current: ColorScheme): ColorScheme {
  if (current === 'system') {
    return 'light'
  }
  if (current === 'light') {
    return 'dark'
  }
  return 'system'
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'instant' })
  document.querySelector('.docs-article')?.scrollTo({ top: 0, behavior: 'instant' })
}

export function App() {
  const [hash, setHash] = createSignal(readHash())
  const [searchOpen, setSearchOpen] = createSignal(false)
  const [mobileNavOpen, setMobileNavOpen] = createSignal(false)
  const [theme, setTheme] = createSignal<ColorScheme>(
    (document.documentElement.dataset.colorScheme as ColorScheme | undefined) ?? 'system',
  )

  const navigate = (target: string) => {
    window.location.hash = target
    setHash(target)
    scrollToTop()
  }

  const onHashChange = () => {
    setHash(readHash())
    scrollToTop()
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault()
      setSearchOpen((open) => !open)
    }
  }

  onSettled(() => {
    window.addEventListener('hashchange', onHashChange)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('hashchange', onHashChange)
      window.removeEventListener('keydown', onKeyDown)
    }
  })

  createEffect(
    () => theme(),
    (mode) => {
      document.documentElement.dataset.colorScheme = mode
      try {
        localStorage.setItem('subf-ui-theme', mode)
      } catch {
        // Ignore storage errors in restricted contexts
      }
    },
  )

  const docsRoute = () => {
    const h = hash()
    if (h.startsWith('#/docs/')) {
      return h.slice('#/docs/'.length)
    }
    return 'index'
  }

  const isDocs = () => hash().startsWith('#/docs')
  const isSink = () => hash().startsWith('#/sink')

  return (
    <div class="site-shell">
      <header class="site-header">
        <div class="container site-header-inner">
          <div class="brand-group">
            <a href="#/" class="brand-group" aria-label="@subf/ui home">
              <span class="brand-mark">ui</span>
              <span class="brand-name">@subf/ui</span>
            </a>
            <span class="brand-badge">Solid 2</span>
          </div>

          <nav class="header-nav" aria-label="Primary">
            <a
              href="#/docs/index"
              class="header-nav-link"
              data-active={isDocs() ? 'true' : undefined}
            >
              Docs
            </a>
            <a
              href="#/docs/components/button"
              class="header-nav-link"
              data-active={hash().startsWith('#/docs/components/') ? 'true' : undefined}
            >
              Components
            </a>
            <a href="#/sink" class="header-nav-link" data-active={isSink() ? 'true' : undefined}>
              Sink
            </a>
          </nav>

          <div class="header-actions">
            <button
              type="button"
              class="search-trigger"
              onClick={() => setSearchOpen(true)}
              aria-label="Search docs"
            >
              <svg
                class="search-trigger-icon"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <span class="search-trigger-label">Search docs</span>
              <kbd class="search-kbd">⌘K</kbd>
            </button>

            <button
              type="button"
              class="icon-btn"
              onClick={() => setTheme((t) => nextTheme(t))}
              title="Toggle theme (system / light / dark)"
              aria-label="Toggle color theme"
            >
              {theme() === 'light' ? '☀' : theme() === 'dark' ? '☾' : '◐'}
            </button>

            <a
              href="https://github.com/subframe7536/ui"
              target="_blank"
              rel="noreferrer"
              class="icon-btn header-github-link"
            >
              GitHub
            </a>

            <button
              type="button"
              class="icon-btn mobile-menu-btn"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open navigation menu"
            >
              ☰
            </button>
          </div>
        </div>
        <div class="site-header-rule" />
      </header>

      <Switch fallback={<HomePage />}>
        <Match when={isDocs()}>
          <DocsPage route={docsRoute()} />
        </Match>
        <Match when={isSink()}>
          <SinkPage />
        </Match>
      </Switch>

      <footer class="site-footer">
        <div class="container site-footer-inner">
          <span>
            @subf/ui — SolidJS 2 native headless UI SDK, inspired by{' '}
            <a
              href="https://ui-sdk.dev"
              target="_blank"
              rel="noreferrer"
              style={{ 'text-decoration': 'underline' }}
            >
              ui-sdk.dev
            </a>
            .
          </span>
          <div class="ui-row footer-links">
            <a href="#/docs/index">Docs</a>
            <a href="#/sink">Kitchen Sink</a>
            <a href="https://github.com/subframe7536/ui" target="_blank" rel="noreferrer">
              GitHub
            </a>
          </div>
        </div>
      </footer>

      <SearchModal
        open={searchOpen()}
        onOpenChange={(open) => setSearchOpen(open)}
        onNavigate={navigate}
      />

      <Drawer side="right" open={mobileNavOpen()} onOpenChange={(open) => setMobileNavOpen(open)}>
        <DrawerBackdrop class="ui-backdrop" />
        <DrawerContent class="ui-drawer">
          <div class="drawer-header">
            <DrawerTitle class="drawer-title">Navigation</DrawerTitle>
            <DrawerClose class="ui-btn drawer-close-btn" aria-label="Close navigation menu">
              ×
            </DrawerClose>
          </div>
          <div class="drawer-quick-links">
            <a href="#/" class="ui-btn" onClick={() => setMobileNavOpen(false)}>
              Home
            </a>
            <a href="#/sink" class="ui-btn" onClick={() => setMobileNavOpen(false)}>
              Sink
            </a>
            <a
              href="https://github.com/subframe7536/ui"
              target="_blank"
              rel="noreferrer"
              class="ui-btn"
              onClick={() => setMobileNavOpen(false)}
            >
              GitHub
            </a>
          </div>
          <DocsSidebar currentHash={hash()} onSelect={() => setMobileNavOpen(false)} />
        </DrawerContent>
      </Drawer>
    </div>
  )
}
