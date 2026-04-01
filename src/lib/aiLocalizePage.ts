import { z } from 'zod'

import { postOpenAiCompatibleChatCompletions } from '@/lib/aiChatClient'

const translationSchema = z.object({
  heroHeadline: z.string(),
  heroSubheadline: z.string(),
  seoTitle: z.string(),
  seoDescription: z.string(),
})

export type TranslatedPageFields = z.infer<typeof translationSchema>

export async function translatePageHeroSeo(input: {
  sourceLocale: string
  targetLocale: string
  heroHeadline: string
  heroSubheadline: string
  seoTitle: string
  seoDescription: string
}): Promise<TranslatedPageFields> {
  const user = `Translate the following website fields from ${input.sourceLocale} to ${input.targetLocale}.
Keep tone: premium B2B, concise, no generic AI buzzwords. Preserve meaning and proper nouns.

Source JSON:
${JSON.stringify(
  {
    heroHeadline: input.heroHeadline,
    heroSubheadline: input.heroSubheadline,
    seoTitle: input.seoTitle,
    seoDescription: input.seoDescription,
  },
  null,
  2,
)}

Return JSON only with keys: heroHeadline, heroSubheadline, seoTitle, seoDescription (all strings).`

  const res = await postOpenAiCompatibleChatCompletions({
    temperature: 0.3,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: 'You are a professional marketing translator. Output valid JSON only.',
      },
      { role: 'user', content: user },
    ],
  })

  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(`AI provider error ${res.status}: ${t.slice(0, 400)}`)
  }

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
  const raw = data.choices?.[0]?.message?.content
  if (!raw) throw new Error('Empty AI response')

  const parsed = translationSchema.safeParse(JSON.parse(raw))
  if (!parsed.success) {
    throw new Error(`Invalid translation JSON: ${parsed.error.message}`)
  }
  return parsed.data
}

const layoutResponseSchema = z.object({
  layout: z.array(z.record(z.unknown())),
})

/**
 * Translate layout block copy (strings) while preserving structure, ids, URLs, and relation ids.
 */
export async function translatePageLayoutBlocks(input: {
  sourceLocale: string
  targetLocale: string
  layout: unknown[]
}): Promise<unknown[]> {
  const raw = JSON.stringify(input.layout)
  if (raw.length > 80_000) {
    throw new Error('Layout is too large for a single translation pass; shorten content or split the page.')
  }

  const user = `You translate website layout JSON from ${input.sourceLocale} to ${input.targetLocale}.

Rules:
- Return JSON with a single key "layout" whose value is an array with the SAME length and order as the input.
- Each object must keep the same keys and value types as the input item at that index.
- Preserve exactly: blockType, id, variant, imagePosition, width, logoAlign, formConfig, bookingProfile, any numeric ids, UUIDs, URLs (http/https or /paths), emails, file paths, and media object shapes.
- Translate human-readable strings only: headlines, body text, button labels, FAQ questions/answers, step titles/bodies, stat labels (not numeric values), section titles, intros, etc.
- Do not add or remove blocks.

Input layout JSON:
${raw}

Return JSON only: { "layout": [ ... ] }`

  const res = await postOpenAiCompatibleChatCompletions({
    temperature: 0.25,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'You are a professional B2B web translator. Output valid JSON only. Never change array length or blockType values.',
      },
      { role: 'user', content: user },
    ],
  })

  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(`AI provider error ${res.status}: ${t.slice(0, 400)}`)
  }

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('Empty AI response')

  const parsed = layoutResponseSchema.safeParse(JSON.parse(content))
  if (!parsed.success) {
    throw new Error(`Invalid layout translation JSON: ${parsed.error.message}`)
  }
  return parsed.data.layout
}
