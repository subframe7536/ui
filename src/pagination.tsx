import { createContext, createUniqueId, merge, omit, Show, useContext } from 'solid-js'

import { createController, useController } from './foundation/controller'
import { createChangeDetails } from './foundation/details'
import type { ChangeDetails, ChangeOptions } from './foundation/details'
import { registerComponent } from './foundation/registry'
import { renderPart } from './foundation/render'
import type { PartProps } from './foundation/render'
import { createControlledSignal } from './foundation/state'

export type PaginationPageChangeReason =
  | 'page'
  | 'previous'
  | 'next'
  | 'first'
  | 'last'
  | 'programmatic'

export type PaginationChangeOptions = ChangeOptions<PaginationPageChangeReason>

export type PaginationRangeOptions = {
  page: number
  count: number
  siblingCount?: number
  boundaryCount?: number
}

export type PaginationRangeItem =
  | { type: 'page'; page: number; current: boolean }
  | { type: 'ellipsis'; key: 'start-ellipsis' | 'end-ellipsis' }

function numRange(start: number, end: number): Array<number> {
  const out: Array<number> = []
  for (let i = start; i <= end; i++) {
    out.push(i)
  }
  return out
}

export function paginationRange(options: PaginationRangeOptions): Array<PaginationRangeItem> {
  const count = Math.max(1, Math.floor(options.count))
  const page = Math.min(count, Math.max(1, Math.floor(options.page)))
  const siblingCount = Math.max(0, Math.floor(options.siblingCount ?? 1))
  const boundaryCount = Math.max(0, Math.floor(options.boundaryCount ?? 1))
  const range = numRange

  const startPages = range(1, Math.min(boundaryCount, count))
  const endPages = range(Math.max(count - boundaryCount + 1, boundaryCount + 1), count)

  const siblingsStart = Math.max(
    Math.min(page - siblingCount, count - boundaryCount - siblingCount * 2 - 1),
    boundaryCount + 2,
  )
  const siblingsEnd = Math.min(
    Math.max(page + siblingCount, boundaryCount + siblingCount * 2 + 2),
    (endPages[0] ?? count + 1) - 2,
  )

  const result: Array<PaginationRangeItem> = []
  const pushPage = (p: number) => result.push({ type: 'page', page: p, current: p === page })

  for (const p of startPages) {
    pushPage(p)
  }

  if (siblingsStart > boundaryCount + 2) {
    result.push({ type: 'ellipsis', key: 'start-ellipsis' })
  } else if (boundaryCount + 1 < count - boundaryCount) {
    pushPage(boundaryCount + 1)
  }

  for (const p of range(siblingsStart, siblingsEnd)) {
    pushPage(p)
  }

  if (siblingsEnd < count - boundaryCount - 1) {
    result.push({ type: 'ellipsis', key: 'end-ellipsis' })
  } else if (count - boundaryCount > boundaryCount) {
    pushPage(count - boundaryCount)
  }

  for (const p of endPages) {
    pushPage(p)
  }

  return result
}

export type PaginationApi = {
  setPage: (page: number, options?: PaginationChangeOptions) => void
  next: () => void
  previous: () => void
  first: () => void
  last: () => void
  getPage: () => number
}

export function createPaginationController() {
  return createController<PaginationApi>()
}

export type PaginationController = ReturnType<typeof createPaginationController>

export type PaginationOptions = {
  page?: number
  defaultPage?: number
  count?: number
  pageCount?: number
  getHref?: (page: number) => string
  onPageChange?: (page: number, details: ChangeDetails<PaginationPageChangeReason>) => void
  siblingCount?: number
  boundaryCount?: number
  disabled?: boolean
  controller?: PaginationController
  debug?: boolean
}

export type PaginationState = {
  page: number
  count: number
  canPrevious: boolean
  canNext: boolean
  disabled: boolean
  range: Array<PaginationRangeItem>
  items: Array<number | 'ellipsis'>
}

export type PaginationPrimitive = PaginationState
export type PaginationLinkProps = { page: number; disabled?: boolean }
export type PaginationLinkState = {
  page: number
  current: boolean
  disabled: boolean
}
export type PaginationStepState = PaginationState & { disabled: boolean }

type PaginationContextValue = {
  id: string
  state: () => PaginationState
  goTo: (page: number, reason: PaginationPageChangeReason, event?: Event) => void
  getHref: () => ((page: number) => string) | undefined
}

const PaginationContext = createContext<PaginationContextValue | null>(null)

function usePagination(part: string): PaginationContextValue {
  const ctx = useContext(PaginationContext)
  if (!ctx) {
    throw new Error(`<Pagination${part}> must be used inside <Pagination>.`)
  }
  return ctx
}

