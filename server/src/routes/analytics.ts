import { Hono } from 'hono'
import { table } from '../db/index'

const analyticsRoute = new Hono()

const VALID_EVENTS = [
  'page_view', 'transaction_create', 'ai_report_generate', 'asset_edit',
  'savings_goal_action', 'savings_progress', 'voice_used', 'category_custom_add',
  'report_generate'
]

analyticsRoute.post('/track', async (c) => {
  const body = await c.req.json<{ userUuid: string; eventType: string; timestamp?: number }>()
  if (!body.userUuid || !body.eventType) return c.json({ error: 'Missing required fields' }, 400)
  if (!VALID_EVENTS.includes(body.eventType)) return c.json({ error: 'Invalid event type' }, 400)

  table('analyticsEvents').insert({
    userUuid: body.userUuid, eventType: body.eventType, timestamp: body.timestamp || Date.now(),
  })
  return c.json({ success: true })
})

analyticsRoute.get('/dashboard', async (c) => {
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  const todayTs = todayStart.getTime()

  const events = table('analyticsEvents')

  // Count real users from transactions (more reliable than users table due to CORS history)
  const allTxUuids = [...new Set(table('transactions').all().map((t: any) => t.userUuid))]
  const totalUsers = allTxUuids.length

  // Auto-repair: create missing user records
  for (const uuid of allTxUuids) {
    if (!table('users').get(uuid)) {
      table('users').insert({ uuid, nickname: '', createdAt: Date.now(), lastActiveAt: Date.now() })
    }
  }

  // Feature usage counts
  const usersWithTx = allTxUuids.length
  const usersWithReports = new Set(table('aiReports').all().map((r: any) => r.userUuid)).size
  const usersWithAssets = new Set(table('assets').all().map((a: any) => a.userUuid)).size
  const usersWithGoals = new Set(table('savingsGoals').all().map((g: any) => g.userUuid)).size

  // Today active (distinct UUIDs with any event today)
  const todayActiveUsers = new Set(events.filter((e: any) => e.timestamp >= todayTs).map((e: any) => e.userUuid)).size

  // 7-day DAU trend
  const dauTrend: { date: string; count: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0)
    const dEnd = new Date(d); dEnd.setDate(dEnd.getDate() + 1)
    const count = new Set(
      events.filter((e: any) => e.timestamp >= d.getTime() && e.timestamp < dEnd.getTime()).map((e: any) => e.userUuid)
    ).size
    dauTrend.push({ date: d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }), count })
  }

  // Recent events timeline (last 30)
  const recentEvents = events.all()
    .filter((e: any) => e.timestamp)
    .sort((a: any, b: any) => b.timestamp - a.timestamp)
    .slice(0, 30)
    .map((e: any) => ({
      userUuid: (e.userUuid || '').slice(0, 8),
      eventType: e.eventType,
      timestamp: e.timestamp,
    }))

  // User stats list
  const userStats = allTxUuids.map(uuid => {
    const user = table('users').get(uuid) || {}
    const txCount = table('transactions').count((t: any) => t.userUuid === uuid)
    const reportCount = table('aiReports').count((r: any) => r.userUuid === uuid)
    const goalCount = table('savingsGoals').count((g: any) => g.userUuid === uuid)
    const voiceCount = events.filter((e: any) => e.userUuid === uuid && e.eventType === 'voice_used').length
    const todayVisits = events.filter((e: any) =>
      e.userUuid === uuid && e.eventType === 'page_view' && e.timestamp >= todayTs
    ).length

    return {
      uuid: uuid.slice(0, 8) + '...', fullUuid: uuid,
      nickname: user.nickname || '', createdAt: user.createdAt || 0, lastActiveAt: user.lastActiveAt || 0,
      todayVisits, txCount, reportCount, goalCount, voiceCount,
    }
  })

  // Sort by last active
  userStats.sort((a, b) => b.lastActiveAt - a.lastActiveAt)

  return c.json({
    overview: {
      totalUsers,
      todayActive: todayActiveUsers,
      totalTransactions: table('transactions').count(),
      totalReports: table('aiReports').count(),
    },
    featureUsage: {
      transaction: totalUsers > 0 ? Math.round(usersWithTx / totalUsers * 100) : 0,
      aiReport: totalUsers > 0 ? Math.round(usersWithReports / totalUsers * 100) : 0,
      asset: totalUsers > 0 ? Math.round(usersWithAssets / totalUsers * 100) : 0,
      savings: totalUsers > 0 ? Math.round(usersWithGoals / totalUsers * 100) : 0,
    },
    dauTrend,
    recentEvents,
    users: userStats,
  })
})

export { analyticsRoute }
