import { Hono } from 'hono'
import { table } from '../db/index'
import { v4 as uuidv4 } from 'uuid'

const savingsRoute = new Hono()

savingsRoute.get('/', async (c) => {
  const uuid = c.get('userUuid')
  const goals = table('savingsGoals').filter(g => g.userUuid === uuid)
  return c.json({ goals })
})

savingsRoute.post('/', async (c) => {
  const uuid = c.get('userUuid')
  const body = await c.req.json<any>()
  if (!body.name?.trim()) return c.json({ error: '目标名称不能为空' }, 400)
  if (!body.targetAmount || body.targetAmount <= 0) return c.json({ error: '目标金额必须大于0' }, 400)

  const id = uuidv4()
  const now = Date.now()
  table('savingsGoals').insert({
    id, userUuid: uuid, name: body.name.trim(), targetAmount: body.targetAmount,
    currentAmount: 0, monthlyTarget: body.monthlyTarget || 0,
    startDate: body.startDate || now, targetDate: body.targetDate,
    status: 'active', createdAt: now,
  })
  return c.json({ id, success: true }, 201)
})

savingsRoute.put('/:id', async (c) => {
  const uuid = c.get('userUuid')
  const id = c.req.param('id')
  const body = await c.req.json<any>()

  const goal = table('savingsGoals').get(id)
  if (!goal || goal.userUuid !== uuid) return c.json({ error: 'Goal not found' }, 404)

  const updates: any = {}
  if (body.currentAmount !== undefined) updates.currentAmount = body.currentAmount
  if (body.status) updates.status = body.status
  if (body.name) updates.name = body.name
  if (body.targetAmount !== undefined) updates.targetAmount = body.targetAmount
  if (body.monthlyTarget !== undefined) updates.monthlyTarget = body.monthlyTarget
  if (body.targetDate !== undefined) updates.targetDate = body.targetDate
  const checkAmount = updates.currentAmount !== undefined ? updates.currentAmount : goal.currentAmount
  const checkTarget = updates.targetAmount !== undefined ? updates.targetAmount : goal.targetAmount
  if (updates.status !== 'completed' && checkAmount >= checkTarget) updates.status = 'completed'

  table('savingsGoals').update(id, updates)
  return c.json({ success: true })
})

savingsRoute.delete('/:id', async (c) => {
  table('savingsGoals').delete(c.req.param('id'))
  return c.json({ success: true })
})

export { savingsRoute }
