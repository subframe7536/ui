declare module '*generated/docs-data.json' {
  const data: Record<string, unknown>
  export default data
}

declare module '*generated/nav.json' {
  const nav: Array<{
    section?: 'solid' | 'guides' | 'agents' | 'core'
    group: string
    indexSlug?: string
    items: Array<{ slug: string; title: string }>
  }>
  export default nav
}

declare module '*generated/example-sources.json' {
  const sources: Record<string, string>
  export default sources
}
