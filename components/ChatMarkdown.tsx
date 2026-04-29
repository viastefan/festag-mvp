'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type Props = {
  text: string
  variant?: 'ai' | 'plain'
}

export default function ChatMarkdown({ text, variant = 'ai' }: Props) {
  return (
    <div className={`md ${variant === 'plain' ? 'md-plain' : 'md-ai'}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--green-dark)', textDecoration: 'underline' }}>
              {children}
            </a>
          ),
          code: ({ className, children, ...props }: any) => {
            const inline = !className
            if (inline) {
              return (
                <code style={{ background: 'var(--surface-2)', padding: '1px 6px', borderRadius: 4, fontSize: '0.92em', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
                  {children}
                </code>
              )
            }
            return (
              <code className={className} style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '0.88em' }} {...props}>
                {children}
              </code>
            )
          },
          pre: ({ children }) => (
            <pre style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '10px 12px',
              overflowX: 'auto',
              fontSize: '0.9em',
              margin: '8px 0',
              lineHeight: 1.5,
            }}>
              {children}
            </pre>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
      <style>{`
        .md > :first-child { margin-top: 0 }
        .md > :last-child  { margin-bottom: 0 }
        .md p     { margin: 0 0 8px; line-height: 1.6 }
        .md p:last-child { margin-bottom: 0 }
        .md h1, .md h2, .md h3, .md h4 { margin: 12px 0 6px; line-height: 1.3; font-weight: 700 }
        .md h1 { font-size: 1.15em }
        .md h2 { font-size: 1.08em }
        .md h3 { font-size: 1em }
        .md ul, .md ol { margin: 4px 0 8px; padding-left: 22px }
        .md li { margin: 2px 0; line-height: 1.55 }
        .md li > p { margin: 0 }
        .md strong { font-weight: 700 }
        .md em { font-style: italic }
        .md blockquote { margin: 6px 0; padding: 4px 12px; border-left: 3px solid var(--border-strong); color: var(--text-secondary) }
        .md hr { border: 0; border-top: 1px solid var(--border); margin: 10px 0 }
        .md table { border-collapse: collapse; margin: 8px 0; font-size: 0.92em }
        .md th, .md td { border: 1px solid var(--border); padding: 5px 8px; text-align: left }
        .md th { background: var(--surface-2); font-weight: 600 }
      `}</style>
    </div>
  )
}
