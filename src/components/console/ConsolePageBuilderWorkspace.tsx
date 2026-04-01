'use client'

import { useState } from 'react'

import { ConsolePageEditorForm } from '@/components/console/ConsolePageEditorForm'
import { ConsolePageResponsivePreview } from '@/components/console/ConsolePageResponsivePreview'

type Props = {
  pageId: number
  initialSlug: string
  initialTitle: string
  initialPageType: string
  initialStatus: 'draft' | 'review' | 'published' | 'archived' | 'trashed'
  initialDocument: Record<string, unknown>
  canEdit: boolean
  canPublishLive: boolean
  canEditCustomCss: boolean
  visualPreviewUrl: string | null
  publicPath: string
}

export function ConsolePageBuilderWorkspace(props: Props) {
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)

  return (
    <ConsolePageEditorForm
      pageId={props.pageId}
      initialSlug={props.initialSlug}
      initialTitle={props.initialTitle}
      initialPageType={props.initialPageType}
      initialStatus={props.initialStatus}
      initialDocument={props.initialDocument}
      canEdit={props.canEdit}
      canPublishLive={props.canPublishLive}
      canEditCustomCss={props.canEditCustomCss}
      selectedBlockId={selectedBlockId}
      onSelectedBlockIdChange={setSelectedBlockId}
      previewSlot={
        <ConsolePageResponsivePreview
          visualPreviewUrl={props.visualPreviewUrl}
          slug={props.initialSlug}
          publicPath={props.publicPath}
          selectedBlockId={selectedBlockId}
          onSelectedBlockIdChange={setSelectedBlockId}
        />
      }
    />
  )
}

