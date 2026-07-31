import OpenAI from 'openai';

const DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({
      baseURL: DEEPSEEK_BASE_URL,
      apiKey: DEEPSEEK_API_KEY,
    });
  }
  return client;
}

interface ChatOptions {
  systemPrompt: string;
  userMessage: string;
  temperature?: number;
  maxTokens?: number;
}

export async function deepseekChat(options: ChatOptions): Promise<string> {
  const { systemPrompt, userMessage, temperature = 0.3, maxTokens = 500 } = options;

  if (!DEEPSEEK_API_KEY) {
    throw new Error('DEEPSEEK_API_KEY not configured');
  }

  const openai = getClient();

  const response = await openai.chat.completions.create({
    model: 'deepseek-chat',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    temperature,
    max_tokens: maxTokens,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('Empty response from DeepSeek');
  }

  return content;
}

export function isDeepSeekAvailable(): boolean {
  return !!DEEPSEEK_API_KEY;
}
