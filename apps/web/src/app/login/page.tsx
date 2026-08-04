'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message || 'Invalid credentials. Please try again.')
      setLoading(false)
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#f5f5f8',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px', justifyContent: 'center' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '9px',
            background: 'linear-gradient(135deg, #6f57e8 0%, #8a76ef 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(111,87,232,0.3)',
          }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 1.5L11.5 7H17L12.5 10.5L14 16L9 12.5L4 16L5.5 10.5L1 7H6.5L9 1.5Z" fill="white"/>
            </svg>
          </div>
          <span style={{ fontSize: '18px', fontWeight: '800', color: '#0a0a0f', letterSpacing: '-0.5px' }}>
            Kablet
          </span>
        </div>

        {/* Card */}
        <div style={{
          background: '#ffffff', border: '1px solid #eeeef2',
          borderRadius: '16px', padding: '36px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
        }}>
          <h1 style={{ fontSize: '19px', fontWeight: '700', color: '#0a0a0f', margin: '0 0 4px', letterSpacing: '-0.4px' }}>
            Sign in
          </h1>
          <p style={{ fontSize: '13.5px', color: '#9898aa', margin: '0 0 28px' }}>
            Access your merchant dashboard
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: '#4a4a5a', marginBottom: '6px' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="you@company.com"
                style={{
                  width: '100%', border: '1px solid #e0e0e8', borderRadius: '9px',
                  padding: '10px 13px', fontSize: '14px', color: '#0a0a0f',
                  outline: 'none', background: '#fafafa', boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: '#4a4a5a', marginBottom: '6px' }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{
                  width: '100%', border: '1px solid #e0e0e8', borderRadius: '9px',
                  padding: '10px 13px', fontSize: '14px', color: '#0a0a0f',
                  outline: 'none', background: '#fafafa', boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            {error && (
              <div style={{
                background: '#fee2e2', border: '1px solid #fecaca',
                borderRadius: '8px', padding: '10px 13px',
                fontSize: '13px', color: '#dc2626',
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                background: loading ? '#a897f4' : 'linear-gradient(135deg, #6f57e8, #8a76ef)',
                color: '#ffffff', border: 'none', borderRadius: '9px',
                padding: '11px', fontSize: '14px', fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                marginTop: '4px', transition: 'opacity 0.12s',
                fontFamily: 'inherit',
                boxShadow: '0 2px 8px rgba(111,87,232,0.3)',
              }}
            >
              {loading ? 'Signing in…' : 'Sign in →'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: '12px', color: '#c4c4cf', marginTop: '24px' }}>
          Kablet Merchant Dashboard · Powered by the Decision Engine
        </p>
      </div>
    </div>
  )
}
