import { createDefaultLayoutBlock } from '@/lib/cms/layoutBlockPresets'

type StarterTemplate =
  | 'blank'
  | 'landing'
  | 'service'
  | 'services_directory'
  | 'industries_directory'
  | 'work_showcase'
  | 'projects_directory'
  | 'news_index'
  | 'news_article'
  | 'contact'
  | 'thank_you'

const localizationAutomation = {
  autoQueueOnPublish: true,
  sourceLocale: 'de',
  targetLocales: ['en'],
}

/** Starter JSON `document` when creating a page from the console. */
export function starterPageDocument(template: StarterTemplate): Record<string, unknown> {
  switch (template) {
    case 'landing':
      return {
        localizationAutomation,
        hero: {
          headline: 'Neue Landingpage',
          subheadline: 'Bearbeite Hero, SEO und Abschnittsblöcke in der Konsole.',
        },
        layout: [
          {
            blockType: 'cta',
            label: 'Primäre Aktion',
            href: '/contact',
            variant: 'primary',
          },
        ],
      }
    case 'service':
      return {
        localizationAutomation,
        hero: {
          headline: 'Service-Detail',
          subheadline: 'Beschreibe Angebot, Proof und den nächsten Schritt.',
        },
        layout: [
          {
            blockType: 'faq',
            items: [
              {
                question: 'Für wen ist das?',
                answer: 'Ersetze diesen Platzhalter mit ICP und Kaufkontext.',
              },
            ],
          },
        ],
      }
    case 'services_directory':
      return {
        localizationAutomation,
        hero: {
          headline: 'Leistungen',
          subheadline:
            'Die Seite ist bereits so vorbereitet, dass aktive Service-Einträge aus der Bibliothek direkt gemappt werden können.',
        },
        layout: [
          {
            ...createDefaultLayoutBlock('servicesFocus'),
            sourceMode: 'library',
            selectionMode: 'automatic',
            serviceIds: [],
            sectionTitle: 'Leistungsübersicht',
            intro:
              'Aktive Services aus der Bibliothek erscheinen hier automatisch. Passe Intro, CTA und Detaildarstellung im Builder an.',
            items: [],
            ctaLabel: 'Kontakt aufnehmen',
            ctaHref: '/contact',
          },
        ],
      }
    case 'industries_directory':
      return {
        localizationAutomation,
        hero: {
          headline: 'Branchen',
          subheadline:
            'Diese Seite ist für aktive Branchen-Einträge vorbereitet und zeigt sie als editierbare Bibliotheks-Sektion.',
        },
        layout: [
          {
            ...createDefaultLayoutBlock('industryGrid'),
            selectionMode: 'automatic',
            sectionTitle: 'Branchen im Fokus',
            intro:
              'Aktive Branchen aus der Bibliothek erscheinen hier automatisch. Wähle auf Wunsch einzelne Branchen manuell aus.',
            ctaLabel: 'Kontakt aufnehmen',
            ctaHref: '/contact',
          },
        ],
      }
    case 'work_showcase':
      return {
        localizationAutomation,
        hero: {
          headline: 'Ausgewählte Arbeit',
          subheadline:
            'Diese Vorlage ist auf Case Studies ausgerichtet und zeigt aktive Arbeiten automatisch im Work-Bereich.',
        },
        layout: [
          {
            ...createDefaultLayoutBlock('featuredProjectSpotlight'),
            eyebrow: 'Featured project',
            title: 'Flagship work story',
            description:
              'Verknüpfe ein Case Study direkt oder ergänze die Leitstory manuell für den oberen Aufschlag.',
            ctaLabel: 'Projekt ansehen',
            ctaHref: '/work',
            secondaryCtaLabel: 'Kontakt aufnehmen',
            secondaryCtaHref: '/contact',
          },
          {
            ...createDefaultLayoutBlock('caseStudyGrid'),
            selectionMode: 'automatic',
            sectionTitle: 'Alle Case Studies',
            intro:
              'Aktive Case Studies aus der Bibliothek erscheinen hier automatisch in der Work-Übersicht.',
          },
        ],
      }
    case 'projects_directory':
      return {
        localizationAutomation,
        hero: {
          headline: 'Projekte & Produkte',
          subheadline:
            'Diese Vorlage zieht veröffentlichte Projekt- und Produkt-Einträge aus der Bibliothek in einen kuratierten Feed.',
        },
        layout: [
          {
            ...createDefaultLayoutBlock('productFeed'),
            sectionTitle: 'Projekte & Produkte',
            intro:
              'Veröffentlichte Einträge aus der Bibliothek werden hier als Feed angezeigt. Featured-Elemente und Filter lassen sich im Builder anpassen.',
            selectionMode: 'hybrid',
            contentKinds: ['project', 'product', 'concept', 'system', 'initiative'],
            showOnlyProjectFeedEligible: false,
            showAllPublished: true,
            ctaLabel: 'Kontakt aufnehmen',
            ctaHref: '/contact',
          },
        ],
      }
    case 'news_index':
      return {
        localizationAutomation,
        hero: {
          headline: 'News & Blog',
          subheadline:
            'Diese Vorlage ist bereits auf veröffentlichte Resource-Seiten gemappt und zeigt neue Beiträge automatisch.',
        },
        layout: [
          {
            ...createDefaultLayoutBlock('resourceFeed'),
            sectionTitle: 'Aktuelle Beiträge',
            intro:
              'Veröffentlichte News- und Blog-Seiten vom Typ Resource erscheinen hier automatisch.',
            showAllPublished: true,
            ctaLabel: '',
            ctaHref: '',
          },
        ],
      }
    case 'news_article':
      return {
        localizationAutomation,
        hero: {
          headline: 'Neuer Beitrag',
          subheadline:
            'Ergänze Hero, Zusammenfassung, Medien und Inhaltsabschnitte. Diese Vorlage ist für News- und Blog-Artikel gedacht.',
        },
        layout: [
          {
            ...createDefaultLayoutBlock('imageBanner'),
            eyebrow: 'News / Blog',
            title: 'Titelbild oder Leitmotiv',
            body: 'Nutze ein starkes Leitbild, um den Beitrag visuell zu verankern.',
          },
          {
            ...createDefaultLayoutBlock('rich'),
          },
          {
            ...createDefaultLayoutBlock('cta'),
            label: 'Kontakt aufnehmen',
            href: '/contact',
            variant: 'ghost',
          },
        ],
      }
    case 'contact':
      return {
        localizationAutomation,
        hero: {
          headline: 'Kontakt',
          subheadline:
            'Füge im JSON-Layout einen Formularblock mit Verweis auf deine Formular-Konfiguration hinzu.',
        },
        layout: [],
      }
    case 'thank_you':
      return {
        localizationAutomation,
        hero: {
          headline: 'Vielen Dank',
          subheadline: 'Bestätigung und nächste Schritte.',
        },
        layout: [{ blockType: 'cta', label: 'Zur Startseite', href: '/', variant: 'ghost' }],
      }
    default:
      return { localizationAutomation }
  }
}
