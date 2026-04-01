'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { CSSProperties, ReactNode } from 'react'

type Props = {
  id: string
  disabled: boolean
  children: ReactNode
}

export function SortableLayoutBlockRow({ id, disabled, children }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled,
  })

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : 1,
  }

  return (
    <li ref={setNodeRef} style={style} className="tma-console-layout-row tma-console-layout-row--sortable">
      <button
        type="button"
        className="tma-console-drag-handle"
        aria-label="Drag to reorder"
        disabled={disabled}
        {...attributes}
        {...listeners}
      >
        ⋮⋮
      </button>
      <div className="tma-console-layout-row-body">{children}</div>
    </li>
  )
}
