import { 
  reactExtension, 
  Text, 
  BlockStack,
  Button,
  Heading,
  Divider,
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

function App() {
  const api = useApi()
  const shop = useShop()
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null)
  const [responded, setResponded] = useState(false)
  const [accepting, setAccepting] = useState(false)
  const [checked, setChecked] = useState(false)
  const [orderId, setOrderId] = useState<string | null>(null)

  const shopDomain = shop?.myshopifyDomain

  // Subscribe to orderConfirmation signal
  useEffect(() => {
    const orderConfirmation = (api as any)?.orderConfirmation
    if (!orderConfirmation) return

    // Read current value
    const current = orderConfirmation.current
    if (current?.order?.id) {
      const id = current.order.id.toString().split('/').pop()
      setOrderId(id ?? null)
      return
    }

    // Subscribe to future updates
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
    return  // Stop retrying
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

  if (responded || checked) return null
  if (!opportunity) return null

  return (
    <BlockStack spacing="loose">
      <Divider />
      <Heading level={2}>{opportunity.headline}</Heading>
      <Text size="large" emphasis="bold">{opportunity.valueProposition}</Text>
      <Text>{opportunity.description}</Text>
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
          setResponded(true)
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
  )
}