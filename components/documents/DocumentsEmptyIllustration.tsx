'use client'

/** Linear-inspired isometric document stack for empty Dokumente. */
export default function DocumentsEmptyIllustration() {
  return (
    <div className="doc-empty-art" aria-hidden>
      <svg viewBox="0 0 120 92" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g className="doc-empty-sheet doc-empty-sheet--1">
          <path className="doc-empty-fill" d="M22 58 L48 46 L74 58 L48 70 Z" />
          <path className="doc-empty-stroke" d="M22 58 L48 46 L74 58 L48 70 Z" />
          <path className="doc-empty-stroke" d="M48 46 L48 24 L74 36 L74 58" />
          <path className="doc-empty-stroke" d="M48 46 L48 24 L22 36 L22 58" />
          <path className="doc-empty-fold" d="M48 24 L56 20 L56 28 L48 24" />
        </g>
        <g className="doc-empty-sheet doc-empty-sheet--2">
          <path className="doc-empty-fill" d="M38 68 L64 56 L90 68 L64 80 Z" />
          <path className="doc-empty-stroke" d="M38 68 L64 56 L90 68 L64 80 Z" />
          <path className="doc-empty-stroke" d="M64 56 L64 34 L90 46 L90 68" />
          <path className="doc-empty-stroke" d="M64 56 L64 34 L38 46 L38 68" />
        </g>
        <g className="doc-empty-sheet doc-empty-sheet--3">
          <path className="doc-empty-fill" d="M14 42 L40 30 L66 42 L40 54 Z" />
          <path className="doc-empty-stroke" d="M14 42 L40 30 L66 42 L40 54 Z" />
          <path className="doc-empty-stroke" d="M40 30 L40 8 L66 20 L66 42" />
          <path className="doc-empty-stroke" d="M40 30 L40 8 L14 20 L14 42" />
          <path className="doc-empty-line" d="M22 36 H54" />
          <path className="doc-empty-line" d="M22 41 H48" />
        </g>
      </svg>
    </div>
  )
}
