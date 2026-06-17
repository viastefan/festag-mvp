/** Trailing @-fragment the user is typing (e.g. "@Max" → "Max"). */
export function trailingMentionQuery(text: string): string | null {
  const m = text.match(/@([^\s@]*)$/)
  return m ? m[1] : null
}

/** Replace a trailing @-partial with a resolved mention label. */
export function replaceTrailingMention(text: string, mentionLabel: string): string {
  const label = mentionLabel.trim()
  if (!label) return text
  if (/@([^\s@]*)$/.test(text)) {
    return text.replace(/@([^\s@]*)$/, label.endsWith(' ') ? label : `${label} `)
  }
  const base = text.trimEnd()
  return base ? `${base} ${label} ` : `${label} `
}
