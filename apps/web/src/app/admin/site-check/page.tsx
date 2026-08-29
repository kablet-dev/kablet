'use client'

import { FormEvent, useState } from 'react'
import { adminApi } from '@/lib/admin-api'

type SiteCheckResult = {
  url: string
  reachable: boolean
  statusCode: number
  https: boolean
  forms: number
  platforms: string[]
  formTypes: string[]
  ajaxDetected: boolean
  fitResult: string
  recommendation: string
}

export default function SiteCheckPage() {
  const [url, setUrl] = useState('')
  const [result, setResult] = useState<SiteCheckResult | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')
    setResult(null)

    try {
      const response = await adminApi.siteCheck(url)
      setResult(response)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Site check failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Site Checker</h1>
        <p className="mt-2 text-gray-400">
          Check a website before pitching it to confirm likely widget compatibility.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-3">
        <input
          type="url"
          required
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://example.com"
          className="flex-1 rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-white outline-none focus:border-violet-500"
        />

        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-violet-600 px-5 py-3 font-medium text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Checking...' : 'Check site'}
        </button>
      </form>

      {error && (
        <div className="mt-6 rounded-lg border border-red-800 bg-red-950/40 p-4 text-red-300">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-8 rounded-xl border border-gray-800 bg-gray-900 p-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Result</h2>

            <span
              className={`rounded-full px-3 py-1 text-sm font-bold ${
                result.fitResult === 'GOOD FIT'
                  ? 'bg-green-900/50 text-green-300'
                  : result.fitResult === 'NOT READY'
                    ? 'bg-red-900/50 text-red-300'
                    : 'bg-yellow-900/50 text-yellow-300'
              }`}
            >
              {result.fitResult}
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="text-sm text-gray-500">Website</div>
              <div className="mt-1 break-all text-white">{result.url}</div>
            </div>

            <div>
              <div className="text-sm text-gray-500">HTTPS</div>
              <div className="mt-1 text-white">
                {result.https ? 'Yes' : 'No'}
              </div>
            </div>

            <div>
              <div className="text-sm text-gray-500">Forms detected</div>
              <div className="mt-1 text-white">{result.forms}</div>
            </div>

            <div>
              <div className="text-sm text-gray-500">AJAX indicators</div>
              <div className="mt-1 text-white">
                {result.ajaxDetected ? 'Detected' : 'Not detected'}
              </div>
            </div>

            <div>
              <div className="text-sm text-gray-500">Platform</div>
              <div className="mt-1 text-white">
                {result.platforms.length
                  ? result.platforms.join(', ')
                  : 'Not detected'}
              </div>
            </div>

            <div>
              <div className="text-sm text-gray-500">Form type</div>
              <div className="mt-1 text-white">
                {result.formTypes.length
                  ? result.formTypes.join(', ')
                  : 'Not detected'}
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-lg bg-gray-950 p-4">
            <div className="text-sm text-gray-500">Recommendation</div>
            <div className="mt-1 text-white">{result.recommendation}</div>
          </div>
        </div>
      )}
    </div>
  )
}