export function Pagination(
  props: PaginationOptions & Omit<PartProps<'nav', PaginationState>, keyof PaginationOptions>,
) {
  const id = `ui-pagination-${createUniqueId()}`
  const count = () => Math.max(1, Math.floor(props.count ?? props.pageCount ?? 1))

  const [page, setRawPage] = createControlledSignal<number>({
    value: () => props.page,
    defaultValue: () => props.defaultPage ?? 1,
  })
  let rootEl: HTMLElement | null = null

  const disabled = () => !!props.disabled
  const currentPage = () => Math.min(count(), Math.max(1, Math.floor(page())))

  const state = (): PaginationState => {
    const p = currentPage()
    const total = count()
    const isDisabled = disabled()
    const range = paginationRange({
      page: p,
      count: total,
      siblingCount: props.siblingCount,
      boundaryCount: props.boundaryCount,
    })
    return {
      page: p,
      count: total,
      canPrevious: !isDisabled && p > 1,
      canNext: !isDisabled && p < total,
      disabled: isDisabled,
      range,
      items: range.map((r) => (r.type === 'page' ? r.page : 'ellipsis')),
    }
  }

  const emitRef: {
    fn?: (change: {
      key: string
      previous: unknown
      value: unknown
      reason: string
      source: ChangeDetails['source']
    }) => void
  } = {}

  const goTo = (next: number, reason: PaginationPageChangeReason, event?: Event) => {
    if (disabled()) {
      return
    }
    const prev = currentPage()
    const clamped = Math.min(count(), Math.max(1, Math.floor(next)))
    if (clamped === prev) {
      return
    }
    const details = createChangeDetails(reason, event)
    props.onPageChange?.(clamped, details)
    if (details.canceled) {
      return
    }
    setRawPage(clamped)
    emitRef.fn?.({
      key: 'page',
      previous: prev,
      value: clamped,
      reason,
      source: details.source,
    })
  }

  const api: PaginationApi = {
    setPage: (p, opts) => goTo(p, opts?.reason ?? 'programmatic', opts?.event),
    next: () => goTo(currentPage() + 1, 'next'),
    previous: () => goTo(currentPage() - 1, 'previous'),
    first: () => goTo(1, 'first'),
    last: () => goTo(count(), 'last'),
    getPage: currentPage,
  }

  useController(() => props.controller, api)

  const reg = registerComponent({
    component: 'pagination',
    getElements: () => [rootEl],
    getState: () => ({ page: currentPage(), count: count(), disabled: disabled() }),
    getDisabled: disabled,
    actions: {
      setPage: (p) => api.setPage(Number(p ?? 1)),
      next: () => api.next(),
      previous: () => api.previous(),
    },
  })
  emitRef.fn = reg.emit

  const rest = omit(
    props,
    'page',
    'defaultPage',
    'count',
    'pageCount',
    'getHref',
    'onPageChange',
    'siblingCount',
    'boundaryCount',
    'disabled',
    'controller',
    'debug',
  )

  return (
    <PaginationContext value={{ id, state, goTo, getHref: () => props.getHref }}>
      {renderPart('nav', rest, state, {
        ref: (el) => {
          rootEl = el
        },
        attrs: () => ({
          id,
          'aria-label': props['aria-label'] ?? 'Pagination',
          'data-disabled': disabled() ? '' : undefined,
        }),
      })}
    </PaginationContext>
  )
}

export function PaginationList(props: PartProps<'ul', PaginationState>) {
  const ctx = usePagination('List')
  return renderPart('ul', props, ctx.state, {
    attrs: () => ({ role: 'list' }),
  })
}

export function PaginationItem(props: PartProps<'li', PaginationState>) {
  const ctx = usePagination('Item')
  return renderPart('li', props, ctx.state)
}

export function PaginationLink(
  props: PaginationLinkProps &
    Omit<PartProps<'button', PaginationLinkState>, keyof PaginationLinkProps | 'type'>,
) {
  const ctx = usePagination('Link')
  const linkState = (): PaginationLinkState => {
    const s = ctx.state()
    return {
      page: props.page,
      current: s.page === props.page,
      disabled: s.disabled || !!props.disabled,
    }
  }
  const rest = omit(props, 'page', 'disabled')
  const resolvedProps: PartProps<'button', PaginationLinkState> = merge(rest, {
    get children() {
      return props.children ?? String(props.page)
    },
  })

  return (
    <Show
      when={ctx.getHref()}
      fallback={renderPart('button', resolvedProps, linkState, {
        attrs: () => {
          const s = linkState()
          return {
            type: 'button',
            disabled: s.disabled,
            'aria-current': s.current ? 'page' : undefined,
            'data-current': s.current ? '' : undefined,
            'data-disabled': s.disabled ? '' : undefined,
          }
        },
        handlers: {
          onClick: (e: MouseEvent) => {
            if (!linkState().disabled) {
              ctx.goTo(props.page, 'page', e)
            }
          },
        },
      })}
    >
      {(getHref) =>
        renderPart(
          'a',
          resolvedProps as unknown as PartProps<'a', PaginationLinkState>,
          linkState,
          {
            attrs: () => {
              const s = linkState()
              return {
                href: s.disabled ? undefined : getHref()(props.page),
                'aria-disabled': s.disabled ? 'true' : undefined,
                'aria-current': s.current ? 'page' : undefined,
                'data-current': s.current ? '' : undefined,
                'data-disabled': s.disabled ? '' : undefined,
              }
            },
          },
        )
      }
    </Show>
  )
}

