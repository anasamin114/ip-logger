// middleware.js
import { NextResponse } from 'next/server';

export function middleware(request) {
  // If it's an API route for logging, let it pass through
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // For page requests, extract IP and pass it as header
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || request.headers.get('x-vercel-forwarded-for')
    || request.ip
    || '127.0.0.1';

  const response = NextResponse.next();
  
  // Forward the real IP to the app
  response.headers.set('x-real-ip-detected', ip);
  
  return response;
}

export const config = {
  matcher: [
    // Match all routes except static files
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
