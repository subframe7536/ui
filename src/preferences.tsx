import type { JSX } from '@solidjs/web'
import { createContext, createSignal, useContext } from 'solid-js'

export type PreferencesProps = {
  prefix?: string
  storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
  children?: JSX.Element
}

type PreferencesContextValue = {
  prefix: string
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null
}

const PreferencesContext = createContext<PreferencesContextValue>({
  prefix: 'ui-pref:',
  storage: typeof localStorage !== 'undefined' ? localStorage : null,
})

export function Preferences(props: PreferencesProps) {
  const ctx: PreferencesContextValue = {
    get prefix() {
      return props.prefix ?? 'ui-pref:'
    },
    get storage() {
      return props.storage ?? (typeof localStorage !== 'undefined' ? localStorage : null)
    },
  }
  return <PreferencesContext value={ctx}>{props.children}</PreferencesContext>
}

export function usePreference<T>(
  key: string,
  defaultValue: T,
): [get: () => T, set: (next: T) => void, reset: () => void] {
  const ctx = useContext(PreferencesContext)
  const fullKey = `${ctx.prefix}${key}`

  const readInitial = (): T => {
    try {
      const raw = ctx.storage?.getItem(fullKey)
      if (raw === null || raw === undefined) {
        return defaultValue
      }
      return JSON.parse(raw) as T
    } catch {
      return defaultValue
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
    setBoxed({ value: defaultValue })
    try {
      ctx.storage?.removeItem(fullKey)
    } catch {
      // ignore storage errors
    }
  }

  return [get, set, reset]
}
