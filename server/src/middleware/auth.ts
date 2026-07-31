import { Context, Next } from 'hono';

// UUID 校验中间件：从请求头提取用户UUID
export async function authMiddleware(c: Context, next: Next) {
  const uuid = c.req.header('X-User-UUID');

  if (!uuid) {
    return c.json({ error: 'Missing X-User-UUID header', code: 'AUTH_REQUIRED' }, 401);
  }

  // UUID 格式校验
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(uuid)) {
    return c.json({ error: 'Invalid UUID format', code: 'INVALID_UUID' }, 400);
  }

  c.set('userUuid', uuid);
  await next();
}
