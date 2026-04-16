import { NextResponse, type NextRequest } from 'next/server'

// Simple middleware - just let requests through
// Auth is handled client-side and in layouts
export async function middleware(request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: [],
}
