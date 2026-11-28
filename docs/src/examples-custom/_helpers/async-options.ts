import { createSignal, onCleanup, onSettled } from 'solid-js'

export type AsyncOptionsStatus = 'idle' | 'loading' | 'error'

export type AsyncOptionsContext = {
  signal: AbortSignal
  page: number
}

export type AsyncOptionsOptions = {
  debounce?: number
  minLength?: number
  immediate?: boolean
  initialQuery?: string
}

export type AsyncOptionsState<Item> = {
  items: Array<Item>
  query: string
  status: AsyncOptionsStatus
  error: unknown
  hasMore: boolean
}

export function useAsyncOptions<Item>(
  load: (
    query: string,
    context: AsyncOptionsContext,
  ) => Promise<Array<Item> | { items: Array<Item>; hasMore?: boolean }>,
  options?: AsyncOptionsOptions,
) {
  const debounce = options?.debounce ?? 150
  const minLength = options?.minLength ?? 0
  const immediate = Boolean(options?.immediate)

  const [state, setState] = createSignal<AsyncOptionsState<Item>>({
    items: [],
    query: options?.initialQuery ?? '',
    status: immediate ? 'loading' : 'idle',
    error: undefined,
    hasMore: false,
  })

  let controller: AbortController | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  let page = 1

  const cancel = () => {
    if (timer !== undefined) {
      clearTimeout(timer)
      timer = undefined
    }
    controller?.abort()
    controller = undefined
  }

  const run = async (query: string, nextPage: number, append: boolean) => {
    cancel()
    if (query.length < minLength) {
      setState((prev) => ({
        ...prev,
        query,
        items: [],
        status: 'idle',
        error: undefined,
        hasMore: false,
      }))
      return
    }
    const nextController = new AbortController()
    controller = nextController
    page = nextPage
    setState((prev) => ({
      ...prev,
      query,
      status: 'loading',
      error: undefined,
    }))
    try {
      const result = await load(query, { signal: nextController.signal, page: nextPage })
      if (nextController.signal.aborted) {
        return
      }
      const list = Array.isArray(result) ? result : result.items
      const hasMore = Array.isArray(result) ? false : Boolean(result.hasMore)
      setState((prev) => ({
        query,
        items: append ? [...prev.items, ...list] : list,
        status: 'idle',
        error: undefined,
        hasMore,
      }))
    } catch (err) {
      if (nextController.signal.aborted) {
        return
      }
      setState((prev) => ({
        ...prev,
        query,
        status: 'error',
        error: err,
      }))
    }
  }

  const setQuery = (query: string) => {
    cancel()
    setState((prev) => ({ ...prev, query }))
    if (debounce > 0) {
      timer = setTimeout(() => {
        void run(query, 1, false)
      }, debounce)
    } else {
      void run(query, 1, false)
    }
  }

  const reload = () => {
    void run(state().query, 1, false)
  }

  const loadMore = () => {
    if (!state().hasMore || state().status === 'loading') {
      return
    }
    void run(state().query, page + 1, true)
  }

  if (immediate) {
    onSettled(() => {
      void run(state().query, 1, false)
    })
  }

  onCleanup(() => cancel())

  return {
    get items() {
      return state().items
    },
    get query() {
      return state().query
    },
    get status() {
      return state().status
    },
    get error() {
      return state().error
    },
    get hasMore() {
      return state().hasMore
    },
    setQuery,
    reload,
    loadMore,
  }
}
