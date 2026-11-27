import type { JSX } from '@solidjs/web'
import { createContext, createSignal, Show, useContext } from 'solid-js'

export type PreferenceStorage = {
  key: string
  get: () => string | null
  set: (value: string) => void
  remove: () => void
}

export function createLocalStorage(key: string): PreferenceStorage {
  return {
    key,
    get: () => {
      try {
        return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null
      } catch {
        return null
      }
    },
    set: (value: string) => {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(key, value)
        }
      } catch {
        // ignore storage errors
      }
    },
    remove: () => {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(key)
        }
      } catch {
        // ignore storage errors
      }
    },
  }
}

export type PreferenceDefinition<T extends string = string> = {
  values: ReadonlyArray<T>
  defaultValue: T
  attribute: string
  storage?: PreferenceStorage
  global?: boolean
}

export function createPreference<const T extends string>(options: {
  values: ReadonlyArray<T>
  defaultValue: T
  attribute: string
  storage?: PreferenceStorage
  global?: boolean
}): PreferenceDefinition<T> {
  return {
    values: options.values,
    defaultValue: options.defaultValue,
    attribute: options.attribute,
    storage: options.storage,
    global: options.global,
  }
}

export function createColorScheme(options?: {
  defaultValue?: 'system' | 'light' | 'dark'
  attribute?: string
  storage?: PreferenceStorage
  global?: boolean
}): PreferenceDefinition<'system' | 'light' | 'dark'> {
  return createPreference({
    values: ['system', 'light', 'dark'] as const,
    defaultValue: options?.defaultValue ?? 'system',
    attribute: options?.attribute ?? 'data-color-scheme',
    storage: options?.storage,
    global: options?.global,
  })
}

export type PreferencesProps = {
  prefix?: string
  storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
  preferences?: ReadonlyArray<PreferenceDefinition>
  nonce?: string
  children?: JSX.Element
}

type PreferencesContextValue = {
  prefix: string
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null
  values: Map<PreferenceDefinition, () => { value: string; set: (next: string) => void }>
}

const PreferencesContext = createContext<PreferencesContextValue>({
  prefix: 'ui-pref:',
  storage: typeof localStorage !== 'undefined' ? localStorage : null,
  values: new Map(),
})

function buildInitScript(prefs: ReadonlyArray<PreferenceDefinition>): string {
  const entries = prefs
    .filter((p) => p.storage)
    .map((p) => ({
      key: p.storage?.key ?? '',
      attr: p.attribute,
      global: !!p.global,
      values: p.values,
    }))
  return `(function(){try{var e=${JSON.stringify(entries)};for(var i=0;i<e.length;i++){var p=e[i],v=localStorage.getItem(p.key);if(v&&p.values.indexOf(v)!==-1){(p.global?document.documentElement:document.currentScript.parentElement).setAttribute(p.attr,v)}}}catch(x){}})()`
}

export function Preferences(props: PreferencesProps) {
  const values = new Map<
    PreferenceDefinition,
    () => { value: string; set: (next: string) => void }
  >()
  const defs = () => props.preferences ?? []

  const ctx: PreferencesContextValue = {
    get prefix() {
      return props.prefix ?? 'ui-pref:'
    },
    get storage() {
      return props.storage ?? (typeof localStorage !== 'undefined' ? localStorage : null)
    },
    values,
  }

  const localAttrs = () => {
    const attrs: Record<string, string> = {}
    for (const def of defs()) {
      if (!def.global) {
        attrs[def.attribute] = def.defaultValue
      }
    }
    return attrs
  }

  return (
    <PreferencesContext value={ctx}>
      <Show when={defs().length > 0} fallback={props.children}>
        <div {...localAttrs()}>
          {/* oxlint-disable-next-line subf/solid-no-innerhtml */}
          <script nonce={props.nonce} innerHTML={buildInitScript(defs())} />
          {props.children}
        </div>
      </Show>
    </PreferencesContext>
  )
}

export function usePreference<T extends string>(
  def: PreferenceDefinition<T>,
): () => { value: T; set: (next: T) => void }
export function usePreference<T>(
  key: string,
  defaultValue: T,
): [get: () => T, set: (next: T) => void, reset: () => void]
export function usePreference<T>(
  keyOrDef: string | PreferenceDefinition,
  defaultValue?: T,
):
  | (() => { value: string; set: (next: string) => void })
  | [get: () => T, set: (next: T) => void, reset: () => void] {
  const ctx = useContext(PreferencesContext)

  if (typeof keyOrDef !== 'string') {
    const def = keyOrDef
    const [val, setVal] = createSignal<string>(def.storage?.get() ?? def.defaultValue)
    const set = (next: string) => {
      setVal(next)
      def.storage?.set(next)
    }
    return () => ({ value: val(), set })
  }

  const key = keyOrDef
  const fullKey = `${ctx.prefix}${key}`

  const readInitial = (): T => {
    try {
      const raw = ctx.storage?.getItem(fullKey)
      if (raw === null || raw === undefined) {
        return defaultValue as T
      }
      return JSON.parse(raw) as T
    } catch {
      return defaultValue as T
    }
  }

  const [boxed, setBoxed] = createSignal<{ value: T }>({ value: readInitial() })

  const get = (): T => boxed().value

  const set = (next: T) => {
    setBoxed({ value: next })
    try {
      ctx.storage?.setItem(fullKey, JSON.stringify(next))
    } catch {
      // ignore storage errors
    }
  }

  const reset = () => {
    setBoxed({ value: defaultValue as T })
    try {
      ctx.storage?.removeItem(fullKey)
    } catch {
      // ignore storage errors
    }
  }

  return [get, set, reset]
}
