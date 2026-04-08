'use client'

import type { ElementType } from 'react'
import { useMemo } from 'react'

import { useRotatingWords } from './useRotatingWords'

type Props = {
  as?: ElementType
  className?: string
  text: string
  intervalMs?: number
  id?: string
  enabled?: boolean
}

type RotationParts = {
  before: string
  after: string
  words: string[]
}

export function parseMotionHeadingRotation(text: string): RotationParts | null {
  const match = text.match(/\[\[([^[\]]+)\]\]/)
  if (!match?.index && match?.index !== 0) return null
  const rawWords = match[1]?.split('|').map((part) => part.trim()).filter(Boolean) ?? []
  if (rawWords.length < 2) return null
  return {
    before: text.slice(0, match.index),
    after: text.slice(match.index + match[0].length),
    words: rawWords,
  }
}

export function MotionHeading({
  as: Tag = 'h2',
  className,
  text,
  intervalMs,
  id,
  enabled = true,
}: Props) {
  const rotation = useMemo(() => parseMotionHeadingRotation(text), [text])
  const { currentWord, index, enabled: rotationEnabled } = useRotatingWords(rotation?.words ?? [], {
    intervalMs,
    enabled: Boolean(rotation) && enabled,
  })

  if (!rotation) {
    return (
      <Tag id={id} className={className}>
        {text}
      </Tag>
    )
  }

  const fallbackWord = rotation.words[0] ?? ''
  const visibleWord = rotationEnabled ? currentWord : fallbackWord
  const screenReaderText = `${rotation.before}${fallbackWord}${rotation.after}`

  return (
    <Tag id={id} className={className}>
      <span className="sr-only">{screenReaderText}</span>
      <span aria-hidden="true">
        {rotation.before}
        <span className="tma-rotating-words">
          <span key={`${visibleWord}-${index}`} className="tma-rotating-words__word">
            {visibleWord}
          </span>
        </span>
        {rotation.after}
      </span>
    </Tag>
  )
}
