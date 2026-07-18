/** Official-style filled Apple mark for auth buttons. */
export default function AppleBrandIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className || 'al-apple-icon'}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M16.365 1.43c0 1.14-.428 2.054-1.214 2.772-.894.834-1.953 1.3-3.036 1.21-.074-1.093.386-2.18 1.18-2.9.873-.784 2.083-1.32 3.07-1.36zM20.8 17.23c-.55 1.25-.82 1.81-1.54 2.91-.99 1.48-2.39 3.32-4.13 3.34-1.54.02-1.94-.97-4.03-.96-2.09.01-2.54.98-4.08.96-1.74-.02-3.08-1.68-4.07-3.16C1.04 16.97-.4 12.03 1.64 8.72c1.08-1.77 3-2.9 5.07-2.93 1.58-.03 3.07 1.07 4.03 1.07.95 0 2.72-1.32 4.59-1.12.78.03 2.97.32 4.37 2.4-3.72 2.04-3.12 7.36.1 8.16z"
      />
    </svg>
  )
}
