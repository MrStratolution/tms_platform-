import Link from 'next/link'

import { absoluteMediaUrl } from '@/lib/mediaUrl'
import { localizePublicHref, type PublicLocale } from '@/lib/publicLocale'
import type { CaseStudy, Media } from '@/types/cms'

function isPopulatedMedia(value: number | Media | null | undefined): value is Media {
  return typeof value === 'object' && value != null && 'url' in value
}

export function CaseStudyPublicView(props: {
  caseStudy: CaseStudy
  locale?: PublicLocale
}) {
  const locale = props.locale ?? 'de'
  const workLabel = locale === 'en' ? 'Work' : 'Work'
  const contactLabel = locale === 'en' ? 'Start project' : 'Projekt starten'
  const summary =
    props.caseStudy.summary?.trim() ||
    (locale === 'en'
      ? 'This case study is currently being expanded in the CMS.'
      : 'Diese Case Study wird derzeit im CMS weiter ausgebaut.')
  const image = isPopulatedMedia(props.caseStudy.featuredImage)
    ? props.caseStudy.featuredImage
    : null
  const imageSrc =
    image && typeof image.url === 'string' && image.url.trim()
      ? absoluteMediaUrl(image.url.trim())
      : null

  return (
    <article className="tma-case-study-public">
      <header className="tma-case-study-public__header">
        <p className="tma-case-study-public__eyebrow">
          <Link href={localizePublicHref('/work', locale)}>{workLabel}</Link>
        </p>
        <h1 className="tma-case-study-public__title">{props.caseStudy.title}</h1>
        <p className="tma-case-study-public__summary">{summary}</p>
      </header>

      {imageSrc ? (
        <div className="tma-case-study-public__media">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageSrc}
            alt={image?.alt?.trim() || props.caseStudy.title}
            width={1440}
            height={900}
            className="tma-case-study-public__image"
          />
        </div>
      ) : null}

      <section className="tma-case-study-public__body">
        <p>
          {locale === 'en'
            ? 'This public detail view is intentionally lightweight and driven by the existing case-study library model. Expand the entry in the CMS if you want deeper editorial content later.'
            : 'Diese öffentliche Detailansicht bleibt bewusst leichtgewichtig und orientiert sich am bestehenden Case-Study-Modell. Wenn später mehr redaktionelle Tiefe nötig ist, kann der Eintrag im CMS erweitert werden.'}
        </p>
      </section>

      <p className="tma-case-study-public__cta">
        <a className="tma-btn tma-btn--primary" href={localizePublicHref('/contact', locale)}>
          {contactLabel}
        </a>
      </p>
    </article>
  )
}
