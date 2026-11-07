import ReactMarkdown from 'react-markdown'
import { cn } from '../../lib/utils'

/**
 * Safe markdown for AI text: raw HTML is never rendered (react-markdown default),
 * images are dropped, and links open safely in a new tab. Styled by `.prose-medo`.
 */
export default function Markdown({ children, className }) {
  return (
    <div className={cn('prose-medo max-w-[65ch]', className)}>
      <ReactMarkdown
        skipHtml
        disallowedElements={['img', 'iframe', 'script', 'style', 'table']}
        unwrapDisallowed
        components={{
          a: ({ href, children: c }) => (
            <a href={href} target="_blank" rel="noopener noreferrer nofollow">{c}</a>
          ),
          h1: 'p', h2: 'p', h3: 'p', h4: 'p',
          code: ({ children: c }) => <code className="rounded bg-cream px-1 py-0.5 font-mono text-[0.875em] text-ink">{c}</code>,
        }}
      >
        {children || ''}
      </ReactMarkdown>
    </div>
  )
}
