import { For, createSignal } from 'solid-js'

import { COMPONENTS } from '../data/components'
import { renderComponentDemo } from '../demos'

const FEATURED_TILES: Array<{ slug: string; title: string }> = [
  { slug: 'switch', title: 'Switch' },
  { slug: 'segmented-control', title: 'Segmented Control' },
  { slug: 'slider', title: 'Slider' },
  { slug: 'tabs', title: 'Tabs' },
  { slug: 'accordion', title: 'Accordion' },
  { slug: 'dialog', title: 'Dialog' },
  { slug: 'select', title: 'Select' },
  { slug: 'number-input', title: 'Number Input' },
  { slug: 'otp-input', title: 'OTP Input' },
  { slug: 'rating', title: 'Rating' },
  { slug: 'popover', title: 'Popover' },
  { slug: 'command', title: 'Command' },
]

export function HomePage() {
  const [copied, setCopied] = createSignal(false)

  const copyInstall = () => {
    void navigator.clipboard?.writeText('pnpm add @subf/ui').then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    })
  }

  return (
    <main class="container home-main">
      <h1 class="hero-title">
        A SolidJS 2 native UI SDK for building accessible, agent-ready interfaces.
      </h1>
      <p class="hero-sub">
        API-compatible with <code class="inline-code">@ui-sdk/solid</code>, rewritten directly on
        Solid 2 signals — zero kernel bridge, native array refs, imperative controllers, and 56
        tree-shakeable components.
      </p>

      <div class="hero-actions">
        <a href="#/docs/index" class="btn-primary">
          Get Started →
        </a>
        <a href="#/sink" class="btn-secondary">
          Open Kitchen Sink
        </a>
        <div class="install-pill">
          <code>pnpm add @subf/ui</code>
          <button type="button" onClick={copyInstall}>
            {copied() ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      <div class="poster-grid">
        <div class="poster-card poster-card-muted">
          <p class="poster-kicker">/solid-2</p>
          <p class="poster-copy">
            No framework-agnostic kernel. Every primitive runs directly on Solid 2{' '}
            <code class="inline-code">createSignal</code>, <code class="inline-code">merge()</code>,{' '}
            <code class="inline-code">omit()</code>, and <code class="inline-code">isStatic()</code>{' '}
            — updating attributes in place without recreating DOM nodes.
          </p>
        </div>
        <div class="poster-card">
          <p class="poster-kicker poster-kicker-accent">56 parts. 1 dep.</p>
          <p class="poster-copy poster-copy-subtle">
            Only <code class="inline-code">@floating-ui/dom</code> at runtime. Every component ships
            with keyboard navigation, focus trapping, dismissal layers, cancelable{' '}
            <code class="inline-code">ChangeDetails</code>, and live{' '}
            <code class="inline-code">@subf/ui/agent</code> introspection.
          </p>
          <div class="ui-row">
            <a href="#/docs/installation" class="btn-secondary">
              Installation
            </a>
            <a href="#/docs/agents" class="btn-secondary">
              Agent Runtime
            </a>
          </div>
        </div>
      </div>

      <div class="editorial-rule" />

      <h2 class="section-heading">Interactive Components</h2>
      <p class="section-lead">
        Every tile below is a live SolidJS 2 component rendered directly from{' '}
        <code class="inline-code">@subf/ui</code>. Try clicking, typing, and navigating with the
        keyboard.
      </p>

      <div class="bento-grid">
        <For each={FEATURED_TILES}>
          {(tile) => (
            <div class="bento-tile">
              <div class="bento-tile-head">
                <span class="bento-tile-title">{tile.title}</span>
                <a class="bento-tile-link" href={`#/docs/components/${tile.slug}`}>
                  docs →
                </a>
              </div>
              <div class="bento-tile-body">{renderComponentDemo(tile.slug)}</div>
            </div>
          )}
        </For>
      </div>

      <div class="editorial-rule" />

      <h2 class="section-heading">Architecture</h2>
      <p class="section-lead">
        Designed around Solid 2&apos;s fine-grained reactivity model while keeping familiar{' '}
        <code class="inline-code">ui-sdk.dev</code> ergonomics.
      </p>

      <div class="feature-grid">
        <div class="feature-card">
          <h3>Zero-Copy renderPart</h3>
          <p>
            Composes internal ARIA attributes, passthrough props, and reactive overrides using Solid
            2 <code class="inline-code">merge()</code> and{' '}
            <code class="inline-code">isStatic()</code>.
          </p>
        </div>
        <div class="feature-card">
          <h3>Imperative Controllers</h3>
          <p>
            Open dialogs with typed payloads, await return values, or drive tabs and popups from
            outside JSX trees.
          </p>
        </div>
        <div class="feature-card">
          <h3>Agent &amp; Observe API</h3>
          <p>
            Discover mounted components via{' '}
            <code class="inline-code">createAgent().snapshot()</code>, read state, and subscribe to
            changes via <code class="inline-code">observe()</code>.
          </p>
        </div>
        <div class="feature-card">
          <h3>Strict QA &amp; Types</h3>
          <p>
            Zero <code class="inline-code">oxlint</code> warnings, clean{' '}
            <code class="inline-code">tsrs</code> types, and zero Solid 2 runtime diagnostics across
            all tests.
          </p>
        </div>
      </div>

      <div class="editorial-rule" />

      <h2 class="section-heading">All {COMPONENTS.length} Components</h2>
      <p class="section-lead">
        Every subpath export in <code class="inline-code">@subf/ui</code>, ready to inspect and
        copy.
      </p>

      <div class="directory-grid">
        <For each={COMPONENTS}>
          {(comp) => (
            <a class="directory-item" href={`#/docs/components/${comp.slug}`}>
              <span class="directory-item-name">{comp.name}</span>
              <span class="directory-item-slug">/{comp.slug}</span>
            </a>
          )}
        </For>
      </div>
    </main>
  )
}
