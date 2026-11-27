// Provide minimal browser APIs and exit animation support in jsdom,
// matching Moraine's jsdom test environment conventions.
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

if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
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

if (typeof Element !== 'undefined' && typeof Element.prototype.scrollIntoView !== 'function') {
  Element.prototype.scrollIntoView = () => {}
}
