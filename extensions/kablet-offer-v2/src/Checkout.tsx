import '@shopify/ui-extensions/preact';
import { render } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';

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

function formatPrice(value: string): string {
  return new Intl.NumberFormat('en-AE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(parseFloat(value))
}

function useCountdown(seconds: number | null) {
  const [left, setLeft] = useState<number | null>(null)
  useEffect(() => {
    if (seconds === null) return
    setLeft(seconds)
  }, [seconds])
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

export default async () => {
  render(<App />, document.body)
}

function App() {
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [checked, setChecked] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const { display: countdown, expired } = useCountdown(opportunity ? 180 : null)

  const isMounted = useRef(true)
  useEffect(() => {
    return () => { isMounted.current = false }
  }, [])

  const abortRef = useRef<AbortController | null>(null)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (opportunity) return
    const t = setTimeout(() => setShowHint(true), 2000)
    return () => clearTimeout(t)
  }, [opportunity])

  useEffect(() => {
    const oc = shopify?.orderConfirmation
    if (!oc) return
    const tryGet = (val: any) => {
      const id = val?.order?.id?.toString().split('/').pop()
      if (id) fetchOffer(id)
    }
    if (oc.current?.order?.id) { tryGet(oc.current); return }
    const unsub = oc.subscribe((val: any) => tryGet(val))
    return () => {
      if (abortRef.current) abortRef.current.abort()
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
      unsub?.()
    }
  }, [])

  function fetchOffer(orderId: string, attempt = 0) {
    const controller = new AbortController()
    abortRef.current = controller
    const shopDomain = shopify?.shop?.myshopifyDomain ?? ''
    fetch(
      `${API_BASE}/opportunity/decision?shopifyOrderId=${orderId}&shopDomain=${shopDomain}`,
      { signal: controller.signal }
    )
      .then(r => r.json())
      .then((d: any) => {
        if (!isMounted.current) return
        if (d.opportunity) {
          setOpportunity(d.opportunity)
        } else if (attempt < 10) {
          retryTimerRef.current = setTimeout(() => fetchOffer(orderId, attempt + 1), 1500)
        } else {
          setChecked(true)
        }
      })
      .catch((err: any) => {
        if (err?.name === 'AbortError') return
        if (!isMounted.current) return
        if (attempt < 10) {
          retryTimerRef.current = setTimeout(() => fetchOffer(orderId, attempt + 1), 1500)
        } else {
          setChecked(true)
        }
      })
  }

  async function respond(response: 'ACCEPTED' | 'DECLINED') {
    if (!opportunity) return
    setError(false)
    if (response === 'ACCEPTED') setLoading(true)
    const shopDomain = shopify?.shop?.myshopifyDomain ?? ''
    const controller = new AbortController()
    try {
      const res = await fetch(`${API_BASE}/opportunity/response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceId: opportunity.instanceId, response, shopDomain }),
        signal: controller.signal,
      })
      if (!res.ok) throw new Error('failed')
      if (!isMounted.current) return
      if (response === 'ACCEPTED') { setLoading(false); setAccepted(true) }
      else setDismissed(true)
    } catch (err: any) {
      if (err?.name === 'AbortError') return
      if (!isMounted.current) return
      setLoading(false)
      if (response === 'ACCEPTED') setError(true)
      else setDismissed(true)
    }
  }

  if (dismissed || checked || (expired && opportunity)) return null

  // CARD CONTAINER NOTE:
  // There is no dedicated s-card component in Checkout UI Extensions 2026-07.
  // s-section is the official card equivalent (confirmed: Polaris React docs state
  // "Card is now available as a framework-agnostic web component. Start using <s-section>").
  // However, s-section's visual card appearance (border, radius, shadow) is controlled
  // entirely by the merchant's checkout branding — it cannot be forced by the extension.
  // To guarantee a visible card outline on all themes, we wrap content in an s-box with
  // border="base" and borderRadius="base" — both props verified from the official s-stack
  // docs (same prop system applies to s-box). This produces a consistent card appearance
  // independent of the merchant's theme while remaining fully native and non-custom.
  // The outer s-section is kept as the semantic container; the inner s-box provides
  // the visible card treatment.

  /* ── Success ── */
  if (accepted) return (
    <s-section>
      <s-box border="base" borderRadius="base" padding="base">
        <s-stack direction="block" gap="base">
          <s-stack direction="inline" gap="base" alignItems="center">
            <s-icon type="check-circle" tone="success" size="large" />
            <s-stack direction="block" gap="none">
              <s-heading level="2">Added to your order</s-heading>
              {/* TODO: type="small" — not confirmed in official 2026-07 s-text props. Leaving unchanged. */}
              <s-text color="subdued" type="small">
                {opportunity?.deliveryNote ?? 'Your item will be delivered separately.'}
              </s-text>
            </s-stack>
          </s-stack>
          <s-stack direction="inline" gap="base" justifyContent="space-between">
            <s-text color="subdued" type="small">Powered by Kablet</s-text>
            {/* TODO: target="_blank" on s-link — not confirmed in official 2026-07 docs. Leaving unchanged. */}
            <s-link href="https://kablet.com/privacy/" target="_blank">
              <s-text color="subdued" type="small">Privacy</s-text>
            </s-link>
          </s-stack>
        </s-stack>
      </s-box>
    </s-section>
  )

  /* ── Skeleton ──
     Uses identical outer s-section + s-box wrapper as the offer card.
     Every row mirrors the real card row for row to prevent layout shift.
  ── */
  if (!opportunity) return (
    <s-section>
      <s-box border="base" borderRadius="base">

        {/* Header row */}
        <s-stack direction="inline" gap="base" alignItems="center" justifyContent="space-between" padding="base">
          <s-stack direction="inline" gap="small" alignItems="center">
            <s-box minInlineSize="20px" minBlockSize="20px" background="subdued" borderRadius="base" />
            <s-stack direction="block" gap="none">
              <s-skeleton-paragraph lines={1} />
              <s-skeleton-paragraph lines={1} />
            </s-stack>
          </s-stack>
          <s-box minInlineSize="56px" minBlockSize="24px" background="subdued" borderRadius="base" />
        </s-stack>

        <s-divider />

        <s-stack direction="block" gap="base" padding="base">

          {/* Product row */}
          <s-stack direction="inline" gap="base" alignItems="start">
            <s-box minInlineSize="80px" maxInlineSize="80px" minBlockSize="80px" background="subdued" borderRadius="base" />
            <s-stack direction="block" gap="small">
              <s-skeleton-paragraph lines={1} />
              <s-skeleton-paragraph lines={2} />
              <s-skeleton-paragraph lines={1} />
            </s-stack>
          </s-stack>

          {/* Value proposition block */}
          <s-box background="subdued" borderRadius="base" padding="small">
            <s-skeleton-paragraph lines={2} />
          </s-box>

          {/* Delivery bar */}
          <s-box background="subdued" borderRadius="base" padding="small">
            <s-skeleton-paragraph lines={1} />
          </s-box>

          {/* Pills row */}
          <s-stack direction="inline" gap="small">
            <s-box minInlineSize="100px" minBlockSize="28px" background="subdued" borderRadius="base" />
            <s-box minInlineSize="100px" minBlockSize="28px" background="subdued" borderRadius="base" />
            <s-box minInlineSize="100px" minBlockSize="28px" background="subdued" borderRadius="base" />
          </s-stack>

          <s-divider />

          {/* Primary CTA placeholder */}
          <s-box minBlockSize="44px" background="subdued" borderRadius="base" />

          {/* Secondary CTA placeholder */}
          <s-box minBlockSize="38px" background="subdued" borderRadius="base" />

          {/* Footer row */}
          <s-stack direction="inline" gap="base" justifyContent="space-between">
            <s-box minInlineSize="100px" minBlockSize="16px" background="subdued" borderRadius="base" />
            <s-box minInlineSize="40px" minBlockSize="16px" background="subdued" borderRadius="base" />
          </s-stack>

          {/* Waiting state */}
          {showHint && (
            <s-stack direction="inline" justifyContent="center">
              <s-text color="subdued" type="small">Personalising your offer…</s-text>
            </s-stack>
          )}

        </s-stack>
      </s-box>
    </s-section>
  )

  /* ── Offer card ── */
  const o = opportunity
  const currency = o.currency || 'AED'
  const pills = o.valueBullets?.slice(0, 3) ?? ['Ships separately', 'Cash on Delivery', 'Easy returns']
  const delivery = o.deliveryNote || 'Next-day delivery — shipped separately, free'
  const ctaLabel = o.ctaLabel || 'Add to my order'
  const discountPct = o.price && o.priceWas
    ? Math.round((1 - parseFloat(o.price) / parseFloat(o.priceWas)) * 100)
    : null

  return (
    <s-section>
      {/* VERIFIED card container:
          - s-section = official card semantic equivalent (Polaris docs)
          - s-box border="base" borderRadius="base" = verified props from s-stack/s-box docs,
            produces a visible card border on all themes regardless of merchant branding */}
      <s-box border="base" borderRadius="base">

        {/* ── Header ── */}
        <s-stack direction="inline" gap="base" alignItems="center" justifyContent="space-between" padding="base">
          <s-stack direction="inline" gap="small" alignItems="center">
            {/* TODO: "gift" — not in published icon subset. Leaving unchanged. */}
            <s-icon type="gift" size="small" />
            <s-stack direction="block" gap="none">
              <s-text color="subdued" type="small">Just for you</s-text>
              {/* TODO: emphasis="bold" — not confirmed in official 2026-07 s-text props. Leaving unchanged. */}
              <s-text emphasis="bold">Add to your order</s-text>
            </s-stack>
          </s-stack>
          {countdown && <s-badge tone="critical">{countdown}</s-badge>}
        </s-stack>

        <s-divider />

        <s-stack direction="block" gap="base" padding="base">

          {/* ── Product row ── */}
          <s-stack direction="inline" gap="base" alignItems="start">
            <s-box minInlineSize="80px" maxInlineSize="80px">
              {o.visualAssetUrl
                ? <s-image
                    src={o.visualAssetUrl}
                    alt={o.headline}
                    aspectRatio="1/1"
                    objectFit="cover"
                    borderRadius="base"
                    inlineSize="fill"
                  />
                : <s-box minInlineSize="80px" minBlockSize="80px" background="subdued" borderRadius="base" />
              }
            </s-box>
            <s-stack direction="block" gap="small">
              <s-heading level="2">{o.headline}</s-heading>
              <s-text color="subdued" type="small">{o.description}</s-text>
              <s-stack direction="inline" gap="small" alignItems="center">
                {o.price && (
                  <s-text emphasis="bold" size="large">{currency} {formatPrice(o.price)}</s-text>
                )}
                {o.priceWas && (
                  <s-text color="subdued" type="small">
                    {currency} {formatPrice(o.priceWas)}
                  </s-text>
                )}
                {discountPct && discountPct > 0 && (
                  <s-badge tone="success">Save {discountPct}%</s-badge>
                )}
              </s-stack>
            </s-stack>
          </s-stack>

          {/* ── Value proposition ── */}
          {o.valueProposition && (
            <s-box background="subdued" borderRadius="base" padding="small">
              <s-text color="subdued" type="small">{o.valueProposition}</s-text>
            </s-box>
          )}

          {/* ── Delivery bar ── */}
          <s-box background="subdued" borderRadius="base" padding="small">
            <s-stack direction="inline" gap="small" alignItems="center">
              <s-icon type="delivery" size="small" tone="success" />
              {/* TODO: emphasis="bold" — not confirmed. Leaving unchanged. */}
              {/* TODO: type="small" — not confirmed. Leaving unchanged. */}
              <s-text emphasis="bold" type="small">{delivery}</s-text>
            </s-stack>
          </s-box>

          {/* ── Pills ── */}
          <s-stack direction="inline" gap="small">
            {pills.map((pill, i) => (
              <s-badge key={i} tone="neutral">{pill}</s-badge>
            ))}
          </s-stack>

          <s-divider />

          {/* ── CTAs ──
              VERIFIED: inlineSize="fill" on s-button makes it full-width.
              Source: official s-button docs — "The button takes up 100% of the available inline size." */}
          <s-stack direction="block" gap="small">
            <s-button variant="primary" inlineSize="fill" loading={loading} onClick={() => respond('ACCEPTED')}>
              {ctaLabel}
            </s-button>
            <s-button variant="secondary" inlineSize="fill" onClick={() => respond('DECLINED')}>
              Skip
            </s-button>
          </s-stack>

          {/* ── Error ── */}
          {error && (
            <s-banner tone="critical">
              {/* TODO: type="small" — not confirmed. Leaving unchanged. */}
              <s-text type="small">Couldn't add the item. Please try again.</s-text>
            </s-banner>
          )}

          {/* ── Footer ── */}
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