import '@shopify/ui-extensions/preact'
import { render } from 'preact'
import { useState, useEffect } from 'preact/hooks'

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

/* ── Countdown hook — starts only when seconds is non-null ── */
function useCountdown(seconds: number | null) {
  const [left, setLeft] = useState<number | null>(null)

  // Arm the counter only once, when seconds first becomes non-null
  useEffect(() => {
    if (seconds === null) return
    setLeft(seconds)
  }, [seconds !== null]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (left === null || left <= 0) return
    const t = setInterval(() => setLeft(n => (n ?? 1) - 1), 1000)
    return () => clearInterval(t)
  }, [left])

  if (left === null) return { display: null, expired: false }
  const m = Math.floor(left / 60)
  const s = left % 60
  return { display: `${m}:${s.toString().padStart(2, '0')}`, expired: left <= 0 }
}

/* ── Format price — preserves decimals where needed ── */
function formatPrice(value: string): string {
  const n = parseFloat(value)
  return new Intl.NumberFormat('en-AE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n)
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
  const [error, setError] = useState(false)
  const [checked, setChecked] = useState(false)
  const [showLoadingHint, setShowLoadingHint] = useState(false)

  // Countdown only arms after the offer card is ready
  const { display: countdown, expired } = useCountdown(opportunity ? 180 : null)

  // Show "Finding your offer" hint after 2s of skeleton
  useEffect(() => {
    if (opportunity) return
    const t = setTimeout(() => setShowLoadingHint(true), 2000)
    return () => clearTimeout(t)
  }, [opportunity])

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
    setError(false)
    if (response === 'ACCEPTED') setLoading(true)
    const shopDomain = shopify?.shop?.myshopifyDomain ?? ''
    try {
      const res = await fetch(`${API_BASE}/opportunity/response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceId: opportunity.instanceId, response, shopDomain }),
      })
      if (!res.ok) throw new Error('response error')
      if (response === 'ACCEPTED') {
        setLoading(false)
        setAccepted(true)
      } else {
        setDismissed(true)
      }
    } catch {
      setLoading(false)
      if (response === 'ACCEPTED') {
        // Show error — don't silently succeed
        setError(true)
      } else {
        // Declined errors can dismiss silently
        setDismissed(true)
      }
    }
  }

  // Hide widget when dismissed, no offer found, or timer expired after offer was shown
  if (dismissed || checked || (expired && opportunity)) return null

  /* ── Success state ── */
  if (accepted) {
    return (
      <s-section>
        <s-stack direction="block" spacing="base" padding="base">
          <s-stack direction="inline" spacing="base" block-alignment="center">
            <s-icon source="checkmark-circle" size="medium" />
            <s-stack direction="block" spacing="none">
              <s-heading level="2">Added to your order</s-heading>
              <s-text type="small" tone="subdued">
                {opportunity?.deliveryNote ?? 'Your item will be delivered separately.'}
              </s-text>
            </s-stack>
          </s-stack>
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

  /* ── Skeleton ── */
  if (!opportunity) {
    return (
      <s-section>
        {/* Header band — mirrors real card structure */}
        <s-box padding="tight" border-block-end="base">
          <s-stack direction="inline" spacing="base" block-alignment="center" inline-alignment="space-between">
            <s-stack direction="inline" spacing="tight" block-alignment="center">
              <s-box min-inline-size="28px" min-block-size="28px" background="surface-secondary" border-radius="base" />
              <s-stack direction="block" spacing="extraTight">
                <s-skeleton-paragraph lines={1} />
                <s-skeleton-paragraph lines={1} />
              </s-stack>
            </s-stack>
            <s-box min-inline-size="70px" min-block-size="24px" background="surface-secondary" border-radius="fullyRounded" />
          </s-stack>
        </s-box>

        <s-stack direction="block" spacing="base" padding="base">
          {/* Product row — 88px image matches loaded card */}
          <s-stack direction="inline" spacing="base" block-alignment="start">
            <s-box min-inline-size="88px" min-block-size="88px" background="surface-secondary" border-radius="base" />
            <s-stack direction="block" spacing="tight" flex="1">
              <s-skeleton-paragraph lines={1} />
              <s-skeleton-paragraph lines={2} />
              <s-stack direction="inline" spacing="tight">
                <s-skeleton-paragraph lines={1} />
                <s-skeleton-paragraph lines={1} />
              </s-stack>
            </s-stack>
          </s-stack>

          {/* Value prop placeholder */}
          <s-box min-block-size="52px" background="surface-secondary" border-radius="base" />

          {/* Delivery bar */}
          <s-box min-block-size="36px" background="surface-secondary" border-radius="base" />

          {/* Pills */}
          <s-stack direction="inline" spacing="tight">
            <s-box min-block-size="26px" flex="1" background="surface-secondary" border-radius="fullyRounded" />
            <s-box min-block-size="26px" flex="1" background="surface-secondary" border-radius="fullyRounded" />
            <s-box min-block-size="26px" flex="1" background="surface-secondary" border-radius="fullyRounded" />
          </s-stack>

          {/* Buttons */}
          <s-box min-block-size="44px" background="surface-secondary" border-radius="base" />
          <s-box min-block-size="38px" background="surface-secondary" border-radius="base" />

          {/* Loading hint — appears after 2s so users know something is happening */}
          {showLoadingHint && (
            <s-stack direction="inline" spacing="tight" block-alignment="center" inline-alignment="center">
              <s-text type="small" tone="subdued">Finding your offer…</s-text>
            </s-stack>
          )}
        </s-stack>
      </s-section>
    )
  }

  /* ── Offer card ── */
  const o = opportunity
  const currency = o.currency || 'AED'
  const pills = o.valueBullets?.slice(0, 3) ?? ['Ships separately', 'Cash on Delivery', 'Easy returns']
  const delivery = o.deliveryNote || 'Next-day delivery — shipped separately, free'
  const ctaLabel = o.ctaLabel || 'Add to my order'

  // Calculate discount percentage if both prices exist
  const discountPct =
    o.price && o.priceWas
      ? Math.round((1 - parseFloat(o.price) / parseFloat(o.priceWas)) * 100)
      : null

  return (
    <s-section>

      {/* ── Header band ── */}
      <s-box padding="tight" border-block-end="base">
        <s-stack direction="inline" spacing="base" block-alignment="center" inline-alignment="space-between">
          <s-stack direction="inline" spacing="tight" block-alignment="center">
            <s-box
              min-inline-size="28px"
              min-block-size="28px"
              background="warning-subdued"
              border-radius="base"
            >
              <s-icon source="star" size="small" />
            </s-box>
            <s-stack direction="block" spacing="none">
              <s-text type="small" tone="subdued">Just for you</s-text>
              <s-text emphasis="bold">Add to your order</s-text>
            </s-stack>
          </s-stack>

          {/* Timer — only shown when countdown is running */}
          {countdown && (
            <s-badge tone="critical">
              <s-stack direction="inline" spacing="extraTight" block-alignment="center">
                <s-icon source="clock" size="small" />
                <s-text>{countdown}</s-text>
              </s-stack>
            </s-badge>
          )}
        </s-stack>
      </s-box>

      <s-stack direction="block" spacing="base" padding="base">

        {/* ── Product row — 88px image ── */}
        <s-stack direction="inline" spacing="base" block-alignment="start">
          {o.visualAssetUrl ? (
            <s-image
              source={o.visualAssetUrl}
              accessibility-description={o.headline}
              aspect-ratio="1"
              fit="cover"
              border-radius="base"
              max-inline-size="88px"
            />
          ) : (
            <s-box
              min-inline-size="88px"
              min-block-size="88px"
              background="surface-secondary"
              border-radius="base"
            />
          )}

          <s-stack direction="block" spacing="tight" flex="1">
            <s-heading level="2">{o.headline}</s-heading>
            <s-text type="small" tone="subdued">{o.description}</s-text>

            {/* Price row — correct decimal formatting + dynamic discount badge */}
            <s-stack direction="inline" spacing="tight" block-alignment="center">
              {o.price && (
                <s-text emphasis="bold" size="large">
                  {currency} {formatPrice(o.price)}
                </s-text>
              )}
              {o.priceWas && (
                <s-text tone="subdued" style="text-decoration:line-through">
                  {currency} {formatPrice(o.priceWas)}
                </s-text>
              )}
              {discountPct && discountPct > 0 && (
                <s-badge tone="success">Save {discountPct}%</s-badge>
              )}
            </s-stack>
          </s-stack>
        </s-stack>

        {/* ── Value proposition — was previously discarded ── */}
        {o.valueProposition && (
          <s-box padding="tight" background="surface-secondary" border-radius="base" border-inline-start="thick">
            <s-text type="small" tone="subdued">{o.valueProposition}</s-text>
          </s-box>
        )}

        {/* ── Delivery bar — green tone signals benefit ── */}
        <s-box padding="tight" background="success-subdued" border-radius="base">
          <s-stack direction="inline" spacing="tight" block-alignment="center">
            <s-icon source="delivery" size="small" />
            <s-text type="small" emphasis="bold" tone="success">{delivery}</s-text>
          </s-stack>
        </s-box>

        {/* ── Pills — no flex stretch, sized to content ── */}
        <s-stack direction="inline" spacing="tight">
          {pills.map((pill, i) => (
            <s-box
              key={i}
              padding="extraTight"
              border="base"
              border-radius="fullyRounded"
            >
              <s-stack direction="inline" spacing="extraTight" block-alignment="center" inline-alignment="center">
                <s-icon source="checkmark" size="small" />
                <s-text type="small" emphasis="bold">{pill}</s-text>
              </s-stack>
            </s-box>
          ))}
        </s-stack>

        <s-divider />

        {/* ── CTAs — no emoji, neutral decline label ── */}
        <s-stack direction="block" spacing="tight">
          <s-button
            variant="primary"
            loading={loading}
            onClick={() => respond('ACCEPTED')}
          >
            {ctaLabel}
          </s-button>
          <s-button
            variant="secondary"
            onClick={() => respond('DECLINED')}
          >
            Skip
          </s-button>
        </s-stack>

        {/* ── Error state — surfaces ACCEPTED failures instead of silently succeeding ── */}
        {error && (
          <s-banner tone="critical">
            <s-text type="small">Couldn't add the item. Please try again.</s-text>
          </s-banner>
        )}

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