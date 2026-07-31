const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:7b';

interface ChatOptions {
  systemPrompt: string;
  userMessage: string;
  temperature?: number;
}

export async function ollamaChat(options: ChatOptions): Promise<string> {
  const { systemPrompt, userMessage, temperature = 0.3 } = options;

  const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      stream: false,
      options: {
        temperature,
        num_predict: 500,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as any;
  const content = data?.message?.content;
  if (!content) {
    throw new Error('Empty response from Ollama');
  }

  return content;
}

export async function isOllamaAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
    return response.ok;
  } catch {
    return false;
  }
}
