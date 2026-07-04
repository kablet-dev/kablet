import {
  reactExtension,
  Text,
  BlockStack,
  InlineLayout,
  Button,
  Image,
  Heading,
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
  const countdown = useCountdown(600) // 10 minutes

  // Subscribe to orderConfirmation signal
  useEffect(() => {
    const orderConfirmation = (api as any)?.orderConfirmation
    if (!orderConfirmation) return

    const current = orderConfirmation.current
    if (current?.order?.id) {
      const id = current.order.id.toString().split('/').pop()
      setOrderId(id ?? null)
      return
    }

    const unsubscribe = orderConfirmation.subscribe((value: any) => {
      if (value?.order?.id) {
        const id = value.order.id.toString().split('/').pop()
        setOrderId(id ?? null)
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

  // Hide if timer runs out
  if (countdown === '0:00') return null
  if (checked) return null
  if (!opportunity) return null

  // Success state
  if (accepted) {
    return (
      <BlockStack spacing="tight">
        <Divider />
        <View padding="base">
          <BlockStack spacing="tight">
            <Heading level={3}>✓ Added to your order!</Heading>
            <Text size="small" appearance="subdued">
              Your item will be shipped separately to your address.
            </Text>
          </BlockStack>
        </View>
      </BlockStack>
    )
  }

  if (responded) return null

  return (
    <BlockStack spacing="none">
      <Divider />
      <View
        padding="base"
        border="base"
        borderRadius="base"
        background="secondary"
      >
        <BlockStack spacing="base">

          {/* Header with urgency */}
          <InlineLayout
            columns={['fill', 'auto']}
            spacing="base"
          >
            <Heading level={3}>{opportunity.headline}</Heading>
            <Text size="small" appearance="critical" emphasis="bold">
              ⏱ {countdown}
            </Text>
          </InlineLayout>

          {/* Image + details */}
<InlineLayout columns={[120, 'fill']} spacing="base">
  <Image
    source={opportunity.visualAssetUrl}
    accessibilityDescription="Product image"
  />
  <BlockStack spacing="tight">
    <Text size="large" emphasis="bold">
      {opportunity.valueProposition}
    </Text>
    <Text size="small">{opportunity.description}</Text>
    <Text size="extraSmall" appearance="subdued">
      🚚 Ships separately to your address
    </Text>
  </BlockStack>
</InlineLayout>

          {/* CTA buttons */}
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

          {/* Footer */}
          <Text size="extraSmall" appearance="subdued">
            Powered by Kablet
          </Text>

        </BlockStack>
      </View>
    </BlockStack>
  )
}