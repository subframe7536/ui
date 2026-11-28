import { For, createSignal } from 'solid-js'

const choices = [
  { value: 'like', emoji: '👍', label: 'Like' },
  { value: 'love', emoji: '❤️', label: 'Love' },
  { value: 'celebrate', emoji: '🎉', label: 'Celebrate' },
]

function Example() {
  const [picked, setPicked] = createSignal<Array<string>>(['like'])
  const [focusedIndex, setFocusedIndex] = createSignal(0)
  const buttons: Array<HTMLButtonElement | undefined> = []

  const toggle = (value: string) => {
    setPicked((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value],
    )
  }

  const moveFocus = (next: number) => {
    const idx = (next + choices.length) % choices.length
    setFocusedIndex(idx)
    buttons[idx]?.focus()
  }

  return (
    <div data-slot="reactions" role="toolbar" aria-label="Reactions">
      <For each={choices}>
        {(choice, index) => {
          const active = () => picked().includes(choice.value)
          return (
            <button
              ref={(el) => {
                buttons[index()] = el
              }}
              type="button"
              data-slot="reaction"
              data-pressed={active() ? '' : undefined}
              aria-pressed={active() ? 'true' : 'false'}
              tabindex={focusedIndex() === index() ? 0 : -1}
              onFocus={() => setFocusedIndex(index())}
              onClick={() => toggle(choice.value)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight') {
                  e.preventDefault()
                  moveFocus(index() + 1)
                } else if (e.key === 'ArrowLeft') {
                  e.preventDefault()
                  moveFocus(index() - 1)
                } else if (e.key === 'Home') {
                  e.preventDefault()
                  moveFocus(0)
                } else if (e.key === 'End') {
                  e.preventDefault()
                  moveFocus(choices.length - 1)
                }
              }}
            >
              <span>{choice.emoji}</span>
              <span>{choice.label}</span>
            </button>
          )
        }}
      </For>
    </div>
  )
}

export { Example }
