import { Hono } from 'hono'
import { table } from '../db/index'
import { v4 as uuidv4 } from 'uuid'
import { classifyTransaction, detectTradePattern } from '../ai/classifier'

const transactionRoute = new Hono()

transactionRoute.get('/', async (c) => {
  const uuid = c.get('userUuid')
  const limit = Math.min(parseInt(c.req.query('limit') || '50'), 200)
  const period = c.req.query('period')

  const txTable = table('transactions')
  let txs = txTable.filter(t => t.userUuid === uuid)

  if (period) {
    const now = Date.now()
    const periodMap: Record<string, number> = { week: 7 * 86400000, month: 30 * 86400000, year: 365 * 86400000 }
    const since = now - (periodMap[period] || periodMap.month)
    txs = txs.filter(t => t.timestamp >= since)
  }

  txs.sort((a, b) => b.timestamp - a.timestamp)
  const total = txs.length
  txs = txs.slice(0, limit)

  return c.json({ transactions: txs, total })
})

transactionRoute.post('/', async (c) => {
  const uuid = c.get('userUuid')
  const body = await c.req.json<{
    amount: number; currency?: string; baseAmount?: number
    type: 'income' | 'expense'; categoryNote: string; note?: string; timestamp?: number
    paymentMethod?: string
  }>()

  if (!body.amount || body.amount <= 0) return c.json({ error: '金额必须大于0' }, 400)
  if (body.amount > 99999999) return c.json({ error: '金额异常，请检查后重新输入' }, 400)
  if (!body.categoryNote?.trim()) return c.json({ error: '请输入品类备注' }, 400)

  const now = Date.now()
  const currency = body.currency || 'CNY'

  // Duplicate check
  const txTable = table('transactions')
  const dup = txTable.find(t =>
    t.userUuid === uuid && t.amount === body.amount &&
    t.categoryNote === body.categoryNote.trim() &&
    t.timestamp >= now - 60000
  )
  if (dup) return c.json({ error: '检测到疑似重复记录', code: 'DUPLICATE', existingId: dup.id }, 409)

  let aiCategory: string | null = null
  let aiConfidence: number | null = null
  let aiReasoning: string | null = null
  let persistentTagId: string | null = null

  // Check persistent tags
  const existingTag = table('persistentTags').find(
    t => t.userUuid === uuid && t.keyword === body.categoryNote.trim()
  )
  if (existingTag) {
    aiCategory = existingTag.category === 'alternative_asset' ? 'alternative_asset' : 'pure_consumption'
    aiConfidence = 1.0
    persistentTagId = existingTag.id
  } else if (body.type === 'expense') {
    try {
      const result = await classifyTransaction({ categoryNote: body.categoryNote, type: body.type, amount: body.amount })
      aiCategory = result.category
      aiConfidence = result.confidence
      aiReasoning = result.reasoning

      if (result.category === 'dual_attribute') {
        const historyNotes = txTable.filter(t => t.userUuid === uuid).map(t => ({
          categoryNote: t.categoryNote, type: t.type, timestamp: t.timestamp,
        }))
        const pattern = detectTradePattern(body.categoryNote, body.type, historyNotes)
        if (pattern === 'asset_trading') aiCategory = 'alternative_asset'
        else if (pattern === 'pending') aiCategory = 'dual_attribute'
      }

      if (aiConfidence && aiConfidence > 0.85 && aiCategory !== 'dual_attribute') {
        const tagId = uuidv4()
        table('persistentTags').insert({
          id: tagId, userUuid: uuid, keyword: body.categoryNote.trim(),
          category: aiCategory === 'alternative_asset' ? 'alternative_asset' : 'pure_consumption',
          source: 'ai_detected', createdAt: now,
        })
        persistentTagId = tagId
      }
    } catch (err) {
      console.warn('[Transaction] AI classification failed', (err as Error).message)
      aiCategory = 'pure_consumption'
      aiConfidence = 0.3
    }
  }

  const txId = uuidv4()
  txTable.insert({
    id: txId, userUuid: uuid, amount: body.amount, currency,
    baseAmount: body.baseAmount || body.amount, type: body.type,
    categoryNote: body.categoryNote.trim(), note: body.note || '',
    timestamp: body.timestamp || now, aiCategory, aiConfidence, aiReasoning,
    userOverride: false, persistentTagId,
    paymentMethod: body.paymentMethod || '',
  })

  if (aiCategory === 'alternative_asset' && body.type === 'expense') {
    const assetId = uuidv4()
    table('assets').insert({
      id: assetId, userUuid: uuid, name: body.categoryNote.trim(),
      type: 'alternative', subType: '', currentValue: body.amount,
      costBasis: body.amount, currency, isAutoTracked: true,
      relatedTransactionIds: JSON.stringify([txId]), updatedAt: now,
    })
  }

  table('users').update(uuid, { lastActiveAt: now })

  return c.json({ id: txId, aiCategory, aiConfidence, aiReasoning, persistentTagId, needsConfirmation: aiCategory === 'dual_attribute' }, 201)
})

transactionRoute.put('/:id', async (c) => {
  const uuid = c.get('userUuid')
  const id = c.req.param('id')
  const body = await c.req.json<{ categoryNote?: string; note?: string; userOverride?: boolean; aiCategory?: string }>()

  const tx = table('transactions').get(id)
  if (!tx || tx.userUuid !== uuid) return c.json({ error: 'Transaction not found' }, 404)

  const updates: any = {}
  if (body.categoryNote) updates.categoryNote = body.categoryNote
  if (body.note !== undefined) updates.note = body.note
  if (body.userOverride) { updates.userOverride = true; updates.aiCategory = body.aiCategory || tx.aiCategory }

  table('transactions').update(id, updates)

  if (body.userOverride && body.aiCategory && body.aiCategory !== 'dual_attribute') {
    const existing = table('persistentTags').find(t => t.userUuid === uuid && t.keyword === tx.categoryNote)
    if (!existing) {
      table('persistentTags').insert({
        id: uuidv4(), userUuid: uuid, keyword: tx.categoryNote,
        category: body.aiCategory === 'alternative_asset' ? 'alternative_asset' : 'pure_consumption',
        source: 'user_confirmed', createdAt: Date.now(),
      })
    }
  }
  return c.json({ success: true })
})

transactionRoute.delete('/:id', async (c) => {
  const uuid = c.get('userUuid')
  const id = c.req.param('id')
  const tx = table('transactions').get(id)
  if (!tx || tx.userUuid !== uuid) return c.json({ error: 'Transaction not found' }, 404)
  table('transactions').delete(id)
  return c.json({ success: true })
})

transactionRoute.get('/summary', async (c) => {
  const uuid = c.get('userUuid')
  const now = Date.now()
  const monthStart = now - 30 * 86400000

  const monthTxs = table('transactions').filter(t => t.userUuid === uuid && t.timestamp >= monthStart)
  const totalIncome = monthTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.baseAmount, 0)
  const totalExpense = monthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.baseAmount, 0)
  const pureConsumption = monthTxs.filter(t => t.aiCategory === 'pure_consumption').reduce((s, t) => s + t.baseAmount, 0)
  const alternativeAsset = monthTxs.filter(t => t.aiCategory === 'alternative_asset' || t.aiCategory === 'dual_attribute').reduce((s, t) => s + t.baseAmount, 0)

  return c.json({ monthIncome: totalIncome, monthExpense: totalExpense, monthBalance: totalIncome - totalExpense, pureConsumption, alternativeAsset, transactionCount: monthTxs.length })
})

export { transactionRoute }
