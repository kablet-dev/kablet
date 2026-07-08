import type { FastifyInstance } from 'fastify'

export async function embeddedRoutes(fastify: FastifyInstance) {

  fastify.get('/app', async (request, reply) => {
    const { shop } = request.query as { shop?: string }

    if (!shop) {
      return reply.status(400).send('Missing shop parameter')
    }

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kablet</title>
  <script src="https://unpkg.com/@shopify/app-bridge@3"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #f4f0fd;
      padding: 24px;
      color: #111;
    }
    .tabs {
      display: flex;
      gap: 4px;
      margin-bottom: 24px;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 0;
    }
    .tab {
      padding: 8px 16px;
      font-size: 14px;
      font-weight: 500;
      color: #666;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      margin-bottom: -2px;
      background: none;
      border-top: none;
      border-left: none;
      border-right: none;
    }
    .tab.active { color: #673de6; border-bottom-color: #673de6; }
    .tab-content { display: none; }
    .tab-content.active { display: block; }
    .header { margin-bottom: 20px; }
    .header h1 { font-size: 20px; font-weight: 700; color: #111; }
    .header p { color: #666; font-size: 14px; margin-top: 4px; }
    .period-filter {
      display: flex;
      gap: 8px;
      margin-bottom: 20px;
    }
    .period-btn {
      padding: 6px 14px;
      font-size: 13px;
      font-weight: 500;
      border-radius: 20px;
      border: 1px solid #d1d5db;
      background: white;
      color: #666;
      cursor: pointer;
    }
    .period-btn.active {
      background: #673de6;
      color: white;
      border-color: #673de6;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin-bottom: 24px;
    }
    @media (min-width: 600px) { .stats { grid-template-columns: repeat(3, 1fr); } }
    @media (min-width: 900px) { .stats { grid-template-columns: repeat(5, 1fr); } }
    .stat {
      background: white;
      border-radius: 10px;
      padding: 16px;
      border: 1px solid #e5e7eb;
    }
    .stat-label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
    .stat-value { font-size: 22px; font-weight: 700; color: #111; }
    .stat-value.purple { color: #673de6; }
    .section-title { font-size: 15px; font-weight: 600; color: #111; margin-bottom: 12px; }
    .table-wrap { background: white; border-radius: 10px; border: 1px solid #e5e7eb; overflow: hidden; }
    table { width: 100%; font-size: 13px; border-collapse: collapse; }
    th { text-align: left; padding: 10px 14px; font-size: 11px; font-weight: 600; color: #888; text-transform: uppercase; border-bottom: 1px solid #e5e7eb; background: #fafafa; }
    td { padding: 12px 14px; border-bottom: 1px solid #f3f4f6; color: #374151; }
    tr:last-child td { border-bottom: none; }
    .badge { display: inline-flex; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600; }
    .badge-green { background: #d1fae5; color: #065f46; }
    .badge-gray { background: #f3f4f6; color: #6b7280; }
    .badge-yellow { background: #fef3c7; color: #92400e; }
    .badge-red { background: #fee2e2; color: #991b1b; }
    .empty { text-align: center; padding: 32px; color: #9ca3af; font-size: 14px; }
    .loading { text-align: center; padding: 48px; color: #6b7280; }
    .earnings { color: #673de6; font-weight: 600; }
    .payout-banner {
      background: linear-gradient(135deg, #673de6, #5530c4);
      color: white;
      border-radius: 10px;
      padding: 20px 24px;
      margin-bottom: 16px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .payout-banner .label { font-size: 12px; opacity: 0.8; margin-bottom: 4px; }
    .payout-banner .amount { font-size: 28px; font-weight: 700; }
    .payout-banner .sub { font-size: 13px; opacity: 0.8; margin-top: 2px; }
    .payout-card { background: white; border-radius: 10px; border: 1px solid #e5e7eb; padding: 20px; margin-bottom: 16px; }
    .payout-card h3 { font-size: 15px; font-weight: 600; margin-bottom: 14px; }
    .payout-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; }
    .payout-row:last-child { border-bottom: none; }
    .payout-row .label { color: #666; }
    .payout-row .value { font-weight: 600; }
    .payout-row .value.green { color: #059669; }
    .form-group { margin-bottom: 16px; }
    .form-group label { display: block; font-size: 13px; font-weight: 500; color: #374151; margin-bottom: 6px; }
    .form-group input {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 14px;
    }
    .form-group input:focus { outline: none; border-color: #673de6; box-shadow: 0 0 0 2px rgba(103,61,230,0.1); }
    .btn {
      background: #673de6;
      color: white;
      padding: 10px 20px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      border: none;
      cursor: pointer;
    }
    .btn:hover { background: #5530c4; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-danger {
      background: white;
      color: #dc2626;
      border: 1px solid #dc2626;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
    }
    .btn-danger:hover { background: #fee2e2; }
    .success-msg { color: #059669; font-size: 14px; margin-top: 12px; display: none; }
    .status-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; }
    .status-dot.green { background: #10b981; }
    .status-dot.red { background: #ef4444; }
    .section-divider { border: none; border-top: 1px solid #e5e7eb; margin: 20px 0; }
    .support-link {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 0;
      border-bottom: 1px solid #f3f4f6;
      font-size: 14px;
      color: #374151;
    }
    .support-link:last-child { border-bottom: none; }
    .support-link a { color: #673de6; text-decoration: none; font-weight: 500; }
    .support-link a:hover { text-decoration: underline; }
  </style>
</head>
<body>

<!-- Onboarding state -->
  <div id="onboarding-state" style="display:none;">
    
    <!-- Help Modal -->
    <div id="help-modal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:100; align-items:center; justify-content:center; padding:24px;">
      <div style="background:white; border-radius:12px; padding:32px; max-width:480px; width:100%; position:relative;">
        <button onclick="closeHelpModal()" style="position:absolute; top:16px; right:16px; background:none; border:none; font-size:20px; cursor:pointer; color:#999;">×</button>
        <h2 style="font-size:18px; font-weight:700; margin-bottom:8px;">Quick Setup Guide</h2>
        <p style="font-size:14px; color:#666; margin-bottom:16px;">Watch how to activate Kablet in under 60 seconds.</p>
        <video autoplay muted loop playsinline style="width:100%; border-radius:8px; margin-bottom:20px; max-height:200px; object-fit:cover;">
  <source src="https://res.cloudinary.com/bc2i2xi2/video/upload/v1783510042/Installation-demo-vid_zbzram.mov" type="video/mp4">
</video>
        <div style="border-top:1px solid #e5e7eb; padding-top:16px;">
          <p style="font-size:13px; color:#666; margin-bottom:12px;">Still need help? Our team is happy to assist.</p>
          <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid #f3f4f6; font-size:13px;">
            <span>📧 Email</span>
            <a href="mailto:support@kablet.com" style="color:#673de6; text-decoration:none; font-weight:500;">support@kablet.com</a>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; font-size:13px;">
            <span>💬 WhatsApp</span>
            <a href="https://wa.me/971561551029" target="_blank" style="color:#673de6; text-decoration:none; font-weight:500;">+971 56 155 1029</a>
          </div>
        </div>
      </div>
    </div>

    <!-- Two column layout -->
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:0; min-height:calc(100vh - 48px); background:white; border-radius:12px; overflow:hidden; box-shadow:0 2px 12px rgba(103,61,230,0.1);">
      
      <!-- Left column -->
      <div style="padding:40px 36px; display:flex; flex-direction:column; justify-content:center;">
        <div style="margin-bottom:28px;">
          <span style="font-size:18px; font-weight:700; color:#111;">Kablet<span style="color:#673de6;">.</span></span>
        </div>
        <h1 style="font-size:22px; font-weight:700; color:#111; margin-bottom:8px; line-height:1.3;">
          Start earning additional revenue from every completed order.
        </h1>
        <p style="font-size:14px; color:#666; margin-bottom:28px; line-height:1.6;">
          Complete one final step to activate Kablet. It takes less than a minute.
        </p>

        <!-- Steps -->
        <div style="margin-bottom:24px;">
          <div style="display:flex; align-items:flex-start; gap:12px; margin-bottom:12px;">
            <div style="width:26px; height:26px; border-radius:50%; background:#d1fae5; color:#059669; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:600; flex-shrink:0;">✓</div>
            <div>
              <div style="font-size:13px; font-weight:600; color:#111;">App Installed</div>
              <div style="font-size:12px; color:#888;">Your store is connected to Kablet.</div>
            </div>
          </div>
          <div style="width:2px; height:14px; background:#e5e7eb; margin-left:12px; margin-bottom:12px;"></div>
          <div style="display:flex; align-items:flex-start; gap:12px;">
            <div style="width:26px; height:26px; border-radius:50%; background:#673de6; color:white; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:600; flex-shrink:0;">2</div>
            <div>
              <div style="font-size:13px; font-weight:600; color:#111;">Activate on your Thank You page</div>
              <div style="font-size:12px; color:#888;">Add the Kablet block in your checkout editor.</div>
            </div>
          </div>
        </div>

        <!-- Instructions -->
        <div style="background:#f9fafb; border-radius:8px; padding:12px 14px; margin-bottom:20px;">
          <div style="font-size:12px; font-weight:600; color:#374151; margin-bottom:6px;">What you'll do</div>
          <ul style="padding-left:14px; margin:0;">
            <li style="font-size:12px; color:#666; line-height:2;">Open the Shopify Checkout Editor</li>
            <li style="font-size:12px; color:#666; line-height:2;">Add the Kablet Offer block</li>
            <li style="font-size:12px; color:#666; line-height:2;">Click Save</li>
          </ul>
        </div>

        <!-- CTAs -->
        <button onclick="openEditor()" style="display:block; width:100%; background:#673de6; color:white; padding:12px 20px; border-radius:8px; font-size:14px; font-weight:600; border:none; cursor:pointer; margin-bottom:8px;">
          Open Checkout Editor →
        </button>
        <button onclick="completeSetup()" style="display:block; width:100%; background:#101011; color:white; padding:12px 20px; border-radius:8px; font-size:14px; font-weight:600; border:none; cursor:pointer; margin-bottom:12px;">
          I've completed setup ✓
        </button>
        <p style="font-size:11px; color:#999; text-align:center; margin-bottom:16px;">One-time setup · Takes less than 1 minute</p>
        
        <!-- Need help -->
        <button onclick="openHelpModal()" style="display:block; width:100%; background:transparent; color:#673de6; padding:10px 20px; border-radius:8px; font-size:13px; font-weight:500; border:1px solid #e5e7eb; cursor:pointer;">
          Need Help?
        </button>
      </div>

      <!-- Right column -->
<div style="background:linear-gradient(135deg, #673de6 0%, #101011 100%); display:flex; flex-direction:column; align-items:center; justify-content:center; padding:40px; position:relative; gap:24px;">
  
  <!-- Manual step switcher -->
<div style="display:flex; align-items:flex-start; gap:0;">
  <div style="display:flex; flex-direction:column; align-items:center; gap:6px; cursor:pointer;" onclick="switchToPreviewStep1()">
    <div id="step-indicator-1" style="width:36px; height:36px; border-radius:50%; background:white; color:#673de6; display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:700; transition:all 0.4s;">1</div>
    <div id="step-label-1" style="font-size:10px; color:white; text-align:center; max-width:60px; opacity:1; transition:all 0.4s;">Setup</div>
  </div>
  <div style="width:60px; height:2px; background:rgba(255,255,255,0.3); margin-top:18px;"></div>
  <div style="display:flex; flex-direction:column; align-items:center; gap:6px; cursor:pointer;" onclick="switchToPreviewStep2()">
    <div id="step-indicator-2" style="width:36px; height:36px; border-radius:50%; background:rgba(255,255,255,0.2); color:rgba(255,255,255,0.5); display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:700; transition:all 0.4s;">2</div>
    <div id="step-label-2" style="font-size:10px; color:rgba(255,255,255,0.5); text-align:center; max-width:60px; transition:all 0.4s;">Customer<br>Experience</div>
  </div>
</div>

  <!-- Step 1 video — Setup guide -->
<div id="right-col-step1" style="width:100%; border-radius:12px; overflow:hidden; transition:opacity 0.4s; min-height:280px;">
  <video autoplay muted loop playsinline style="width:100%; height:auto; object-fit:contain; border-radius:12px;">
    <source src="https://res.cloudinary.com/bc2i2xi2/video/upload/v1783510042/Installation-demo-vid_zbzram.mov" type="video/mp4">
  </video>
</div>

  <!-- Step 2 video — Customer experience -->
<div id="right-col-step2" style="display:none; width:100%; border-radius:12px; overflow:hidden; transition:opacity 0.4s; opacity:0; min-height:280px;">
  <video autoplay muted loop playsinline style="width:100%; height:auto; object-fit:contain; border-radius:12px;">
    <source src="https://res.cloudinary.com/bc2i2xi2/video/upload/v1783510006/Customer-expiernce-demo-vid_kafvjf.mov" type="video/mp4">
  </video>
</div>

  <div style="color:rgba(255,255,255,0.3); font-size:11px; letter-spacing:0.05em; text-transform:uppercase;" id="right-col-label">Step 1 of 2 · Setup</div>
</div>

    </div>
  </div>

  <!-- Dashboard state -->
  <div id="dashboard-state" style="display:none;">

  <div class="tabs">
    <button class="tab active" onclick="showTab('overview')">Overview</button>
    <button class="tab" onclick="showTab('payouts')">Payouts</button>
    <button class="tab" onclick="showTab('settings')">Settings</button>
  </div>

  <!-- Payout setup banner -->
  <div id="payout-banner" style="display:none; background:#fef3c7; border:1px solid #f59e0b; border-radius:8px; padding:12px 16px; margin-bottom:20px; font-size:14px; color:#92400e; align-items:center; justify-content:space-between; gap:12px;">
    <span>⚠️ To receive your weekly payouts, please add your bank details in <strong>Settings</strong>.</span>
    <button onclick="showTab('settings')" style="background:#f59e0b; color:white; border:none; padding:6px 12px; border-radius:6px; font-size:13px; font-weight:600; cursor:pointer; white-space:nowrap;">Add Bank Details</button>
  </div>

  <!-- OVERVIEW TAB -->
  <div id="tab-overview" class="tab-content active">
    <div class="header">
      <h1>Kablet</h1>
      <p>Track the extra revenue Kablet generates for your store.</p>
    </div>

    <div class="period-filter">
      <button class="period-btn active" onclick="setPeriod('today', this)">Today</button>
      <button class="period-btn" onclick="setPeriod('7d', this)">Last 7 Days</button>
      <button class="period-btn" onclick="setPeriod('30d', this)">Last 30 Days</button>
      <button class="period-btn" onclick="setPeriod('lifetime', this)">Lifetime</button>
    </div>

    <div class="stats">
      <div class="stat">
        <div class="stat-label">Revenue Generated</div>
        <div class="stat-value purple" id="stat-revenue">—</div>
      </div>
      <div class="stat">
        <div class="stat-label">Acceptance Rate</div>
        <div class="stat-value" id="stat-rate">—</div>
      </div>
      <div class="stat">
        <div class="stat-label">Completed Offers</div>
        <div class="stat-value" id="stat-completed">—</div>
      </div>
      <div class="stat">
        <div class="stat-label">Transactions Evaluated</div>
        <div class="stat-value" id="stat-tx">—</div>
      </div>
      <div class="stat">
        <div class="stat-label">Revenue Per Order</div>
        <div class="stat-value" id="stat-rpo">—</div>
      </div>
    </div>

    <div class="section-title">Recent Transactions</div>
    <div class="table-wrap">
      <div id="transactions" class="loading">Loading...</div>
    </div>
  </div>

  <!-- PAYOUTS TAB -->
  <div id="tab-payouts" class="tab-content">
    <div class="header">
      <h1>Payouts</h1>
      <p>AED 8 per completed offer, paid every Monday</p>
    </div>
    <div id="payouts-content" class="loading">Loading...</div>
  </div>

  <!-- SETTINGS TAB -->
  <div id="tab-settings" class="tab-content">
    <div class="header">
      <h1>Settings</h1>
      <p>Manage your Kablet configuration</p>
    </div>

    <!-- Kablet Status -->
    <div class="payout-card">
      <h3>Kablet Status</h3>
      <div class="payout-row">
        <span class="label">
          <span class="status-dot green" id="status-dot"></span>
          <span id="status-text">Active</span>
        </span>
        <button class="btn-danger" id="toggle-status-btn" onclick="toggleKabletStatus()">Pause Kablet</button>
      </div>
    </div>

    <hr class="section-divider">

    <!-- Bank Details -->
    <div class="payout-card">
      <h3>Payout Bank Details</h3>
      <div class="form-group">
        <label>Full Name</label>
        <input type="text" id="full_name" placeholder="Your full legal name" />
      </div>
      <div class="form-group">
        <label>Account Holder Name</label>
        <input type="text" id="account_holder_name" placeholder="Name on bank account" />
      </div>
      <div class="form-group">
        <label>Bank Name</label>
        <input type="text" id="bank_name" placeholder="e.g. Emirates NBD" />
      </div>
      <div class="form-group">
        <label>IBAN (UAE)</label>
        <input type="text" id="iban" placeholder="AE000000000000000000000" />
      </div>
      <button class="btn" id="save-settings-btn" onclick="saveSettings()">Save Bank Details</button>
      <div class="success-msg" id="settings-success">✓ Saved successfully</div>
    </div>

    <hr class="section-divider">

    <!-- Support -->
    <div class="payout-card">
      <h3>Support</h3>
      <p style="font-size:14px; color:#666; margin-bottom:14px;">Need help? Our team is here to assist you.</p>
      <div class="support-link">
        <span>📧 Email</span>
        <a href="mailto:support@kablet.com">support@kablet.com</a>
      </div>
      <div class="support-link">
        <span>💬 WhatsApp</span>
        <a href="https://wa.me/971561551029" target="_blank">+971 56 155 1029</a>
      </div>
    </div>
  </div>

 <script>
    const API = 'https://kablet-backend.onrender.com';
    let appBridgeToken = null;
    let currentPeriod = 'lifetime';
    let kabletEnabled = true;
    let currentPreviewStep = 1;
    let previewInterval = null;

    const AppBridge = window['app-bridge'];
const createApp = AppBridge.default;
const { getSessionToken } = AppBridge.utilities;

const app = createApp({
  apiKey: '468a9b31e9ad02a319dbc3b88d6b4039',
  host: new URLSearchParams(window.location.search).get('host'),
});

    async function getToken() {
      if (!appBridgeToken) {
        appBridgeToken = await getSessionToken(app);
      }
      return appBridgeToken;
    }

    // ── Onboarding ───────────────────────────────────────────────────

    function showOnboarding() {
      document.getElementById('onboarding-state').style.display = 'block';
      document.getElementById('dashboard-state').style.display = 'none';
      startPreviewLoop();
    }

    function showDashboard() {
      document.getElementById('onboarding-state').style.display = 'none';
      document.getElementById('dashboard-state').style.display = 'block';
      loadOverview();
    }

    function openHelpModal() {
      document.getElementById('help-modal').style.display = 'flex';
    }

    function closeHelpModal() {
      document.getElementById('help-modal').style.display = 'none';
    }

    async function openEditor() {
      const token = await getToken();
      const res = await fetch(API + '/dashboard/editor-url', {
        headers: { Authorization: 'Bearer ' + token }
      });
      const data = await res.json();
      window.open(data.url, '_blank');
    }

    async function completeSetup() {
      if (previewInterval) clearInterval(previewInterval);
      const token = await getToken();
      await fetch(API + '/dashboard/complete-setup', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token }
      });
      showDashboard();
    }

    // ── Preview loop ─────────────────────────────────────────────────

    function startPreviewLoop() {
  switchToPreviewStep1();
}

    function switchToPreviewStep1() {
      currentPreviewStep = 1;
      document.getElementById('step-indicator-1').style.background = 'white';
      document.getElementById('step-indicator-1').style.color = '#673de6';
      document.getElementById('step-label-1').style.color = 'white';
      document.getElementById('step-label-1').style.opacity = '1';
      document.getElementById('step-indicator-2').style.background = 'rgba(255,255,255,0.2)';
      document.getElementById('step-indicator-2').style.color = 'rgba(255,255,255,0.5)';
      document.getElementById('step-label-2').style.color = 'rgba(255,255,255,0.5)';
      document.getElementById('right-col-step2').style.opacity = '0';
      setTimeout(() => {
        document.getElementById('right-col-step2').style.display = 'none';
        document.getElementById('right-col-step1').style.display = 'flex';
        document.getElementById('right-col-step1').style.opacity = '1';
      }, 400);
      document.getElementById('right-col-label').textContent = 'Step 1 of 2 · Setup';
    }

    function switchToPreviewStep2() {
      currentPreviewStep = 2;
      document.getElementById('step-indicator-2').style.background = 'white';
      document.getElementById('step-indicator-2').style.color = '#673de6';
      document.getElementById('step-label-2').style.color = 'white';
      document.getElementById('step-indicator-1').style.background = 'rgba(255,255,255,0.2)';
      document.getElementById('step-indicator-1').style.color = 'rgba(255,255,255,0.5)';
      document.getElementById('step-label-1').style.color = 'rgba(255,255,255,0.5)';
      document.getElementById('right-col-step1').style.opacity = '0';
      setTimeout(() => {
        document.getElementById('right-col-step1').style.display = 'none';
        document.getElementById('right-col-step2').style.display = 'flex';
        document.getElementById('right-col-step2').style.opacity = '1';
      }, 400);
      document.getElementById('right-col-label').textContent = 'Step 2 of 2 · Customer Experience';
    }

    // ── Dashboard ────────────────────────────────────────────────────

    function showTab(name) {
      document.querySelectorAll('.tab').forEach((t, i) => {
        t.classList.toggle('active', ['overview','payouts','settings'][i] === name);
      });
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      document.getElementById('tab-' + name).classList.add('active');
      if (name === 'payouts') loadPayouts();
      if (name === 'settings') loadSettings();
    }

    function setPeriod(period, btn) {
      currentPeriod = period;
      document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadOverview();
    }

    function getStatusBadge(state) {
      if (!state) return '—';
      switch(state) {
        case 'COMPLETED': return '<span class="badge badge-green">Completed</span>';
        case 'ACCEPTED': return '<span class="badge badge-green">Accepted</span>';
        case 'DECLINED': return '<span class="badge badge-gray">Declined</span>';
        case 'EXPIRED': return '<span class="badge badge-yellow">Expired</span>';
        case 'PRESENTED': return '<span class="badge badge-yellow">Shown</span>';
        default: return '<span class="badge badge-gray">' + state.toLowerCase() + '</span>';
      }
    }

    async function loadOverview() {
      const token = await getToken();

      const summaryRes = await fetch(API + '/dashboard/summary?period=' + currentPeriod, {
        headers: { Authorization: 'Bearer ' + token }
      });
      const summary = await summaryRes.json();

      document.getElementById('stat-revenue').textContent = 'AED ' + Number(summary.total_revenue).toFixed(2);
      document.getElementById('stat-rate').textContent = summary.acceptance_rate + '%';
      document.getElementById('stat-completed').textContent = summary.opportunities_accepted;
      document.getElementById('stat-tx').textContent = summary.transactions_processed;
      document.getElementById('stat-rpo').textContent = 'AED ' + Number(summary.revenue_per_order).toFixed(2);

      const txRes = await fetch(API + '/dashboard/transactions?period=' + currentPeriod, {
        headers: { Authorization: 'Bearer ' + token }
      });
      const txData = await txRes.json();

      if (!txData.transactions || txData.transactions.length === 0) {
        document.getElementById('transactions').innerHTML = '<div class="empty">No transactions in this period</div>';
        return;
      }

      let html = '<table><thead><tr><th>Date</th><th>Order Value</th><th>Offer</th><th>Status</th><th>Merchant Earnings</th></tr></thead><tbody>';
      txData.transactions.forEach(tx => {
        const instance = tx.instance;
        const date = new Date(tx.received_at).toLocaleDateString();
        const value = tx.transaction_currency + ' ' + Number(tx.transaction_value).toFixed(2);
        const offerName = tx.offer_name ?? '—';
        const status = instance ? getStatusBadge(instance.current_state) : '—';
        const earnings = (instance?.current_state === 'COMPLETED' && instance?.outcome_value)
          ? '<span class="earnings">AED ' + Number(instance.outcome_value).toFixed(2) + '</span>'
          : '—';
        html += '<tr><td>' + date + '</td><td>' + value + '</td><td>' + offerName + '</td><td>' + status + '</td><td>' + earnings + '</td></tr>';
      });
      html += '</tbody></table>';
      document.getElementById('transactions').innerHTML = html;
      checkPayoutSetup();
    }

    async function loadPayouts() {
      const token = await getToken();
      const res = await fetch(API + '/payouts/summary', {
        headers: { Authorization: 'Bearer ' + token }
      });
      const data = await res.json();

      const cw = data.current_week;
      const lifetime = data.lifetime;
      const payouts = data.payouts;

      let html = '';
      html += '<div class="payout-banner">';
      html += '<div><div class="label">Next Payout</div><div class="amount">AED ' + Number(cw.amount).toFixed(2) + '</div><div class="sub">Monday, ' + formatDate(cw.next_payout_date) + '</div></div>';
      html += '<div><div class="label">Lifetime Paid</div><div class="amount">AED ' + Number(lifetime.earnings).toFixed(2) + '</div><div class="sub">' + lifetime.transactions + ' completed offers</div></div>';
      html += '</div>';

      html += '<div class="payout-card"><h3>This Week</h3>';
      html += '<div class="payout-row"><span class="label">Completed offers</span><span class="value">' + cw.transactions + '</span></div>';
      html += '<div class="payout-row"><span class="label">Your rate</span><span class="value">AED 8.00 per offer</span></div>';
      html += '<div class="payout-row"><span class="label">Estimated payout</span><span class="value green">AED ' + Number(cw.amount).toFixed(2) + '</span></div>';
      html += '</div>';

      html += '<div class="section-title">Payout History</div>';
      html += '<div class="table-wrap">';
      if (!payouts || payouts.length === 0) {
        html += '<div class="empty">No payouts yet. Your first payout will arrive next Monday.</div>';
      } else {
        html += '<table><thead><tr><th>Period</th><th>Offers</th><th>Amount</th><th>Status</th></tr></thead><tbody>';
        payouts.forEach(p => {
          const statusClass = p.status === 'PAID' ? 'badge-green' : 'badge-gray';
          html += '<tr><td>' + p.period_start + ' – ' + p.period_end + '</td><td>' + p.transactions_count + '</td><td class="earnings">AED ' + Number(p.total_amount).toFixed(2) + '</td><td><span class="badge ' + statusClass + '">' + p.status.toLowerCase() + '</span></td></tr>';
        });
        html += '</tbody></table>';
      }
      html += '</div>';
      document.getElementById('payouts-content').innerHTML = html;
      checkPayoutSetup();
    }

    function formatDate(dateStr) {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-AE', { month: 'long', day: 'numeric' });
    }

    async function loadSettings() {
      const token = await getToken();

      const res = await fetch(API + '/payouts/settings', {
        headers: { Authorization: 'Bearer ' + token }
      });
      const data = await res.json();
      if (data.settings) {
        document.getElementById('full_name').value = data.settings.full_name ?? '';
        document.getElementById('account_holder_name').value = data.settings.account_holder_name ?? '';
        document.getElementById('bank_name').value = data.settings.bank_name ?? '';
        document.getElementById('iban').value = data.settings.iban ?? '';
      }

      const configRes = await fetch(API + '/dashboard/config', {
        headers: { Authorization: 'Bearer ' + token }
      });
      const configData = await configRes.json();
      kabletEnabled = configData.offers_enabled;
      updateStatusUI();
    }

    function updateStatusUI() {
      const dot = document.getElementById('status-dot');
      const text = document.getElementById('status-text');
      const btn = document.getElementById('toggle-status-btn');
      if (kabletEnabled) {
        dot.className = 'status-dot green';
        text.textContent = 'Active';
        btn.textContent = 'Pause Kablet';
        btn.className = 'btn-danger';
      } else {
        dot.className = 'status-dot red';
        text.textContent = 'Paused';
        btn.textContent = 'Resume Kablet';
        btn.className = 'btn';
      }
    }

    async function toggleKabletStatus() {
      const token = await getToken();
      const newStatus = !kabletEnabled;
      await fetch(API + '/dashboard/config', {
        method: 'PATCH',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ offers_enabled: newStatus })
      });
      kabletEnabled = newStatus;
      updateStatusUI();
    }

    async function checkPayoutSetup() {
      const token = await getToken();
      const res = await fetch(API + '/payouts/settings', {
        headers: { Authorization: 'Bearer ' + token }
      });
      const data = await res.json();
      const hasDetails = data.settings?.iban && data.settings?.bank_name;
      const banner = document.getElementById('payout-banner');
      if (banner) {
        banner.style.display = hasDetails ? 'none' : 'flex';
      }
    }

    async function saveSettings() {
      const btn = document.getElementById('save-settings-btn');
      btn.disabled = true;
      btn.textContent = 'Saving...';
      const token = await getToken();
      await fetch(API + '/payouts/settings', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: document.getElementById('full_name').value,
          account_holder_name: document.getElementById('account_holder_name').value,
          bank_name: document.getElementById('bank_name').value,
          iban: document.getElementById('iban').value,
        })
      });
      btn.disabled = false;
      btn.textContent = 'Save Bank Details';
      document.getElementById('payout-banner').style.display = 'none';
      const msg = document.getElementById('settings-success');
      msg.style.display = 'block';
      setTimeout(() => msg.style.display = 'none', 3000);
    }

    // ── Init ─────────────────────────────────────────────────────────

    async function init() {
      const token = await getToken();
      const res = await fetch(API + '/dashboard/config', {
        headers: { Authorization: 'Bearer ' + token }
      });
      const data = await res.json();

      if (!data.setup_completed) {
        showOnboarding();
      } else {
        showDashboard();
      }
    }

    init();
  </script>
  </div><!-- end dashboard-state -->
</body>
</html>
    `

    return reply.type('text/html').send(html)
  })
}