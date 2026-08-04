import '@shopify/ui-extensions/preact';
import { render } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';

const API_BASE = 'https://kablet-backend.onrender.com'

declare const shopify: any

function extractOrderId(raw: any): string | null {
  if (!raw) return null
  const str = raw.toString()
  const part = str.includes('/') ? str.split('/').pop() : str
  return part && part !== '0' ? part : null
}

function formatPrice(value: string): string {
  return new Intl.NumberFormat('en-AE', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(parseFloat(value))
}

export default function () {
  render(<App />, document.body)
}

function App() {
  const [offer, setOffer] = useState<any>(null)
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
            setOffer(d.opportunity)
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

  async function respond(response: 'ACCEPTED' | 'DECLINED') {
    if (!offer) return
    if (response === 'ACCEPTED') setLoading(true)
    const shopDomain = shopify?.shop?.myshopifyDomain ?? ''
    try {
      await fetch(`${API_BASE}/opportunity/response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceId: offer.instanceId, response, shopDomain }),
      })
    } catch {}
    setLoading(false)
    if (response === 'ACCEPTED') setAccepted(true)
    else setDone(true)
  }

  if (done || noOffer) return null

  // Success state
  if (accepted) return (
    <s-section>
      <s-box border="base" borderRadius="base" padding="base">
        <s-stack direction="block" gap="base">
          <s-stack direction="inline" gap="base" alignItems="center">
            <s-icon type="check-circle" tone="success" size="large" />
            <s-stack direction="block" gap="none">
              <s-heading level="2">Added to your order!</s-heading>
              <s-text color="subdued" type="small">
                {offer?.deliveryNote ?? 'Your item will be delivered separately.'}
              </s-text>
            </s-stack>
          </s-stack>
          <s-stack direction="inline" gap="base" justifyContent="space-between">
            <s-text color="subdued" type="small">Powered by Kablet</s-text>
            <s-link href="https://kablet.com/privacy/" target="_blank">
              <s-text color="subdued" type="small">Privacy</s-text>
            </s-link>
          </s-stack>
        </s-stack>
      </s-box>
    </s-section>
  )

  if (!offer) return (
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

  const currency = offer.currency || 'AED'
  const pills = offer.valueBullets?.length > 0 ? offer.valueBullets.slice(0, 3) : []

  return (
    <s-section>
      <s-box border="base" borderRadius="base">

        {/* Header */}
        <s-stack direction="inline" gap="small" alignItems="center" padding="base">
          <s-icon type="gift" size="small" />
          <s-stack direction="block" gap="none">
            <s-text color="subdued" type="small">Just for you</s-text>
            <s-text emphasis="bold">Add to your order</s-text>
          </s-stack>
        </s-stack>

        <s-divider />

        {/* Body */}
        <s-stack direction="block" gap="base" padding="base">

          <s-stack direction="inline" gap="base" alignItems="start">
            {offer.visualAssetUrl && (
              <s-box minInlineSize="80px" maxInlineSize="80px">
                <s-image
                  src={offer.visualAssetUrl}
                  alt={offer.headline}
                  aspectRatio="1/1"
                  objectFit="cover"
                  borderRadius="base"
                  inlineSize="fill"
                />
              </s-box>
            )}
            <s-stack direction="block" gap="small">
              <s-heading level="2">{offer.headline}</s-heading>
              <s-text color="subdued" type="small">{offer.description}</s-text>
              {offer.price && (
                <s-stack direction="inline" gap="small" alignItems="center">
                  <s-text emphasis="bold" size="large">{currency} {formatPrice(offer.price)}</s-text>
                  {offer.priceWas && (
                    <s-text color="subdued" type="small">{currency} {formatPrice(offer.priceWas)}</s-text>
                  )}
                </s-stack>
              )}
              {offer.valueProposition && (
                <s-text color="subdued" type="small">{offer.valueProposition}</s-text>
              )}
            </s-stack>
          </s-stack>

          {/* Social proof */}
          {offer.socialProof && (
            <s-box background="subdued" borderRadius="base" padding="small">
              <s-stack direction="inline" gap="small" alignItems="center">
                <s-icon type="star" size="small" tone="warning" />
                <s-text color="subdued" type="small">{offer.socialProof}</s-text>
              </s-stack>
            </s-box>
          )}

          {/* Pills */}
          {pills.length > 0 && (
            <s-stack direction="inline" gap="small">
              {pills.map((pill: string, i: number) => (
                <s-badge key={i} tone="neutral">{pill}</s-badge>
              ))}
            </s-stack>
          )}

          <s-divider />

          <s-stack direction="inline" gap="small">
            <s-button variant="primary" loading={loading} onClick={() => respond('ACCEPTED')}>
              {offer.ctaLabel}
            </s-button>
            <s-button variant="secondary" onClick={() => respond('DECLINED')}>
              No thanks
            </s-button>
          </s-stack>

          <s-stack direction="inline" gap="base" justifyContent="space-between">
            <s-text color="subdued" type="small">Powered by Kablet</s-text>
            <s-link href="https://kablet.com/privacy/" target="_blank">
              <s-text color="subdued" type="small">Privacy</s-text>
            </s-link>
          </s-stack>

        </s-stack>
      </s-box>
    </s-section>
  )
}