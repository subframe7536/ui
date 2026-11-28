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
  const [showCode, setShowCode] = createSignal(false)
  const [resetKey, setResetKey] = createSignal(1)
  const [logs, setLogs] = createSignal<Array<string>>([])

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

  return (
    <figure class="example-figure">
      <div class="example-frame">
        <div class="example-toolbar">
          <span class="example-name">{props.name}</span>
          <div class="example-actions">
            <Show when={hasLiveModule()}>
              <button
                type="button"
                class="example-tool-btn"
                onClick={() => {
                  setLogs([])
                  setResetKey((k) => k + 1)
                }}
                title="Reset example"
              >
                Reset
              </button>
              <Show when={sourceCode()}>
                <button
                  type="button"
                  class="example-tool-btn"
                  data-active={showCode() ? 'true' : undefined}
                  onClick={() => setShowCode((v) => !v)}
                >
                  {showCode() ? 'Hide code' : 'Code'}
                </button>
              </Show>
            </Show>
          </div>
        </div>

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
          <div class="example-stage-wrap">
            <Show when={!loadError()} fallback={<div class="example-error">{loadError()}</div>}>
              <Show when={comp()} fallback={<div class="example-loading">Loading example…</div>}>
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

          <Show when={showCode() && sourceCode()}>
            <div class="example-code-pane">
              <CodeBlock title={`${props.name}.tsx`} code={sourceCode()} />
            </div>
          </Show>
        </Show>
      </div>

      <Show when={props.caption}>
        {(cap) => <figcaption class="example-caption">{cap()}</figcaption>}
      </Show>
    </figure>
  )
}
