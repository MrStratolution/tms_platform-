import { z } from 'zod'

import { postOpenAiCompatibleChatCompletions } from '@/lib/aiChatClient'

export const contentBriefSchema = z.object({
  industry: z.string().optional().default(''),
  serviceType: z.string().optional().default(''),
  targetAudience: z.string().optional().default(''),
  painPoints: z.string().optional().default(''),
  offerType: z.string().optional().default(''),
  tone: z.enum(['premium', 'direct', 'minimal']).default('premium'),
  locale: z.enum(['de', 'en']).default('de'),
})

export type ContentBrief = z.infer<typeof contentBriefSchema>

export const generatedCopySchema = z.object({
  hero: z.object({
    headline: z.string(),
    subheadline: z.string(),
    primaryCtaLabel: z.string(),
  }),
  faq: z.array(
    z.object({
      question: z.string(),
      answer: z.string(),
    }),
  ),
  ctaVariations: z.array(z.string()).length(3),
  problemStatement: z.string(),
  solutionStatement: z.string(),
  processOutline: z.array(
    z.object({
      title: z.string(),
      body: z.string(),
    }),
  ),
})

export type GeneratedMarketingCopy = z.infer<typeof generatedCopySchema>

const SYSTEM_RULES = `You are a senior B2B copywriter for "The Modesty Argument" (TMA), a premium GTM and positioning firm.
Rules:
- No generic AI buzzwords ("revolutionary", "cutting-edge", "game-changing", "unlock", "leverage synergy").
- Short, sharp sentences. Clear outcomes. Practical language.
- High-trust tone; sound credible to skeptical technical and economic buyers.
- If locale is "de", write all user-facing strings in professional German (Sie-Form acceptable for B2B).
- If locale is "en", write in English.
- Output MUST be a single JSON object only, no markdown, matching the schema described in the user message.`

function buildUserPrompt(brief: ContentBrief): string {
  return `Content brief (use what is non-empty; infer sensibly if sparse):
${JSON.stringify(brief, null, 2)}

Return JSON with exactly this shape (all keys required):
{
  "hero": { "headline": string, "subheadline": string, "primaryCtaLabel": string },
  "faq": [ { "question": string, "answer": string }, ... 3 to 6 items ],
  "ctaVariations": [ string, string, string ],
  "problemStatement": string (one short paragraph),
  "solutionStatement": string (one short paragraph),
  "processOutline": [ { "title": string, "body": string }, ... 3 to 5 steps ]
}`
}

export async function generateMarketingCopy(brief: ContentBrief): Promise<GeneratedMarketingCopy> {
  const res = await postOpenAiCompatibleChatCompletions({
    temperature: 0.65,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_RULES },
      { role: 'user', content: buildUserPrompt(brief) },
    ],
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`AI provider error ${res.status}: ${errText.slice(0, 500)}`)
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[]
  }
  const raw = data.choices?.[0]?.message?.content
  if (!raw) {
    throw new Error('Empty response from AI')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('AI returned non-JSON')
  }

  const out = generatedCopySchema.safeParse(parsed)
  if (!out.success) {
    throw new Error(`Invalid AI JSON: ${out.error.message}`)
  }
  return out.data
}
