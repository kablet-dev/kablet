import {
  extend,
  render,
  useExtensionInput,
  BlockStack,
  Button,
  CalloutBanner,
  Heading,
  Image,
  Text,
  TextContainer,
  Layout,
  View,
} from '@shopify/post-purchase-ui-extensions-react'
import { useState, useEffect } from 'react'

const API_BASE = 'https://ramble-unblock-occupy.ngrok-free.dev'

interface Opportunity {
  instanceId: string
  headline: string
  description: string
  valueProposition: string
  visualAssetUrl: string
  ctaLabel: string
}

extend('Checkout::PostPurchase::Render', render(() => <App />))

function App() {
  const { initialPurchase } = useExtensionInput()
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null)
  const [loading, setLoading] = useState(true)
  const [responded, setResponded] = useState(false)
  const [accepting, setAccepting] = useState(false)

  const orderId = initialPurchase?.referenceId
  const shopDomain = window.location.hostname.replace('checkout.', '')

  useEffect(() => {
    if (!orderId) {
      setLoading(false)
      return
    }

    fetch(
      `${API_BASE}/opportunity/decision?shopifyOrderId=${orderId}&shopDomain=${shopDomain}`,
      { headers: { 'ngrok-skip-browser-warning': 'true' } }
    )
      .then(r => r.json())
      .then(data => {
        setOpportunity(data.opportunity)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [orderId])

  async function handleAccept() {
    if (!opportunity) return
    setAccepting(true)

    await fetch(`${API_BASE}/opportunity/response`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({
        instanceId: opportunity.instanceId,
        response: 'ACCEPTED',
        shopDomain,
      }),
    })

    setAccepting(false)
    setResponded(true)
  }

  async function handleDecline() {
    if (!opportunity) return

    await fetch(`${API_BASE}/opportunity/response`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({
        instanceId: opportunity.instanceId,
        response: 'DECLINED',
        shopDomain,
      }),
    })

    setResponded(true)
  }

  if (loading || !opportunity || responded) return null

  return (
    <BlockStack spacing="loose">
      <CalloutBanner title="Special offer for you">
        <Text>This offer is only available right now.</Text>
      </CalloutBanner>

      <Layout
        media={[
          { viewportSize: 'small', sizes: [1] },
          { viewportSize: 'medium', sizes: [0.4, 0.6] },
        ]}
      >
        <View>
          <Image source={opportunity.visualAssetUrl} />
        </View>
        <View>
          <BlockStack spacing="tight">
            <Heading>{opportunity.headline}</Heading>
            <TextContainer>
              <Text>{opportunity.description}</Text>
            </TextContainer>
            <Text size="medium" emphasized>
              {opportunity.valueProposition}
            </Text>
            <BlockStack spacing="tight">
              <Button
                onPress={handleAccept}
                loading={accepting}
              >
                {opportunity.ctaLabel}
              </Button>
              <Button
                onPress={handleDecline}
                plain
              >
                No thanks
              </Button>
            </BlockStack>
          </BlockStack>
        </View>
      </Layout>
    </BlockStack>
  )
}