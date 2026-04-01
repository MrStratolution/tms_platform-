/** Starter JSON `document` when creating a page from the console. */
export function starterPageDocument(
  template: 'blank' | 'landing' | 'service' | 'contact' | 'thank_you',
): Record<string, unknown> {
  const localizationAutomation = {
    autoQueueOnPublish: true,
    sourceLocale: 'de',
    targetLocales: ['en'],
  }

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
    case 'contact':
      return {
        localizationAutomation,
        hero: {
          headline: 'Kontakt',
          subheadline: 'Füge im JSON-Layout einen Formularblock mit Verweis auf deine Formular-Konfiguration hinzu.',
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
        layout: [
          { blockType: 'cta', label: 'Zur Startseite', href: '/', variant: 'ghost' },
        ],
      }
    default:
      return { localizationAutomation }
  }
}
