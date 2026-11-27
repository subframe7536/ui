import { render } from "@solidjs/web"
import { flush } from "solid-js"
import { afterEach, describe, expect, it } from "vitest"
import { createAgent } from "../src/agent"
import { Button } from "../src/button"
import { elementOf, observe, type ObservedChange } from "../src/observe"
import { Switch } from "../src/switch"
import { Tabs, TabsList, TabsPanel, TabsTab } from "../src/tabs"

let disposers: Array<() => void> = []

function mount(fn: () => any) {
  const container = document.createElement("div")
  document.body.appendChild(container)
  const dispose = render(fn, container)
  disposers.push(() => {
    dispose()
    container.remove()
  })
  return container
}

afterEach(() => {
  for (const dispose of disposers) dispose()
  disposers = []
  document.body.innerHTML = ""
})

describe("observe & createAgent", () => {
  it("observes user & agent changes and resolves elementOf(ref)", async () => {
    const seen: ObservedChange[] = []
    const stop = observe((change) => seen.push(change))
    disposers.push(stop)

    let saved = false
    mount(() => (
      <div>
        <Switch aria-label="Auto renew" defaultChecked={false} />
        <Tabs defaultValue="general">
          <TabsList>
            <TabsTab value="general">General</TabsTab>
            <TabsTab value="billing">Billing</TabsTab>
          </TabsList>
          <TabsPanel value="general">General Content</TabsPanel>
          <TabsPanel value="billing">Billing Content</TabsPanel>
        </Tabs>
        <Button onClick={() => (saved = true)}>Save</Button>
      </div>
    ))

    const agent = createAgent()
    const snap = agent.snapshot()
    expect(snap.some((c) => c.component === "switch" && c.label === "Auto renew")).toBe(true)
    expect(snap.some((c) => c.component === "tabs")).toBe(true)
    expect(snap.some((c) => c.component === "button" && c.label === "Save")).toBe(true)

    const switchEntry = snap.find((c) => c.component === "switch")!
    expect(elementOf(switchEntry.ref)?.getAttribute("role")).toBe("switch")

    const result = await agent.act({
      steps: [
        { ref: "Auto renew", action: "setChecked", args: [true] },
        { ref: "tabs", action: "setValue", args: ["billing"] },
        { ref: "Save", action: "press" },
      ],
    })
    flush()

    expect(result.ok).toBe(true)
    expect(saved).toBe(true)
    expect(result.changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ component: "switch", key: "checked", value: true }),
        expect.objectContaining({ component: "tabs", key: "value", value: "billing" }),
      ])
    )
    expect(seen.every((c) => c.source === "agent")).toBe(true)
  })
})
