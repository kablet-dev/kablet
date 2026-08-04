import { useState, useEffect } from 'preact/hooks'
import { dashboardApi } from '../../../../../shared/models/dashboard.ts'

/** @param {{ token: string }} props */
export default function SettingsPage({ token }) {
  const [config, setConfig] = useState(null)
  const [bankForm, setBankForm] = useState({
    full_name: '',
    account_holder_name: '',
    bank_name: '',
    iban: '',
  })
  const [loadingConfig, setLoadingConfig] = useState(true)
  const [loadingBank, setLoadingBank] = useState(true)
  const [savingConfig, setSavingConfig] = useState(false)
  const [savingBank, setSavingBank] = useState(false)
  const [bankSaved, setBankSaved] = useState(false)
  const [configSaved, setConfigSaved] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    ;(async () => {
      try {
        const [c, b] = await Promise.all([
          dashboardApi.getConfig(token),
          dashboardApi.getPayoutSettings(token),
        ])
        setConfig(c)
        if (b.settings) {
          setBankForm({
            full_name: b.settings.full_name ?? '',
            account_holder_name: b.settings.account_holder_name ?? '',
            bank_name: b.settings.bank_name ?? '',
            iban: b.settings.iban ?? '',
          })
        }
      } catch {
        setError('Failed to load settings.')
      }
      setLoadingConfig(false)
      setLoadingBank(false)
    })()
  }, [])

  const toggleEngine = async () => {
    if (!config) return
    setSavingConfig(true)
    try {
      const updated = await dashboardApi.updateConfig(token, {
        engine_enabled: !config.engine_enabled,
      })
      setConfig(updated)
      setConfigSaved(true)
      setTimeout(() => setConfigSaved(false), 2500)
    } catch {
      setError('Failed to update engine status.')
    }
    setSavingConfig(false)
  }

  const saveBank = async () => {
    setSavingBank(true)
    setError(null)
    try {
      await dashboardApi.savePayoutSettings(token, bankForm)
      setBankSaved(true)
      setTimeout(() => setBankSaved(false), 2500)
    } catch {
      setError('Failed to save bank details. Please check your details and try again.')
    }
    setSavingBank(false)
  }

  return (
    <s-page heading="Settings">

      {error && (
        <s-section>
          <s-banner tone="critical" onDismiss={() => setError(null)}>
            <s-paragraph>{error}</s-paragraph>
          </s-banner>
        </s-section>
      )}

      {/* Engine toggle */}
      <s-section heading="Kablet Status">
        {loadingConfig ? (
          <s-stack direction="inline" gap="base" alignItems="center">
            <s-spinner />
            <s-text>Loading…</s-text>
          </s-stack>
        ) : config ? (
          <s-stack gap="base">
            <s-stack direction="inline" gap="base" alignItems="center">
              <s-badge tone={config.engine_enabled ? 'success' : 'critical'}>
                {config.engine_enabled ? 'Engine Active' : 'Engine Paused'}
              </s-badge>
              {configSaved && <s-badge tone="success">Saved</s-badge>}
            </s-stack>
            <s-paragraph tone="subdued">
              {config.engine_enabled
                ? 'Kablet is actively analyzing transactions and presenting opportunities to your customers.'
                : 'Kablet is paused. No opportunities will be shown to customers.'}
            </s-paragraph>
            <s-button-group>
              <s-button
                variant={config.engine_enabled ? 'plain' : 'primary'}
                tone={config.engine_enabled ? 'critical' : undefined}
                loading={savingConfig}
                onClick={toggleEngine}
              >
                {config.engine_enabled ? 'Pause Kablet' : 'Activate Kablet'}
              </s-button>
            </s-button-group>
          </s-stack>
        ) : null}
      </s-section>

      {/* Bank details */}
      <s-section heading="Payout Bank Details">
        <s-paragraph tone="subdued">
          Required to receive your weekly AED payouts. All fields must match your bank records.
        </s-paragraph>

        {loadingBank ? (
          <s-stack direction="inline" gap="base" alignItems="center">
            <s-spinner />
            <s-text>Loading bank details…</s-text>
          </s-stack>
        ) : (
          <s-stack gap="base">
            {bankSaved && (
              <s-banner tone="success">
                <s-paragraph>Bank details saved successfully.</s-paragraph>
              </s-banner>
            )}

            <s-form-layout>
              <s-text-field
                label="Full Name"
                value={bankForm.full_name}
                placeholder="Your full legal name"
                onChange={e => setBankForm(f => ({ ...f, full_name: e.target.value }))}
              />
              <s-text-field
                label="Account Holder Name"
                value={bankForm.account_holder_name}
                placeholder="Name as it appears on the bank account"
                onChange={e => setBankForm(f => ({ ...f, account_holder_name: e.target.value }))}
              />
              <s-text-field
                label="Bank Name"
                value={bankForm.bank_name}
                placeholder="e.g. Emirates NBD"
                onChange={e => setBankForm(f => ({ ...f, bank_name: e.target.value }))}
              />
              <s-text-field
                label="IBAN (UAE)"
                value={bankForm.iban}
                placeholder="AE000000000000000000000"
                onChange={e => setBankForm(f => ({ ...f, iban: e.target.value }))}
              />
            </s-form-layout>

            <s-button-group>
              <s-button
                variant="primary"
                loading={savingBank}
                onClick={saveBank}
              >
                Save Bank Details
              </s-button>
            </s-button-group>
          </s-stack>
        )}
      </s-section>

      {/* Support */}
      <s-section heading="Support">
        <s-paragraph tone="subdued">
          Need help? Our team is available via email and WhatsApp.
        </s-paragraph>
        <s-stack gap="tight">
          <s-link href="mailto:support@kablet.com">support@kablet.com</s-link>
          <s-link href="https://wa.me/971561551029" target="_blank">
            WhatsApp · +971 56 155 1029
          </s-link>
        </s-stack>
      </s-section>

    </s-page>
  )
}
