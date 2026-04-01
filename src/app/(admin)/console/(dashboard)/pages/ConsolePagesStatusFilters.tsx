import Link from 'next/link'

const FILTERS: { param: string | null; label: string }[] = [
  { param: null, label: 'All' },
  { param: 'published', label: 'Published' },
  { param: 'review', label: 'Review' },
  { param: 'draft', label: 'Draft' },
  { param: 'archived', label: 'Archived' },
  { param: 'trashed', label: 'Trash' },
]

type Props = { active: string | null }

export function ConsolePagesStatusFilters({ active }: Props) {
  return (
    <div className="tma-console-status-filters" role="navigation" aria-label="Filter by status">
      {FILTERS.map(({ param, label }) => {
        const href = param ? `/console/pages?status=${param}` : '/console/pages'
        const isActive = (param ?? null) === (active ?? null)
        return (
          <Link
            key={label}
            href={href}
            className={
              isActive
                ? 'tma-console-status-pill tma-console-status-pill--active'
                : 'tma-console-status-pill'
            }
          >
            {label}
          </Link>
        )
      })}
    </div>
  )
}
