import { NextResponse, type NextRequest } from 'next/server'

import { createClient } from '@/lib/supabase/server'

function safeRedirectPath(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/dashboard'
  return value
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const providerError = requestUrl.searchParams.get('error')
  const providerErrorDescription = requestUrl.searchParams.get('error_description')
  const next = safeRedirectPath(requestUrl.searchParams.get('next'))

  if (providerError) {
    const loginUrl = new URL('/login', requestUrl.origin)
    loginUrl.searchParams.set('error', providerErrorDescription || providerError || 'auth_failed')
    return NextResponse.redirect(loginUrl)
  }

  const supabase = createClient()

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      const loginUrl = new URL('/login', requestUrl.origin)
      loginUrl.searchParams.set('error', 'auth_failed')
      return NextResponse.redirect(loginUrl)
    }
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    const loginUrl = new URL('/login', requestUrl.origin)
    loginUrl.searchParams.set('error', 'auth_failed')
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin))
}
