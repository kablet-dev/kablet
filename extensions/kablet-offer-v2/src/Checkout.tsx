import '@shopify/ui-extensions/preact';
import { render } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';

const API_BASE = 'https://kablet-backend.onrender.com'

declare const shopify: any

// ── Template types ────────────────────────────────────────────────
type Template =
  | 'PHYSICAL_PRODUCT'
  | 'REWARD'
  | 'CASHBACK'
  | 'COUPON'
  | 'TRAVEL'
  | 'INSURANCE'
  | 'DIGITAL'
  | 'FINANCIAL'
  | 'ENTERTAINMENT'
  | 'SUBSCRIPTION'

interface Opportunity {
  instanceId: string
  template: Template
  headline: string
  description: string
  valueProposition: string
  visualAssetUrl: string
  ctaLabel: string
  valueBullets: string[]
  socialProof: string | null
  trustRating: number | null
  price: string | null
  currency?: string
  priceWas?: string
  deliveryNote?: string
}

// ── Template config ───────────────────────────────────────────────
// Each template defines its own header label, icon, badge tone,
// CTA style, and which sections to show/hide.
const TEMPLATE_CONFIG: Record<Template, {
  headerLabel: string
  headerSub: string
  icon: string
  badgeTone: string
  showImage: boolean
  showDelivery: boolean
  showPrice: boolean
  accentTone: string
  defaultCta: string
  defaultPills: string[]
}> = {
  PHYSICAL_PRODUCT: {
    headerLabel: 'Add to your order',
    headerSub: 'Just for you',
    icon: 'gift',
    badgeTone: 'critical',
    showImage: true,
    showDelivery: true,
    showPrice: true,
    accentTone: 'success',
    defaultCta: 'Add to my order',
    defaultPills: ['Ships separately', 'Cash on Delivery', 'Easy returns'],
  },
  REWARD: {
    headerLabel: "You've unlocked a reward",
    headerSub: 'Exclusive for you',
    icon: 'star',
    badgeTone: 'warning',
    showImage: false,
    showDelivery: false,
    showPrice: false,
    accentTone: 'warning',
    defaultCta: 'Claim my reward',
    defaultPills: ['Instant reward', 'No minimum spend', 'Valid 30 days'],
  },
  CASHBACK: {
    headerLabel: 'Cashback offer',
    headerSub: 'Money back in your pocket',
    icon: 'money',
    badgeTone: 'success',
    showImage: false,
    showDelivery: false,
    showPrice: false,
    accentTone: 'success',
    defaultCta: 'Claim cashback',
    defaultPills: ['Instant cashback', 'No conditions', 'Auto-applied'],
  },
  COUPON: {
    headerLabel: 'Your exclusive coupon',
    headerSub: 'Limited time offer',
    icon: 'discount',
    badgeTone: 'critical',
    showImage: false,
    showDelivery: false,
    showPrice: false,
    accentTone: 'critical',
    defaultCta: 'Get my coupon',
    defaultPills: ['One time use', 'Expires soon', 'Transferable'],
  },
  TRAVEL: {
    headerLabel: 'Travel upgrade for you',
    headerSub: 'Exclusive offer',
    icon: 'location',
    badgeTone: 'info',
    showImage: true,
    showDelivery: false,
    showPrice: false,
    accentTone: 'info',
    defaultCta: 'Claim my upgrade',
    defaultPills: ['Exclusive rate', 'Flexible dates', 'Free cancellation'],
  },
  INSURANCE: {
    headerLabel: 'Protect your order',
    headerSub: 'Peace of mind included',
    icon: 'security',
    badgeTone: 'success',
    showImage: false,
    showDelivery: false,
    showPrice: true,
    accentTone: 'success',
    defaultCta: 'Add protection',
    defaultPills: ['Instant coverage', 'Claims in 24h', 'Cancel anytime'],
  },
  DIGITAL: {
    headerLabel: 'Digital offer for you',
    headerSub: 'Instant access',
    icon: 'apps',
    badgeTone: 'info',
    showImage: true,
    showDelivery: false,
    showPrice: true,
    accentTone: 'info',
    defaultCta: 'Get instant access',
    defaultPills: ['Instant delivery', 'No shipping', 'Always available'],
  },
  FINANCIAL: {
    headerLabel: 'Financial offer',
    headerSub: 'Tailored for you',
    icon: 'bank',
    badgeTone: 'neutral',
    showImage: false,
    showDelivery: false,
    showPrice: false,
    accentTone: 'neutral',
    defaultCta: 'Apply now',
    defaultPills: ['Quick approval', 'No hidden fees', 'Secure'],
  },
  ENTERTAINMENT: {
    headerLabel: 'Entertainment offer',
    headerSub: 'Enjoy more',
    icon: 'play',
    badgeTone: 'warning',
    showImage: true,
    showDelivery: false,
    showPrice: true,
    accentTone: 'warning',
    defaultCta: 'Get access',
    defaultPills: ['Stream instantly', 'Cancel anytime', 'HD quality'],
  },
  SUBSCRIPTION: {
    headerLabel: 'Subscription offer',
    headerSub: 'Special member rate',
    icon: 'refresh',
    badgeTone: 'info',
    showImage: true,
    showDelivery: false,
    showPrice: true,
    accentTone: 'success',
    defaultCta: 'Start subscription',
    defaultPills: ['Cancel anytime', 'First month free', 'Exclusive access'],
  },
}

