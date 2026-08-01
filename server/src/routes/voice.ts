import { Hono } from 'hono'
import { deepseekChat, isDeepSeekAvailable } from '../ai/providers/deepseek'
import { ollamaChat, isOllamaAvailable } from '../ai/providers/ollama'

const voiceRoute = new Hono()

const VOICE_PARSE_PROMPT = `你是记账助手。从用户的口语中提取结构化数据。支持单笔或多笔交易。仅输出JSON。

## 提取规则
- transactions: 数组，每笔包含 type/amount/categoryNote/paymentMethod/confidence
- type: 花钱说"花了/付了/买了/给了"→expense，收钱说"收到/到账/赚了/发了"→income
- amount: 提取金额数字。"三十五块五"→35.5，"一千二"→1200，"一万五"→15000，"两千"→2000，"两千五"→2500，"两块五"→2.5，"八毛"→0.8
- categoryNote: 映射到品类标签。吃/喝/饭/面/咖啡/奶茶/外卖→餐饮，打车/地铁/公交/出行→交通，买衣服/鞋→购物，盲盒/手办→潮玩，手机/电脑/耳机→数码，电影/游戏/KTV→娱乐，超市/日用→日用，房租/水电→房租，工资/薪水→工资薪资，副业/接单/兼职→副业收入，股票/分红/利息→投资收益，卖/变现→资产变现，红包/礼金→红包礼金，退税/补贴→退税补贴
- paymentMethod: 支付方式。"微信"→微信，"支付宝"→支付宝，"刷卡/信用卡"→银行卡，"现金"→现金。没提到留空
- confidence: 0-1，对提取结果的确信程度

## 示例（单笔）
输入: "午餐花了35块微信支付的"
输出: {"transactions":[{"type":"expense","amount":35,"categoryNote":"餐饮","paymentMethod":"微信","confidence":0.95}]}

输入: "工资到账一万五"
输出: {"transactions":[{"type":"income","amount":15000,"categoryNote":"工资薪资","paymentMethod":"","confidence":0.98}]}

输入: "打车回家27块5"
输出: {"transactions":[{"type":"expense","amount":27.5,"categoryNote":"交通","paymentMethod":"","confidence":0.92}]}

输入: "在闲鱼卖了旧相机收到800块"
输出: {"transactions":[{"type":"income","amount":800,"categoryNote":"资产变现","paymentMethod":"","confidence":0.90}]}

输入: "超市买日用品刷了信用卡168"
输出: {"transactions":[{"type":"expense","amount":168,"categoryNote":"日用","paymentMethod":"银行卡","confidence":0.93}]}

## 示例（多笔）
输入: "午餐35微信，咖啡18，打车27块5"
输出: {"transactions":[{"type":"expense","amount":35,"categoryNote":"餐饮","paymentMethod":"微信","confidence":0.95},{"type":"expense","amount":18,"categoryNote":"餐饮","paymentMethod":"","confidence":0.88},{"type":"expense","amount":27.5,"categoryNote":"交通","paymentMethod":"","confidence":0.90}]}

输入: "买了件衣服299支付宝，然后地铁充了50，晚上吃火锅花了180"
输出: {"transactions":[{"type":"expense","amount":299,"categoryNote":"购物","paymentMethod":"支付宝","confidence":0.93},{"type":"expense","amount":50,"categoryNote":"交通","paymentMethod":"","confidence":0.95},{"type":"expense","amount":180,"categoryNote":"餐饮","paymentMethod":"","confidence":0.94}]}

## 现在请处理
输入: "{transcript}"
输出:`

voiceRoute.post('/parse-voice', async (c) => {
  const body = await c.req.json<{ transcript: string }>()
  const transcript = body.transcript?.trim()

  if (!transcript) {
    return c.json({ error: 'Empty transcript' }, 400)
  }

  let parsed: any = null

  // Layer 1: DeepSeek API
  if (isDeepSeekAvailable()) {
    try {
      const raw = await deepseekChat({
        systemPrompt: VOICE_PARSE_PROMPT,
        userMessage: transcript,
        temperature: 0.1,
        maxTokens: 400,
      })
      const m = raw.match(/\{[\s\S]*\}/)
      if (m) parsed = JSON.parse(m[0])
    } catch (err) {
      console.warn('[Voice] DeepSeek failed, trying Ollama...', (err as Error).message)
    }
  }

  // Layer 2: Ollama fallback
  if (!parsed) {
    try {
      const ollamaAvail = await isOllamaAvailable()
      if (ollamaAvail) {
        const raw = await ollamaChat({
          systemPrompt: VOICE_PARSE_PROMPT,
          userMessage: transcript,
          temperature: 0.1,
        })
        const m = raw.match(/\{[\s\S]*\}/)
        if (m) parsed = JSON.parse(m[0])
      }
    } catch (err) {
      console.warn('[Voice] Ollama failed', (err as Error).message)
    }
  }

  // Layer 3: Return fallback — client will do local regex parse
  if (!parsed || !parsed.transactions || !Array.isArray(parsed.transactions) || parsed.transactions.length === 0) {
    return c.json({ fallback: true, transcript })
  }

  return c.json({ transactions: parsed.transactions, transcript })
})

export { voiceRoute }
