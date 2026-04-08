'use client'

import Script from 'next/script'

type Props = {
  metaPixelId?: string | null
  linkedInPartnerId?: string | null
  pageGtmOverride?: string | null
  enabled?: boolean
}

/**
 * Per-page tracking pixels: Meta/Facebook Pixel + LinkedIn Insight Tag.
 * Renders only if the relevant ID is set on the page's trackingOverrides.
 * GTM override uses the same GTM script pattern but with the page-specific ID.
 */
export function PageTrackingPixels({
  metaPixelId,
  linkedInPartnerId,
  pageGtmOverride,
  enabled = true,
}: Props) {
  const hasMeta = metaPixelId?.trim()
  const hasLinkedIn = linkedInPartnerId?.trim()
  const hasGtm = pageGtmOverride?.trim()

  if (!enabled || (!hasMeta && !hasLinkedIn && !hasGtm)) return null

  return (
    <>
      {hasMeta ? (
        <>
          <Script id="tma-meta-pixel" strategy="afterInteractive">
            {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;
n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,
'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${hasMeta}');fbq('track','PageView');`}
          </Script>
          <noscript>
            {/* eslint-disable-next-line @next/next/no-img-element -- standard Meta Pixel tracking pixel */}
            <img
              height="1"
              width="1"
              style={{ display: 'none' }}
              src={`https://www.facebook.com/tr?id=${hasMeta}&ev=PageView&noscript=1`}
              alt=""
            />
          </noscript>
        </>
      ) : null}
      {hasLinkedIn ? (
        <Script id="tma-linkedin-insight" strategy="afterInteractive">
          {`_linkedin_partner_id="${hasLinkedIn}";
window._linkedin_data_partner_ids=window._linkedin_data_partner_ids||[];
window._linkedin_data_partner_ids.push(_linkedin_partner_id);
(function(l){if(!l){window.lintrk=function(a,b){window.lintrk.q.push([a,b])};
window.lintrk.q=[]}var s=document.getElementsByTagName("script")[0];
var b=document.createElement("script");b.type="text/javascript";b.async=true;
b.src="https://snap.licdn.com/li.lms-analytics/insight.min.js";
s.parentNode.insertBefore(b,s);})(window.lintrk);`}
        </Script>
      ) : null}
      {hasGtm ? (
        <Script id="tma-page-gtm" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${hasGtm}');`}
        </Script>
      ) : null}
    </>
  )
}
