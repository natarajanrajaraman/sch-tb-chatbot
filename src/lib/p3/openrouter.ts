import OpenAI from 'openai';

// Thin wrapper around the OpenAI SDK pointed at OpenRouter.
// Single API key (OPENROUTER_API_KEY env var) gives access to OpenAI,
// Anthropic, Google, DeepSeek, Qwen, Mistral, etc.

function getClient(): OpenAI {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error(
      'OPENROUTER_API_KEY env var is not set. Add it on Vercel project settings.'
    );
  }
  return new OpenAI({
    apiKey,
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
      'HTTP-Referer': 'https://sch-tb-chatbot.vercel.app',
      'X-Title': 'SCH TB Chatbot — P3 prototype',
    },
  });
}

export interface P3ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface P3ChatResult {
  text: string;
  promptTokens: number;
  completionTokens: number;
  model: string;
  finishReason: string;
}

export async function callOpenRouter(
  modelId: string,
  messages: P3ChatMessage[]
): Promise<P3ChatResult> {
  const client = getClient();
  const resp = await client.chat.completions.create({
    model: modelId,
    messages,
    temperature: 0.4,
    // Keep responses tight on the prototype to manage cost.
    max_tokens: 1024,
  });

  const choice = resp.choices[0];
  const usage = resp.usage;

  return {
    text: choice?.message?.content || '',
    promptTokens: usage?.prompt_tokens || 0,
    completionTokens: usage?.completion_tokens || 0,
    model: resp.model || modelId,
    finishReason: choice?.finish_reason || 'unknown',
  };
}
