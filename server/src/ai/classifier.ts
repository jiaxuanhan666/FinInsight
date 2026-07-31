import { deepseekChat, isDeepSeekAvailable } from './providers/deepseek';
import { ollamaChat, isOllamaAvailable } from './providers/ollama';
import { CLASSIFY_SYSTEM_PROMPT } from './prompts/classify';

interface ClassifyResult {
  category: 'pure_consumption' | 'dual_attribute' | 'asset_realization';
  confidence: number;
  reasoning: string;
  assetSubType: string;
}

interface ClassifyContext {
  categoryNote: string;
  type: 'income' | 'expense';
  amount: number;
}

// 规则引擎兜底关键词
const PURE_CONSUMPTION_KEYWORDS = [
  '餐饮', '美食', '外卖', '奶茶', '咖啡', '午餐', '晚餐', '早餐', '零食',
  '出行', '打车', '地铁', '公交', '高铁', '机票', '酒店', '民宿',
  '电影', '演出', '门票', 'KTV', '剧本杀', '密室',
  '日用', '超市', '杂货', '话费', '流量', '网费',
  '视频会员', '音乐会员', '游戏', '皮肤',
  '房租', '水电', '燃气', '物业', '暖气',
  '医疗', '药', '挂号', '体检', '牙科',
  '教育', '培训', '课程', '书本', '考试',
  '理发', '护肤', '美甲', '造型',
  '宠物粮', '猫砂', '狗粮', '猫粮',
  '捐款', '红包', '礼物', '随份子',
];

const DUAL_ATTRIBUTE_KEYWORDS = [
  '盲盒', '潮玩', '手办', '模型', '乐高', '高达', '积木',
  '球鞋', 'AJ', 'Yeezy', 'Dunk', 'Jordan',
  '奢侈品', 'LV', 'Gucci', 'Chanel', 'Dior', 'Hermes',
  'iPhone', 'iPad', 'MacBook', 'AirPods', '耳机', '相机', '镜头', '无人机', 'Switch', 'PS5', 'Xbox',
  '收藏', '纪念币', '邮票', '球星卡', '茅台',
  '珠宝', '金饰', '银饰', '钻石', '手表', '劳力士',
  '乐器', '吉他', '钢琴', '电子琴', '尤克里里',
  '自行车', '电动车', '滑板', '滑雪板', '冲浪板',
  '闲置', '二手', '咸鱼', '卖掉', '转卖',
];

const ASSET_REALIZATION_KEYWORDS = [
  '卖掉', '卖出', '变现', '回血', '出手', '转让', '转卖',
];

export async function classifyTransaction(
  context: ClassifyContext
): Promise<ClassifyResult> {
  const { categoryNote, type, amount } = context;

  // 收入类型：检查是否是资产变现
  if (type === 'income') {
    const noteLower = categoryNote.toLowerCase();
    const isRealization = ASSET_REALIZATION_KEYWORDS.some(kw => noteLower.includes(kw));
    if (isRealization) {
      return {
        category: 'asset_realization',
        confidence: 0.85,
        reasoning: '识别为资产变现收入',
        assetSubType: '其他',
      };
    }
    // 普通收入不分类，返回默认
    return {
      category: 'pure_consumption',
      confidence: 0.95,
      reasoning: '普通收入类型',
      assetSubType: '',
    };
  }

  // === 分层调度：AI分类 ===

  // 第一层：尝试 DeepSeek API
  if (isDeepSeekAvailable()) {
    try {
      const userMessage = `请对以下消费进行分类：\n品类：${categoryNote}\n金额：${amount}元\n类型：${type}`;
      const rawResult = await deepseekChat({
        systemPrompt: CLASSIFY_SYSTEM_PROMPT,
        userMessage,
        temperature: 0.1,
        maxTokens: 200,
      });

      // 提取JSON
      const jsonMatch = rawResult.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          category: parsed.category === 'dual_attribute' ? 'dual_attribute' : 'pure_consumption',
          confidence: parsed.confidence || 0.8,
          reasoning: parsed.reasoning || 'AI模型判定',
          assetSubType: parsed.assetSubType || '',
        };
      }
    } catch (err) {
      console.warn('[AI Classifier] DeepSeek failed, trying Ollama fallback...', (err as Error).message);
    }
  }

  // 第二层：尝试 Ollama 本地模型
  const ollamaAvail = await isOllamaAvailable();
  if (ollamaAvail) {
    try {
      const userMessage = `请对以下消费进行分类：品类：${categoryNote}，金额：${amount}元。仅输出JSON。`;
      const rawResult = await ollamaChat({
        systemPrompt: CLASSIFY_SYSTEM_PROMPT,
        userMessage,
        temperature: 0.1,
      });
      const jsonMatch = rawResult.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          category: parsed.category === 'dual_attribute' ? 'dual_attribute' : 'pure_consumption',
          confidence: parsed.confidence || 0.7,
          reasoning: parsed.reasoning || '本地模型判定',
          assetSubType: parsed.assetSubType || '',
        };
      }
    } catch (err) {
      console.warn('[AI Classifier] Ollama failed, using rule engine...', (err as Error).message);
    }
  }

  // 第三层：规则引擎兜底
  return ruleBasedClassify(categoryNote, type);
}

