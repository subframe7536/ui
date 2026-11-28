import { For, createSignal } from 'solid-js'

const choices = [
  { value: 'like', emoji: '👍', label: 'Like' },
  { value: 'love', emoji: '❤️', label: 'Love' },
  { value: 'celebrate', emoji: '🎉', label: 'Celebrate' },
]

function Example() {
  const [picked, setPicked] = createSignal<Array<string>>(['like'])

  const toggle = (value: string) => {
    setPicked((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value],
    )
  }

  return (
    <div data-slot="reactions" role="toolbar" aria-label="Reactions">
      <For each={choices}>
        {(choice) => {
          const active = () => picked().includes(choice.value)
          return (
            <button
              type="button"
              data-slot="reaction"
              data-pressed={active() ? '' : undefined}
              aria-pressed={active() ? 'true' : 'false'}
              onClick={() => toggle(choice.value)}
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
