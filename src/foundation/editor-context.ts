import { createContext } from 'solid-js'

export type EditorTriggerBinding = {
  getElement: () => HTMLInputElement | HTMLTextAreaElement | null
  getAnchorElement: () => HTMLElement | null
  getValue: () => string
  getCaret: () => number
  replace: (range: { start: number; end: number }, text: string) => void
  insertToken?: (
    range: { start: number; end: number },
    token: { label: string; value: string; type?: string },
  ) => void
  subscribeInput: (
    fn: (el: HTMLInputElement | HTMLTextAreaElement, event: Event) => void,
  ) => () => void
  subscribeKeyDown: (fn: (event: KeyboardEvent) => boolean) => () => void
  focus: () => void
}

export const EditorContext = createContext<(() => EditorTriggerBinding | undefined) | null>(null)
