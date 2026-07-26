'use client'

/** Linear-inspired isometric document wireframe for empty Dokumente. */
export default function DocumentsEmptyIllustration() {
  return (
    <div className="doc-empty-art" aria-hidden>
      <svg viewBox="0 0 120 88" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g className="doc-empty-sheet doc-empty-sheet--1">
          <path className="doc-empty-edge" d="M18 52 L42 40 L66 52 L42 64 Z" />
          <path className="doc-empty-edge" d="M42 40 L42 18 L66 30 L66 52" />
          <path className="doc-empty-edge" d="M42 40 L42 18 L18 30 L18 52" />
          <path className="doc-empty-fold" d="M42 18 L50 14 L50 22 L42 18" />
        </g>
        <g className="doc-empty-sheet doc-empty-sheet--2">
          <path className="doc-empty-edge" d="M34 62 L58 50 L82 62 L58 74 Z" />
          <path className="doc-empty-edge" d="M58 50 L58 28 L82 40 L82 62" />
          <path className="doc-empty-edge" d="M58 50 L58 28 L34 40 L34 62" />
          <path className="doc-empty-line" d="M42 56 H74" />
          <path className="doc-empty-line" d="M42 61 H68" />
        </g>
        <g className="doc-empty-sheet doc-empty-sheet--3">
          <path className="doc-empty-edge" d="M10 36 L34 24 L58 36 L34 48 Z" />
          <path className="doc-empty-edge" d="M34 24 L34 4 L58 16 L58 36" />
          <path className="doc-empty-edge" d="M34 24 L34 4 L10 16 L10 36" />
        </g>
      </svg>
    </div>
  )
}
