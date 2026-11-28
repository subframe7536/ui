import {
  createContext,
  createEffect,
  createSignal,
  createUniqueId,
  omit,
  onCleanup,
  untrack,
  useContext,
} from 'solid-js'

import { createController, useController } from './foundation/controller'
import { createChangeDetails } from './foundation/details'
import type { ChangeDetails, ChangeOptions } from './foundation/details'
import { registerComponent } from './foundation/registry'
import { renderPart } from './foundation/render'
import type { PartProps } from './foundation/render'
import { createControlledSignal } from './foundation/state'

export type ImageRotation = number

export type ImageCrop = {
  x: number
  y: number
  width: number
  height: number
  rotation?: ImageRotation
  flipX?: boolean
  flipY?: boolean
}

export type ImageCropperShape = 'rectangle' | 'rect' | 'circle'
export type ImageCropperMode = 'box' | 'frame' | 'crop' | 'pan'
export type ImageCropperFlipDirection = 'horizontal' | 'vertical'
export type ImageCropperHandlePosition = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw'
export type ImageCropperCropChangeReason =
  | 'image-load'
  | 'drag'
  | 'resize'
  | 'pinch'
  | 'wheel'
  | 'step-key'
  | 'zoom-key'
  | 'zoom-input'
  | 'zoom'
  | 'rotate-key'
  | 'rotate-press'
  | 'rotate'
  | 'flip-press'
  | 'flip'
  | 'aspect-ratio-change'
  | 'reset'
  | 'imperative'
  | 'programmatic'
export type ImageCropperChangeOptions = ChangeOptions<ImageCropperCropChangeReason>
export type ImageCropperCropChangeDetails = ChangeDetails<ImageCropperCropChangeReason>
export type ImageCropperCropCommitDetails = ImageCropperCropChangeDetails

export type ImageCropperApi = {
  setCrop: (crop: ImageCrop, options?: ImageCropperChangeOptions) => void
  setZoom: (zoom: number, options?: ImageCropperChangeOptions) => void
  rotate: (degreesOrDirection?: number, options?: ImageCropperChangeOptions) => void
  flip: (direction?: ImageCropperFlipDirection, options?: ImageCropperChangeOptions) => void
  reset: () => void
  getCrop: () => Required<ImageCrop>
  getZoom: () => number
  getRotation: () => number
  focus: () => void
}

export function createImageCropperController() {
  return createController<ImageCropperApi>()
}

export type ImageCropperController = ReturnType<typeof createImageCropperController>

export type ImageCropperOptions = {
  src?: string
  crop?: ImageCrop
  defaultCrop?: ImageCrop
  onCropChange?: (crop: Required<ImageCrop>, details: ImageCropperCropChangeDetails) => void
  onCropCommit?: (crop: Required<ImageCrop>, details: ImageCropperCropCommitDetails) => void
  aspectRatio?: number
  minWidth?: number
  minHeight?: number
  minZoom?: number
  maxZoom?: number
  shape?: ImageCropperShape
  mode?: ImageCropperMode
  disabled?: boolean
  controller?: ImageCropperController
  debug?: boolean
}

export type ImageCropperState = {
  crop: Required<ImageCrop>
  zoom: number
  rotation: number
  flipX: boolean
  flipY: boolean
  loading: boolean
  error: boolean
  dragging: boolean
  shape: ImageCropperShape
  mode: 'box' | 'frame'
  disabled: boolean
}

export type ImageCropperPrimitive = ImageCropperState
export type ImageCropperHandleProps = { position: ImageCropperHandlePosition }
export type ImageCropperHandleState = ImageCropperState & { position: ImageCropperHandlePosition }
export type ImageCropperFlipProps = { direction?: ImageCropperFlipDirection }

type Size = { width: number; height: number }
type Rect = { left: number; top: number; width: number; height: number }
type Crop = Required<ImageCrop>
type Layout = { scale: number; image: Rect; selection: Rect }

const DEFAULT_CROP: Crop = {
  x: 10,
  y: 10,
  width: 80,
  height: 80,
  rotation: 0,
  flipX: false,
  flipY: false,
}

const HANDLE_SPOTS: Record<ImageCropperHandlePosition, [number, number]> = {
  n: [0.5, 0],
  e: [1, 0.5],
  s: [0.5, 1],
  w: [0, 0.5],
  ne: [1, 0],
  nw: [0, 0],
  se: [1, 1],
  sw: [0, 1],
}

const HANDLE_CURSORS: Record<ImageCropperHandlePosition, string> = {
  n: 'ns-resize',
  s: 'ns-resize',
  e: 'ew-resize',
  w: 'ew-resize',
  ne: 'nesw-resize',
  sw: 'nesw-resize',
  nw: 'nwse-resize',
  se: 'nwse-resize',
}

