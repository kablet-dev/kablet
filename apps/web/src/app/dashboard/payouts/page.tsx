export default function Page() {
  return (
    <div style={{ padding: '32px 36px', maxWidth: '900px' }}>
      <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#0a0a0f', margin: 0, letterSpacing: '-0.5px' }}>
        Payouts
      </h1>
      <p style={{ fontSize: '13.5px', color: '#9898aa', marginTop: '4px', marginBottom: '32px' }}>
        Your earnings, payout history, and bank account settings.
      </p>
      <div style={{
        background: '#ffffff', border: '1px solid #eeeef2', borderRadius: '14px',
        padding: '48px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}>
        <div style={{
          width: '48px', height: '48px', borderRadius: '12px',
          background: '#f5f3fe', display: 'flex', alignItems: 'center',
          justifyContent: 'center', margin: '0 auto 16px',
        }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <rect x="3" y="3" width="6" height="6" rx="1.5" fill="#6f57e8" opacity=".5"/>
            <rect x="11" y="3" width="6" height="6" rx="1.5" fill="#6f57e8"/>
            <rect x="3" y="11" width="6" height="6" rx="1.5" fill="#6f57e8"/>
            <rect x="11" y="11" width="6" height="6" rx="1.5" fill="#6f57e8" opacity=".5"/>
          </svg>
        </div>
        <p style={{ fontSize: '15px', fontWeight: '600', color: '#0a0a0f', margin: '0 0 6px' }}>
          Coming soon
        </p>
        <p style={{ fontSize: '13px', color: '#9898aa', margin: '0 auto', maxWidth: '360px' }}>
          This section is being built. Check back shortly or return to the Dashboard.
        </p>
      </div>
    </div>
  )
}
