import { Hono } from 'hono'
import { deepseekChat, isDeepSeekAvailable } from '../ai/providers/deepseek'
import { ollamaChat, isOllamaAvailable } from '../ai/providers/ollama'

const voiceRoute = new Hono()

const VOICE_PARSE_PROMPT = `你是记账助手。从用户的口语中提取结构化数据。仅输出JSON。

## 提取规则
- type: 花钱说"花了/付了/买了/给了"→expense，收钱说"收到/到账/赚了/发了"→income
- amount: 提取金额数字。"三十五块五"→35.5，"一千二"→1200，"一万五"→15000，"两千"→2000，"两千五"→2500，"两块五"→2.5，"八毛"→0.8
- categoryNote: 映射到品类标签。吃/喝→餐饮，打车/地铁/公交→交通，买衣服/鞋→购物，盲盒/手办→潮玩，手机/电脑/耳机→数码，电影/游戏/KTV→娱乐，超市/日用→日用，房租/水电→房租，工资/薪水→工资薪资，副业/接单/兼职→副业收入，股票/分红/利息→投资收益，卖/变现→资产变现，红包/礼金→红包礼金，退税/补贴→退税补贴
- paymentMethod: 支付方式。"微信"→微信，"支付宝"→支付宝，"刷卡/信用卡"→银行卡，"现金"→现金
- confidence: 0-1，对提取结果的确信程度。金额品类都明确→高，模糊→低

## 示例
输入: "午餐花了35块微信支付的"
输出: {"type":"expense","amount":35,"categoryNote":"餐饮","paymentMethod":"微信","confidence":0.95}

输入: "工资到账一万五"
输出: {"type":"income","amount":15000,"categoryNote":"工资薪资","paymentMethod":"","confidence":0.98}

输入: "打车回家27块5"
输出: {"type":"expense","amount":27.5,"categoryNote":"交通","paymentMethod":"","confidence":0.92}

输入: "在闲鱼卖了旧相机收到800块"
输出: {"type":"income","amount":800,"categoryNote":"资产变现","paymentMethod":"","confidence":0.90}

输入: "超市买日用品刷了信用卡168"
输出: {"type":"expense","amount":168,"categoryNote":"日用","paymentMethod":"银行卡","confidence":0.93}

输入: "星巴克买咖啡花了38"
输出: {"type":"expense","amount":38,"categoryNote":"餐饮","paymentMethod":"","confidence":0.94}

输入: "副业接了个设计单赚了3000"
输出: {"type":"income","amount":3000,"categoryNote":"副业收入","paymentMethod":"","confidence":0.91}

输入: "房租转账给房东2500"
输出: {"type":"expense","amount":2500,"categoryNote":"房租","paymentMethod":"银行卡","confidence":0.96}

输入: "买了个泡泡玛特盲盒69块"
输出: {"type":"expense","amount":69,"categoryNote":"潮玩","paymentMethod":"","confidence":0.94}

输入: "地铁卡充了50块"
输出: {"type":"expense","amount":50,"categoryNote":"交通","paymentMethod":"","confidence":0.95}

输入: "股票分红到账2000"
输出: {"type":"income","amount":2000,"categoryNote":"投资收益","paymentMethod":"","confidence":0.97}

输入: "妈妈发了红包500块"
输出: {"type":"income","amount":500,"categoryNote":"红包礼金","paymentMethod":"","confidence":0.93}`

voiceRoute.post('/parse-voice', async (c) => {
  const body = await c.req.json<{ transcript: string }>()
  const transcript = body.transcript?.trim()

  if (!transcript) {
    return c.json({ error: 'Empty transcript' }, 400)
  }

  try {
    let rawResult: string

    if (isDeepSeekAvailable()) {
      rawResult = await deepseekChat({
        systemPrompt: VOICE_PARSE_PROMPT,
        userMessage: transcript,
        temperature: 0.1,
        maxTokens: 150,
      })
    } else {
      const ollamaAvail = await isOllamaAvailable()
      if (ollamaAvail) {
        rawResult = await ollamaChat({
          systemPrompt: VOICE_PARSE_PROMPT,
          userMessage: transcript,
          temperature: 0.1,
        })
      } else {
        return c.json({ fallback: true, transcript })
      }
    }

    const jsonMatch = rawResult.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return c.json({ type: parsed.type, amount: parsed.amount, categoryNote: parsed.categoryNote, paymentMethod: parsed.paymentMethod || '', confidence: parsed.confidence, transcript })
    }
  } catch (err) {
    console.warn('[Voice] Parse failed', (err as Error).message)
  }

  return c.json({ fallback: true, transcript })
})

export { voiceRoute }
