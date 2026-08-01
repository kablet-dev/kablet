import '@shopify/ui-extensions/preact'
import { render } from 'preact'
import { useState, useEffect, useRef } from 'preact/hooks'

const API_BASE = 'https://kablet-backend.onrender.com'

declare const shopify: any

interface Opportunity {
  instanceId: string
  headline: string
  description: string
  valueProposition: string
  visualAssetUrl: string
  ctaLabel: string
  valueBullets: string[]
  currency?: string
  price?: string
  priceWas?: string
  deliveryNote?: string
}

/* ── Countdown hook ── */
function useCountdown(seconds: number) {
  const [left, setLeft] = useState(seconds)
  useEffect(() => {
    if (left <= 0) return
    const t = setInterval(() => setLeft(n => n - 1), 1000)
    return () => clearInterval(t)
  }, [left])
  const m = Math.floor(left / 60)
  const s = left % 60
  return { display: `${m}:${s.toString().padStart(2, '0')}`, expired: left <= 0 }
}

/* ── Root ── */
export default function extension() {
  render(<App />, document.body)
}

function App() {
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [checked, setChecked] = useState(false)
  const { display: countdown, expired } = useCountdown(180)

  /* ── Get order ID ── */
  useEffect(() => {
    const oc = (shopify as any)?.orderConfirmation
    if (!oc) return
    const tryGet = (val: any) => {
      const id = val?.order?.id?.toString().split('/').pop()
      if (id) fetchOffer(id)
    }
    if (oc.current?.order?.id) { tryGet(oc.current); return }
    const unsub = oc.subscribe((val: any) => { tryGet(val) })
    return unsub
  }, [])

  /* ── Poll for offer ── */
  function fetchOffer(orderId: string, attempt = 0) {
    const shopDomain = shopify?.shop?.myshopifyDomain ?? ''
    fetch(`${API_BASE}/opportunity/decision?shopifyOrderId=${orderId}&shopDomain=${shopDomain}`)
      .then(r => r.json())
      .then((d: any) => {
        if (d.opportunity) {
          setOpportunity(d.opportunity)
        } else if (attempt < 10) {
          setTimeout(() => fetchOffer(orderId, attempt + 1), 1500)
        } else {
          setChecked(true)
        }
      })
      .catch(() => {
        if (attempt < 10) setTimeout(() => fetchOffer(orderId, attempt + 1), 1500)
        else setChecked(true)
      })
  }

  /* ── Respond ── */
  async function respond(response: 'ACCEPTED' | 'DECLINED') {
    if (!opportunity) return
    if (response === 'ACCEPTED') setLoading(true)
    const shopDomain = shopify?.shop?.myshopifyDomain ?? ''
    await fetch(`${API_BASE}/opportunity/response`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instanceId: opportunity.instanceId, response, shopDomain }),
    }).catch(() => {})
    if (response === 'ACCEPTED') {
      setLoading(false)
      setAccepted(true)
    } else {
      setDismissed(true)
    }
  }

  if (dismissed || expired || checked) return null

  /* ── Success state ── */
  if (accepted) {
    return (
      <s-section>
        <s-stack direction="block" spacing="base" padding="base">
          <s-stack direction="inline" spacing="base" block-alignment="center">
            <s-icon source="checkmark" size="medium" />
            <s-stack direction="block" spacing="none">
              <s-heading level="2">Added to your order!</s-heading>
              <s-text type="small" tone="subdued">
                Your item is confirmed and will be delivered separately.
              </s-text>
            </s-stack>
          </s-stack>
          <s-stack direction="inline" spacing="loose" block-alignment="center">
            <s-text type="small" tone="subdued">Powered by Kablet</s-text>
            <s-link href="https://kablet.com/privacy/" target="_blank">
              <s-text type="small" tone="subdued">Privacy</s-text>
            </s-link>
          </s-stack>
        </s-stack>
      </s-section>
    )
  }

  /* ── Skeleton ── */
  if (!opportunity) {
    return (
      <s-section>
        <s-stack direction="block" spacing="base" padding="base">
          {/* Header row */}
          <s-stack direction="inline" spacing="base" block-alignment="center" inline-alignment="space-between">
            <s-stack direction="inline" spacing="tight" block-alignment="center">
              <s-icon source="star" size="small" />
              <s-stack direction="block" spacing="none">
                <s-skeleton-paragraph lines={1} />
                <s-skeleton-paragraph lines={1} />
              </s-stack>
            </s-stack>
            <s-skeleton-paragraph lines={1} />
          </s-stack>
          {/* Product row */}
          <s-stack direction="inline" spacing="base" block-alignment="start">
            <s-box min-inline-size="120px" min-block-size="120px" background="surface-secondary" border-radius="base" />
            <s-stack direction="block" spacing="tight" flex="1">
              <s-skeleton-paragraph lines={2} />
              <s-skeleton-paragraph lines={1} />
              <s-skeleton-paragraph lines={1} />
            </s-stack>
          </s-stack>
          {/* Delivery */}
          <s-box padding="tight" background="surface-secondary" border-radius="base">
            <s-skeleton-paragraph lines={1} />
          </s-box>
          {/* Pills */}
          <s-stack direction="inline" spacing="tight">
            <s-skeleton-paragraph lines={1} />
            <s-skeleton-paragraph lines={1} />
            <s-skeleton-paragraph lines={1} />
          </s-stack>
          {/* Buttons */}
          <s-stack direction="block" spacing="tight">
            <s-box min-block-size="52px" background="surface-secondary" border-radius="base" />
            <s-box min-block-size="44px" background="surface-secondary" border-radius="base" />
          </s-stack>
        </s-stack>
      </s-section>
    )
  }

  /* ── Offer card ── */
  const o = opportunity
  const currency = o.currency || 'AED'
  const pills = o.valueBullets?.slice(0, 3) ?? ['Ships separately', 'Cash on Delivery', 'One-click add']
  const delivery = o.deliveryNote || 'Next-day delivery – Delivered separately to your door'
  const ctaLabel = o.ctaLabel || 'Add to my order'

  return (
    <s-section>
      <s-stack direction="block" spacing="base" padding="base">

        {/* ── Header ── */}
        <s-stack direction="inline" spacing="base" block-alignment="center" inline-alignment="space-between">
          <s-stack direction="inline" spacing="tight" block-alignment="center">
            <s-icon source="star" size="small" />
            <s-stack direction="block" spacing="none">
              <s-text emphasis="bold">Recommended for you</s-text>
              <s-text type="small" tone="subdued">Something we think you'll love</s-text>
            </s-stack>
          </s-stack>
          <s-stack direction="inline" spacing="tight" block-alignment="center">
            <s-icon source="clock" size="small" />
            <s-text type="small" tone="subdued">Offer ends in</s-text>
            <s-badge tone="info">{countdown}</s-badge>
          </s-stack>
        </s-stack>

        <s-divider />

        {/* ── Product row ── */}
        <s-stack direction="inline" spacing="base" block-alignment="start">

          {/* Image — fixed 120×120 */}
          {o.visualAssetUrl ? (
            <s-image
              source={o.visualAssetUrl}
              accessibility-description={o.headline}
              aspect-ratio="1"
              fit="cover"
              border-radius="base"
              max-inline-size="120px"
            />
          ) : (
            <s-box
              min-inline-size="120px"
              min-block-size="120px"
              background="surface-secondary"
              border-radius="base"
            />
          )}

          {/* Info */}
          <s-stack direction="block" spacing="tight" flex="1">
            <s-heading level="2">{o.headline}</s-heading>
            <s-text type="small" tone="subdued">{o.description}</s-text>

            {/* Price row */}
            <s-stack direction="inline" spacing="tight" block-alignment="center">
              {o.price && (
                <s-text emphasis="bold" size="large">
                  {currency} {parseFloat(o.price).toFixed(0)}
                </s-text>
              )}
              {o.priceWas && (
                <s-text tone="subdued">
                  <s-text style="text-decoration:line-through">
                    {currency} {parseFloat(o.priceWas).toFixed(0)}
                  </s-text>
                </s-text>
              )}
              <s-badge tone="success">Special offer</s-badge>
            </s-stack>
          </s-stack>
        </s-stack>

        {/* ── Delivery bar ── */}
        <s-box padding="tight" background="surface-secondary" border-radius="base">
          <s-stack direction="inline" spacing="tight" block-alignment="center">
            <s-icon source="truck" size="small" />
            <s-text type="small" emphasis="bold">{delivery}</s-text>
          </s-stack>
        </s-box>

        {/* ── Pills ── */}
        <s-stack direction="inline" spacing="tight">
          {pills.map((pill, i) => (
            <s-box
              key={i}
              padding="extraTight"
              border="base"
              border-radius="fullyRounded"
              flex="1"
            >
              <s-stack direction="inline" spacing="extraTight" block-alignment="center" inline-alignment="center">
                <s-icon source="checkmark" size="small" />
                <s-text type="small" emphasis="bold">{pill}</s-text>
              </s-stack>
            </s-box>
          ))}
        </s-stack>

        <s-divider />

        {/* ── CTAs ── */}
        <s-stack direction="block" spacing="tight">
          <s-button
            variant="primary"
            loading={loading}
            onClick={() => respond('ACCEPTED')}
          >
            🔒 {ctaLabel}
          </s-button>
          <s-button
            variant="secondary"
            onClick={() => respond('DECLINED')}
          >
            No thanks
          </s-button>
        </s-stack>

        {/* ── Footer ── */}
        <s-stack direction="inline" spacing="loose" block-alignment="center" inline-alignment="space-between">
          <s-text type="small" tone="subdued">Powered by Kablet</s-text>
          <s-link href="https://kablet.com/privacy/" target="_blank">
            <s-text type="small" tone="subdued">Privacy</s-text>
          </s-link>
        </s-stack>

      </s-stack>
    </s-section>
  )
}
