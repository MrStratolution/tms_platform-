/**
 * OpenAI-compatible chat completions (`POST .../v1/chat/completions`).
 * Use with OpenAI, or any compatible gateway (LM Studio, Ollama, Groq, Azure OpenAI path, etc.).
 *
 * Note: Cursor IDE does not expose a public HTTP API for its built-in models; run a local
 * OpenAI-compatible server or use a provider key in env.
 */

export type AiChatEnv = {
  apiKey: string
  /** No trailing slash, e.g. https://api.openai.com/v1 */
  baseUrl: string
  model: string
}

const DEFAULT_BASE = 'https://api.openai.com/v1'

export function getAiChatEnv(): AiChatEnv {
  const apiKey =
    process.env.TMA_AI_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim() || ''
  if (!apiKey) {
    throw new Error(
      'AI API key not configured: set TMA_AI_API_KEY (recommended) or OPENAI_API_KEY',
    )
  }
  const baseUrl = (process.env.TMA_AI_BASE_URL?.trim() || DEFAULT_BASE).replace(/\/$/, '')
  const model =
    process.env.TMA_AI_MODEL?.trim() ||
    process.env.OPENAI_MODEL?.trim() ||
    'gpt-4o-mini'
  return { apiKey, baseUrl, model }
}

export function isAiKeyMissingError(message: string): boolean {
  return (
    message.includes('TMA_AI_API_KEY') ||
    message.includes('OPENAI_API_KEY') ||
    message.includes('AI API key not configured')
  )
}

export async function postOpenAiCompatibleChatCompletions(
  body: Record<string, unknown>,
): Promise<Response> {
  const env = getAiChatEnv()
  const url = `${env.baseUrl}/chat/completions`
  const modelOverride =
    typeof body.model === 'string' && body.model.trim() !== '' ? body.model : env.model
  const payload = { ...body, model: modelOverride }
  return fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
}
