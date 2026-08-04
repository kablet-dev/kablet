import '@shopify/ui-extensions/preact';
import { render } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';

const API_BASE = 'https://kablet-backend.onrender.com'

declare const shopify: any

// ── Layout region order ───────────────────────────────────────────
const LAYOUTS: Record<string, string[]> = {
  standard: ['header', 'media+content', 'value', 'benefits', 'socialProof', 'trust', 'actions', 'disclosure'],
  compact:  ['header', 'content', 'value', 'actions', 'disclosure'],
  featured: ['header', 'media+content', 'value', 'benefits', 'socialProof', 'trust', 'actions', 'disclosure'],
  banner:   ['header', 'media+content', 'value', 'benefits', 'socialProof', 'trust', 'actions', 'disclosure'],
  carousel: ['header', 'media+content', 'value', 'benefits', 'socialProof', 'trust', 'actions', 'disclosure'],
}

function extractOrderId(raw: any): string | null {
  if (!raw) return null
  const str = raw.toString()
  const part = str.includes('/') ? str.split('/').pop() : str
  return part && part !== '0' ? part : null
}

function formatPrice(value: string): string {
  return new Intl.NumberFormat('en-AE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(parseFloat(value))
}

export default function () {
  render(<App />, document.body)
}

// ── Region renderers ──────────────────────────────────────────────

function HeaderRegion({ data }: { data: any }) {
  return (
    <s-stack direction="inline" gap="small" alignItems="center" padding="base">
      <s-icon type={data.icon} size="small" />
      <s-stack direction="block" gap="none">
        <s-text color="subdued" type="small">{data.subtitle}</s-text>
        <s-text emphasis="bold">{data.title}</s-text>
      </s-stack>
      {data.badge && <s-badge tone="critical">{data.badge}</s-badge>}
    </s-stack>
  )
}

function MediaContentRegion({ media, content }: { media: any; content: any }) {
  return (
    <s-stack direction="inline" gap="base" alignItems="start">
      {media && (
        <s-box minInlineSize="80px" maxInlineSize="80px">
          <s-image
            src={media.src}
            alt={media.alt}
            aspectRatio={media.aspectRatio ?? '1/1'}
            objectFit={media.fit ?? 'cover'}
            borderRadius="base"
            inlineSize="fill"
          />
        </s-box>
      )}
      {content && (
        <s-stack direction="block" gap="small">
          <s-heading level="2">{content.headline}</s-heading>
          <s-text color="subdued" type="small">{content.description}</s-text>
        </s-stack>
      )}
    </s-stack>
  )
}

function ContentRegion({ data }: { data: any }) {
  return (
    <s-stack direction="block" gap="small">
      <s-heading level="2">{data.headline}</s-heading>
      <s-text color="subdued" type="small">{data.description}</s-text>
    </s-stack>
  )
}

function ValueRegion({ data }: { data: any }) {
  if (!data) return null
  if (data.amount) {
    return (
      <s-stack direction="inline" gap="small" alignItems="center">
        <s-text emphasis="bold" size="large">
          {data.currency} {formatPrice(data.amount)}
        </s-text>
        {data.label && (
          <s-text color="subdued" type="small">{data.label}</s-text>
        )}
      </s-stack>
    )
  }
  if (data.label) {
    return <s-text color="subdued" type="small">{data.label}</s-text>
  }
  return null
}

function BenefitsRegion({ data }: { data: any }) {
  if (!data?.attributes?.length) return null
  return (
    <s-stack direction="inline" gap="small">
      {data.attributes.slice(0, 3).map((attr: string, i: number) => (
        <s-badge key={i} tone="neutral">{attr}</s-badge>
      ))}
    </s-stack>
  )
}

function SocialProofRegion({ data }: { data: any }) {
  if (!data?.label) return null
  return (
    <s-box background="subdued" borderRadius="base" padding="small">
      <s-stack direction="inline" gap="small" alignItems="center">
        <s-icon type="star" size="small" tone="warning" />
        <s-text color="subdued" type="small">{data.label}</s-text>
      </s-stack>
    </s-box>
  )
}

function TrustRegion({ data }: { data: any }) {
  if (!data?.badges?.length) return null
  return (
    <s-stack direction="inline" gap="small">
      {data.badges.map((badge: string, i: number) => (
        <s-badge key={i} tone="success">{badge}</s-badge>
      ))}
    </s-stack>
  )
}

function ActionsRegion({ data, loading, onAction }: { data: any; loading: boolean; onAction: (actionType: string) => void }) {
  if (!data?.actions?.length) return null
  return (
    <s-stack direction="block" gap="small">
      {data.actions.map((action: any, i: number) => (
        <s-button
          key={i}
          variant={action.style === 'primary' ? 'primary' : 'secondary'}
          inlineSize="fill"
          loading={action.style === 'primary' ? loading : false}
          onClick={() => onAction(action.actionType)}
        >
          {action.label}
        </s-button>
      ))}
    </s-stack>
  )
}

function DisclosureRegion({ data }: { data: any }) {
  if (!data) return null
  return (
    <s-stack direction="inline" gap="base" justifyContent="space-between">
      {data.poweredBy && (
        <s-text color="subdued" type="small">Powered by {data.poweredBy}</s-text>
      )}
      {data.privacy && (
        <s-link href={data.privacy} target="_blank">
          <s-text color="subdued" type="small">Privacy</s-text>
        </s-link>
      )}
    </s-stack>
  )
}

// ── Main App ──────────────────────────────────────────────────────

function App() {
  const [opportunity, setOpportunity] = useState<any>(null)
  const [noOffer, setNoOffer] = useState(false)
  const [done, setDone] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [loading, setLoading] = useState(false)
  const fetched = useRef(false)

  useEffect(() => {
    const oc = shopify?.orderConfirmation
    if (!oc) return

    const tryFetch = (id: string, attempt = 0) => {
      if (fetched.current) return
      fetched.current = true
      const shopDomain = shopify?.shop?.myshopifyDomain ?? ''
      fetch(`${API_BASE}/opportunity/decision?shopifyOrderId=${id}&shopDomain=${shopDomain}`)
        .then(r => r.json())
        .then((d: any) => {
          if (d.opportunity) {
            setOpportunity(d.opportunity)
          } else if (attempt < 8) {
            fetched.current = false
            setTimeout(() => tryFetch(id, attempt + 1), 2000)
          } else {
            setNoOffer(true)
          }
        })
        .catch(() => {
          if (attempt < 8) {
            fetched.current = false
            setTimeout(() => tryFetch(id, attempt + 1), 2000)
          } else {
            setNoOffer(true)
          }
        })
    }

    const id = extractOrderId((oc.value ?? oc.current)?.order?.id)
    if (id) { tryFetch(id); return }

    const unsub = oc.subscribe?.((val: any) => {
      const id = extractOrderId(val?.order?.id)
      if (id) tryFetch(id)
    })
    return () => unsub?.()
  }, [])

  async function handleAction(actionType: string) {
    if (!opportunity) return
    const response = actionType === 'accept' ? 'ACCEPTED' : 'DECLINED'
    if (response === 'ACCEPTED') setLoading(true)
    const shopDomain = shopify?.shop?.myshopifyDomain ?? ''
    try {
      await fetch(`${API_BASE}/opportunity/response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instanceId: opportunity.identity.instanceId,
          response,
          shopDomain,
        }),
      })
    } catch {}
    setLoading(false)
    if (response === 'ACCEPTED') setAccepted(true)
    else setDone(true)
  }

  if (done || noOffer) return null

  // ── Success state ─────────────────────────────────────────────
  if (accepted && opportunity) {
    const r = opportunity.regions
    return (
      <s-section>
        <s-box border="base" borderRadius="base" padding="base">
          <s-stack direction="block" gap="base">
            <s-stack direction="inline" gap="base" alignItems="center">
              <s-icon type="check-circle" tone="success" size="large" />
              <s-stack direction="block" gap="none">
                <s-heading level="2">
                  {opportunity.metadata?.type === 'reward' || opportunity.metadata?.type === 'cashback'
                    ? 'Reward claimed!'
                    : opportunity.metadata?.type === 'coupon'
                    ? 'Coupon activated!'
                    : opportunity.metadata?.type === 'insurance'
                    ? 'Protection added!'
                    : 'Added to your order!'}
                </s-heading>
                <s-text color="subdued" type="small">
                  {opportunity.metadata?.type === 'digital'
                    ? 'Check your email for access details.'
                    : opportunity.metadata?.type === 'financial'
                    ? "We'll be in touch shortly."
                    : 'Your item will be delivered separately.'}
                </s-text>
              </s-stack>
            </s-stack>
            {r?.disclosure && <DisclosureRegion data={r.disclosure} />}
          </s-stack>
        </s-box>
      </s-section>
    )
  }

  // ── Skeleton ──────────────────────────────────────────────────
  if (!opportunity) return (
    <s-section>
      <s-box border="base" borderRadius="base" padding="base">
        <s-stack direction="block" gap="base">
          <s-skeleton-paragraph lines={1} />
          <s-skeleton-paragraph lines={2} />
          <s-stack direction="inline" gap="small">
            <s-box minInlineSize="120px" minBlockSize="36px" background="subdued" borderRadius="base" />
            <s-box minInlineSize="100px" minBlockSize="36px" background="subdued" borderRadius="base" />
          </s-stack>
        </s-stack>
      </s-box>
    </s-section>
  )

  // ── Renderer ──────────────────────────────────────────────────
  const layout = opportunity.rendering?.layout ?? 'standard'
  const regionOrder = LAYOUTS[layout] ?? LAYOUTS.standard
  const r = opportunity.regions

  return (
    <s-section>
      <s-box border="base" borderRadius="base">

        {/* Header always renders without internal padding — has its own */}
        {r?.header && regionOrder.includes('header') && (
          <>
            <HeaderRegion data={r.header} />
            <s-divider />
          </>
        )}

        <s-stack direction="block" gap="base" padding="base">
          {regionOrder.map((region: string) => {
            switch (region) {
              case 'media+content':
                if (!r?.media && !r?.content) return null
                return <MediaContentRegion key={region} media={r.media} content={r.content} />

              case 'content':
                if (!r?.content) return null
                return <ContentRegion key={region} data={r.content} />

              case 'value':
                if (!r?.value) return null
                return <ValueRegion key={region} data={r.value} />

              case 'benefits':
                if (!r?.benefits) return null
                return <BenefitsRegion key={region} data={r.benefits} />

              case 'socialProof':
                if (!r?.socialProof) return null
                return <SocialProofRegion key={region} data={r.socialProof} />

              case 'trust':
                if (!r?.trust) return null
                return <TrustRegion key={region} data={r.trust} />

              case 'actions':
                if (!r?.actions) return null
                return (
                  <>
                    <s-divider key="divider-actions" />
                    <ActionsRegion key={region} data={r.actions} loading={loading} onAction={handleAction} />
                  </>
                )

              case 'disclosure':
                if (!r?.disclosure) return null
                return <DisclosureRegion key={region} data={r.disclosure} />

              default:
                return null
            }
          })}
        </s-stack>

      </s-box>
    </s-section>
  )
}