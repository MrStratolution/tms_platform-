import { describe, expect, it } from 'vitest'

import { isAiKeyMissingError } from './aiChatClient'

describe('isAiKeyMissingError', () => {
  it('detects missing key messages', () => {
    expect(isAiKeyMissingError('AI API key not configured: set TMA_AI_API_KEY')).toBe(true)
    expect(isAiKeyMissingError('OPENAI_API_KEY is not configured')).toBe(true)
    expect(isAiKeyMissingError('AI provider error 401')).toBe(false)
  })
})
