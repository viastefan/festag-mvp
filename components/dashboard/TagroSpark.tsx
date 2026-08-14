/** TagroSpark — der vierzackige Tagro-Stern. Erbt die Textfarbe. */
export default function TagroSpark({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 1.5c.45 5.1 5.4 10.05 10.5 10.5-5.1.45-10.05 5.4-10.5 10.5-.45-5.1-5.4-10.05-10.5-10.5C6.6 11.55 11.55 6.6 12 1.5Z"
        fill="currentColor"
      />
    </svg>
  )
}
