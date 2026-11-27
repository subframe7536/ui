import { renderToString } from '@solidjs/web'
import { describe, expect, it } from 'vitest'

import { HoverCard, HoverCardContent, HoverCardTrigger } from '../../src/hover-card'

// Runs with no DOM: any access to window or document during render throws.
describe('server rendering a hover card', () => {
  const card = (open: boolean) => (
    <HoverCard defaultOpen={open}>
      <HoverCardTrigger href="/ada">@ada</HoverCardTrigger>
      <HoverCardContent>Ada Lovelace</HoverCardContent>
    </HoverCard>
  )

  it('a closed card renders its link only', () => {
    const html = renderToString(() => card(false))
    expect(typeof window).toBe('undefined')
    expect(html).toContain('href="/ada"')
    expect(html).not.toContain('Ada Lovelace')
  })

  it('an open card renders its content', () => {
    expect(renderToString(() => card(true))).toContain('Ada Lovelace')
  })
})
