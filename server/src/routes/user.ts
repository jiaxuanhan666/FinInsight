import { Hono } from 'hono'
import { table } from '../db/index'

const userRoute = new Hono()

userRoute.post('/register', async (c) => {
  const { uuid } = await c.req.json<{ uuid?: string }>()
  if (!uuid) return c.json({ error: 'UUID is required' }, 400)

  const now = Date.now()
  const users = table('users')
  let user = users.get(uuid)

  if (user) {
    users.update(uuid, { lastActiveAt: now })
    return c.json({ uuid: user.uuid, nickname: user.nickname || '', createdAt: user.createdAt, isNew: false })
  }

  const newUser = { uuid, nickname: '', createdAt: now, lastActiveAt: now }
  users.insert(newUser)
  return c.json({ uuid, nickname: '', createdAt: now, isNew: true })
})

userRoute.get('/profile', async (c) => {
  const uuid = c.get('userUuid')
  const user = table('users').get(uuid)
  if (!user) return c.json({ error: 'User not found' }, 404)
  return c.json(user)
})

userRoute.post('/find-account', async (c) => {
  const { hint } = await c.req.json<{ hint?: string }>()
  const users = table('users').all().slice(0, 10).map(u => ({
    uuid: u.uuid, nickname: u.nickname, createdAt: u.createdAt,
  }))
  return c.json({ users })
})

userRoute.post('/merge', async (c) => {
  const uuid = c.get('userUuid')
  const { oldUuid } = await c.req.json<{ oldUuid: string }>()
  if (!oldUuid || oldUuid === uuid) return c.json({ error: 'Invalid old UUID' }, 400)

  const oldUser = table('users').get(oldUuid)
  if (!oldUser) return c.json({ error: 'Old account not found' }, 404)

  const tables = ['transactions', 'persistentTags', 'assets', 'liabilities', 'savingsGoals', 'aiReports'] as const
  for (const t of tables) {
    const tbl = table(t)
    tbl.filter(r => r.userUuid === oldUuid).forEach(r => {
      tbl.update(r.id, { userUuid: uuid })
    })
  }

  table('users').update(uuid, { mergedFrom: oldUuid })
  table('users').delete(oldUuid)

  return c.json({ success: true, message: '账本成功合并，数据完整留存✨' })
})

export { userRoute }
