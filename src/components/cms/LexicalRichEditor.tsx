'use client'

import { TOGGLE_LINK_COMMAND, LinkNode } from '@lexical/link'
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  ListItemNode,
  ListNode,
} from '@lexical/list'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin'
import { ListPlugin } from '@lexical/react/LexicalListPlugin'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'
import { FORMAT_TEXT_COMMAND, type SerializedEditorState } from 'lexical'
import { useEffect, useMemo } from 'react'

import { lexicalTheme } from './LexicalRichReadonly'

type Props = {
  data: SerializedEditorState
  onChange: (next: SerializedEditorState) => void
  disabled?: boolean
}

const EMPTY_STATE = {
  root: {
    type: 'root',
    children: [
      {
        type: 'paragraph',
        version: 1,
        children: [
          {
            type: 'text',
            text: '',
            version: 1,
            format: 0,
            mode: 'normal',
            style: '',
            detail: 0,
          },
        ],
        direction: 'ltr',
        format: '',
        indent: 0,
      },
    ],
    direction: 'ltr',
    format: '',
    indent: 0,
    version: 1,
  },
} as unknown as SerializedEditorState

function normalizeState(data: SerializedEditorState | null | undefined): SerializedEditorState {
  if (
    data &&
    typeof data === 'object' &&
    'root' in data &&
    data.root &&
    typeof data.root === 'object'
  ) {
    return data
  }
  return EMPTY_STATE
}

function ToolbarButton(props: {
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  const { label, onClick, disabled } = props
  return (
    <button
      type="button"
      className="tma-console-rich-editor__toolbar-btn"
      onClick={onClick}
      disabled={disabled}
    >
      {label}
    </button>
  )
}

function ToolbarPlugin({ disabled = false }: { disabled?: boolean }) {
  const [editor] = useLexicalComposerContext()

  return (
    <div className="tma-console-rich-editor__toolbar">
      <ToolbarButton
        label="Bold"
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')}
        disabled={disabled}
      />
      <ToolbarButton
        label="Italic"
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')}
        disabled={disabled}
      />
      <ToolbarButton
        label="Bullets"
        onClick={() => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)}
        disabled={disabled}
      />
      <ToolbarButton
        label="Numbers"
        onClick={() => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)}
        disabled={disabled}
      />
      <ToolbarButton
        label="Link"
        onClick={() => {
          const current = typeof window !== 'undefined' ? window.prompt('Link URL') : null
          if (current === null) return
          const trimmed = current.trim()
          editor.dispatchCommand(TOGGLE_LINK_COMMAND, trimmed || null)
        }}
        disabled={disabled}
      />
    </div>
  )
}

function SyncEditorStatePlugin({ data }: { data: SerializedEditorState }) {
  const [editor] = useLexicalComposerContext()
  const serialized = useMemo(() => JSON.stringify(normalizeState(data)), [data])

  useEffect(() => {
    const current = JSON.stringify(editor.getEditorState().toJSON())
    if (current === serialized) return
    editor.setEditorState(editor.parseEditorState(serialized))
  }, [editor, serialized])

  return null
}

export function LexicalRichEditor({ data, onChange, disabled = false }: Props) {
  const initialState = normalizeState(data)

  return (
    <div className="tma-console-rich-editor">
      <LexicalComposer
        initialConfig={{
          namespace: 'TmaRichEditor',
          theme: lexicalTheme,
          editable: !disabled,
          onError: (error) => {
            console.error(error)
          },
          nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, LinkNode],
          editorState: JSON.stringify(initialState),
        }}
      >
        <ToolbarPlugin disabled={disabled} />
        <RichTextPlugin
          contentEditable={
            <ContentEditable
              className="tma-console-rich-editor__surface"
              aria-label="Rich text editor"
            />
          }
          placeholder={
            <div className="tma-console-rich-editor__placeholder">
              Write rich text here…
            </div>
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
        <HistoryPlugin />
        <ListPlugin />
        <LinkPlugin />
        <OnChangePlugin
          onChange={(editorState) => {
            onChange(editorState.toJSON())
          }}
        />
        <SyncEditorStatePlugin data={initialState} />
      </LexicalComposer>
    </div>
  )
}
