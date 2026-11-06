import ReactMarkdown from 'react-markdown'

/**
 * Safe markdown for AI text: raw HTML is never rendered (react-markdown default),
 * images are dropped, and links open safely in a new tab.
 */
export default function Markdown({ children }) {
  return (
    <div className="prose-medo">
      <ReactMarkdown
        skipHtml
        disallowedElements={['img', 'iframe', 'script', 'style', 'table']}
        unwrapDisallowed
        components={{
          a: ({ href, children: c }) => (
            <a href={href} target="_blank" rel="noopener noreferrer nofollow">{c}</a>
          ),
          h1: 'p', h2: 'p', h3: 'p', h4: 'p',
        }}
      >
        {children || ''}
      </ReactMarkdown>
    </div>
  )
}
