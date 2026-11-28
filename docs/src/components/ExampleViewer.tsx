import type { JSX } from '@solidjs/web'
import { For, Show, createEffect, createSignal } from 'solid-js'

import { LogContext } from '../examples-custom/_helpers/log'
import exampleSourcesRaw from '../generated/example-sources.json'

import { CodeBlock } from './CodeBlock'

type ExampleModule = {
  Example?: () => JSX.Element
  default?: () => JSX.Element
}

const EXAMPLE_LOADERS = import.meta.glob<ExampleModule>('../examples/*/*.tsx')
const EXAMPLE_SOURCES = exampleSourcesRaw

export function ExampleViewer(props: { name: string; caption?: string }) {
  const [comp, setComp] = createSignal<(() => JSX.Element) | null>(null)
  const [loadError, setLoadError] = createSignal<string | null>(null)
  const [hasLiveModule, setHasLiveModule] = createSignal(true)
  const [activeTab, setActiveTab] = createSignal<'preview' | 'code'>('preview')
  const [resetKey, setResetKey] = createSignal(1)
  const [logs, setLogs] = createSignal<Array<string>>([])
  const [copied, setCopied] = createSignal(false)

  const pushLog = (message: string) => {
    setLogs((prev) => [...prev.slice(-7), message])
  }

  createEffect(
    () => props.name,
    (name) => {
      setComp(null)
      setLoadError(null)
      setLogs([])
      setResetKey(1)
      setActiveTab('preview')
      const loader = EXAMPLE_LOADERS[`../examples/${name}.tsx`]
      if (!loader) {
        setHasLiveModule(false)
        return
      }
      setHasLiveModule(true)
      let cancelled = false
      void loader()
        .then((mod) => {
          if (cancelled) {
            return
          }
          const fn = mod.Example ?? mod.default ?? null
          if (!fn) {
            setLoadError(`Example "${name}" has no Example export.`)
            return
          }
          setComp(() => fn)
        })
        .catch((error: unknown) => {
          if (cancelled) {
            return
          }
          setLoadError(error instanceof Error ? error.message : String(error))
        })
      return () => {
        cancelled = true
      }
    },
  )

  const sourceCode = () => EXAMPLE_SOURCES[props.name] ?? ''

  const handleCopy = () => {
    const code = sourceCode()
    if (!code) {
      return
    }
    void navigator.clipboard?.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    })
  }

  return (
    <figure class="example-figure">
      <div class="example-frame">
        <Show
          when={hasLiveModule()}
          fallback={
            <Show
              when={sourceCode()}
              fallback={<div class="example-loading">Reference example: {props.name}</div>}
            >
              <div class="example-code-pane">
                <CodeBlock title={`${props.name}.tsx`} code={sourceCode()} />
              </div>
            </Show>
          }
        >
          <div class="example-toolbar">
            <div class="example-tabs" role="tablist" aria-label="Example">
              <button
                type="button"
                role="tab"
                class="example-tab-btn"
                aria-selected={activeTab() === 'preview' ? 'true' : 'false'}
                data-selected={activeTab() === 'preview' ? '' : undefined}
                onClick={() => setActiveTab('preview')}
              >
                PREVIEW
              </button>
              <Show when={sourceCode()}>
                <button
                  type="button"
                  role="tab"
                  class="example-tab-btn"
                  aria-selected={activeTab() === 'code' ? 'true' : 'false'}
                  data-selected={activeTab() === 'code' ? '' : undefined}
                  onClick={() => setActiveTab('code')}
                >
                  CODE
                </button>
              </Show>
            </div>

            <div class="example-actions">
              <Show when={activeTab() === 'preview'}>
                <button
                  type="button"
                  class="example-icon-btn"
                  onClick={() => {
                    setLogs([])
                    setResetKey((k) => k + 1)
                  }}
                  aria-label="Reset example"
                  title="Reset example"
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
                    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
                    <path d="M3 3v5h5" />
                  </svg>
                </button>
              </Show>
              <Show when={activeTab() === 'code' && sourceCode()}>
                <span class="example-file-label">{`${props.name}.tsx`}</span>
                <button
                  type="button"
                  class="example-icon-btn"
                  onClick={handleCopy}
                  aria-label={copied() ? 'Copied' : 'Copy code'}
                  title={copied() ? 'Copied' : 'Copy code'}
                >
                  <Show
                    when={copied()}
                    fallback={
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
                        <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                        <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                      </svg>
                    }
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
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </Show>
                </button>
              </Show>
            </div>
          </div>

          <div class="example-body">
            <div
              class="example-panel example-panel-preview"
              data-inactive={activeTab() !== 'preview' ? '' : undefined}
              aria-hidden={activeTab() !== 'preview' ? 'true' : undefined}
            >
              <div class="example-stage-wrap">
                <Show when={!loadError()} fallback={<div class="example-error">{loadError()}</div>}>
                  <Show
                    when={comp()}
                    fallback={<div class="example-loading">Loading example…</div>}
                  >
                    {(ExampleComp) => (
                      <For each={[resetKey()]}>
                        {() => (
                          <LogContext value={pushLog}>
                            <div class="example-stage" data-example={props.name}>
                              <div class="example-stage-inner">{ExampleComp()()}</div>
                            </div>
                          </LogContext>
                        )}
                      </For>
                    )}
                  </Show>
                </Show>
                <span
                  class="example-style-note"
                  title="Components from @subf/ui are unstyled; this preview uses example styles."
                  aria-label="Components from @subf/ui are unstyled; this preview uses example styles."
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.7"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                    <path d="M12 17h.01" />
                  </svg>
                </span>
              </div>

              <Show when={logs().length > 0}>
                <div class="example-log" aria-live="polite">
                  <div class="example-log-head">
                    <span>Event log</span>
                    <button type="button" class="example-log-clear" onClick={() => setLogs([])}>
                      Clear
                    </button>
                  </div>
                  <ul class="example-log-list">
                    <For each={logs()}>{(entry) => <li>{entry}</li>}</For>
                  </ul>
                </div>
              </Show>
            </div>

            <Show when={sourceCode()}>
              <div
                class="example-panel example-panel-code"
                data-inactive={activeTab() !== 'code' ? '' : undefined}
                aria-hidden={activeTab() !== 'code' ? 'true' : undefined}
              >
                <div class="example-code-pane">
                  <pre class="code-pre">
                    <code>{sourceCode()}</code>
                  </pre>
                </div>
              </div>
            </Show>
          </div>
        </Show>
      </div>

      <Show when={props.caption}>
        {(cap) => <figcaption class="example-caption">{cap()}</figcaption>}
      </Show>
    </figure>
  )
}
