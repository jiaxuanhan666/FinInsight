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

function maxTime(items: any[], field: string): number {
  if (!items.length) return 0
  return Math.max(...items.map((i: any) => i[field] || 0))
}

analyticsRoute.get('/dashboard', async (c) => {
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  const todayTs = todayStart.getTime()

  // Count real users from all sources (transactions + analytics)
  const txUuids = new Set(table('transactions').all().map((t: any) => t.userUuid))
  const eventUuids = new Set(table('analyticsEvents').all().map((e: any) => e.userUuid))
  const allUserUuids = [...new Set([...txUuids, ...eventUuids])]
  const totalUsers = allUserUuids.length

  // Auto-repair: create missing user records (FIXED: use 'id' field)
  for (const uuid of allUserUuids) {
    if (!table('users').get(uuid)) {
      table('users').insert({ id: uuid, uuid, nickname: '', createdAt: Date.now(), lastActiveAt: Date.now() })
    }
  }

  const events = table('analyticsEvents')
  const allEvents = events.all()

  // Feature usage counts
  const voiceUsers = new Set(allEvents.filter((e: any) => e.eventType === 'voice_used').map((e: any) => e.userUuid))
  const txUsers = [...txUuids]
  const reportUsers = new Set(table('aiReports').all().map((r: any) => r.userUuid))
  const assetUsers = new Set(table('assets').all().map((a: any) => a.userUuid))
  const goalUsers = new Set(table('savingsGoals').all().map((g: any) => g.userUuid))

  // Today active
  const todayActiveUsers = new Set(allEvents.filter((e: any) => e.timestamp >= todayTs).map((e: any) => e.userUuid)).size

  // 7-day DAU trend
  const dauTrend: { date: string; count: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0)
    const dEnd = new Date(d); dEnd.setDate(dEnd.getDate() + 1)
    const count = new Set(
      allEvents.filter((e: any) => e.timestamp >= d.getTime() && e.timestamp < dEnd.getTime()).map((e: any) => e.userUuid)
    ).size
    dauTrend.push({ date: d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }), count })
  }

  // Funnel: user value ladder
  const funnel = [
    { stage: '总用户', count: totalUsers, pct: 100 },
    { stage: '记过账', count: txUsers.length, pct: totalUsers > 0 ? Math.round(txUsers.length / totalUsers * 100) : 0 },
    { stage: '用过语音记账', count: voiceUsers.size, pct: totalUsers > 0 ? Math.round(voiceUsers.size / totalUsers * 100) : 0 },
    { stage: '生成过AI报告', count: reportUsers.size, pct: totalUsers > 0 ? Math.round(reportUsers.size / totalUsers * 100) : 0 },
  ]

  // User stats (behavior only, no financial data)
  const userStats = allUserUuids.map(uuid => {
    const user = table('users').get(uuid) || {}

    const userTxs = table('transactions').filter((t: any) => t.userUuid === uuid)
    const txCount = userTxs.length
    const lastTxTime = maxTime(userTxs, 'timestamp')

    const reportCount = table('aiReports').count((r: any) => r.userUuid === uuid)
    const userReports = table('aiReports').filter((r: any) => r.userUuid === uuid)
    const lastReportTime = maxTime(userReports, 'createdAt')

    const goalCount = table('savingsGoals').count((g: any) => g.userUuid === uuid)

    const userEvents = allEvents.filter((e: any) => e.userUuid === uuid)
    const voiceCount = userEvents.filter((e: any) => e.eventType === 'voice_used').length
    const lastVoiceTime = maxTime(userEvents.filter((e: any) => e.eventType === 'voice_used'), 'timestamp')

    const assetEdits = userEvents.filter((e: any) => e.eventType === 'asset_edit').length
    const lastAssetTime = maxTime(userEvents.filter((e: any) => e.eventType === 'asset_edit'), 'timestamp')

    const goalEvents = userEvents.filter((e: any) => e.eventType === 'savings_goal_action' || e.eventType === 'savings_progress')
    const lastGoalTime = maxTime(goalEvents, 'timestamp')

    const todayVisits = userEvents.filter((e: any) => e.eventType === 'page_view' && e.timestamp >= todayTs).length

    // Active days: distinct calendar dates with any activity
    const activeDays = new Set(userEvents.map((e: any) => {
      const d = new Date(e.timestamp)
      return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
    })).size

    return {
      uuid: uuid.slice(0, 8) + '...', fullUuid: uuid,
      nickname: user.nickname || '',
      createdAt: user.createdAt || 0,
      lastActiveAt: user.lastActiveAt || 0,
      activeDays,
      todayVisits,
      txCount, lastTxTime,
      reportCount, lastReportTime,
      voiceCount, lastVoiceTime,
      assetEdits, lastAssetTime,
      goalCount, lastGoalTime,
    }
  })

  userStats.sort((a, b) => b.lastActiveAt - a.lastActiveAt)

  return c.json({
    overview: {
      totalUsers,
      todayActive: todayActiveUsers,
      totalTransactions: table('transactions').count(),
      totalReports: table('aiReports').count(),
    },
    featureUsage: {
      transaction: totalUsers > 0 ? Math.round(txUsers.length / totalUsers * 100) : 0,
      aiReport: totalUsers > 0 ? Math.round(reportUsers.size / totalUsers * 100) : 0,
      asset: totalUsers > 0 ? Math.round(assetUsers.size / totalUsers * 100) : 0,
      savings: totalUsers > 0 ? Math.round(goalUsers.size / totalUsers * 100) : 0,
    },
    dauTrend,
    funnel,
    users: userStats,
  })
})

export { analyticsRoute }
