import { Hono } from 'hono'
import { table } from '../db/index'

const analyticsRoute = new Hono()

analyticsRoute.post('/track', async (c) => {
  const body = await c.req.json<{ userUuid: string; eventType: string; timestamp?: number }>()
  if (!body.userUuid || !body.eventType) return c.json({ error: 'Missing required fields' }, 400)

  const validEvents = ['page_view', 'transaction_create', 'ai_report_generate', 'asset_edit', 'savings_goal_action']
  if (!validEvents.includes(body.eventType)) return c.json({ error: 'Invalid event type' }, 400)

  table('analyticsEvents').insert({
    userUuid: body.userUuid, eventType: body.eventType, timestamp: body.timestamp || Date.now(),
  })
  return c.json({ success: true })
})

analyticsRoute.get('/dashboard', async (c) => {
  const now = Date.now()
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayTs = todayStart.getTime()

  const allUsers = table('users').all()
  const events = table('analyticsEvents')

  const userStats = allUsers.map(user => {
    const txCount = table('transactions').count(t => t.userUuid === user.uuid)
    const assetCount = table('assets').count(a => a.userUuid === user.uuid)
    const reportCount = table('aiReports').count(r => r.userUuid === user.uuid)
    const todayVisits = events.filter(e => e.userUuid === user.uuid && e.eventType === 'page_view' && e.timestamp >= todayTs).length

    return {
      uuid: user.uuid.slice(0, 8) + '...', fullUuid: user.uuid,
      nickname: user.nickname || '', createdAt: user.createdAt, lastActiveAt: user.lastActiveAt,
      todayVisits, totalTransactions: txCount, totalAssets: assetCount, aiReports: reportCount,
    }
  })

  const totalUsers = allUsers.length
  const totalTransactions = table('transactions').count()
  const totalReports = table('aiReports').count()
  const todayActiveUsers = new Set(events.filter(e => e.timestamp >= todayTs).map(e => e.userUuid)).size
  const usersWithReports = new Set(table('aiReports').all().map(r => r.userUuid)).size
  const usersWithAssets = new Set(table('assets').all().map(a => a.userUuid)).size
  const usersWithGoals = new Set(table('savingsGoals').all().map(g => g.userUuid)).size

  return c.json({
    overview: { totalUsers, todayActive: todayActiveUsers, totalTransactions, totalReports },
    featureUsage: {
      transaction: totalUsers > 0 ? 100 : 0,
      aiReport: totalUsers > 0 ? Math.round(usersWithReports / totalUsers * 100) : 0,
      asset: totalUsers > 0 ? Math.round(usersWithAssets / totalUsers * 100) : 0,
      savings: totalUsers > 0 ? Math.round(usersWithGoals / totalUsers * 100) : 0,
    },
    users: userStats,
  })
})

export { analyticsRoute }
