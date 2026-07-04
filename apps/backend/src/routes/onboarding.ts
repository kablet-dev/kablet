import type { FastifyInstance } from 'fastify'
import { db } from '../db.js'

export async function onboardingRoutes(fastify: FastifyInstance) {

  fastify.get('/', async (request, reply) => {
    const { shop } = request.query as { shop?: string }

    let isConnected = false
    let merchantName = ''
    let checkoutEditorUrl = '#'

    if (shop) {
      const { data: merchant } = await db
        .from('merchants')
        .select('name, shopify_access_token')
        .eq('shopify_shop_domain', shop)
        .single()

      isConnected = !!merchant
      merchantName = merchant?.name ?? ''

      // Get checkout profile ID for deep link
      if (merchant?.shopify_access_token) {
        try {
          const profileResponse = await fetch(
            `https://${shop}/admin/api/2026-07/graphql.json`,
            {
              method: 'POST',
              headers: {
                'X-Shopify-Access-Token': merchant.shopify_access_token,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                query: `{ checkoutProfiles(first: 1) { edges { node { id } } } }`
              })
            }
          )
          const profileData = await profileResponse.json() as any
          const profileGid = profileData?.data?.checkoutProfiles?.edges?.[0]?.node?.id
          const profileId = profileGid?.split('/').pop() ?? ''

          if (profileId) {
            checkoutEditorUrl = `https://${shop}/admin/settings/checkout/editor/profiles/${profileId}?page=thank-you`
          } else {
            checkoutEditorUrl = `https://${shop}/admin/settings/checkout`
          }
        } catch {
          checkoutEditorUrl = `https://${shop}/admin/settings/checkout`
        }
      }
    }

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kablet — Setup</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #f6f6f7;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      background: white;
      border-radius: 12px;
      padding: 48px;
      max-width: 560px;
      width: 100%;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .logo {
      font-size: 24px;
      font-weight: 700;
      color: #111;
      margin-bottom: 32px;
    }
    .logo span { color: #6d28d9; }
    h1 { font-size: 22px; font-weight: 600; color: #111; margin-bottom: 8px; }
    .subtitle {
      color: #666;
      font-size: 15px;
      margin-bottom: 32px;
      line-height: 1.5;
    }
    .steps { margin-bottom: 32px; }
    .step {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 20px;
    }
    .step-number {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #6d28d9;
      color: white;
      font-size: 14px;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .step-number.done { background: #059669; }
    .step-content h3 { font-size: 15px; font-weight: 600; color: #111; margin-bottom: 4px; }
    .step-content p { font-size: 14px; color: #666; line-height: 1.5; }
    .instructions {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 16px;
      margin-top: 12px;
    }
    .instructions ol {
      padding-left: 20px;
      font-size: 13px;
      color: #374151;
      line-height: 2;
    }
    .instructions li strong { color: #111; }
    .btn {
      display: inline-block;
      background: #6d28d9;
      color: white;
      padding: 14px 24px;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 600;
      text-decoration: none;
      width: 100%;
      text-align: center;
      cursor: pointer;
      border: none;
      transition: background 0.2s;
    }
    .btn:hover { background: #5b21b6; }
    .divider { border: none; border-top: 1px solid #e5e7eb; margin: 24px 0; }
    .note { font-size: 13px; color: #9ca3af; text-align: center; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">Kablet<span>.</span></div>

    <h1>Welcome to Kablet</h1>
    <p class="subtitle">
      Kablet shows your customers a special offer immediately after checkout —
      increasing your revenue with zero extra effort.
    </p>

    <hr class="divider">

    <div class="steps">
      <div class="step">
        <div class="step-number done">✓</div>
        <div class="step-content">
          <h3>Step 1 — Install Kablet</h3>
          <p>Kablet is installed and connected${merchantName ? ` to <strong>${merchantName}</strong>` : ''}.</p>
        </div>
      </div>

      <div class="step">
        <div class="step-number">2</div>
        <div class="step-content">
          <h3>Step 2 — Add Kablet to your Thank You page</h3>
          <p>Click the button below to open your checkout editor, then follow these steps:</p>
          <div class="instructions">
            <ol>
              <li>You'll land on the <strong>Thank you</strong> page in the editor</li>
              <li>Click <strong>"Add block"</strong> in the left sidebar</li>
              <li>Select <strong>"Kablet Offer"</strong> from the list</li>
              <li>Click <strong>"Save"</strong> in the top right</li>
            </ol>
          </div>
        </div>
      </div>
    </div>

    <a href="${checkoutEditorUrl}" class="btn" target="_blank">
      Open Thank You Page Editor →
    </a>
    <p class="note">Takes about 30 seconds. You only need to do this once.</p>
  </div>
</body>
</html>
    `

    return reply.type('text/html').send(html)
  })
}