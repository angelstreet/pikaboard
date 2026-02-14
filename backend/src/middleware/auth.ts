import { Context, Next } from 'hono';
import { verifyToken } from '@clerk/backend';

// Public endpoints that skip auth
const PUBLIC_PATHS = ['/api/apps', '/api/health'];

export const authMiddleware = async (c: Context, next: Next) => {
  if (PUBLIC_PATHS.some((p) => c.req.path === p || c.req.path.startsWith(p + '/'))) {
    return next();
  }

  const authHeader = c.req.header('Authorization');
  const apiToken = process.env.PIKABOARD_API_TOKEN || process.env.PIKABOARD_TOKEN;
  const clerkSecretKey = process.env.CLERK_SECRET_KEY;

  // If neither auth method is configured, allow all requests
  if (!apiToken && !clerkSecretKey) {
    console.warn(
      '⚠️  No auth configured (PIKABOARD_API_TOKEN/PIKABOARD_TOKEN and CLERK_SECRET_KEY all unset)'
    );
    return next();
  }

  if (!authHeader) {
    return c.json({ error: 'Missing Authorization header' }, 401);
  }

  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return c.json({ error: 'Invalid Authorization header' }, 401);
  }

  // 1. Check API token (for agents/OpenClaw)
  if (apiToken && token === apiToken) {
    return next();
  }

  // 2. Check Clerk JWT (for human users)
  if (clerkSecretKey) {
    try {
      const payload = await verifyToken(token, { secretKey: clerkSecretKey });
      (c as any).clerkUserId = payload.sub;
      return next();
    } catch {
      // Invalid Clerk token — fall through to 401
    }
  }

  return c.json({ error: 'Invalid token' }, 401);
};
