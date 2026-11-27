// Provide minimal browser APIs and exit animation support in jsdom,
// matching Moraine's jsdom test environment conventions and @ui-sdk/solid tests.
if (typeof document !== 'undefined') {
  const style = document.createElement('style')
  style.textContent = `
    [data-closed] {
      animation: ui-test-exit 100ms linear forwards;
    }
    @keyframes ui-test-exit {
      from { opacity: 1; }
      to { opacity: 0; }
    }
  `
  document.head.append(style)
}

function MockResizeObserver() {
  return {
    observe() {},
    unobserve() {},
    disconnect() {},
  }
}

if (globalThis.ResizeObserver === undefined) {
  globalThis.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver
}

if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => false,
  })
}

if (typeof Element !== 'undefined') {
  if (typeof Element.prototype.scrollIntoView !== 'function') {
    Element.prototype.scrollIntoView = () => {}
  }
  if (typeof Element.prototype.getAnimations !== 'function') {
    Element.prototype.getAnimations = () => []
  }
}

if (typeof HTMLElement !== 'undefined') {
  if (typeof HTMLElement.prototype.showPopover !== 'function') {
    HTMLElement.prototype.showPopover = () => {}
  }
  if (typeof HTMLElement.prototype.hidePopover !== 'function') {
    HTMLElement.prototype.hidePopover = () => {}
  }
}
