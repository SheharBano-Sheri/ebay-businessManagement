import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request) {
  // Allow auth routes and public assets
  if (
    request.nextUrl.pathname.startsWith('/auth') ||
    request.nextUrl.pathname.startsWith('/api/auth') ||
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/public') ||
    request.nextUrl.pathname === '/'
  ) {
    return NextResponse.next();
  }

  // Check if user has a valid JWT token
  const token = await getToken({ 
    req: request, 
    secret: process.env.NEXTAUTH_SECRET 
  });

  if (!token) {
    // Redirect to signin if no token
    if (request.nextUrl.pathname.startsWith('/dashboard')) {
      return NextResponse.redirect(new URL('/auth/signin', request.url));
    }
    return NextResponse.next();
  }

  // For dashboard routes, validate that the session is still active
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    if (token.sessionToken) {
      try {
        // We'll verify session is active via the database
        // This is a lightweight check - the session API will handle the full validation
        const sessionCheckResponse = await fetch(
          `${request.nextUrl.origin}/api/auth/validate-session`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              sessionToken: token.sessionToken,
              userId: token.id 
            }),
          }
        );

        if (!sessionCheckResponse.ok) {
          // Session is invalid - redirect to signin
          return NextResponse.redirect(new URL('/auth/signin', request.url));
        }
      } catch (error) {
        console.error('Session validation error:', error);
        // On error, allow the request to proceed (fail open)
        // The session callback in NextAuth will handle expired sessions
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
