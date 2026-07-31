import { Hono } from 'hono'
import { table } from '../db/index'
import { v4 as uuidv4 } from 'uuid'

const liabilityRoute = new Hono()

liabilityRoute.get('/', async (c) => {
  const uuid = c.get('userUuid')
  const liabilities = table('liabilities').filter(l => l.userUuid === uuid)
  const totalDebt = liabilities.reduce((s, l) => s + l.remainingAmount, 0)
  const monthlyTotal = liabilities.reduce((s, l) => s + l.monthlyPayment, 0)
  return c.json({ liabilities, totalDebt, monthlyTotal, count: liabilities.length })
})

liabilityRoute.post('/', async (c) => {
  const uuid = c.get('userUuid')
  const body = await c.req.json<any>()
  if (!body.name?.trim()) return c.json({ error: '负债名称不能为空' }, 400)
  const id = uuidv4()
  table('liabilities').insert({
    id, userUuid: uuid, name: body.name.trim(), type: body.type || 'other',
    totalAmount: body.totalAmount, remainingAmount: body.remainingAmount !== undefined ? body.remainingAmount : body.totalAmount,
    monthlyPayment: body.monthlyPayment || 0, dueDate: body.dueDate || null,
    currency: body.currency || 'CNY', createdAt: Date.now(),
  })
  return c.json({ id, success: true }, 201)
})

liabilityRoute.put('/:id', async (c) => {
  const uuid = c.get('userUuid')
  const id = c.req.param('id')
  const liab = table('liabilities').get(id)
  if (!liab || liab.userUuid !== uuid) return c.json({ error: 'Liability not found' }, 404)
  table('liabilities').update(id, await c.req.json())
  return c.json({ success: true })
})

liabilityRoute.delete('/:id', async (c) => {
  const uuid = c.get('userUuid')
  const id = c.req.param('id')
  const liab = table('liabilities').get(id)
  if (!liab || liab.userUuid !== uuid) return c.json({ error: 'Liability not found' }, 404)
  table('liabilities').delete(id)
  return c.json({ success: true })
})

export { liabilityRoute }