export function PaginationPrevious(props: Omit<PartProps<'button', PaginationStepState>, 'type'>) {
  const ctx = usePagination('Previous')
  const stepState = (): PaginationStepState => {
    const s = ctx.state()
    return { ...s, disabled: !s.canPrevious }
  }
  return (
    <Show
      when={ctx.getHref()}
      fallback={renderPart('button', props, stepState, {
        attrs: () => ({
          type: 'button',
          disabled: stepState().disabled,
          'aria-label': 'Previous page',
          'data-disabled': stepState().disabled ? '' : undefined,
        }),
        handlers: {
          onClick: (e: MouseEvent) => {
            if (ctx.state().canPrevious) {
              ctx.goTo(ctx.state().page - 1, 'previous', e)
            }
          },
        },
      })}
    >
      {(getHref) =>
        renderPart('a', props as unknown as PartProps<'a', PaginationStepState>, stepState, {
          attrs: () => ({
            href: stepState().disabled ? undefined : getHref()(ctx.state().page - 1),
            'aria-disabled': stepState().disabled ? 'true' : undefined,
            'aria-label': 'Previous page',
            'data-disabled': stepState().disabled ? '' : undefined,
          }),
        })
      }
    </Show>
  )
}

export function PaginationNext(props: Omit<PartProps<'button', PaginationStepState>, 'type'>) {
  const ctx = usePagination('Next')
  const stepState = (): PaginationStepState => {
    const s = ctx.state()
    return { ...s, disabled: !s.canNext }
  }
  return (
    <Show
      when={ctx.getHref()}
      fallback={renderPart('button', props, stepState, {
        attrs: () => ({
          type: 'button',
          disabled: stepState().disabled,
          'aria-label': 'Next page',
          'data-disabled': stepState().disabled ? '' : undefined,
        }),
        handlers: {
          onClick: (e: MouseEvent) => {
            if (ctx.state().canNext) {
              ctx.goTo(ctx.state().page + 1, 'next', e)
            }
          },
        },
      })}
    >
      {(getHref) =>
        renderPart('a', props as unknown as PartProps<'a', PaginationStepState>, stepState, {
          attrs: () => ({
            href: stepState().disabled ? undefined : getHref()(ctx.state().page + 1),
            'aria-disabled': stepState().disabled ? 'true' : undefined,
            'aria-label': 'Next page',
            'data-disabled': stepState().disabled ? '' : undefined,
          }),
        })
      }
    </Show>
  )
}

export function PaginationFirst(props: Omit<PartProps<'button', PaginationStepState>, 'type'>) {
  const ctx = usePagination('First')
  const stepState = (): PaginationStepState => {
    const s = ctx.state()
    return { ...s, disabled: !s.canPrevious }
  }
  return renderPart('button', props, stepState, {
    attrs: () => ({
      type: 'button',
      disabled: stepState().disabled,
      'aria-label': 'First page',
      'data-disabled': stepState().disabled ? '' : undefined,
    }),
    handlers: {
      onClick: (e: MouseEvent) => {
        if (ctx.state().canPrevious) {
          ctx.goTo(1, 'first', e)
        }
      },
    },
  })
}

export function PaginationLast(props: Omit<PartProps<'button', PaginationStepState>, 'type'>) {
  const ctx = usePagination('Last')
  const stepState = (): PaginationStepState => {
    const s = ctx.state()
    return { ...s, disabled: !s.canNext }
  }
  return renderPart('button', props, stepState, {
    attrs: () => ({
      type: 'button',
      disabled: stepState().disabled,
      'aria-label': 'Last page',
      'data-disabled': stepState().disabled ? '' : undefined,
    }),
    handlers: {
      onClick: (e: MouseEvent) => {
        if (ctx.state().canNext) {
          ctx.goTo(ctx.state().count, 'last', e)
        }
      },
    },
  })
}

export function PaginationEllipsis(props: PartProps<'span', PaginationState>) {
  const ctx = usePagination('Ellipsis')
  const resolvedProps: PartProps<'span', PaginationState> = merge(props, {
    get children() {
      return props.children ?? '…'
    },
  })
  return renderPart('span', resolvedProps, ctx.state, {
    attrs: () => ({ 'aria-hidden': 'true' }),
  })
}
