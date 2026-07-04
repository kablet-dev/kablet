import type { FastifyInstance } from 'fastify'
import { db } from '../db.js'

export async function onboardingRoutes(fastify: FastifyInstance) {
  
  // App home — shown after merchant installs
  fastify.get('/', async (request, reply) => {
    const { shop } = request.query as { shop?: string }

    // Check if this merchant has completed setup
    let isConnected = false
    let merchantName = ''

    if (shop) {
      const { data: merchant } = await db
        .from('merchants')
        .select('name')
        .eq('shopify_shop_domain', shop)
        .single()

      isConnected = !!merchant
      merchantName = merchant?.name ?? ''
    }

    const checkoutEditorUrl = shop
      ? `https://${shop}/admin/themes/current/editor?context=checkout&template=thank-you`
      : '#'

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
    .logo span {
      color: #6d28d9;
    }
    h1 {
      font-size: 22px;
      font-weight: 600;
      color: #111;
      margin-bottom: 8px;
    }
    .subtitle {
      color: #666;
      font-size: 15px;
      margin-bottom: 32px;
      line-height: 1.5;
    }
    .steps {
      margin-bottom: 32px;
    }
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
    .step-number.done {
      background: #059669;
    }
    .step-content h3 {
      font-size: 15px;
      font-weight: 600;
      color: #111;
      margin-bottom: 4px;
    }
    .step-content p {
      font-size: 14px;
      color: #666;
      line-height: 1.5;
    }
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
    .btn.secondary {
      background: white;
      color: #6d28d9;
      border: 2px solid #6d28d9;
      margin-top: 12px;
    }
    .status {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 24px;
      font-size: 14px;
      font-weight: 500;
    }
    .status.connected {
      background: #d1fae5;
      color: #065f46;
    }
    .status.pending {
      background: #fef3c7;
      color: #92400e;
    }
    .divider {
      border: none;
      border-top: 1px solid #e5e7eb;
      margin: 24px 0;
    }
    .note {
      font-size: 13px;
      color: #9ca3af;
      text-align: center;
      margin-top: 16px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">Kablet<span>.</span></div>

    <h1>Welcome to Kablet</h1>
    <p class="subtitle">
      Kablet shows your customers a special offer immediately after they complete a purchase — 
      increasing your revenue with zero extra effort.
    </p>

    <hr class="divider">

    <div class="steps">
      <div class="step">
        <div class="step-number done">✓</div>
        <div class="step-content">
          <h3>Step 1 — Install Kablet</h3>
          <p>Kablet is installed and connected to your store${merchantName ? ` (${merchantName})` : ''}.</p>
        </div>
      </div>

      <div class="step">
        <div class="step-number ${isConnected ? 'done' : ''}">2</div>
        <div class="step-content">
          <h3>Step 2 — Add Kablet to your Thank You page</h3>
          <p>
            Open your checkout editor, navigate to the <strong>Thank you</strong> page, 
            and add the <strong>Kablet Offer</strong> block. This takes about 30 seconds.
          </p>
        </div>
      </div>
    </div>

    <a href="${checkoutEditorUrl}" class="btn" target="_blank">
      Open Checkout Editor →
    </a>
    <p class="note">
      In the editor: select Thank you page → click Add block → choose Kablet Offer → Save
    </p>
  </div>
</body>
</html>
    `

    return reply.type('text/html').send(html)
  })
}