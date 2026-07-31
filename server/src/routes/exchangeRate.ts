import { Hono } from 'hono'
import { table } from '../db/index'

const exchangeRoute = new Hono()
let rateCache: Record<string, { rate: number; updatedAt: number }> = {}
const CACHE_TTL = 60 * 60 * 1000

exchangeRoute.get('/', async (c) => {
  const pairs = ['USD_CNY', 'EUR_CNY']
  const now = Date.now()
  const result: Record<string, number> = {}

  for (const pair of pairs) {
    if (rateCache[pair] && now - rateCache[pair].updatedAt < CACHE_TTL) {
      result[pair] = rateCache[pair].rate
      continue
    }

    const dbRate = table('exchangeRates').get(pair)
    if (dbRate && now - dbRate.updatedAt < CACHE_TTL) {
      rateCache[pair] = { rate: dbRate.rate, updatedAt: dbRate.updatedAt }
      result[pair] = dbRate.rate
      continue
    }

    try {
      const from = pair.split('_')[0]
      const resp = await fetch(`https://api.exchangerate-api.com/v4/latest/${from}`)
      const data = await resp.json() as any
      const rate = data?.rates?.[pair.split('_')[1]]
      if (rate) {
        rateCache[pair] = { rate, updatedAt: now }
        table('exchangeRates').insert({ pair, rate, updatedAt: now })
        result[pair] = rate
      } else {
        result[pair] = dbRate?.rate || getFallback(pair)
      }
    } catch {
      result[pair] = dbRate?.rate || getFallback(pair)
    }
  }

  return c.json({ rates: result, updatedAt: now })
})

function getFallback(pair: string): number {
  return { USD_CNY: 7.25, EUR_CNY: 7.85 }[pair] || 1
}

export { exchangeRoute }
