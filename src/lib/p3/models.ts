// P3 model registry. OpenRouter slugs verified at v0.9 build time.
// Pricing fluctuates; cross-check at openrouter.ai/models before
// trusting these values for invoicing.

export type ModelBand = 'frontier' | 'efficient' | 'ultra-cheap';

export interface ModelEntry {
  id: string;                  // OpenRouter slug
  label: string;               // shown in debug panel
  band: ModelBand;
  pricePerMTokenInputUsd: number;
  pricePerMTokenOutputUsd: number;
  notes: string;
}

export const P3_MODELS: ModelEntry[] = [
  {
    id: 'openai/gpt-5.4',
    label: 'GPT-5.4',
    band: 'frontier',
    pricePerMTokenInputUsd: 2.50,
    pricePerMTokenOutputUsd: 10.00,
    notes: 'OpenAI flagship. Best-in-class reasoning + nuance. Most expensive.',
  },
  {
    id: 'anthropic/claude-sonnet-4-6',
    label: 'Claude Sonnet 4.6',
    band: 'frontier',
    pricePerMTokenInputUsd: 3.00,
    pricePerMTokenOutputUsd: 15.00,
    notes: 'Anthropic mid-frontier. Strong on long context + safety-shaped responses.',
  },
  {
    id: 'openai/gpt-5.4-mini',
    label: 'GPT-5.4 mini',
    band: 'efficient',
    pricePerMTokenInputUsd: 0.15,
    pricePerMTokenOutputUsd: 0.60,
    notes: 'Small + cheap from OpenAI. Common cost-conscious production choice.',
  },
  {
    id: 'qwen/qwen-2.5-32b-instruct',
    label: 'Qwen 2.5 32B',
    band: 'efficient',
    pricePerMTokenInputUsd: 0.30,
    pricePerMTokenOutputUsd: 0.60,
    notes: 'Open-weight Chinese model, mid-size. Comparable capability to gpt-mini.',
  },
  {
    id: 'deepseek/deepseek-v4-flash',
    label: 'DeepSeek V4 Flash',
    band: 'ultra-cheap',
    pricePerMTokenInputUsd: 0.05,
    pricePerMTokenOutputUsd: 0.30,
    notes: 'Cheapest in the registry. Fast, surprisingly capable for routine queries.',
  },
];

export const DEFAULT_MODEL_ID = 'openai/gpt-5.4-mini';

export function findModel(id: string): ModelEntry | undefined {
  return P3_MODELS.find(m => m.id === id);
}

// Estimate cost in USD for a given token spend on a given model.
export function estimateCostUsd(modelId: string, promptTokens: number, completionTokens: number): number {
  const m = findModel(modelId);
  if (!m) return 0;
  const inCost = (promptTokens / 1_000_000) * m.pricePerMTokenInputUsd;
  const outCost = (completionTokens / 1_000_000) * m.pricePerMTokenOutputUsd;
  return inCost + outCost;
}
