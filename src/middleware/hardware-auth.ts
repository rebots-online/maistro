import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { HardwareAuthFactory } from '../lib/hardware-auth/factory';
import { HardwareType } from '../lib/hardware-auth/types';
import prisma from '../lib/prisma';

export async function hardwareAuthMiddleware(request: NextRequest) {
  const token = await getToken({ req: request });
  
  if (!token) {
    return NextResponse.redirect(new URL('/auth/signin', request.url));
  }

  // Check if user has registered hardware
  const user = await prisma.user.findUnique({
    where: { id: token.sub }
  });

  if (!user) {
    return NextResponse.redirect(new URL('/auth/signin', request.url));
  }

  // If user has registered hardware, verify it's present
  if (user.hardwareId && user.hardwareType) {
    try {
      const provider = HardwareAuthFactory.getProvider(user.hardwareType as HardwareType);
      const config = HardwareAuthFactory.getConfig(user.hardwareType as HardwareType);
      
      const verifyResult = await provider.verifyHardware();
      
      if (!verifyResult.isValid) {
        if (config.required) {
          // If hardware is required, block access
          return new NextResponse(
            JSON.stringify({ 
              error: 'Hardware authentication required',
              details: verifyResult.error
            }),
            { 
              status: 403,
              headers: { 'content-type': 'application/json' }
            }
          );
        } else if (config.fallbackTimeout) {
          // If there's a fallback timeout, allow temporary access
          // You might want to implement a more sophisticated fallback system
          // For now, we'll just allow access
          return NextResponse.next();
        }
      }
      
      // Hardware verified successfully
      return NextResponse.next();
    } catch (error) {
      console.error('Hardware verification error:', error);
      // If hardware verification fails, handle based on config
      return new NextResponse(
        JSON.stringify({ 
          error: 'Hardware verification failed',
          details: error.message
        }),
        { 
          status: 500,
          headers: { 'content-type': 'application/json' }
        }
      );
    }
  }

  // If no hardware is registered, allow access
  return NextResponse.next();
}

// Configure which routes require hardware authentication
export const config = {
  matcher: [
    '/api/scores/:path*/export',  // Require hardware auth for exports
    '/api/scores/:path*/edit',    // And score editing
    // Add more protected routes as needed
  ]
};
