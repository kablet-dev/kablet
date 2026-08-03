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
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { -webkit-font-smoothing: antialiased; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif;
      background: #f5f5f8;
      color: #0a0a0f;
      min-height: 100vh;
    }

    /* ── Layout ── */
    .shell { display: flex; min-height: 100vh; }
    .sidebar {
      width: 220px;
      min-height: 100vh;
      background: #ffffff;
      border-right: 1px solid #eeeef2;
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
      position: fixed;
      top: 0; left: 0; bottom: 0;
    }
    .main { margin-left: 220px; flex: 1; min-width: 0; padding: 32px 36px; max-width: calc(100vw - 220px); }

    /* ── Sidebar ── */
    .sidebar-logo {
      padding: 24px 20px 20px;
      border-bottom: 1px solid #eeeef2;
      display: flex;
      align-items: center;
      gap: 9px;
    }
    .sidebar-logo-icon {
      width: 28px; height: 28px; border-radius: 7px;
      background: linear-gradient(135deg, #6f57e8 0%, #8a76ef 100%);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .sidebar-logo-text { font-size: 15px; font-weight: 700; color: #0a0a0f; letter-spacing: -0.3px; }
    .sidebar-nav { flex: 1; padding: 12px 10px; display: flex; flex-direction: column; gap: 2px; }
    .nav-item {
      display: flex; align-items: center; gap: 9px;
      padding: 7px 10px; border-radius: 8px;
      font-size: 13.5px; font-weight: 450;
      color: #4a4a5a; background: transparent;
      border: none; cursor: pointer; text-align: left;
      transition: all 0.12s ease; width: 100%;
    }
    .nav-item:hover { background: #f5f5f8; color: #0a0a0f; }
    .nav-item.active { background: #f5f3fe; color: #6f57e8; font-weight: 600; }
    .nav-item svg { flex-shrink: 0; opacity: 0.7; }
    .nav-item.active svg { opacity: 1; }
    .sidebar-footer {
      padding: 12px 10px;
      border-top: 1px solid #eeeef2;
    }
    .sidebar-user {
      display: flex; align-items: center; gap: 9px;
      padding: 8px 10px; border-radius: 8px;
    }
    .sidebar-avatar {
      width: 28px; height: 28px; border-radius: 50%;
      background: linear-gradient(135deg, #a897f4, #6f57e8);
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 700; color: white; flex-shrink: 0;
    }
    .sidebar-email { font-size: 12px; color: #9898aa; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }

    /* ── Page header ── */
    .page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 28px; }
    .page-title { font-size: 22px; font-weight: 700; color: #0a0a0f; letter-spacing: -0.5px; }
    .page-subtitle { font-size: 13.5px; color: #9898aa; margin-top: 4px; }

    /* ── Engine badge ── */
    .engine-badge {
      display: inline-flex; align-items: center; gap: 6px;
      border-radius: 100px; padding: 4px 12px;
      font-size: 12px; font-weight: 600;
    }
    .engine-badge.active { background: #f0fdf4; border: 1px solid #bbf7d0; color: #15803d; }
    .engine-badge.paused { background: #fee2e2; border: 1px solid #fecaca; color: #dc2626; }
    .engine-dot { width: 6px; height: 6px; border-radius: 50%; }
    .engine-dot.active { background: #16a34a; animation: pulse 2s infinite; }
    .engine-dot.paused { background: #dc2626; }

    /* ── Period filter ── */
    .period-filter {
      display: inline-flex; gap: 2px;
      background: #eeeef2; border-radius: 10px; padding: 3px;
      margin-bottom: 24px;
    }
    .period-btn {
      padding: 6px 14px; border-radius: 8px; border: none;
      font-size: 13px; font-weight: 500; cursor: pointer;
      transition: all 0.12s ease;
      background: transparent; color: #6b6b7e;
      font-family: inherit;
    }
    .period-btn.active {
      background: #ffffff; color: #0a0a0f;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }

    /* ── KPI grid ── */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-bottom: 28px;
      transition: opacity 0.2s;
    }
    .kpi-card {
      background: #ffffff;
      border: 1px solid #eeeef2;
      border-radius: 14px;
      padding: 22px 24px;
      display: flex; flex-direction: column; gap: 10px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    }
    .kpi-card.accent {
      background: linear-gradient(135deg, #6f57e8 0%, #8a76ef 100%);
      border: none;
      box-shadow: 0 8px 24px rgba(111,87,232,0.2);
    }
    .kpi-label {
      font-size: 11.5px; font-weight: 600;
      text-transform: uppercase; letter-spacing: 0.7px;
      color: #9898aa;
    }
    .kpi-card.accent .kpi-label { color: rgba(255,255,255,0.7); }
    .kpi-value {
      font-size: 28px; font-weight: 700; color: #0a0a0f;
      letter-spacing: -0.8px; line-height: 1;
    }
    .kpi-card.accent .kpi-value { color: #ffffff; }
    .kpi-sub { font-size: 12px; color: #9898aa; }
    .kpi-card.accent .kpi-sub { color: rgba(255,255,255,0.65); }

    /* ── Table card ── */
    .table-card {
      background: #ffffff;
      border: 1px solid #eeeef2;
      border-radius: 14px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
      margin-bottom: 20px;
    }
    .table-card-header {
      padding: 18px 24px;
      border-bottom: 1px solid #eeeef2;
      display: flex; align-items: center; justify-content: space-between;
    }
    .table-card-title { font-size: 14px; font-weight: 600; color: #0a0a0f; }
    .table-card-sub { font-size: 12px; color: #9898aa; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    thead tr { background: #fafafa; }
    th {
      padding: 10px 16px; text-align: left;
      font-size: 11px; font-weight: 600;
      text-transform: uppercase; letter-spacing: 0.5px;
      color: #9898aa; border-bottom: 1px solid #eeeef2;
      white-space: nowrap;
    }
    td { padding: 13px 16px; border-bottom: 1px solid #f5f5f8; color: #4a4a5a; }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: #fafafa; }
    .td-mono { font-family: monospace; font-size: 12px; color: #6b6b7e; }
    .td-bold { font-weight: 600; color: #0a0a0f; }
    .td-right { text-align: right; }
    .td-green { font-weight: 600; color: #15803d; }
    .td-muted { color: #c4c4cf; }

    /* ── Badges ── */
    .badge {
      display: inline-flex; align-items: center; gap: 4px;
      font-size: 11.5px; font-weight: 600; padding: 3px 9px;
      border-radius: 100px;
    }
    .badge::before { content: ''; width: 5px; height: 5px; border-radius: 50%; background: currentColor; }
    .badge-green { background: #dcfce7; color: #15803d; }
    .badge-purple { background: #ede9fc; color: #5b45d4; }
    .badge-yellow { background: #fef3c7; color: #d97706; }
    .badge-gray { background: #f5f5f8; color: #6b6b7e; }
    .badge-red { background: #fee2e2; color: #dc2626; }

    /* ── Empty / loading ── */
    .empty-state { padding: 60px 24px; text-align: center; }
    .empty-icon {
      width: 44px; height: 44px; border-radius: 50%;
      background: #f5f5f8; display: flex; align-items: center;
      justify-content: center; margin: 0 auto 12px;
    }
    .empty-title { font-size: 14px; color: #4a4a5a; font-weight: 500; }
    .empty-sub { font-size: 12.5px; color: #9898aa; margin-top: 4px; }
    .loading-state { padding: 48px 24px; text-align: center; color: #9898aa; font-size: 13px; }

    /* ── Pagination ── */
    .pagination {
      padding: 14px 24px;
      border-top: 1px solid #eeeef2;
      display: flex; align-items: center; justify-content: space-between;
    }
    .pagination-info { font-size: 12px; color: #9898aa; }
    .pagination-btns { display: flex; gap: 6px; }
    .page-btn {
      padding: 6px 12px; border-radius: 7px; font-size: 12.5px;
      border: 1px solid #eeeef2; background: #fff; cursor: pointer;
      color: #4a4a5a; font-weight: 500; font-family: inherit;
    }
    .page-btn:disabled { opacity: 0.4; cursor: not-allowed; }

    /* ── Engine strip ── */
    .engine-strip {
      background: #f5f3fe; border: 1px solid #ede9fc;
      border-radius: 12px; padding: 16px 20px;
      display: flex; align-items: center; gap: 12px;
      margin-bottom: 20px;
    }
    .engine-strip-icon {
      width: 32px; height: 32px; border-radius: 8px;
      background: linear-gradient(135deg, #6f57e8, #a897f4);
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .engine-strip-title { font-size: 13px; font-weight: 600; color: #0a0a0f; }
    .engine-strip-sub { font-size: 12px; color: #6b6b7e; margin-top: 2px; }

    /* ── Payouts ── */
    .payout-hero {
      background: linear-gradient(135deg, #6f57e8 0%, #8a76ef 100%);
      border-radius: 14px; padding: 24px 28px;
      display: grid; grid-template-columns: 1fr 1fr 1fr;
      gap: 20px; margin-bottom: 20px;
      box-shadow: 0 8px 24px rgba(111,87,232,0.2);
    }
    .payout-hero-label { font-size: 11.5px; color: rgba(255,255,255,0.7); text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 6px; }
    .payout-hero-value { font-size: 26px; font-weight: 700; color: white; letter-spacing: -0.6px; }
    .payout-hero-sub { font-size: 12px; color: rgba(255,255,255,0.65); margin-top: 4px; }

    /* ── Settings ── */
    .settings-section {
      background: #ffffff; border: 1px solid #eeeef2;
      border-radius: 14px; padding: 24px;
      margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    }
    .settings-section-title { font-size: 14px; font-weight: 600; color: #0a0a0f; margin-bottom: 16px; }
    .form-row { margin-bottom: 14px; }
    .form-label { display: block; font-size: 12.5px; font-weight: 600; color: #4a4a5a; margin-bottom: 6px; }
    .form-input {
      width: 100%; border: 1px solid #e0e0e8; border-radius: 9px;
      padding: 10px 13px; font-size: 14px; color: #0a0a0f;
      outline: none; background: #fafafa; font-family: inherit;
      transition: border-color 0.12s;
    }
    .form-input:focus { border-color: #6f57e8; box-shadow: 0 0 0 3px rgba(111,87,232,0.1); background: #fff; }
    .btn-primary {
      background: linear-gradient(135deg, #6f57e8, #8a76ef);
      color: white; border: none; border-radius: 9px;
      padding: 10px 20px; font-size: 14px; font-weight: 600;
      cursor: pointer; font-family: inherit;
      box-shadow: 0 2px 8px rgba(111,87,232,0.3);
      transition: opacity 0.12s;
    }
    .btn-primary:hover { opacity: 0.9; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-danger {
      background: white; color: #dc2626;
      border: 1px solid #dc2626; border-radius: 9px;
      padding: 8px 16px; font-size: 13px; font-weight: 500;
      cursor: pointer; font-family: inherit;
    }
    .btn-danger:hover { background: #fee2e2; }
    .btn-resume {
      background: #6f57e8; color: white;
      border: none; border-radius: 9px;
      padding: 8px 16px; font-size: 13px; font-weight: 500;
      cursor: pointer; font-family: inherit;
    }
    .status-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 0; border-bottom: 1px solid #f5f5f8;
    }
    .status-row:last-child { border-bottom: none; }
    .status-label { font-size: 13.5px; color: #4a4a5a; display: flex; align-items: center; gap: 8px; }
    .status-dot { width: 8px; height: 8px; border-radius: 50%; }
    .status-dot.green { background: #16a34a; box-shadow: 0 0 0 3px rgba(22,163,74,0.15); }
    .status-dot.red { background: #dc2626; }
    .success-msg {
      display: none; color: #15803d; font-size: 13px;
      margin-top: 12px; background: #dcfce7;
      border: 1px solid #bbf7d0; border-radius: 8px; padding: 10px 14px;
    }
    .support-link {
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 0; border-bottom: 1px solid #f5f5f8; font-size: 13.5px;
    }
    .support-link:last-child { border-bottom: none; }
    .support-link a { color: #6f57e8; text-decoration: none; font-weight: 500; }
    .support-link a:hover { text-decoration: underline; }

    /* ── Banner ── */
    .payout-banner {
      display: none; background: #fef3c7; border: 1px solid #fde68a;
      border-radius: 10px; padding: 12px 16px; margin-bottom: 20px;
      font-size: 13.5px; color: #92400e;
      align-items: center; justify-content: space-between; gap: 12px;
    }
    .payout-banner-btn {
      background: #d97706; color: white; border: none;
      padding: 6px 14px; border-radius: 7px; font-size: 13px;
      font-weight: 600; cursor: pointer; white-space: nowrap; font-family: inherit;
    }

    /* ── Onboarding ── */
    .onboarding-shell {
      min-height: 100vh; display: flex; align-items: center; justify-content: center;
      padding: 24px; background: #f5f5f8;
    }
    .onboarding-card {
      background: white; border-radius: 16px; overflow: hidden;
      box-shadow: 0 4px 24px rgba(0,0,0,0.08);
      display: grid; grid-template-columns: 1fr 1fr;
      max-width: 900px; width: 100%;
    }
    .onboarding-left { padding: 40px 36px; display: flex; flex-direction: column; justify-content: center; }
    .onboarding-logo { display: flex; align-items: center; gap: 8px; margin-bottom: 28px; }
    .onboarding-logo-icon {
      width: 32px; height: 32px; border-radius: 8px;
      background: linear-gradient(135deg, #6f57e8, #8a76ef);
      display: flex; align-items: center; justify-content: center;
    }
    .onboarding-logo-text { font-size: 17px; font-weight: 800; color: #0a0a0f; letter-spacing: -0.4px; }
    .onboarding-title { font-size: 22px; font-weight: 700; color: #0a0a0f; line-height: 1.35; margin-bottom: 8px; letter-spacing: -0.4px; }
    .onboarding-sub { font-size: 14px; color: #6b6b7e; line-height: 1.6; margin-bottom: 28px; }
    .step-item { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 12px; }
    .step-dot-done {
      width: 26px; height: 26px; border-radius: 50%; background: #dcfce7;
      color: #15803d; display: flex; align-items: center; justify-content: center;
      font-size: 12px; font-weight: 700; flex-shrink: 0;
    }
    .step-dot-active {
      width: 26px; height: 26px; border-radius: 50%; background: #6f57e8;
      color: white; display: flex; align-items: center; justify-content: center;
      font-size: 12px; font-weight: 700; flex-shrink: 0;
    }
    .step-line { width: 2px; height: 14px; background: #eeeef2; margin-left: 12px; margin-bottom: 12px; }
    .step-title { font-size: 13px; font-weight: 600; color: #0a0a0f; }
    .step-desc { font-size: 12px; color: #9898aa; margin-top: 2px; }
    .instructions-box { background: #f5f5f8; border-radius: 9px; padding: 12px 14px; margin-bottom: 20px; }
    .instructions-title { font-size: 12px; font-weight: 600; color: #4a4a5a; margin-bottom: 6px; }
    .instructions-list { padding-left: 14px; }
    .instructions-list li { font-size: 12px; color: #6b6b7e; line-height: 2; }
    .onboarding-cta {
      display: block; width: 100%;
      background: #6f57e8; color: white;
      padding: 12px 20px; border-radius: 9px;
      font-size: 14px; font-weight: 600; border: none;
      cursor: pointer; margin-bottom: 8px; font-family: inherit;
      box-shadow: 0 4px 12px rgba(111,87,232,0.3); text-align: center;
    }
    .onboarding-cta-secondary {
      display: block; width: 100%;
      background: #0a0a0f; color: white;
      padding: 12px 20px; border-radius: 9px;
      font-size: 14px; font-weight: 600; border: none;
      cursor: pointer; margin-bottom: 12px; font-family: inherit; text-align: center;
    }
    .onboarding-hint { font-size: 11px; color: #9898aa; text-align: center; margin-bottom: 14px; }
    .onboarding-help {
      display: block; width: 100%;
      background: transparent; color: #6f57e8;
      padding: 10px 20px; border-radius: 9px;
      font-size: 13px; font-weight: 500; border: 1px solid #eeeef2;
      cursor: pointer; font-family: inherit; text-align: center;
    }
    .onboarding-right {
      background: linear-gradient(135deg, #6f57e8 0%, #0a0a0f 100%);
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; padding: 40px; gap: 24px;
    }
    .step-switcher { display: flex; align-items: flex-start; gap: 0; }
    .step-switch-item { display: flex; flex-direction: column; align-items: center; gap: 6px; cursor: pointer; }
    .step-switch-dot-active {
      width: 36px; height: 36px; border-radius: 50%; background: white;
      color: #6f57e8; display: flex; align-items: center; justify-content: center;
      font-size: 14px; font-weight: 700; transition: all 0.3s;
    }
    .step-switch-dot-inactive {
      width: 36px; height: 36px; border-radius: 50%; background: rgba(255,255,255,0.2);
      color: rgba(255,255,255,0.5); display: flex; align-items: center; justify-content: center;
      font-size: 14px; font-weight: 700; transition: all 0.3s;
    }
    .step-switch-label-active { font-size: 10px; color: white; text-align: center; max-width: 60px; }
    .step-switch-label-inactive { font-size: 10px; color: rgba(255,255,255,0.5); text-align: center; max-width: 60px; }
    .step-switch-line { width: 60px; height: 2px; background: rgba(255,255,255,0.3); margin-top: 18px; }
    .onboarding-video { width: 100%; border-radius: 12px; overflow: hidden; min-height: 240px; }
    .onboarding-video video { width: 100%; height: auto; object-fit: contain; border-radius: 12px; }
    .onboarding-step-label { color: rgba(255,255,255,0.4); font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; }

    /* ── Help modal ── */
    .modal-overlay {
      display: none; position: fixed; inset: 0;
      background: rgba(0,0,0,0.5); z-index: 100;
      align-items: center; justify-content: center; padding: 24px;
    }
    .modal-box {
      background: white; border-radius: 16px; padding: 32px;
      max-width: 480px; width: 100%; position: relative;
    }
    .modal-close {
      position: absolute; top: 16px; right: 16px;
      background: none; border: none; font-size: 20px;
      cursor: pointer; color: #9898aa; line-height: 1;
    }
    .modal-title { font-size: 18px; font-weight: 700; margin-bottom: 8px; color: #0a0a0f; }
    .modal-sub { font-size: 14px; color: #6b6b7e; margin-bottom: 16px; }
    .modal-video { width: 100%; border-radius: 8px; margin-bottom: 20px; max-height: 200px; object-fit: cover; }
    .modal-support-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 8px 0; border-bottom: 1px solid #f5f5f8; font-size: 13px; color: #4a4a5a;
    }
    .modal-support-row:last-child { border-bottom: none; }
    .modal-support-row a { color: #6f57e8; text-decoration: none; font-weight: 500; }

    @keyframes pulse {
      0%, 100% { box-shadow: 0 0 0 3px rgba(22,163,74,0.2); }
      50% { box-shadow: 0 0 0 5px rgba(22,163,74,0.1); }
    }

    @media (max-width: 768px) {
      .sidebar { display: none; }
      .main { margin-left: 0; max-width: 100vw; padding: 20px 16px; }
      .kpi-grid { grid-template-columns: repeat(2, 1fr); }
      .onboarding-card { grid-template-columns: 1fr; }
      .onboarding-right { display: none; }
      .payout-hero { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>

<!-- ── Help Modal ─────────────────────────────────────────────── -->
<div id="help-modal" class="modal-overlay">
  <div class="modal-box">
    <button class="modal-close" onclick="closeHelpModal()">×</button>
    <div class="modal-title">Quick Setup Guide</div>
    <div class="modal-sub">Watch how to activate Kablet in under 60 seconds.</div>
    <video autoplay muted loop playsinline class="modal-video">
      <source src="https://res.cloudinary.com/bc2i2xi2/video/upload/v1783510042/Installation-demo-vid_zbzram.mov" type="video/mp4">
    </video>
    <div style="border-top: 1px solid #eeeef2; padding-top: 16px;">
      <div class="modal-support-row"><span>📧 Email</span><a href="mailto:support@kablet.com">support@kablet.com</a></div>
      <div class="modal-support-row"><span>💬 WhatsApp</span><a href="https://wa.me/971561551029" target="_blank">+971 56 155 1029</a></div>
    </div>
  </div>
</div>

<!-- ── Onboarding ─────────────────────────────────────────────── -->
<div id="onboarding-state" style="display:none;">
  <div class="onboarding-shell">
    <div class="onboarding-card">
      <div class="onboarding-left">
        <div class="onboarding-logo">
          <div class="onboarding-logo-icon">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1L10 6H15L11 9L12.5 14.5L8 11.5L3.5 14.5L5 9L1 6H6L8 1Z" fill="white"/></svg>
          </div>
          <span class="onboarding-logo-text">Kablet</span>
        </div>
        <div class="onboarding-title">Start earning additional revenue from every completed order.</div>
        <div class="onboarding-sub">Complete one final step to activate Kablet. It takes less than a minute.</div>

        <div style="margin-bottom: 20px;">
          <div class="step-item">
            <div class="step-dot-done">✓</div>
            <div><div class="step-title">App Installed</div><div class="step-desc">Your store is connected to Kablet.</div></div>
          </div>
          <div class="step-line"></div>
          <div class="step-item">
            <div class="step-dot-active">2</div>
            <div><div class="step-title">Activate on your Thank You page</div><div class="step-desc">Add the Kablet block in your checkout editor.</div></div>
          </div>
        </div>

        <div class="instructions-box">
          <div class="instructions-title">What you'll do</div>
          <ul class="instructions-list">
            <li>Open the Shopify Checkout Editor</li>
            <li>Add the Kablet Offer block</li>
            <li>Click Save</li>
          </ul>
        </div>

        <button class="onboarding-cta" onclick="openEditor()">Open Checkout Editor →</button>
        <button class="onboarding-cta-secondary" onclick="completeSetup()">I've completed setup ✓</button>
        <div class="onboarding-hint">One-time setup · Takes less than 1 minute</div>
        <button class="onboarding-help" onclick="openHelpModal()">Need Help?</button>
      </div>

      <div class="onboarding-right">
        <div class="step-switcher">
          <div class="step-switch-item" onclick="switchToPreviewStep1()">
            <div id="step-indicator-1" class="step-switch-dot-active">1</div>
            <div id="step-label-1" class="step-switch-label-active">Setup</div>
          </div>
          <div class="step-switch-line"></div>
          <div class="step-switch-item" onclick="switchToPreviewStep2()">
            <div id="step-indicator-2" class="step-switch-dot-inactive">2</div>
            <div id="step-label-2" class="step-switch-label-inactive">Customer<br>Experience</div>
          </div>
        </div>

        <div id="right-col-step1" class="onboarding-video">
          <video autoplay muted loop playsinline>
            <source src="https://res.cloudinary.com/bc2i2xi2/video/upload/v1783510042/Installation-demo-vid_zbzram.mov" type="video/mp4">
          </video>
        </div>
        <div id="right-col-step2" class="onboarding-video" style="display:none; opacity:0;">
          <video autoplay muted loop playsinline>
            <source src="https://res.cloudinary.com/bc2i2xi2/video/upload/v1783510006/Customer-expiernce-demo-vid_kafvjf.mov" type="video/mp4">
          </video>
        </div>
        <div id="right-col-label" class="onboarding-step-label">Step 1 of 2 · Setup</div>
      </div>
    </div>
  </div>
</div>

<!-- ── Dashboard ──────────────────────────────────────────────── -->
<div id="dashboard-state" style="display:none;">
  <div class="shell">

    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="sidebar-logo">
        <div class="sidebar-logo-icon">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1L9 5H13L10 8L11 12L7 10L3 12L4 8L1 5H5L7 1Z" fill="white"/></svg>
        </div>
        <span class="sidebar-logo-text">Kablet</span>
      </div>
      <nav class="sidebar-nav">
        <button class="nav-item active" id="nav-overview" onclick="showTab('overview')">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity=".4"/><rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor"/><rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor"/><rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity=".4"/></svg>
          Dashboard
        </button>
        <button class="nav-item" id="nav-payouts" onclick="showTab('payouts')">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="4" width="14" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><path d="M1 7h14" stroke="currentColor" strokeWidth="1.5"/><path d="M4 10.5h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          Payouts
        </button>
        <button class="nav-item" id="nav-settings" onclick="showTab('settings')">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5"/><path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.05 3.05l1.06 1.06M11.89 11.89l1.06 1.06M3.05 12.95l1.06-1.06M11.89 4.11l1.06-1.06" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          Settings
        </button>
      </nav>
      <div class="sidebar-footer">
        <div class="sidebar-user">
          <div class="sidebar-avatar" id="sidebar-avatar">M</div>
          <div class="sidebar-email" id="sidebar-email">merchant</div>
        </div>
      </div>
    </aside>

    <!-- Main content -->
    <main class="main">

      <!-- Payout setup banner -->
      <div id="payout-banner" class="payout-banner">
        <span>⚠️ To receive your weekly payouts, please add your bank details in <strong>Settings</strong>.</span>
        <button class="payout-banner-btn" onclick="showTab('settings')">Add Bank Details</button>
      </div>

      <!-- OVERVIEW TAB -->
      <div id="tab-overview" class="tab-content">
        <div class="page-header">
          <div>
            <div class="page-title">Dashboard</div>
            <div class="page-subtitle">Revenue generated by Kablet's Decision Engine</div>
          </div>
          <div id="engine-badge" class="engine-badge active">
            <span class="engine-dot active"></span>
            Engine Active
          </div>
        </div>

        <div class="period-filter">
          <button class="period-btn active" onclick="setPeriod('today', this)">Today</button>
          <button class="period-btn" onclick="setPeriod('7d', this)">7 days</button>
          <button class="period-btn" onclick="setPeriod('30d', this)">30 days</button>
          <button class="period-btn" onclick="setPeriod('lifetime', this)">All time</button>
        </div>

        <div class="kpi-grid" id="kpi-grid">
          <div class="kpi-card accent">
            <div class="kpi-label">Additional Revenue</div>
            <div class="kpi-value" id="stat-revenue">—</div>
            <div class="kpi-sub">Generated by Kablet</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Revenue Per Order</div>
            <div class="kpi-value" id="stat-rpo">—</div>
            <div class="kpi-sub">Average uplift per transaction</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Acceptance Rate</div>
            <div class="kpi-value" id="stat-rate">—</div>
            <div class="kpi-sub">Customers who accepted</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Transactions Processed</div>
            <div class="kpi-value" id="stat-tx">—</div>
            <div class="kpi-sub">Orders analyzed by engine</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Opportunities Presented</div>
            <div class="kpi-value" id="stat-presented">—</div>
            <div class="kpi-sub">Shown to customers</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Opportunities Accepted</div>
            <div class="kpi-value" id="stat-completed">—</div>
            <div class="kpi-sub">Converted by customers</div>
          </div>
        </div>

        <div class="table-card">
          <div class="table-card-header">
            <div>
              <div class="table-card-title">Recent Transactions</div>
              <div class="table-card-sub" id="tx-count"></div>
            </div>
          </div>
          <div id="transactions"><div class="loading-state">Loading transactions…</div></div>
        </div>

        <div class="engine-strip">
          <div class="engine-strip-icon">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="3" stroke="white" strokeWidth="1.4"/><path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13" stroke="white" strokeWidth="1.4" strokeLinecap="round"/></svg>
          </div>
          <div style="flex:1;">
            <div class="engine-strip-title">Decision Engine is optimizing automatically</div>
            <div class="engine-strip-sub">Kablet analyzes every transaction and selects the highest-converting opportunity. No manual configuration needed.</div>
          </div>
        </div>
      </div>

      <!-- PAYOUTS TAB -->
      <div id="tab-payouts" class="tab-content" style="display:none;">
        <div class="page-header">
          <div>
            <div class="page-title">Payouts</div>
            <div class="page-subtitle">AED 8 per completed offer · Paid every Monday</div>
          </div>
        </div>
        <div id="payouts-content"><div class="loading-state">Loading payouts…</div></div>
      </div>

      <!-- SETTINGS TAB -->
      <div id="tab-settings" class="tab-content" style="display:none;">
        <div class="page-header">
          <div>
            <div class="page-title">Settings</div>
            <div class="page-subtitle">Manage your Kablet configuration and payout details</div>
          </div>
        </div>

        <!-- Engine status -->
        <div class="settings-section">
          <div class="settings-section-title">Kablet Status</div>
          <div class="status-row">
            <div class="status-label">
              <span class="status-dot green" id="status-dot"></span>
              <span id="status-text">Active</span>
            </div>
            <button class="btn-danger" id="toggle-status-btn" onclick="toggleKabletStatus()">Pause Kablet</button>
          </div>
        </div>

        <!-- Bank details -->
        <div class="settings-section">
          <div class="settings-section-title">Payout Bank Details</div>
          <div class="form-row">
            <label class="form-label">Full Name</label>
            <input class="form-input" type="text" id="full_name" placeholder="Your full legal name" />
          </div>
          <div class="form-row">
            <label class="form-label">Account Holder Name</label>
            <input class="form-input" type="text" id="account_holder_name" placeholder="Name on bank account" />
          </div>
          <div class="form-row">
            <label class="form-label">Bank Name</label>
            <input class="form-input" type="text" id="bank_name" placeholder="e.g. Emirates NBD" />
          </div>
          <div class="form-row">
            <label class="form-label">IBAN (UAE)</label>
            <input class="form-input" type="text" id="iban" placeholder="AE000000000000000000000" />
          </div>
          <button class="btn-primary" id="save-settings-btn" onclick="saveSettings()">Save Bank Details</button>
          <div class="success-msg" id="settings-success">✓ Saved successfully</div>
        </div>

        <!-- Support -->
        <div class="settings-section">
          <div class="settings-section-title">Support</div>
          <div class="support-link"><span>📧 Email</span><a href="mailto:support@kablet.com">support@kablet.com</a></div>
          <div class="support-link"><span>💬 WhatsApp</span><a href="https://wa.me/971561551029" target="_blank">+971 56 155 1029</a></div>
        </div>
      </div>

    </main>
  </div>
</div>

<script>
  const API = 'https://kablet-backend.onrender.com';
  let appBridgeToken = null;
  let currentPeriod = 'lifetime';
  let kabletEnabled = true;
  let currentPage = 1;
  let totalTransactions = 0;
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

  // ── Navigation ───────────────────────────────────────────────────────
  function showTab(tab) {
    ['overview','payouts','settings'].forEach(t => {
      const el = document.getElementById('tab-' + t);
      if (el) el.style.display = t === tab ? 'block' : 'none';
      const nav = document.getElementById('nav-' + t);
      if (nav) nav.classList.toggle('active', t === tab);
    });
    if (tab === 'payouts') loadPayouts();
    if (tab === 'settings') loadSettings();
  }

  // ── Onboarding ───────────────────────────────────────────────────────
  function showOnboarding() {
    document.getElementById('onboarding-state').style.display = 'block';
    document.getElementById('dashboard-state').style.display = 'none';
    startPreviewLoop();
  }

  function showDashboard() {
    document.getElementById('onboarding-state').style.display = 'none';
    document.getElementById('dashboard-state').style.display = 'block';
    stopPreviewLoop();
    loadOverview();
  }

  function startPreviewLoop() {
    previewInterval = setInterval(() => {
      if (currentPreviewStep === 1) switchToPreviewStep2();
      else switchToPreviewStep1();
    }, 5000);
  }

  function stopPreviewLoop() {
    if (previewInterval) { clearInterval(previewInterval); previewInterval = null; }
  }

  function switchToPreviewStep1() {
    currentPreviewStep = 1;
    document.getElementById('right-col-step1').style.display = 'block';
    document.getElementById('right-col-step2').style.display = 'none';
    document.getElementById('right-col-label').textContent = 'Step 1 of 2 · Setup';
    document.getElementById('step-indicator-1').className = 'step-switch-dot-active';
    document.getElementById('step-label-1').className = 'step-switch-label-active';
    document.getElementById('step-indicator-2').className = 'step-switch-dot-inactive';
    document.getElementById('step-label-2').className = 'step-switch-label-inactive';
  }

  function switchToPreviewStep2() {
    currentPreviewStep = 2;
    document.getElementById('right-col-step1').style.display = 'none';
    document.getElementById('right-col-step2').style.display = 'block';
    document.getElementById('right-col-label').textContent = 'Step 2 of 2 · Customer Experience';
    document.getElementById('step-indicator-2').className = 'step-switch-dot-active';
    document.getElementById('step-label-2').className = 'step-switch-label-active';
    document.getElementById('step-indicator-1').className = 'step-switch-dot-inactive';
    document.getElementById('step-label-1').className = 'step-switch-label-inactive';
  }

  function openHelpModal() {
    const m = document.getElementById('help-modal');
    m.style.display = 'flex';
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
    const { Redirect } = AppBridge.actions;
    const redirect = Redirect.create(app);
    redirect.dispatch(Redirect.Action.REMOTE, data.url);
  }

  async function completeSetup() {
    const token = await getToken();
    await fetch(API + '/dashboard/complete-setup', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token }
    });
    await fetch(API + '/dashboard/register-webhook', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token }
    });
    showDashboard();
  }

  // ── Overview ─────────────────────────────────────────────────────────
  function setPeriod(period, btn) {
    currentPeriod = period;
    currentPage = 1;
    document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    loadOverview();
  }

  function getStatusBadge(state) {
    const map = {
      COMPLETED: 'badge-green',
      ACCEPTED:  'badge-purple',
      PRESENTED: 'badge-yellow',
      DECLINED:  'badge-gray',
      EXPIRED:   'badge-gray',
      FAILED:    'badge-red',
    };
    const cls = map[state] || 'badge-gray';
    const label = state.charAt(0) + state.slice(1).toLowerCase();
    return '<span class="badge ' + cls + '">' + label + '</span>';
  }

  function fmtAED(n) {
    return 'AED ' + Number(n).toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function fmtDate(iso) {
    return new Date(iso).toLocaleDateString('en-AE', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function decisionLabel(type) {
    if (type === 'OPPORTUNITY_IDENTIFIED') return 'Matched';
    if (type === 'NO_ELIGIBLE_OPPORTUNITIES') return 'No match';
    if (type === 'CATALOG_EMPTY') return 'No catalog';
    return '—';
  }

  async function loadOverview() {
    document.getElementById('kpi-grid').style.opacity = '0.5';
    document.getElementById('transactions').innerHTML = '<div class="loading-state">Loading…</div>';

    const token = await getToken();
    const [summaryRes, txRes] = await Promise.all([
      fetch(API + '/dashboard/summary?period=' + currentPeriod, { headers: { Authorization: 'Bearer ' + token } }),
      fetch(API + '/dashboard/transactions?period=' + currentPeriod + '&page=' + currentPage, { headers: { Authorization: 'Bearer ' + token } }),
    ]);
    const summary = await summaryRes.json();
    const txData = await txRes.json();

    document.getElementById('stat-revenue').textContent = fmtAED(summary.total_revenue);
    document.getElementById('stat-rpo').textContent = fmtAED(summary.revenue_per_order);
    document.getElementById('stat-rate').textContent = summary.acceptance_rate + '%';
    document.getElementById('stat-tx').textContent = Number(summary.transactions_processed).toLocaleString();
    document.getElementById('stat-presented').textContent = Number(summary.opportunities_presented).toLocaleString();
    document.getElementById('stat-completed').textContent = Number(summary.opportunities_accepted).toLocaleString();
    document.getElementById('kpi-grid').style.opacity = '1';

    totalTransactions = txData.total || 0;
    document.getElementById('tx-count').textContent = totalTransactions.toLocaleString() + ' total';

    if (!txData.transactions || txData.transactions.length === 0) {
      document.getElementById('transactions').innerHTML = \`
        <div class="empty-state">
          <div class="empty-icon">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="5" width="14" height="10" rx="2" stroke="#9898aa" stroke-width="1.4"/><path d="M2 8h14" stroke="#9898aa" stroke-width="1.4"/></svg>
          </div>
          <div class="empty-title">No transactions yet</div>
          <div class="empty-sub">Transactions will appear here once your first order is processed</div>
        </div>\`;
      return;
    }

    const totalPages = Math.ceil(totalTransactions / 20);
    let html = '<div style="overflow-x:auto;"><table><thead><tr><th>Date</th><th>Order</th><th>Order Value</th><th>Opportunity</th><th>Decision</th><th style="text-align:right;">Revenue</th><th>Status</th></tr></thead><tbody>';
    txData.transactions.forEach(tx => {
      const instance = tx.instance;
      const revenue = (instance?.outcome_value)
        ? '<span class="td-green">' + fmtAED(instance.outcome_value) + '</span>'
        : '<span class="td-muted">—</span>';
      const status = instance ? getStatusBadge(instance.current_state) : '<span class="td-muted">—</span>';
      const offer = tx.offer_name
        ? '<span style="max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:block;">' + tx.offer_name + '</span>'
        : '<span class="td-muted">—</span>';
      html += '<tr>';
      html += '<td style="white-space:nowrap;color:#6b6b7e;">' + fmtDate(tx.received_at) + '</td>';
      html += '<td class="td-mono">#' + tx.shopify_order_id + '</td>';
      html += '<td class="td-bold">' + tx.transaction_currency + ' ' + Number(tx.transaction_value).toFixed(2) + '</td>';
      html += '<td>' + offer + '</td>';
      html += '<td style="color:#6b6b7e;font-size:12px;">' + decisionLabel(tx.decision?.outcome_type) + '</td>';
      html += '<td style="text-align:right;">' + revenue + '</td>';
      html += '<td>' + status + '</td>';
      html += '</tr>';
    });
    html += '</tbody></table></div>';

    if (totalPages > 1) {
      html += '<div class="pagination">';
      html += '<span class="pagination-info">Page ' + currentPage + ' of ' + totalPages + ' · ' + totalTransactions + ' transactions</span>';
      html += '<div class="pagination-btns">';
      html += '<button class="page-btn" ' + (currentPage <= 1 ? 'disabled' : '') + ' onclick="changePage(-1)">← Prev</button>';
      html += '<button class="page-btn" ' + (currentPage >= totalPages ? 'disabled' : '') + ' onclick="changePage(1)">Next →</button>';
      html += '</div></div>';
    }

    document.getElementById('transactions').innerHTML = html;
    checkPayoutSetup();
  }

  function changePage(dir) {
    currentPage += dir;
    loadOverview();
  }

  // ── Payouts ──────────────────────────────────────────────────────────
  async function loadPayouts() {
    document.getElementById('payouts-content').innerHTML = '<div class="loading-state">Loading payouts…</div>';
    const token = await getToken();
    const res = await fetch(API + '/payouts/summary', { headers: { Authorization: 'Bearer ' + token } });
    const data = await res.json();
    const cw = data.current_week;
    const lifetime = data.lifetime;
    const payouts = data.payouts;

    let html = '';
    html += '<div class="payout-hero">';
    html += '<div><div class="payout-hero-label">Pending This Week</div><div class="payout-hero-value">' + fmtAED(cw.amount) + '</div><div class="payout-hero-sub">' + cw.transactions + ' completed offers</div></div>';
    html += '<div><div class="payout-hero-label">Next Payout</div><div class="payout-hero-value">' + new Date(cw.next_payout_date).toLocaleDateString('en-AE', { month: 'long', day: 'numeric' }) + '</div><div class="payout-hero-sub">Every Monday · AED 8 per offer</div></div>';
    html += '<div><div class="payout-hero-label">Lifetime Earnings</div><div class="payout-hero-value">' + fmtAED(lifetime.earnings) + '</div><div class="payout-hero-sub">' + lifetime.transactions + ' completed offers</div></div>';
    html += '</div>';

    html += '<div class="table-card">';
    html += '<div class="table-card-header"><div class="table-card-title">Payout History</div></div>';
    if (!payouts || payouts.length === 0) {
      html += '<div class="empty-state"><div class="empty-title">No payouts yet</div><div class="empty-sub">Your first payout will arrive next Monday.</div></div>';
    } else {
      html += '<table><thead><tr><th>Period</th><th>Completed Offers</th><th>Amount</th><th>Status</th><th>Paid On</th></tr></thead><tbody>';
      payouts.forEach(p => {
        const statusCls = p.status === 'PAID' ? 'badge-green' : p.status === 'PROCESSING' ? 'badge-yellow' : 'badge-gray';
        const paidOn = p.paid_at ? fmtDate(p.paid_at) : '<span class="td-muted">—</span>';
        html += '<tr><td>' + p.period_start + ' – ' + p.period_end + '</td><td>' + p.transactions_count + '</td><td class="td-green">' + fmtAED(p.total_amount) + '</td><td><span class="badge ' + statusCls + '">' + p.status.charAt(0) + p.status.slice(1).toLowerCase() + '</span></td><td>' + paidOn + '</td></tr>';
      });
      html += '</tbody></table>';
    }
    html += '</div>';
    document.getElementById('payouts-content').innerHTML = html;
  }

  // ── Settings ─────────────────────────────────────────────────────────
  async function loadSettings() {
    const token = await getToken();
    const [bankRes, configRes] = await Promise.all([
      fetch(API + '/payouts/settings', { headers: { Authorization: 'Bearer ' + token } }),
      fetch(API + '/dashboard/config', { headers: { Authorization: 'Bearer ' + token } }),
    ]);
    const bankData = await bankRes.json();
    const configData = await configRes.json();

    if (bankData.settings) {
      document.getElementById('full_name').value = bankData.settings.full_name ?? '';
      document.getElementById('account_holder_name').value = bankData.settings.account_holder_name ?? '';
      document.getElementById('bank_name').value = bankData.settings.bank_name ?? '';
      document.getElementById('iban').value = bankData.settings.iban ?? '';
    }

    kabletEnabled = configData.offers_enabled;
    updateStatusUI();
  }

  function updateStatusUI() {
    const dot = document.getElementById('status-dot');
    const text = document.getElementById('status-text');
    const btn = document.getElementById('toggle-status-btn');
    const badge = document.getElementById('engine-badge');
    if (kabletEnabled) {
      dot.className = 'status-dot green';
      text.textContent = 'Active';
      btn.textContent = 'Pause Kablet';
      btn.className = 'btn-danger';
      if (badge) { badge.className = 'engine-badge active'; badge.innerHTML = '<span class="engine-dot active"></span> Engine Active'; }
    } else {
      dot.className = 'status-dot red';
      text.textContent = 'Paused';
      btn.textContent = 'Resume Kablet';
      btn.className = 'btn-resume';
      if (badge) { badge.className = 'engine-badge paused'; badge.innerHTML = '<span class="engine-dot paused"></span> Engine Paused'; }
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

  async function saveSettings() {
    const btn = document.getElementById('save-settings-btn');
    btn.disabled = true; btn.textContent = 'Saving…';
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
    btn.disabled = false; btn.textContent = 'Save Bank Details';
    const msg = document.getElementById('settings-success');
    msg.style.display = 'block';
    setTimeout(() => msg.style.display = 'none', 3000);
    checkPayoutSetup();
  }

  async function checkPayoutSetup() {
    const token = await getToken();
    const res = await fetch(API + '/payouts/settings', { headers: { Authorization: 'Bearer ' + token } });
    const data = await res.json();
    const hasDetails = data.settings?.iban && data.settings?.bank_name;
    const banner = document.getElementById('payout-banner');
    if (banner) banner.style.display = hasDetails ? 'none' : 'flex';
  }

  // ── Init ─────────────────────────────────────────────────────────────
  async function init() {
    const token = await getToken();
    const res = await fetch(API + '/dashboard/config', { headers: { Authorization: 'Bearer ' + token } });
    const data = await res.json();
    if (!data.setup_completed) {
      showOnboarding();
    } else {
      showDashboard();
    }
  }

  init();
</script>
</body>
</html>
    `;

    return reply.type('text/html').send(html);
  });
}