function ruleBasedClassify(categoryNote: string, type: string): ClassifyResult {
  const noteLower = categoryNote.toLowerCase();

  // 检查资产变现
  if (type === 'income') {
    const isRealization = ASSET_REALIZATION_KEYWORDS.some(kw => noteLower.includes(kw));
    if (isRealization) {
      return { category: 'asset_realization', confidence: 0.6, reasoning: '规则引擎：识别变现', assetSubType: '其他' };
    }
    return { category: 'pure_consumption', confidence: 0.9, reasoning: '规则引擎：普通收入', assetSubType: '' };
  }

  // 检查双属性关键词
  const isDual = DUAL_ATTRIBUTE_KEYWORDS.some(kw => noteLower.includes(kw));
  if (isDual) {
    return { category: 'dual_attribute', confidence: 0.55, reasoning: '规则引擎：可能为可变现品类', assetSubType: '' };
  }

  // 检查纯消费关键词
  const isPure = PURE_CONSUMPTION_KEYWORDS.some(kw => noteLower.includes(kw));
  if (isPure) {
    return { category: 'pure_consumption', confidence: 0.7, reasoning: '规则引擎：日常消费', assetSubType: '' };
  }

  // 默认：无法判断，归为纯消费
  return { category: 'pure_consumption', confidence: 0.3, reasoning: '规则引擎：默认归类', assetSubType: '' };
}

// 时序行为判定：检查同品类是否有买卖
export function detectTradePattern(
  currentNote: string,
  currentType: 'income' | 'expense',
  historyNotes: { categoryNote: string; type: string; timestamp: number }[]
): 'asset_trading' | 'asset_realization' | 'pending' | 'none' {
  const similarNotes = historyNotes.filter(h => {
    const similarity = calculateSimpleSimilarity(currentNote, h.categoryNote);
    return similarity > 0.4;
  });

  const hasBuyHistory = similarNotes.some(h => h.type === 'expense');
  const hasSellHistory = similarNotes.some(h => h.type === 'income');

  if (currentType === 'expense') {
    if (hasSellHistory) return 'asset_trading';   // 有买有卖 → 小众资产交易
    if (hasBuyHistory && !hasSellHistory) return 'pending'; // 只买不卖 → 待用户确认
    return 'pending'; // 首次购买 → 待用户确认
  }

  if (currentType === 'income') {
    if (hasBuyHistory) return 'asset_realization'; // 只卖不买 → 资产变现
    return 'none';
  }

  return 'none';
}

function calculateSimpleSimilarity(a: string, b: string): number {
  const setA = new Set(a.split(''));
  const setB = new Set(b.split(''));
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return intersection.size / union.size;
}
