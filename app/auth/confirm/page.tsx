import { redirect } from 'next/navigation'

export default function AuthConfirmPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>
}) {
  const params = new URLSearchParams()
  Object.entries(searchParams ?? {}).forEach(([key, value]) => {
    if (typeof value === 'string') params.set(key, value)
    else if (Array.isArray(value) && value[0]) params.set(key, value[0])
  })

  const query = params.toString()
  redirect(`/auth/callback${query ? `?${query}` : ''}`)
}