// ── Helpers ───────────────────────────────────────────────────────
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

// ── App ───────────────────────────────────────────────────────────
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
  useEffect(() => { return () => { isMounted.current = false } }, [])

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
  if (id && id !== '0') fetchOffer(id)
}
    const currentId = oc.current?.order?.id?.toString().split('/').pop()
if (currentId && currentId !== '0') { tryGet(oc.current); return }
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
    try {
      const res = await fetch(`${API_BASE}/opportunity/response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceId: opportunity.instanceId, response, shopDomain }),
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

  // ── Success state (same for all templates) ────────────────────
  if (accepted) return (
    <s-section>
      <s-box border="base" borderRadius="base" padding="base">
        <s-stack direction="block" gap="base">
          <s-stack direction="inline" gap="base" alignItems="center">
            <s-icon type="check-circle" tone="success" size="large" />
            <s-stack direction="block" gap="none">
              <s-heading level="2">
                {opportunity?.template === 'REWARD' || opportunity?.template === 'CASHBACK'
                  ? 'Reward claimed!'
                  : opportunity?.template === 'COUPON'
                  ? 'Coupon activated!'
                  : opportunity?.template === 'INSURANCE'
                  ? 'Protection added!'
                  : 'Added to your order'}
              </s-heading>
              <s-text color="subdued" type="small">
                {opportunity?.template === 'DIGITAL'
                  ? 'Check your email for access details.'
                  : opportunity?.template === 'FINANCIAL'
                  ? "We'll be in touch shortly."
                  : opportunity?.deliveryNote ?? 'Your item will be delivered separately.'}
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

  // ── Skeleton (same for all templates) ─────────────────────────
  if (!opportunity) return (
    <s-section>
      <s-box border="base" borderRadius="base">
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
          <s-stack direction="inline" gap="base" alignItems="start">
            <s-box minInlineSize="80px" maxInlineSize="80px" minBlockSize="80px" background="subdued" borderRadius="base" />
            <s-stack direction="block" gap="small">
              <s-skeleton-paragraph lines={1} />
              <s-skeleton-paragraph lines={2} />
              <s-skeleton-paragraph lines={1} />
            </s-stack>
          </s-stack>
          <s-box background="subdued" borderRadius="base" padding="small">
            <s-skeleton-paragraph lines={2} />
          </s-box>
          <s-stack direction="inline" gap="small">
            <s-box minInlineSize="100px" minBlockSize="28px" background="subdued" borderRadius="base" />
            <s-box minInlineSize="100px" minBlockSize="28px" background="subdued" borderRadius="base" />
          </s-stack>
          <s-divider />
          <s-box minBlockSize="44px" background="subdued" borderRadius="base" />
          <s-box minBlockSize="38px" background="subdued" borderRadius="base" />
          <s-stack direction="inline" gap="base" justifyContent="space-between">
            <s-box minInlineSize="100px" minBlockSize="16px" background="subdued" borderRadius="base" />
            <s-box minInlineSize="40px" minBlockSize="16px" background="subdued" borderRadius="base" />
          </s-stack>
          {showHint && (
            <s-stack direction="inline" justifyContent="center">
              <s-text color="subdued" type="small">Personalising your offer…</s-text>
            </s-stack>
          )}
        </s-stack>
      </s-box>
    </s-section>
  )

  // ── Offer card — template-aware rendering ─────────────────────
  const o = opportunity
  const tmpl = o.template ?? 'PHYSICAL_PRODUCT'
  const cfg = TEMPLATE_CONFIG[tmpl] ?? TEMPLATE_CONFIG.PHYSICAL_PRODUCT
  const currency = o.currency || 'AED'
  const pills = o.valueBullets?.length > 0 ? o.valueBullets.slice(0, 3) : cfg.defaultPills
  const ctaLabel = o.ctaLabel || cfg.defaultCta
  const discountPct = o.price && o.priceWas
    ? Math.round((1 - parseFloat(o.price) / parseFloat(o.priceWas)) * 100)
    : null

  return (
    <s-section>
      <s-box border="base" borderRadius="base">

        {/* ── Header — varies by template label/icon ── */}
        <s-stack direction="inline" gap="base" alignItems="center" justifyContent="space-between" padding="base">
          <s-stack direction="inline" gap="small" alignItems="center">
            <s-icon type={cfg.icon} size="small" />
            <s-stack direction="block" gap="none">
              <s-text color="subdued" type="small">{cfg.headerSub}</s-text>
              <s-text emphasis="bold">{cfg.headerLabel}</s-text>
            </s-stack>
          </s-stack>
          {countdown && <s-badge tone={cfg.badgeTone as any}>{countdown}</s-badge>}
        </s-stack>

        <s-divider />

        <s-stack direction="block" gap="base" padding="base">

          {/* ── PHYSICAL_PRODUCT / TRAVEL / ENTERTAINMENT / DIGITAL / SUBSCRIPTION ──
              Image-based layout: image left, content right */}
          {cfg.showImage && o.visualAssetUrl && (
            <s-stack direction="inline" gap="base" alignItems="start">
              <s-box minInlineSize="80px" maxInlineSize="80px">
                <s-image
                  src={o.visualAssetUrl}
                  alt={o.headline}
                  aspectRatio="1/1"
                  objectFit="cover"
                  borderRadius="base"
                  inlineSize="fill"
                />
              </s-box>
              <s-stack direction="block" gap="small">
                <s-heading level="2">{o.headline}</s-heading>
                <s-text color="subdued" type="small">{o.description}</s-text>
                {cfg.showPrice && o.price && (
                  <s-stack direction="inline" gap="small" alignItems="center">
                    <s-text emphasis="bold" size="large">{currency} {formatPrice(o.price)}</s-text>
                    {o.priceWas && (
                      <s-text color="subdued" type="small">{currency} {formatPrice(o.priceWas)}</s-text>
                    )}
                    {discountPct && discountPct > 0 && (
                      <s-badge tone="success">Save {discountPct}%</s-badge>
                    )}
                  </s-stack>
                )}
              </s-stack>
            </s-stack>
          )}

          {/* ── REWARD / CASHBACK ──
              Big value front and center, no image */}
          {(tmpl === 'REWARD' || tmpl === 'CASHBACK') && (
            <s-stack direction="block" gap="small" alignItems="center">
              <s-box background="subdued" borderRadius="base" padding="base" inlineSize="fill">
                <s-stack direction="block" gap="small" alignItems="center">
                  <s-text emphasis="bold" size="large">{o.headline}</s-text>
                  <s-text color="subdued" type="small">{o.description}</s-text>
                  {o.valueProposition && (
                    <s-badge tone={cfg.accentTone as any}>{o.valueProposition}</s-badge>
                  )}
                </s-stack>
              </s-box>
            </s-stack>
          )}

          {/* ── COUPON ──
              Code-style display, prominent discount */}
          {tmpl === 'COUPON' && (
            <s-stack direction="block" gap="base">
              <s-stack direction="block" gap="small">
                <s-heading level="2">{o.headline}</s-heading>
                <s-text color="subdued" type="small">{o.description}</s-text>
              </s-stack>
              {o.valueProposition && (
                <s-box background="subdued" borderRadius="base" padding="base">
                  <s-stack direction="inline" gap="base" alignItems="center" justifyContent="space-between">
                    <s-text emphasis="bold">{o.valueProposition}</s-text>
                    <s-badge tone="critical">Limited offer</s-badge>
                  </s-stack>
                </s-box>
              )}
            </s-stack>
          )}

          {/* ── INSURANCE ──
              Trust-first: headline, description, price, no image */}
          {tmpl === 'INSURANCE' && (
            <s-stack direction="block" gap="small">
              <s-heading level="2">{o.headline}</s-heading>
              <s-text color="subdued" type="small">{o.description}</s-text>
              {cfg.showPrice && o.price && (
                <s-stack direction="inline" gap="small" alignItems="center">
                  <s-badge tone="success">Only {currency} {formatPrice(o.price)}</s-badge>
                </s-stack>
              )}
            </s-stack>
          )}

          {/* ── FINANCIAL ──
              Minimal, trust-focused, no image, no price */}
          {tmpl === 'FINANCIAL' && (
            <s-stack direction="block" gap="small">
              <s-heading level="2">{o.headline}</s-heading>
              <s-text color="subdued" type="small">{o.description}</s-text>
            </s-stack>
          )}

          {/* ── No-image fallback for templates that hide image but have content ── */}
          {!cfg.showImage && tmpl !== 'REWARD' && tmpl !== 'CASHBACK' && tmpl !== 'COUPON' && tmpl !== 'INSURANCE' && tmpl !== 'FINANCIAL' && (
            <s-stack direction="block" gap="small">
              <s-heading level="2">{o.headline}</s-heading>
              <s-text color="subdued" type="small">{o.description}</s-text>
            </s-stack>
          )}

          {/* ── Value proposition block (shown for most templates) ── */}
          {o.valueProposition && tmpl !== 'REWARD' && tmpl !== 'CASHBACK' && tmpl !== 'COUPON' && (
            <s-box background="subdued" borderRadius="base" padding="small">
              <s-text color="subdued" type="small">{o.valueProposition}</s-text>
            </s-box>
          )}

          {/* ── Delivery bar (only PHYSICAL_PRODUCT) ── */}
          {cfg.showDelivery && (
            <s-box background="subdued" borderRadius="base" padding="small">
              <s-stack direction="inline" gap="small" alignItems="center">
                <s-icon type="delivery" size="small" tone="success" />
                <s-text emphasis="bold" type="small">
                  {o.deliveryNote || 'Next-day delivery — shipped separately, free'}
                </s-text>
              </s-stack>
            </s-box>
          )}

          {/* ── Social proof (shown when available, all templates) ── */}
          {o.socialProof && (
            <s-box background="subdued" borderRadius="base" padding="small">
              <s-stack direction="inline" gap="small" alignItems="center">
                <s-icon type="star" size="small" tone="warning" />
                <s-text color="subdued" type="small">{o.socialProof}</s-text>
              </s-stack>
            </s-box>
          )}

          {/* ── Pills ── */}
          <s-stack direction="inline" gap="small">
            {pills.map((pill: string, i: number) => (
              <s-badge key={i} tone="neutral">{pill}</s-badge>
            ))}
          </s-stack>

          <s-divider />

          {/* ── CTAs (same structure, label changes per template) ── */}
          <s-stack direction="block" gap="small">
            <s-button
              variant="primary"
              inlineSize="fill"
              loading={loading}
              onClick={() => respond('ACCEPTED')}
            >
              {ctaLabel}
            </s-button>
            <s-button variant="secondary" inlineSize="fill" onClick={() => respond('DECLINED')}>
              {tmpl === 'INSURANCE' ? 'No thanks' : tmpl === 'FINANCIAL' ? 'Maybe later' : 'Skip'}
            </s-button>
          </s-stack>

          {/* ── Error ── */}
          {error && (
            <s-banner tone="critical">
              <s-text type="small">Couldn't process your request. Please try again.</s-text>
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
