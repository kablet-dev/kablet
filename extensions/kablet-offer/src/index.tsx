import {
  reactExtension,
  BlockStack,
  InlineLayout,
  Button,
  Image,
  Text,
  Divider,
  View,
  useApi,
  useShop,
} from '@shopify/ui-extensions-react/checkout'
import { useState, useEffect } from 'react'

const API_BASE = 'https://kablet-backend.onrender.com'

export default reactExtension('purchase.thank-you.block.render', () => <App />)

interface Opportunity {
  instanceId: string
  headline: string
  description: string
  valueProposition: string
  visualAssetUrl: string
  ctaLabel: string
  valueBullets: string[]
  socialProof: string | null
  trustRating: number | null
}

function useCountdown(seconds: number) {
  const [timeLeft, setTimeLeft] = useState(seconds)

  useEffect(() => {
    if (timeLeft <= 0) return
    const timer = setInterval(() => {
      setTimeLeft(t => t - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [timeLeft])

  const minutes = Math.floor(timeLeft / 60)
  const secs = timeLeft % 60
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

function getDeliveryDate(): string {
  const date = new Date()
  let daysAdded = 0
  while (daysAdded < 2) {
    date.setDate(date.getDate() + 1)
    const day = date.getDay()
    if (day !== 0 && day !== 6) daysAdded++
  }
  return date.toLocaleDateString('en-AE', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

function App() {
  const api = useApi()
  const shop = useShop()
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null)
  const [responded, setResponded] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [accepting, setAccepting] = useState(false)
  const [checked, setChecked] = useState(false)
  const [orderId, setOrderId] = useState<string | null>(null)

  const shopDomain = shop?.myshopifyDomain
  const countdown = useCountdown(600)
  const deliveryDate = getDeliveryDate()

  useEffect(() => {
    const orderConfirmation = (api as any)?.orderConfirmation
    if (!orderConfirmation) return

    const current = orderConfirmation.current
    if (current?.order?.id) {
      setOrderId(current.order.id.toString().split('/').pop() ?? null)
      return
    }

    const unsubscribe = orderConfirmation.subscribe((value: any) => {
      if (value?.order?.id) {
        setOrderId(value.order.id.toString().split('/').pop() ?? null)
      }
    })

    return unsubscribe
  }, [api])

  useEffect(() => {
    if (!orderId || !shopDomain) return

    let attempts = 0

    function tryFetch() {
      attempts++
      fetch(`${API_BASE}/opportunity/decision?shopifyOrderId=${orderId}&shopDomain=${shopDomain}`)
        .then(r => r.json())
        .then(data => {
          if (data.opportunity) {
            setOpportunity(data.opportunity)
            return
          } else if (attempts < 6) {
            setTimeout(tryFetch, 2000)
          } else {
            setChecked(true)
          }
        })
        .catch(() => {
          if (attempts < 6) setTimeout(tryFetch, 2000)
          else setChecked(true)
        })
    }

    tryFetch()
  }, [orderId, shopDomain])

  if (countdown === '0:00') return null
  if (checked) return null
  if (!opportunity) return null

  // Success state
  if (accepted) {
    return (
      <BlockStack spacing="none">
        <Divider />
        <View padding="base">
          <BlockStack spacing="base">
            <InlineLayout columns={['auto', 'fill']} spacing="base">
              <View>
                <Text size="large" emphasis="bold">✓</Text>
              </View>
              <BlockStack spacing="extraTight">
                <Text size="medium" emphasis="bold">Added to your order!</Text>
                <Text size="small" appearance="subdued">
                  Your item is confirmed and will be delivered separately.
                </Text>
              </BlockStack>
            </InlineLayout>
            <View
              padding="base"
              border="base"
              borderRadius="base"
              background="secondary"
            >
              <BlockStack spacing="extraTight">
                <Text size="small" appearance="subdued">Estimated delivery</Text>
                <Text size="medium" emphasis="bold">{deliveryDate}</Text>
                <Text size="extraSmall" appearance="subdued">
                  Cash on Delivery · Shipped separately
                </Text>
              </BlockStack>
            </View>
            <Text size="extraSmall" appearance="subdued">Powered by Kablet</Text>
          </BlockStack>
        </View>
      </BlockStack>
    )
  }

  if (responded) return null

  return (
    <BlockStack spacing="none">
      <Divider />
      <View padding="base">
        <BlockStack spacing="base">

          {/* Header: label + countdown */}
          <InlineLayout columns={['fill', 'auto']} spacing="base">
            <Text size="small" appearance="subdued" emphasis="bold">
              Recommended for you
            </Text>
            <Text size="extraSmall" appearance="subdued">
              Offer expires in {countdown}
            </Text>
          </InlineLayout>

          {/* Image + content */}
          <InlineLayout columns={[120, 'fill']} spacing="base">
            <Image
              source={opportunity.visualAssetUrl}
              accessibilityDescription="Product image"
            />
            <BlockStack spacing="tight">
              <Text size="medium" emphasis="bold">
                {opportunity.headline}
              </Text>
              <Text size="small" appearance="subdued">
                {opportunity.description}
              </Text>
              <Text size="large" emphasis="bold">
                {opportunity.valueProposition}
              </Text>
            </BlockStack>
          </InlineLayout>

          {/* Value bullets */}
          {opportunity.valueBullets && opportunity.valueBullets.length > 0 && (
            <BlockStack spacing="extraTight">
              {opportunity.valueBullets.map((bullet, i) => (
                <Text key={i} size="small" appearance="subdued">
                  ✓ {bullet}
                </Text>
              ))}
            </BlockStack>
          )}

          {/* Social proof */}
          {(opportunity.trustRating || opportunity.socialProof) && (
            <InlineLayout columns={['auto', 'fill']} spacing="tight">
              {opportunity.trustRating && (
                <Text size="small" emphasis="bold">
                  {'★'.repeat(Math.floor(opportunity.trustRating))} {opportunity.trustRating}
                </Text>
              )}
              {opportunity.socialProof && (
                <Text size="small" appearance="subdued">
                  {opportunity.socialProof}
                </Text>
              )}
            </InlineLayout>
          )}

          {/* CTAs */}
          <BlockStack spacing="tight">
            <Button
              loading={accepting}
              onPress={async () => {
                setAccepting(true)
                await fetch(`${API_BASE}/opportunity/response`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    instanceId: opportunity.instanceId,
                    response: 'ACCEPTED',
                    shopDomain,
                  }),
                })
                setAccepting(false)
                setAccepted(true)
              }}
            >
              {opportunity.ctaLabel}
            </Button>
            <Button
              kind="secondary"
              onPress={async () => {
                await fetch(`${API_BASE}/opportunity/response`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    instanceId: opportunity.instanceId,
                    response: 'DECLINED',
                    shopDomain,
                  }),
                })
                setResponded(true)
              }}
            >
              No thanks
            </Button>
          </BlockStack>

          {/* Powered by Kablet */}
          <Text size="extraSmall" appearance="subdued">
            Powered by Kablet
          </Text>

        </BlockStack>
      </View>
    </BlockStack>
  )
}