import { For, Show, createSignal } from 'solid-js'

import { createAgent } from '../../../../src/agent'
import { Rating, RatingItem } from '../../../../src/rating'

function Example() {
  const [value, setValue] = createSignal(3)
  const [snapshot, setSnapshot] = createSignal('')

  const inspect = () => {
    const entries = createAgent().snapshot()
    const ratings = entries.filter((e) => e.component === 'rating')
    setSnapshot(JSON.stringify(ratings.slice(-1), null, 2))
  }

  return (
    <div data-slot="stack">
      <Rating aria-label="Product rating" value={value()} onValueChange={(next) => setValue(next)}>
        <For each={[1, 2, 3, 4, 5]}>{(n) => <RatingItem index={n} aria-label={`${n} star`} />}</For>
      </Rating>
      <div data-slot="controls">
        <button type="button" onClick={() => setValue(5)}>
          Set 5 via state
        </button>
        <button type="button" onClick={inspect}>
          Read agent snapshot
        </button>
      </div>
      <Show when={snapshot()}>
        <pre style={{ margin: 0, 'font-size': '12px', overflow: 'auto' }}>{snapshot()}</pre>
      </Show>
    </div>
  )
}

export { Example }
