import { Context, Next } from 'hono';

export const authMiddleware = async (c: Context, next: Next) => {
  const authHeader = c.req.header('Authorization');
  const token = process.env.PIKABOARD_TOKEN;

  if (!token) {
    console.warn('⚠️  PIKABOARD_TOKEN not set - auth disabled');
    return next();
  }

  if (!authHeader) {
    return c.json({ error: 'Missing Authorization header' }, 401);
  }

  const [scheme, providedToken] = authHeader.split(' ');

  if (scheme !== 'Bearer' || providedToken !== token) {
    return c.json({ error: 'Invalid token' }, 401);
  }

  return next();
};
