import type { FastifyInstance } from 'fastify'
import { db } from '../db.js'

export async function onboardingRoutes(fastify: FastifyInstance) {

  fastify.get('/', async (request, reply) => {
    const { shop } = request.query as { shop?: string }

    let merchantName = ''
    let checkoutEditorUrl = '#'

    if (shop) {
      const { data: merchant } = await db
        .from('merchants')
        .select('name, shopify_access_token')
        .eq('shopify_shop_domain', shop)
        .single()

      merchantName = merchant?.name ?? ''

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
  <script src="https://unpkg.com/@shopify/app-bridge@3"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #f4f0fd;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .container {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0;
      max-width: 960px;
      width: 100%;
      background: white;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 24px rgba(103,61,230,0.12);
    }
    @media (max-width: 700px) {
      .container { grid-template-columns: 1fr; }
      .right-col { display: none; }
    }
    .left-col {
      padding: 48px 40px;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .right-col {
      background: linear-gradient(135deg, #673de6 0%, #101011 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px;
      position: relative;
      overflow: hidden;
    }
    .logo {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 32px;
    }
    .logo img { height: 28px; }
    .logo-text { font-size: 18px; font-weight: 700; color: #111; }
    .headline {
      font-size: 26px;
      font-weight: 700;
      color: #111;
      line-height: 1.3;
      margin-bottom: 12px;
    }
    .subheadline {
      font-size: 15px;
      color: #666;
      line-height: 1.6;
      margin-bottom: 32px;
    }
    .step-flow {
      display: flex;
      flex-direction: column;
      gap: 0;
      margin-bottom: 28px;
    }
    .step-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 10px 0;
    }
    .step-icon {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      font-weight: 600;
      flex-shrink: 0;
      margin-top: 1px;
    }
    .step-icon.done { background: #d1fae5; color: #059669; }
    .step-icon.active { background: #673de6; color: white; }
    .step-connector {
      width: 2px;
      height: 16px;
      background: #e5e7eb;
      margin-left: 13px;
    }
    .step-content h3 { font-size: 14px; font-weight: 600; color: #111; margin-bottom: 2px; }
    .step-content p { font-size: 13px; color: #888; }
    .instructions {
      background: #f9fafb;
      border-radius: 8px;
      padding: 14px 16px;
      margin-bottom: 24px;
    }
    .instructions p { font-size: 13px; color: #555; font-weight: 500; margin-bottom: 8px; }
    .instructions ul { padding-left: 16px; }
    .instructions li { font-size: 13px; color: #666; line-height: 1.8; }
    .btn-primary {
      display: block;
      width: 100%;
      background: #673de6;
      color: white;
      padding: 14px 24px;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 600;
      text-decoration: none;
      text-align: center;
      cursor: pointer;
      border: none;
      transition: background 0.2s;
      margin-bottom: 10px;
    }
    .btn-primary:hover { background: #5530c4; }
    .btn-secondary {
      display: block;
      width: 100%;
      background: transparent;
      color: #673de6;
      padding: 10px 24px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      text-align: center;
      cursor: pointer;
      border: 1px solid #e5e7eb;
      transition: all 0.2s;
    }
    .btn-secondary:hover { border-color: #673de6; background: #f4f0fd; }
    .time-note {
      font-size: 12px;
      color: #999;
      text-align: center;
      margin-top: 8px;
    }
    /* Activated state */
    .activated-state { display: none; text-align: center; padding: 16px 0; }
    .activated-icon { font-size: 48px; margin-bottom: 16px; }
    .activated-title { font-size: 22px; font-weight: 700; color: #111; margin-bottom: 8px; }
    .activated-sub { font-size: 14px; color: #666; margin-bottom: 28px; line-height: 1.6; }
    /* Right column placeholder */
    .media-placeholder {
      width: 100%;
      aspect-ratio: 9/16;
      max-height: 400px;
      background: rgba(255,255,255,0.08);
      border-radius: 12px;
      border: 2px dashed rgba(255,255,255,0.2);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: rgba(255,255,255,0.5);
      font-size: 13px;
      text-align: center;
      padding: 24px;
      gap: 8px;
    }
    .media-placeholder .icon { font-size: 32px; opacity: 0.5; }
    .right-label {
      position: absolute;
      bottom: 24px;
      left: 0;
      right: 0;
      text-align: center;
      color: rgba(255,255,255,0.4);
      font-size: 11px;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    /* Modal */
    .modal-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.5);
      z-index: 100;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .modal-overlay.open { display: flex; }
    .modal {
      background: white;
      border-radius: 12px;
      padding: 32px;
      max-width: 480px;
      width: 100%;
      position: relative;
    }
    .modal-close {
      position: absolute;
      top: 16px;
      right: 16px;
      background: none;
      border: none;
      font-size: 20px;
      cursor: pointer;
      color: #999;
      line-height: 1;
    }
    .modal h2 { font-size: 18px; font-weight: 700; margin-bottom: 8px; }
    .modal p { font-size: 14px; color: #666; margin-bottom: 16px; }
    .video-placeholder {
      background: #f4f0fd;
      border-radius: 8px;
      height: 180px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;
      color: #999;
      font-size: 13px;
      border: 2px dashed #d1d5db;
    }
    .modal-support { border-top: 1px solid #e5e7eb; padding-top: 16px; }
    .modal-support p { font-size: 13px; color: #666; margin-bottom: 12px; }
    .support-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #f3f4f6;
      font-size: 13px;
    }
    .support-row:last-child { border-bottom: none; }
    .support-row a {
      color: #673de6;
      text-decoration: none;
      font-weight: 500;
    }
    .error-msg {
      background: #fee2e2;
      border: 1px solid #fca5a5;
      color: #991b1b;
      font-size: 13px;
      padding: 10px 14px;
      border-radius: 6px;
      margin-bottom: 12px;
      display: none;
    }
  </style>
</head>
<body>

  <!-- Help Modal -->
  <div class="modal-overlay" id="help-modal">
    <div class="modal">
      <button class="modal-close" onclick="closeModal()">×</button>
      <h2>Quick Setup Guide</h2>
      <p>Watch how to activate Kablet on your Thank You page in under 60 seconds.</p>
      <div class="video-placeholder">
        <!-- Replace with actual setup GIF/video -->
        🎬 Setup video coming soon
      </div>
      <div class="modal-support">
        <p>Still need help? Our team is happy to assist.</p>
        <div class="support-row">
          <span>📧 Email</span>
          <a href="mailto:support@kablet.com">support@kablet.com</a>
        </div>
        <div class="support-row">
          <span>💬 WhatsApp</span>
          <a href="https://wa.me/971561551029" target="_blank">+971 56 155 1029</a>
        </div>
      </div>
    </div>
  </div>

  <div class="container">

    <!-- LEFT COLUMN -->
    <div class="left-col">

      <!-- Logo -->
      <div class="logo">
        <img src="https://kablet.com/wp-content/uploads/2026/07/Kablet-1200X1200.svg" onerror="this.style.display='none'" />
        <span class="logo-text">Kablet</span>
      </div>

      <!-- Setup state -->
      <div id="setup-state">
        <h1 class="headline">Start earning additional revenue from every completed order.</h1>
        <p class="subheadline">Complete one final step to activate Kablet. It takes less than a minute.</p>

        <div class="step-flow">
          <div class="step-item">
            <div class="step-icon done">✓</div>
            <div class="step-content">
              <h3>App Installed</h3>
              <p>${merchantName ? merchantName + ' is connected' : 'Your store is connected'}</p>
            </div>
          </div>
          <div class="step-connector"></div>
          <div class="step-item">
            <div class="step-icon active">2</div>
            <div class="step-content">
              <h3>Activate Kablet on your Thank You Page</h3>
              <p>Add the Kablet block in your checkout editor</p>
            </div>
          </div>
        </div>

        <div class="instructions">
          <p>What you'll do</p>
          <ul>
            <li>Open the Shopify Checkout Editor</li>
            <li>Add the Kablet Offer block</li>
            <li>Click Save</li>
          </ul>
        </div>

        <div class="error-msg" id="error-msg">
          Kablet block not detected yet. Please make sure you've added the Kablet Offer block and saved.
        </div>

        <a href="${checkoutEditorUrl}" class="btn-primary" target="_blank" id="editor-btn">
          Open Shopify Editor →
        </a>

        <button class="btn-primary" onclick="verifyActivation()" id="verify-btn" style="background:#101011; margin-top:0;">
          I've completed setup ✓
        </button>

        <p class="time-note">One-time setup · Takes less than 1 minute</p>

        <button class="btn-secondary" onclick="openModal()" style="margin-top:16px;">
          Need Help?
        </button>
      </div>

      <!-- Activated state -->
      <div class="activated-state" id="activated-state">
        <div class="activated-icon">🎉</div>
        <h2 class="activated-title">Kablet is now active!</h2>
        <p class="activated-sub">
          Customers will now see post-purchase offers after checkout.<br>
          You'll start earning additional revenue from every accepted offer.
        </p>
        <a href="/app?shop=${shop}" class="btn-primary">Go to Dashboard →</a>
      </div>

    </div>

    <!-- RIGHT COLUMN -->
    <div class="right-col">
     <video autoplay muted loop playsinline style="width:100%; border-radius:12px; object-fit:cover; max-height:400px;">
  <source src="https://res.cloudinary.com/bc2i2xi2/video/upload/v1783510006/Customer-expiernce-demo-vid_kafvjf.mov" type="video/mp4">
</video>
      <div class="right-label">What your customers will see</div>
    </div>

  </div>

  <script>
    const AppBridge = window['app-bridge'];
    const createApp = AppBridge.default;

    let app = null;
    try {
      const host = new URLSearchParams(window.location.search).get('host');
      if (host) {
        app = createApp({
          apiKey: '468a9b31e9ad02a319dbc3b88d6b4039',
          host: host,
        });
      }
    } catch(e) {}

    function openModal() {
      document.getElementById('help-modal').classList.add('open');
    }

    function closeModal() {
      document.getElementById('help-modal').classList.remove('open');
    }

    async function verifyActivation() {
  const btn = document.getElementById('verify-btn');
  btn.textContent = 'Activating...';
  btn.disabled = true;
  setTimeout(() => showActivated(), 800);
}

function showActivated() {
  document.getElementById('setup-state').style.display = 'none';
  document.getElementById('activated-state').style.display = 'block';
}
  </script>
</body>
</html>
    `

    return reply.type('text/html').send(html)
  })
}