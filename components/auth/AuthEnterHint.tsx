/** Desktop-only keyboard shortcut hint for primary auth CTAs. */
export default function AuthEnterHint({ ready = true }: { ready?: boolean }) {
  return (
    <span
      className={`al-enter-hint${ready ? ' is-visible' : ''}`}
      aria-hidden="true"
    >
      <span className="al-enter-hint-key">↵</span>
      <span className="al-enter-hint-label">Enter</span>
    </span>
  )
}
