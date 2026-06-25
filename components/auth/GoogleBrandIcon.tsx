type Props = {
  className?: string
}

export default function GoogleBrandIcon({ className = 'al-google-icon' }: Props) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/google-symbol.svg"
      alt=""
      aria-hidden="true"
      className={className}
    />
  )
}
