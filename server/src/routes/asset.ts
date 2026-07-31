import { Hono } from 'hono'
import { table } from '../db/index'
import { v4 as uuidv4 } from 'uuid'

const assetRoute = new Hono()

assetRoute.get('/', async (c) => {
  const uuid = c.get('userUuid')
  const assets = table('assets').filter(a => a.userUuid === uuid)
  const totalValue = assets.reduce((s, a) => s + a.currentValue, 0)
  const alternativeValue = assets.filter(a => a.type === 'alternative').reduce((s, a) => s + a.currentValue, 0)
  const financialValue = assets.filter(a => a.type === 'financial').reduce((s, a) => s + a.currentValue, 0)
  return c.json({ assets, totalValue, alternativeValue, financialValue, count: assets.length })
})

assetRoute.post('/', async (c) => {
  const uuid = c.get('userUuid')
  const body = await c.req.json<{ name: string; type: 'alternative' | 'financial'; subType?: string; currentValue: number; costBasis?: number; currency?: string }>()
  if (!body.name?.trim()) return c.json({ error: '资产名称不能为空' }, 400)
  if (!body.currentValue || body.currentValue <= 0) return c.json({ error: '资产价值必须大于0' }, 400)

  const id = uuidv4()
  table('assets').insert({
    id, userUuid: uuid, name: body.name.trim(), type: body.type || 'financial',
    subType: body.subType || '', currentValue: body.currentValue,
    costBasis: body.costBasis || body.currentValue, currency: body.currency || 'CNY',
    isAutoTracked: false, relatedTransactionIds: '[]', updatedAt: Date.now(),
  })
  return c.json({ id, success: true }, 201)
})

assetRoute.put('/:id', async (c) => {
  const uuid = c.get('userUuid')
  const id = c.req.param('id')
  const asset = table('assets').get(id)
  if (!asset || asset.userUuid !== uuid) return c.json({ error: 'Asset not found' }, 404)

  const body = await c.req.json<any>()
  const allowed = { name: body.name, currentValue: body.currentValue, costBasis: body.costBasis, subType: body.subType, updatedAt: Date.now() }
  table('assets').update(id, allowed)
  return c.json({ success: true })
})

assetRoute.delete('/:id', async (c) => {
  const uuid = c.get('userUuid')
  const id = c.req.param('id')
  const asset = table('assets').get(id)
  if (!asset || asset.userUuid !== uuid) return c.json({ error: 'Asset not found' }, 404)
  table('assets').delete(id)
  return c.json({ success: true })
})

export { assetRoute }
