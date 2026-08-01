import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { authMiddleware } from './middleware/auth';
import { userRoute } from './routes/user';
import { transactionRoute } from './routes/transaction';
import { assetRoute } from './routes/asset';
import { liabilityRoute } from './routes/liability';
import { savingsRoute } from './routes/savings';
import { reportRoute } from './routes/report';
import { analyticsRoute } from './routes/analytics';
import { exchangeRoute } from './routes/exchangeRate';

const app = new Hono();

// CORS
app.use('*', cors({
  origin: (origin) => origin || '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'X-User-UUID'],
  exposeHeaders: ['Content-Type'],
  maxAge: 86400,
}));

// 健康检查
app.get('/api/health', (c) => c.json({ status: 'ok', timestamp: Date.now() }));

// 无需认证的路由
app.route('/api/user', userRoute);
// analytics /track is public (sendBeacon), /dashboard requires auth
app.route('/api/analytics', analyticsRoute);
app.route('/api/exchange', exchangeRoute);

// 需要认证的路由
app.use('/api/transaction/*', authMiddleware);
app.use('/api/asset/*', authMiddleware);
app.use('/api/liability/*', authMiddleware);
app.use('/api/savings/*', authMiddleware);
app.use('/api/report/*', authMiddleware);

app.route('/api/transaction', transactionRoute);
app.route('/api/asset', assetRoute);
app.route('/api/liability', liabilityRoute);
app.route('/api/savings', savingsRoute);
app.route('/api/report', reportRoute);

// 404
app.notFound((c) => c.json({ error: 'Not found' }, 404));

// 错误处理
app.onError((err, c) => {
  console.error('[Server Error]', err);
  return c.json({ error: 'Internal server error', message: err.message }, 500);
});

const port = parseInt(process.env.PORT || '3000');

console.log(`
╔══════════════════════════════════════════╗
║       🏦 FinInsight API Server          ║
║       青年AI收支与资产负债智能分析工具     ║
╠══════════════════════════════════════════╣
║  Server running at: http://localhost:${port} ║
║  Health check: /api/health              ║
║  Admin API:    /api/analytics/dashboard ║
╚══════════════════════════════════════════╝
`);

serve({
  fetch: app.fetch,
  port,
});
