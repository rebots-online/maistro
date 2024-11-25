import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { hasFeatureAccess } from './lib/subscription';

// Add feature checks to protected routes
export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request });
  
  if (!token) {
    return NextResponse.redirect(new URL('/auth/signin', request.url));
  }

  // Feature-gated routes
  if (request.nextUrl.pathname.startsWith('/api/collaboration')) {
    const hasAccess = await hasFeatureAccess(token.user, 'realTimeCollaboration');
    if (!hasAccess) {
      return new NextResponse(
        JSON.stringify({ error: 'Requires Pro subscription' }),
        { status: 403, headers: { 'content-type': 'application/json' } }
      );
    }
  }

  if (request.nextUrl.pathname.startsWith('/api/analysis')) {
    const hasAccess = await hasFeatureAccess(token.user, 'advancedAnalysis');
    if (!hasAccess) {
      return new NextResponse(
        JSON.stringify({ error: 'Requires Pro subscription' }),
        { status: 403, headers: { 'content-type': 'application/json' } }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/collaboration/:path*',
    '/api/analysis/:path*',
    '/api/scores/:path*'
  ]
};
