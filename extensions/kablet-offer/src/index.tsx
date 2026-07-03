import {
  extend,
  render,
  useExtensionInput,
  BlockStack,
  Button,
  CalloutBanner,
  Text,
} from '@shopify/post-purchase-ui-extensions-react'
import { useState, useEffect } from 'react'

const API_BASE = 'https://kablet-backend.onrender.com'

// Phase 1: Tell Shopify to always show the post-purchase page
extend('Checkout::PostPurchase::ShouldRender', async ({ storage }) => {
  await storage.update({ show: true })
  return { render: true }
})

// Phase 2: Render the actual UI
extend('Checkout::PostPurchase::Render', render(() => <App />))

function App() {
  const input = useExtensionInput()
  const [status, setStatus] = useState('loading...')
  const [opportunity, setOpportunity] = useState<any>(null)
  const [responded, setResponded] = useState(false)

  const orderId = (input as any)?.initialPurchase?.referenceId
  const shopDomain = 'kablet-dev.myshopify.com'

  useEffect(() => {
    setStatus(`orderId: ${orderId ?? 'undefined'}, input keys: ${Object.keys(input).join(', ')}`)

    if (!orderId) return

    let attempts = 0
    function tryFetch() {
      attempts++
      fetch(
        `${API_BASE}/opportunity/decision?shopifyOrderId=${orderId}&shopDomain=${shopDomain}`,
        {}
      )
        .then(r => r.json())
        .then(data => {
          if (data.opportunity) {
            setOpportunity(data.opportunity)
            setStatus('opportunity found!')
          } else if (attempts < 5) {
            setStatus(`attempt ${attempts}: no opportunity yet, retrying...`)
            setTimeout(tryFetch, 2000)
          } else {
            setStatus('no opportunity after 5 attempts')
          }
        })
        .catch(err => {
          setStatus(`fetch error: ${err.message}`)
          if (attempts < 5) setTimeout(tryFetch, 2000)
        })
    }

    tryFetch()
  }, [orderId])

  if (responded) return null

  if (opportunity) {
    return (
      <BlockStack spacing="loose">
        <CalloutBanner title={opportunity.headline}>
          <Text>{opportunity.description}</Text>
        </CalloutBanner>
        <Text emphasized>{opportunity.valueProposition}</Text>
        <Button onPress={async () => {
          await fetch(`${API_BASE}/opportunity/response`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ instanceId: opportunity.instanceId, response: 'ACCEPTED', shopDomain }),
          })
          setResponded(true)
        }}>
          {opportunity.ctaLabel}
        </Button>
        <Button plain onPress={async () => {
          await fetch(`${API_BASE}/opportunity/response`, {
            method: 'POST',
       headers: { 'Content-Type': 'application/json' },    
            body: JSON.stringify({ instanceId: opportunity.instanceId, response: 'DECLINED', shopDomain }),
          })
          setResponded(true)
        }}>
          No thanks
        </Button>
      </BlockStack>
    )
  }

  return (
    <BlockStack>
      <Text>Debug: {status}</Text>
    </BlockStack>
  )
}