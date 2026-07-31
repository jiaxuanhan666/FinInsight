import { Hono } from 'hono'
import { table } from '../db/index'
import { v4 as uuidv4 } from 'uuid'
import { deepseekChat, isDeepSeekAvailable } from '../ai/providers/deepseek'
import { ollamaChat, isOllamaAvailable } from '../ai/providers/ollama'
import { REPORT_SYSTEM_PROMPT } from '../ai/prompts/report'

const reportRoute = new Hono()

reportRoute.get('/', async (c) => {
  const uuid = c.get('userUuid')
  const reports = table('aiReports').filter(r => r.userUuid === uuid)
  reports.sort((a, b) => b.createdAt - a.createdAt)
  return c.json({ reports: reports.slice(0, 20) })
})

reportRoute.post('/generate', async (c) => {
  const uuid = c.get('userUuid')
  const body = await c.req.json<{ period: string }>()
  const period = body.period || 'monthly'
  const now = Date.now()

  const periodMap: Record<string, number> = {
    daily: 86400000, weekly: 7 * 86400000, monthly: 30 * 86400000,
    semi_annual: 180 * 86400000, annual: 365 * 86400000,
  }
  const periodStart = now - (periodMap[period] || periodMap.monthly)
  const periodEnd = now

  const txs = table('transactions').filter(t => t.userUuid === uuid && t.timestamp >= periodStart && t.timestamp <= periodEnd)
  const allTxs = table('transactions').filter(t => t.userUuid === uuid)
  const assets = table('assets').filter(a => a.userUuid === uuid)
  const liabilities = table('liabilities').filter(l => l.userUuid === uuid)

  const totalIncome = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.baseAmount, 0)
  const totalExpense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.baseAmount, 0)
  const totalAssets = assets.reduce((s, a) => s + a.currentValue, 0)
  const totalLiabilities = liabilities.reduce((s, l) => s + l.remainingAmount, 0)
  const alternativeAssets = assets.filter(a => a.type === 'alternative').reduce((s, a) => s + a.currentValue, 0)
  const financialAssets = assets.filter(a => a.type === 'financial').reduce((s, a) => s + a.currentValue, 0)
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome * 100).toFixed(1) : '0'
  const debtRatio = totalAssets > 0 ? ((totalLiabilities / totalAssets) * 100).toFixed(1) : '0'

  // AI decision statistics
  const agentClassified = txs.filter(t => t.aiCategory && t.aiConfidence !== null)
  const agentHighConf = agentClassified.filter(t => (t.aiConfidence || 0) > 0.8)
  const agentAssets = agentClassified.filter(t => t.aiCategory === 'alternative_asset')
  const agentPending = agentClassified.filter(t => t.aiCategory === 'dual_attribute')
  const agentAccuracy = agentClassified.length > 0 ? Math.round((agentHighConf.length / agentClassified.length) * 100) : 0

  // Category breakdown for ranking
  const categoryMap: Record<string, number> = {}
  txs.filter(t => t.type === 'expense').forEach(t => {
    const key = t.categoryNote
    categoryMap[key] = (categoryMap[key] || 0) + t.baseAmount
  })
  const categoryRanking = Object.entries(categoryMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, amount]) => ({ name, amount, pct: totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0 }))

  // Previous period comparison
  const prevStart = periodStart - (periodEnd - periodStart)
  const prevTxs = allTxs.filter(t => t.timestamp >= prevStart && t.timestamp < periodStart)
  const prevIncome = prevTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.baseAmount, 0)
  const prevExpense = prevTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.baseAmount, 0)
  const incomeChange = prevIncome > 0 ? (((totalIncome - prevIncome) / prevIncome) * 100).toFixed(1) : 'N/A'
  const expenseChange = prevExpense > 0 ? (((totalExpense - prevExpense) / prevExpense) * 100).toFixed(1) : 'N/A'

  const periodLabels: Record<string, string> = { daily: '日', weekly: '周', monthly: '月', semi_annual: '半年', annual: '年' }

  const userDataSummary = `
## AI 分类统计（本${periodLabels[period] || period}）
- 总分类次数: ${agentClassified.length}
- 识别为另类资产: ${agentAssets.length} 笔，金额 ¥${agentAssets.reduce((s,t) => s + t.baseAmount, 0).toFixed(0)}
- 待用户确认: ${agentPending.length} 笔
- 高置信度分类占比: ${agentAccuracy}%

## 收支数据
- 总收入: ¥${totalIncome.toFixed(2)}（环比 ${incomeChange}%）
- 总支出: ¥${totalExpense.toFixed(2)}（环比 ${expenseChange}%）
- 结余: ¥${(totalIncome - totalExpense).toFixed(2)}
- 储蓄率: ${savingsRate}%

## 资产
- 总资产: ¥${totalAssets.toFixed(2)}
- 另类资产: ¥${alternativeAssets.toFixed(2)}
- 金融资产: ¥${financialAssets.toFixed(2)}
- 总负债: ¥${totalLiabilities.toFixed(2)}

## 消费排名
${categoryRanking.map((c, i) => `${i+1}. ${c.name}: ¥${c.amount.toFixed(0)} (${c.pct}%)`).join('\n')}
`

  let reportContent: any = null
  try {
    let rawResult: string
    if (isDeepSeekAvailable()) {
      rawResult = await deepseekChat({ systemPrompt: REPORT_SYSTEM_PROMPT, userMessage: userDataSummary, temperature: 0.4, maxTokens: 1200 })
    } else if (await isOllamaAvailable()) {
      rawResult = await ollamaChat({ systemPrompt: REPORT_SYSTEM_PROMPT, userMessage: userDataSummary, temperature: 0.4 })
    } else {
      rawResult = JSON.stringify({
        agentSummary: { totalClassified: agentClassified.length, assetDetected: agentAssets.length, assetAmount: agentAssets.reduce((s,t) => s + t.baseAmount, 0), pendingConfirm: agentPending.length, accuracy: agentAccuracy },
        overview: `本${periodLabels[period] || period}收入 ¥${totalIncome.toFixed(0)}，支出 ¥${totalExpense.toFixed(0)}，${Number(savingsRate) > 30 ? '储蓄表现优秀' : '收支基本平衡'}。收入环比 ${incomeChange}%，支出环比 ${expenseChange}%。`,
        consumptionRanking: categoryRanking.slice(0, 5).map(c => ({ category: c.name, amount: c.amount, percentage: c.pct })),
        consumptionInsight: `最高支出类别为"${categoryRanking[0]?.name || 'N/A'}"，占比 ${categoryRanking[0]?.pct || 0}%。${categoryRanking.length > 3 ? `前3类消费合计占比 ${categoryRanking.slice(0,3).reduce((s,c) => s + c.pct, 0)}%。` : ''}`,
        assetSnapshot: { alternativeAssets, alternativeChange: 0, financialAssets, financialChange: 0, totalLiabilities, liabilityChange: 0 },
        healthMetrics: {
          savingsRate: Number(savingsRate), savingsAssessment: Number(savingsRate) > 30 ? '健康' : Number(savingsRate) > 15 ? '关注' : '需改善',
          debtRatio: Number(debtRatio), debtAssessment: Number(debtRatio) < 30 ? '健康' : Number(debtRatio) < 50 ? '关注' : '需改善',
          liquidityRatio: totalAssets > 0 ? Math.round((alternativeAssets / totalAssets) * 100) : 0, liquidityAssessment: '关注',
        },
        agentSuggestions: [
          agentPending.length > 0 ? `你有 ${agentPending.length} 笔待确认分类的消费，确认后 AI 分类会更精准` : 'AI 分类准确率良好，继续保持记账习惯',
          Number(savingsRate) < 20 ? '储蓄率偏低，建议关注弹性消费支出' : '财务状况稳定，可考虑优化资产配置',
        ],
        personalityTag: Number(savingsRate) > 30 ? '理性攒钱达人' : alternativeAssets > financialAssets ? '小众资产收藏家' : '均衡型财务选手',
      })
    }
    const jsonMatch = rawResult.match(/\{[\s\S]*\}/)
    reportContent = jsonMatch ? JSON.parse(jsonMatch[0]) : null
  } catch (err) {
    console.warn('[Report] AI generation failed', (err as Error).message)
  }

  const reportId = uuidv4()
  const stats = JSON.stringify({ totalIncome, totalExpense, totalAssets, totalLiabilities, alternativeAssets, savingsRate, netWorth: totalAssets - totalLiabilities, transactionCount: txs.length })

  table('aiReports').insert({
    id: reportId, userUuid: uuid, period, periodStart, periodEnd,
    personalityTag: reportContent?.personalityTag || '记账小能手',
    content: JSON.stringify(reportContent), stats, createdAt: now,
  })

  return c.json({ id: reportId, period, periodStart, periodEnd, report: reportContent, stats: JSON.parse(stats) })
})

reportRoute.get('/:id', async (c) => {
  const uuid = c.get('userUuid')
  const id = c.req.param('id')
  const report = table('aiReports').get(id)
  if (!report || report.userUuid !== uuid) return c.json({ error: 'Report not found' }, 404)
  return c.json({ ...report, content: JSON.parse(report.content || '{}'), stats: JSON.parse(report.stats || '{}') })
})

// Accuracy endpoint
reportRoute.get('/accuracy', async (c) => {
  const uuid = c.get('userUuid')
  const allTxs = table('transactions').filter(t => t.userUuid === uuid && t.aiCategory !== null)

  const reviewed = allTxs.filter(t => t.userOverride === true || t.userOverride === false)
  const userCorrected = reviewed.filter(t => t.userOverride === true).length
  const aiCorrect = reviewed.length - userCorrected
  const totalClassified = allTxs.length
  const accuracy = reviewed.length > 0 ? Math.round((aiCorrect / reviewed.length) * 100) : (totalClassified > 0 ? 100 : 100)

  return c.json({ totalClassified, aiCorrect, userCorrected, accuracy })
})

export { reportRoute }
