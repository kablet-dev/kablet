import { render } from 'preact'
import { LocationProvider, ErrorBoundary, Router, Route } from 'preact-iso'
import { useEffect, useState } from 'preact/hooks'
import DashboardPage from './pages/DashboardPage.jsx'
import PayoutsPage from './pages/PayoutsPage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'

export default async () => {
  render(<App />, document.body)
}

function App() {
  const [token, setToken] = useState(null)
  const [tokenError, setTokenError] = useState(false)

  // Obtain Shopify session token once on mount — auto-auth, no login screen
  useEffect(() => {
    ;(async () => {
      try {
        const t = await shopify.idToken()
        setToken(t)
      } catch (err) {
        console.error('Failed to get Shopify session token', err)
        setTokenError(true)
      }
    })()
  }, [])

  if (tokenError) {
    return (
      <s-page heading="Kablet">
        <s-section>
          <s-banner tone="critical">
            <s-paragraph>Failed to authenticate with Shopify. Please reload the page.</s-paragraph>
          </s-banner>
        </s-section>
      </s-page>
    )
  }

  if (!token) {
    return (
      <s-page heading="Kablet">
        <s-section>
          <s-stack direction="inline" gap="base" alignItems="center">
            <s-spinner />
            <s-text>Loading your dashboard…</s-text>
          </s-stack>
        </s-section>
      </s-page>
    )
  }

  return (
    <LocationProvider>
      <s-app-nav>
        <s-link href="/payouts">Payouts</s-link>
        <s-link href="/settings">Settings</s-link>
      </s-app-nav>
      <ErrorBoundary>
        <Router>
          <Route path="/" component={() => <DashboardPage token={token} />} />
          <Route path="/payouts" component={() => <PayoutsPage token={token} />} />
          <Route path="/settings" component={() => <SettingsPage token={token} />} />
        </Router>
      </ErrorBoundary>
    </LocationProvider>
  )
}
