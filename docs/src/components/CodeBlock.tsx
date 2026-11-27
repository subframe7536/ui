import { createSignal } from 'solid-js'

export function CodeBlock(props: { code: string; title?: string; lang?: string }) {
  const [copied, setCopied] = createSignal(false)

  const handleCopy = () => {
    void navigator.clipboard?.writeText(props.code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    })
  }

  return (
    <div class="code-block">
      <div class="code-block-header">
        <span>{props.title ?? props.lang ?? 'tsx'}</span>
        <button type="button" class="code-copy-btn" onClick={handleCopy}>
          {copied() ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre class="code-pre">
        <code>{props.code}</code>
      </pre>
    </div>
  )
}