const HANDLE_NAMES: Record<ImageCropperHandlePosition, string> = {
  n: 'Top edge',
  e: 'Right edge',
  s: 'Bottom edge',
  w: 'Left edge',
  ne: 'Top right corner',
  nw: 'Top left corner',
  se: 'Bottom right corner',
  sw: 'Bottom left corner',
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const px = (v: number) => `${Math.round(v * 100) / 100}px`

function completeCrop(c: ImageCrop): Crop {
  return {
    x: c.x,
    y: c.y,
    width: c.width,
    height: c.height,
    rotation: c.rotation ?? 0,
    flipX: !!c.flipX,
    flipY: !!c.flipY,
  }
}

function shownSize(natural: Size, rotation: number): Size {
  return rotation % 180 !== 0 ? { width: natural.height, height: natural.width } : natural
}

function largestForRatio(shown: Size, ratio: number | undefined): Size {
  if (!ratio) {
    return { width: shown.width, height: shown.height }
  }
  const width = Math.min(shown.width, shown.height * ratio)
  return { width, height: width / ratio }
}

function smallestCrop(
  shown: Size,
  opts: { aspect?: number; minWidth: number; minHeight: number; maxZoom: number },
): Size {
  const { aspect, minWidth, minHeight, maxZoom } = opts
  if (!aspect) {
    return {
      width: Math.min(shown.width, Math.max(minWidth, shown.width / maxZoom)),
      height: Math.min(shown.height, Math.max(minHeight, shown.height / maxZoom)),
    }
  }
  const full = largestForRatio(shown, aspect)
  const width = Math.min(full.width, Math.max(minWidth, minHeight * aspect, full.width / maxZoom))
  return { width, height: width / aspect }
}

function roundCrop(c: Crop): Crop {
  return {
    ...c,
    x: Math.round(c.x),
    y: Math.round(c.y),
    width: Math.max(1, Math.round(c.width)),
    height: Math.max(1, Math.round(c.height)),
  }
}

function centeredBox(size: Size, center: { x: number; y: number }, shown: Size) {
  return {
    x: clamp(center.x - size.width / 2, 0, Math.max(0, shown.width - size.width)),
    y: clamp(center.y - size.height / 2, 0, Math.max(0, shown.height - size.height)),
    width: size.width,
    height: size.height,
  }
}

function computeInitialCrop(
  natural: Size,
  opts: { aspect?: number; minWidth: number; minHeight: number; maxZoom: number },
  mode: 'box' | 'frame',
): Crop {
  const full = largestForRatio(natural, opts.aspect)
  const min = smallestCrop(natural, opts)
  const inset =
    mode === 'frame'
      ? 1
      : Math.min(1, Math.max(0.8, min.width / full.width, min.height / full.height))
  const size = { width: full.width * inset, height: full.height * inset }
  const box = centeredBox(size, { x: natural.width / 2, y: natural.height / 2 }, natural)
  return roundCrop({ ...box, rotation: 0, flipX: false, flipY: false })
}

function computeZoomOf(crop: Crop, natural: Size | null): number {
  if (!natural || crop.width <= 0 || crop.height <= 0) {
    return 1
  }
  const shown = shownSize(natural, crop.rotation)
  return Math.max(1, Math.min(shown.width / crop.width, shown.height / crop.height))
}

function computeLayout(
  crop: Crop,
  natural: Size | null,
  box: Rect | null,
  mode: 'box' | 'frame',
  aspect: number | undefined,
): Layout | null {
  if (!natural || !box || box.width <= 0 || box.height <= 0) {
    return null
  }
  const shown = shownSize(natural, crop.rotation)
  if (mode === 'frame') {
    const ratio = aspect ?? (crop.height > 0 ? crop.width / crop.height : 1)
    const width = Math.min(box.width, box.height * ratio)
    const height = width / ratio
    const selection: Rect = {
      left: box.left + (box.width - width) / 2,
      top: box.top + (box.height - height) / 2,
      width,
      height,
    }
    const scale = crop.width > 0 ? width / crop.width : 1
    const image: Rect = {
      left: selection.left - crop.x * scale,
      top: selection.top - crop.y * scale,
      width: shown.width * scale,
      height: shown.height * scale,
    }
    return { scale, image, selection }
  }
  const scale = Math.min(box.width / shown.width, box.height / shown.height)
  const image: Rect = {
    left: box.left + (box.width - shown.width * scale) / 2,
    top: box.top + (box.height - shown.height * scale) / 2,
    width: shown.width * scale,
    height: shown.height * scale,
  }
  const selection: Rect = {
    left: image.left + crop.x * scale,
    top: image.top + crop.y * scale,
    width: crop.width * scale,
    height: crop.height * scale,
  }
  return { scale, image, selection }
}

type ImageCropperContextValue = {
  state: () => ImageCropperState
  api: ImageCropperApi
  src: () => string | undefined
  natural: () => Size | null
  layout: () => Layout | null
  draggingPart: () => string | null
  setDraggingPart: (part: string | null) => void
  setViewportBox: (box: Rect | null) => void
  onImageLoad: (img: HTMLImageElement) => void
  onImageError: () => void
  setSelectionEl: (el: HTMLElement | null) => void
  updateCrop: (next: ImageCrop, reason: ImageCropperCropChangeReason, event?: Event) => void
  commitCrop: (reason: ImageCropperCropChangeReason, event?: Event) => void
  startDrag: (
    event: PointerEvent,
    el: HTMLElement,
    handle: 'move' | 'pan' | ImageCropperHandlePosition,
  ) => void
  handleWheel: (event: WheelEvent) => void
  minZoom: () => number
  maxZoom: () => number
}

const ImageCropperContext = createContext<ImageCropperContextValue | null>(null)

function useImageCropper(part: string): ImageCropperContextValue {
  const ctx = useContext(ImageCropperContext)
  if (!ctx) {
    throw new Error(`<ImageCropper${part}> must be used inside <ImageCropper>.`)
  }
  return ctx
}

export function ImageCropper(
  props: ImageCropperOptions & Omit<PartProps<'div', ImageCropperState>, keyof ImageCropperOptions>,
) {
  const id = `ui-image-cropper-${createUniqueId()}`
  const resolvedMode = (): 'box' | 'frame' =>
    props.mode === 'frame' || props.mode === 'pan' ? 'frame' : 'box'
  const resolvedShape = (): ImageCropperShape => props.shape ?? 'rectangle'

  const [crop, setRawCrop] = createControlledSignal<ImageCrop>({
    value: () => props.crop,
    defaultValue: () => props.defaultCrop ?? DEFAULT_CROP,
  })
  const [natural, setNatural] = createSignal<Size | null>(null)
  const [viewportBox, setViewportBox] = createSignal<Rect | null>(null)
  const [status, setStatus] = createSignal<'idle' | 'loading' | 'ready' | 'error'>(
    untrack(() => (props.src ? 'loading' : 'idle')),
  )
  const [draggingPart, setDraggingPart] = createSignal<string | null>(null)
  const [fallbackZoom, setFallbackZoom] = createSignal(1)
  const [fallbackRotation, setFallbackRotation] = createSignal(0)
  const [fallbackFlipX, setFallbackFlipX] = createSignal(false)
  const [fallbackFlipY, setFallbackFlipY] = createSignal(false)
  let rootEl: HTMLElement | null = null
  let selectionEl: HTMLElement | null = null

  const minZoom = () => props.minZoom ?? 1
  const maxZoom = () => props.maxZoom ?? 10
  const minWidth = () => props.minWidth ?? 1
  const minHeight = () => props.minHeight ?? 1
  const disabled = () => !!props.disabled

  const currentCrop = (): Crop => {
    const c = completeCrop(crop())
    if (!natural()) {
      return {
        ...c,
        rotation: c.rotation || fallbackRotation(),
        flipX: c.flipX || fallbackFlipX(),
        flipY: c.flipY || fallbackFlipY(),
      }
    }
    return c
  }

  const currentZoom = (): number => {
    const nat = natural()
    if (!nat) {
      return fallbackZoom()
    }
    return clamp(computeZoomOf(currentCrop(), nat), minZoom(), maxZoom())
  }

  const layout = () =>
    computeLayout(currentCrop(), natural(), viewportBox(), resolvedMode(), props.aspectRatio)

  const state = (): ImageCropperState => {
    const c = currentCrop()
    return {
      crop: c,
      zoom: currentZoom(),
      rotation: c.rotation,
      flipX: c.flipX,
      flipY: c.flipY,
      loading: status() === 'loading',
      error: status() === 'error',
      dragging: draggingPart() !== null,
      shape: resolvedShape(),
      mode: resolvedMode(),
      disabled: disabled(),
    }
  }

  const limits = () => ({
    aspect: props.aspectRatio,
    minWidth: minWidth(),
    minHeight: minHeight(),
    maxZoom: maxZoom(),
  })

  const clampToBounds = (next: Crop): Crop => {
    const nat = natural()
    if (!nat) {
      const width = clamp(next.width, 5, 100)
      const height = clamp(next.height, 5, 100)
      return {
        ...next,
        x: clamp(next.x, 0, 100 - width),
        y: clamp(next.y, 0, 100 - height),
        width,
        height,
      }
    }
    const shown = shownSize(nat, next.rotation)
    const min = smallestCrop(shown, limits())
    const width = clamp(next.width, min.width, shown.width)
    const height = clamp(next.height, min.height, shown.height)
    return roundCrop({
      ...next,
      x: clamp(next.x, 0, Math.max(0, shown.width - width)),
      y: clamp(next.y, 0, Math.max(0, shown.height - height)),
      width,
      height,
    })
  }

  const updateCrop = (next: ImageCrop, reason: ImageCropperCropChangeReason, event?: Event) => {
    if (disabled() && reason !== 'image-load') {
      return
    }
    const bounded = clampToBounds(completeCrop(next))
    const details = createChangeDetails(reason, event)
    props.onCropChange?.(bounded, details)
    if (details.canceled) {
      return
    }
    setRawCrop(bounded)
  }

  const commitCrop = (reason: ImageCropperCropChangeReason, event?: Event) => {
    props.onCropCommit?.(currentCrop(), createChangeDetails(reason, event))
  }

  const onImageLoad = (img: HTMLImageElement) => {
    if (!img.naturalWidth || !img.naturalHeight) {
      return
    }
    const nat = { width: img.naturalWidth, height: img.naturalHeight }
    setNatural(nat)
    setStatus('ready')
    if (!props.crop && !props.defaultCrop) {
      const initial = computeInitialCrop(nat, limits(), resolvedMode())
      updateCrop(initial, 'image-load')
    }
  }

  const onImageError = () => {
    setStatus('error')
  }

  // Re-fit crop when aspectRatio changes
  let prevAspect = untrack(() => props.aspectRatio)
  createEffect(
    () => props.aspectRatio,
    (nextAspect) => {
      if (nextAspect === prevAspect) {
        return
      }
      prevAspect = nextAspect
      const nat = natural()
      if (!nat || !nextAspect) {
        return
      }
      const c = currentCrop()
      const shown = shownSize(nat, c.rotation)
      const full = largestForRatio(shown, nextAspect)
      const least = smallestCrop(shown, limits())
      const z = Math.min(computeZoomOf(c, nat), full.width / least.width)
      const size = { width: full.width / z, height: full.height / z }
      const box = centeredBox(size, { x: c.x + c.width / 2, y: c.y + c.height / 2 }, shown)
      updateCrop(roundCrop({ ...c, ...box }), 'aspect-ratio-change')
    },
  )

  const setZoomImpl = (z: number, opts?: ImageCropperChangeOptions) => {
    const clamped = clamp(z, minZoom(), maxZoom())
    const nat = natural()
    if (!nat) {
      setFallbackZoom(clamped)
      return
    }
    const c = currentCrop()
    const shown = shownSize(nat, c.rotation)
    const ratio = props.aspectRatio ?? (c.height > 0 ? c.width / c.height : 1)
    const full = largestForRatio(shown, ratio)
    const least = smallestCrop(shown, { ...limits(), aspect: ratio })
    const most = Math.max(1, Math.min(full.width / least.width, full.height / least.height))
    const nextZoom = clamp(clamped, 1, most)
    const width = full.width / nextZoom
    const height = full.height / nextZoom
    const cx = c.x + c.width / 2
    const cy = c.y + c.height / 2
    const next: Crop = roundCrop({
      ...c,
      x: clamp(cx - width / 2, 0, Math.max(0, shown.width - width)),
      y: clamp(cy - height / 2, 0, Math.max(0, shown.height - height)),
      width,
      height,
    })
    updateCrop(next, opts?.reason ?? 'zoom', opts?.event)
  }

  const rotateImpl = (degreesOrDirection = 90, opts?: ImageCropperChangeOptions) => {
    const delta =
      degreesOrDirection === 1 || degreesOrDirection === -1
        ? degreesOrDirection * 90
        : degreesOrDirection
    const nat = natural()
    if (!nat) {
      setFallbackRotation((r) => (r + delta + 360) % 360)
      return
    }
    const c = currentCrop()
    const shown = shownSize(nat, c.rotation)
    const clockwise = ((delta % 360) + 360) % 360 !== 270
    const box = clockwise
      ? {
          x: shown.height - c.y - c.height,
          y: c.x,
          width: c.height,
          height: c.width,
        }
      : {
          x: c.y,
          y: shown.width - c.x - c.width,
          width: c.height,
          height: c.width,
        }
    const nextRot = (c.rotation + delta + 360) % 360
    const next: Crop = {
      ...box,
      rotation: nextRot,
      flipX: c.flipY,
      flipY: c.flipX,
    }
    if (props.aspectRatio) {
      const turnedShown = shownSize(nat, nextRot)
      const full = largestForRatio(turnedShown, props.aspectRatio)
      const least = smallestCrop(turnedShown, limits())
      const z = Math.min(computeZoomOf(c, nat), full.width / least.width)
      const size = { width: full.width / z, height: full.height / z }
      const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 }
      updateCrop(
        roundCrop({ ...next, ...centeredBox(size, center, turnedShown) }),
        opts?.reason ?? 'rotate',
        opts?.event,
      )
    } else {
      updateCrop(roundCrop(next), opts?.reason ?? 'rotate', opts?.event)
    }
  }

  const flipImpl = (
    direction: ImageCropperFlipDirection = 'horizontal',
    opts?: ImageCropperChangeOptions,
  ) => {
    const nat = natural()
    if (!nat) {
      if (direction === 'horizontal') {
        setFallbackFlipX((v) => !v)
      } else {
        setFallbackFlipY((v) => !v)
      }
      return
    }
    const c = currentCrop()
    const shown = shownSize(nat, c.rotation)
    const next: Crop =
      direction === 'horizontal'
        ? { ...c, x: shown.width - c.x - c.width, flipX: !c.flipX }
        : { ...c, y: shown.height - c.y - c.height, flipY: !c.flipY }
    updateCrop(next, opts?.reason ?? 'flip', opts?.event)
  }

  const startDrag = (
    event: PointerEvent,
    el: HTMLElement,
    handle: 'move' | 'pan' | ImageCropperHandlePosition,
  ) => {
    if (disabled() || event.button !== 0) {
      return
    }
    const at = layout()
    const nat = natural()
    if (!at || !nat || at.scale <= 0) {
      return
    }
    event.preventDefault()
    event.stopPropagation()
    const startX = event.clientX
    const startY = event.clientY
    const startCrop = currentCrop()
    const shown = shownSize(nat, startCrop.rotation)
    const scale = at.scale
    setDraggingPart(handle)
    try {
      el.setPointerCapture?.(event.pointerId)
    } catch {
      // ignore in synthetic environments
    }

    const onMove = (e: PointerEvent) => {
      const dx = (e.clientX - startX) / scale
      const dy = (e.clientY - startY) / scale

      if (handle === 'move' || handle === 'pan') {
        const sign = handle === 'pan' ? -1 : 1
        updateCrop(
          {
            ...startCrop,
            x: clamp(startCrop.x + sign * dx, 0, Math.max(0, shown.width - startCrop.width)),
            y: clamp(startCrop.y + sign * dy, 0, Math.max(0, shown.height - startCrop.height)),
          },
          'drag',
          e,
        )
        return
      }

      const min = smallestCrop(shown, limits())
      let left = startCrop.x
      let top = startCrop.y
      let right = startCrop.x + startCrop.width
      let bottom = startCrop.y + startCrop.height

      if (handle.includes('w')) {
        left = clamp(startCrop.x + dx, 0, right - min.width)
      }
      if (handle.includes('e')) {
        right = clamp(startCrop.x + startCrop.width + dx, left + min.width, shown.width)
      }
      if (handle.includes('n')) {
        top = clamp(startCrop.y + dy, 0, bottom - min.height)
      }
      if (handle.includes('s')) {
        bottom = clamp(startCrop.y + startCrop.height + dy, top + min.height, shown.height)
      }

      let width = right - left
      let height = bottom - top

      if (props.aspectRatio) {
        const ratio = props.aspectRatio
        if (handle === 'n' || handle === 's') {
          width = height * ratio
          const cx = startCrop.x + startCrop.width / 2
          left = clamp(cx - width / 2, 0, Math.max(0, shown.width - width))
          if (width > shown.width) {
            width = shown.width
            height = width / ratio
            left = 0
            if (handle === 'n') {
              top = bottom - height
            }
          }
        } else {
          height = width / ratio
          if (handle.includes('n')) {
            top = bottom - height
          }
          if (top < 0) {
            top = 0
            height = bottom
            width = height * ratio
            if (handle.includes('w')) {
              left = right - width
            }
          } else if (top + height > shown.height) {
            height = shown.height - top
            width = height * ratio
            if (handle.includes('w')) {
              left = right - width
            }
          }
        }
      }

      updateCrop(
        roundCrop({
          ...startCrop,
          x: clamp(left, 0, Math.max(0, shown.width - width)),
          y: clamp(top, 0, Math.max(0, shown.height - height)),
          width: clamp(width, min.width, shown.width),
          height: clamp(height, min.height, shown.height),
        }),
        'drag',
        e,
      )
    }

    const onUp = (e: PointerEvent) => {
      setDraggingPart(null)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      commitCrop('drag', e)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }

  const handleWheel = (event: WheelEvent) => {
    if (disabled() || resolvedMode() !== 'frame' || !natural()) {
      return
    }
    event.preventDefault()
    const factor = event.deltaY < 0 ? 1.1 : 1 / 1.1
    setZoomImpl(currentZoom() * factor, { reason: 'wheel', event })
  }

  const api: ImageCropperApi = {
    setCrop: (next, opts) => updateCrop(next, opts?.reason ?? 'programmatic', opts?.event),
    setZoom: setZoomImpl,
    rotate: rotateImpl,
    flip: flipImpl,
    reset: () => {
      setFallbackZoom(1)
      setFallbackRotation(0)
      setFallbackFlipX(false)
      setFallbackFlipY(false)
      const nat = natural()
      const next =
        props.defaultCrop ??
        (nat ? computeInitialCrop(nat, limits(), resolvedMode()) : DEFAULT_CROP)
      updateCrop(next, 'reset')
    },
    getCrop: () => currentCrop(),
    getZoom: () => currentZoom(),
    getRotation: () => currentCrop().rotation,
    focus: () => selectionEl?.focus(),
  }

  useController(() => props.controller, api)

  registerComponent({
    component: 'image-cropper',
    getElements: () => [rootEl],
    getState: () => ({
      crop: currentCrop(),
      zoom: currentZoom(),
      rotation: currentCrop().rotation,
      disabled: disabled(),
    }),
    getDisabled: disabled,
    actions: {
      rotate: (deg) => api.rotate(Number(deg ?? 90)),
      reset: () => api.reset(),
    },
  })

  const rest = omit(
    props,
    'src',
    'crop',
    'defaultCrop',
    'onCropChange',
    'onCropCommit',
    'aspectRatio',
    'minWidth',
    'minHeight',
    'minZoom',
    'maxZoom',
    'shape',
    'mode',
    'disabled',
    'controller',
    'debug',
  )

  return (
    <ImageCropperContext
      value={{
        state,
        api,
        src: () => props.src,
        natural,
        layout,
        draggingPart,
        setDraggingPart,
        setViewportBox,
        onImageLoad,
        onImageError,
        setSelectionEl: (el) => {
          selectionEl = el
        },
        updateCrop,
        commitCrop,
        startDrag,
        handleWheel,
        minZoom,
        maxZoom,
      }}
    >
      {renderPart('div', rest, state, {
        ref: (el) => {
          rootEl = el
        },
        attrs: () => {
          const s = state()
          return {
            id,
            role: 'group',
            'data-slot': 'image-cropper',
            'data-mode': s.mode,
            'data-shape': s.shape,
            'data-loading': s.loading ? '' : undefined,
            'data-error': s.error ? '' : undefined,
            'data-disabled': s.disabled ? '' : undefined,
            'data-dragging': s.dragging ? '' : undefined,
            'aria-busy': s.loading ? 'true' : undefined,
          }
        },
      })}
    </ImageCropperContext>
  )
}

export function ImageCropperViewport(props: PartProps<'div', ImageCropperState>) {
  const ctx = useImageCropper('Viewport')
  let elRef: HTMLElement | null = null

  const measure = (el: HTMLElement) => {
    const cs = typeof getComputedStyle === 'function' ? getComputedStyle(el) : null
    const pl = cs ? Number.parseFloat(cs.paddingLeft) || 0 : 0
    const pt = cs ? Number.parseFloat(cs.paddingTop) || 0 : 0
    const pr = cs ? Number.parseFloat(cs.paddingRight) || 0 : 0
    const pb = cs ? Number.parseFloat(cs.paddingBottom) || 0 : 0
    const width = Math.max(0, el.clientWidth - pl - pr)
    const height = Math.max(0, el.clientHeight - pt - pb)
    if (width > 0 && height > 0) {
      ctx.setViewportBox({ left: pl, top: pt, width, height })
    }
  }

  let observer: ResizeObserver | undefined
  onCleanup(() => observer?.disconnect())

  return renderPart('div', props, ctx.state, {
    ref: (el: HTMLElement) => {
      elRef = el
      measure(el)
      if (typeof ResizeObserver !== 'undefined') {
        observer?.disconnect()
        observer = new ResizeObserver(() => measure(el))
        observer.observe(el)
      }
    },
    attrs: () => {
      const s = ctx.state()
      return {
        'data-slot': 'image-cropper-viewport',
        'data-mode': s.mode,
        'data-shape': s.shape,
        'data-loading': s.loading ? '' : undefined,
        'data-error': s.error ? '' : undefined,
        'data-disabled': s.disabled ? '' : undefined,
        'data-dragging': s.dragging ? '' : undefined,
      }
    },
    style: () => {
      const s = ctx.state()
      const nat = ctx.natural()
      const shown = nat ? shownSize(nat, s.rotation) : null
      return {
        position: 'relative',
        overflow: 'hidden',
        'user-select': 'none',
        'touch-action': s.mode === 'frame' ? 'none' : undefined,
        cursor: s.mode === 'frame' && !s.disabled ? 'move' : undefined,
        '--image-cropper-aspect-ratio': shown ? `${shown.width} / ${shown.height}` : undefined,
      }
    },
    handlers: {
      onPointerDown: (e: PointerEvent) => {
        if (ctx.state().mode === 'frame' && elRef) {
          ctx.startDrag(e, elRef, 'pan')
        }
      },
      onWheel: (e: WheelEvent) => ctx.handleWheel(e),
    },
  })
}

export function ImageCropperImage(props: PartProps<'img', ImageCropperState>) {
  const ctx = useImageCropper('Image')
  return renderPart('img', props, ctx.state, {
    ref: (el: HTMLImageElement) => {
      if (el.complete && el.naturalWidth > 0) {
        queueMicrotask(() => ctx.onImageLoad(el))
      }
    },
    attrs: () => {
      const s = ctx.state()
      return {
        src: props.src ?? ctx.src(),
        draggable: false,
        'data-slot': 'image-cropper-image',
        'data-mode': s.mode,
        'data-shape': s.shape,
        'data-loading': s.loading ? '' : undefined,
        'data-error': s.error ? '' : undefined,
        'data-disabled': s.disabled ? '' : undefined,
      }
    },
    style: () => {
      const s = ctx.state()
      const at = ctx.layout()
      const nat = ctx.natural()
      if (at && nat) {
        const flip = `scale(${s.flipX ? -1 : 1}, ${s.flipY ? -1 : 1})`
        return {
          'pointer-events': 'none',
          'user-select': 'none',
          position: 'absolute',
          left: px(at.image.left + at.image.width / 2),
          top: px(at.image.top + at.image.height / 2),
          width: px(nat.width * at.scale),
          height: px(nat.height * at.scale),
          'max-width': 'none',
          'max-height': 'none',
          transform: `translate(-50%, -50%) ${flip} rotate(${s.rotation}deg)`,
        }
      }
      const sx = s.flipX ? -s.zoom : s.zoom
      const sy = s.flipY ? -s.zoom : s.zoom
      return {
        'pointer-events': 'none',
        'user-select': 'none',
        transform: `scale(${sx}, ${sy}) rotate(${s.rotation}deg)`,
      }
    },
    handlers: {
      onLoad: (e: Event & { currentTarget: HTMLImageElement }) => {
        ctx.onImageLoad(e.currentTarget)
      },
      onError: () => {
        ctx.onImageError()
      },
    },
  })
}

export function ImageCropperSelection(props: PartProps<'div', ImageCropperState>) {
  const ctx = useImageCropper('Selection')
  let elRef: HTMLElement | null = null

  return renderPart('div', props, ctx.state, {
    ref: (el: HTMLElement) => {
      elRef = el
      ctx.setSelectionEl(el)
    },
    attrs: () => {
      const s = ctx.state()
      const c = s.crop
      return {
        role: 'slider',
        tabindex: s.disabled ? undefined : 0,
        'aria-label': 'Crop',
        'aria-roledescription': 'crop area',
        'aria-valuemin': 0,
        'aria-valuenow': c.x,
        'aria-disabled': s.disabled ? 'true' : undefined,
        'data-slot': 'image-cropper-selection',
        'data-mode': s.mode,
        'data-shape': s.shape,
        'data-disabled': s.disabled ? '' : undefined,
        'data-dragging': s.dragging ? '' : undefined,
      }
    },
    style: () => {
      const s = ctx.state()
      const at = ctx.layout()
      const base = {
        position: 'absolute' as const,
        'touch-action': s.mode === 'box' ? 'none' : undefined,
        cursor: s.mode === 'box' && !s.disabled ? 'move' : undefined,
        'border-radius': s.shape === 'circle' ? '9999px' : undefined,
      }
      if (at) {
        return {
          ...base,
          left: px(at.selection.left),
          top: px(at.selection.top),
          width: px(at.selection.width),
          height: px(at.selection.height),
        }
      }
      const c = s.crop
      return {
        ...base,
        left: `${c.x}%`,
        top: `${c.y}%`,
        width: `${c.width}%`,
        height: `${c.height}%`,
      }
    },
    handlers: {
      onPointerDown: (e: PointerEvent) => {
        if (ctx.state().mode === 'box' && elRef) {
          ctx.startDrag(e, elRef, 'move')
        }
      },
    },
  })
}

export function ImageCropperGrid(props: PartProps<'div', ImageCropperState>) {
  const ctx = useImageCropper('Grid')
  return renderPart('div', props, ctx.state, {
    attrs: () => {
      const s = ctx.state()
      return {
        'aria-hidden': 'true',
        'data-slot': 'image-cropper-grid',
        'data-mode': s.mode,
        'data-shape': s.shape,
        'data-dragging': s.dragging ? '' : undefined,
      }
    },
    style: () => ({
      position: 'absolute',
      inset: '0',
      'pointer-events': 'none',
    }),
  })
}

export function ImageCropperHandle(
  props: ImageCropperHandleProps &
    Omit<PartProps<'div', ImageCropperHandleState>, keyof ImageCropperHandleProps>,
) {
  const ctx = useImageCropper('Handle')
  let elRef: HTMLElement | null = null
  const handleState = (): ImageCropperHandleState => ({
    ...ctx.state(),
    position: props.position,
  })
  const rest = omit(props, 'position')
  return renderPart('div', rest, handleState, {
    ref: (el: HTMLElement) => {
      elRef = el
    },
    attrs: () => {
      const s = ctx.state()
      const pos = props.position
      return {
        role: 'slider',
        hidden: s.mode === 'box' ? undefined : true,
        tabindex: s.disabled ? undefined : 0,
        'aria-label': HANDLE_NAMES[pos] ?? pos,
        'aria-roledescription': 'resize handle',
        'aria-orientation':
          pos === 'n' || pos === 's'
            ? 'vertical'
            : pos === 'e' || pos === 'w'
              ? 'horizontal'
              : undefined,
        'aria-disabled': s.disabled ? 'true' : undefined,
        'data-slot': 'image-cropper-handle',
        'data-position': pos,
        'data-mode': s.mode,
        'data-shape': s.shape,
        'data-disabled': s.disabled ? '' : undefined,
        'data-dragging': ctx.draggingPart() === pos ? '' : undefined,
      }
    },
    style: () => {
      const s = ctx.state()
      const at = ctx.layout()
      const [across, down] = HANDLE_SPOTS[props.position] ?? [0, 0]
      const base = {
        position: 'absolute' as const,
        cursor: s.disabled ? undefined : HANDLE_CURSORS[props.position],
        'touch-action': 'none',
      }
      if (at) {
        return {
          ...base,
          left: px(at.selection.left + across * at.selection.width),
          top: px(at.selection.top + down * at.selection.height),
        }
      }
      const c = s.crop
      return {
        ...base,
        left: `${c.x + across * c.width}%`,
        top: `${c.y + down * c.height}%`,
      }
    },
    handlers: {
      onPointerDown: (e: PointerEvent) => {
        if (ctx.state().mode === 'box' && elRef) {
          ctx.startDrag(e, elRef, props.position)
        }
      },
    },
  })
}

export function ImageCropperZoom(
  props: Omit<PartProps<'input', ImageCropperState>, 'type' | 'value'>,
) {
  const ctx = useImageCropper('Zoom')
  return renderPart('input', props, ctx.state, {
    attrs: () => {
      const s = ctx.state()
      return {
        type: 'range',
        min: ctx.minZoom(),
        max: ctx.maxZoom(),
        step: 'any',
        value: s.zoom,
        disabled: s.disabled || undefined,
        'aria-label': 'Zoom',
        'aria-valuetext': `${Math.round(s.zoom * 100)}%`,
        'data-slot': 'image-cropper-zoom',
        'data-mode': s.mode,
        'data-shape': s.shape,
        'data-disabled': s.disabled ? '' : undefined,
      }
    },
    handlers: {
      onInput: (e: InputEvent & { currentTarget: HTMLInputElement }) => {
        ctx.api.setZoom(Number(e.currentTarget.value), { reason: 'zoom-input', event: e })
      },
      onChange: (e: Event) => {
        ctx.commitCrop('zoom-input', e)
      },
    },
  })
}

export function ImageCropperRotate(
  props: { degrees?: number } & Omit<PartProps<'button', ImageCropperState>, 'type'>,
) {
  const ctx = useImageCropper('Rotate')
  const rest = omit(props, 'degrees')
  return renderPart('button', rest, ctx.state, {
    attrs: () => {
      const s = ctx.state()
      return {
        type: 'button',
        disabled: s.disabled || undefined,
        'data-slot': 'image-cropper-rotate',
        'data-mode': s.mode,
        'data-shape': s.shape,
        'data-disabled': s.disabled ? '' : undefined,
      }
    },
    handlers: {
      onClick: (e: MouseEvent) =>
        ctx.api.rotate(props.degrees ?? 90, { reason: 'rotate-press', event: e }),
    },
  })
}

export function ImageCropperFlip(
  props: ImageCropperFlipProps &
    Omit<PartProps<'button', ImageCropperState>, keyof ImageCropperFlipProps | 'type'>,
) {
  const ctx = useImageCropper('Flip')
  const rest = omit(props, 'direction')
  return renderPart('button', rest, ctx.state, {
    attrs: () => {
      const s = ctx.state()
      return {
        type: 'button',
        disabled: s.disabled || undefined,
        'data-slot': 'image-cropper-flip',
        'data-direction': props.direction ?? 'horizontal',
        'data-mode': s.mode,
        'data-shape': s.shape,
        'data-disabled': s.disabled ? '' : undefined,
      }
    },
    handlers: {
      onClick: (e: MouseEvent) =>
        ctx.api.flip(props.direction ?? 'horizontal', { reason: 'flip-press', event: e }),
    },
  })
}
