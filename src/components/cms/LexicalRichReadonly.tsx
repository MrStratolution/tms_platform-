'use client'

import { LinkNode } from '@lexical/link'
import { ListItemNode, ListNode } from '@lexical/list'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'
import type { SerializedEditorState } from 'lexical'

export const lexicalTheme = {
  paragraph: 'lex-p',
  quote: 'lex-quote',
  heading: {
    h1: 'lex-h1',
    h2: 'lex-h2',
    h3: 'lex-h3',
  },
  list: {
    ul: 'lex-ul',
    ol: 'lex-ol',
    listitem: 'lex-li',
  },
  link: 'lex-a',
}

type Props = {
  data: SerializedEditorState
}

/**
 * Read-only Lexical JSON (rich-text block tree).
 */
export function LexicalRichReadonly({ data }: Props) {
  return (
    <LexicalComposer
      initialConfig={{
        namespace: 'TmaReadonly',
        theme: lexicalTheme,
        editable: false,
        onError: (e) => {
          console.error(e)
        },
        nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, LinkNode],
        editorState: JSON.stringify(data),
      }}
    >
      <RichTextPlugin
        contentEditable={
          <ContentEditable className="block-rich__lex" aria-readonly="true" />
        }
        placeholder={<span className="sr-only" />}
        ErrorBoundary={LexicalErrorBoundary}
      />
    </LexicalComposer>
  )
}
