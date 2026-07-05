import type { FastifyInstance } from 'fastify'
import { db } from '../db.js'

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
  <script src="https://unpkg.com/@shopify/app-bridge@3.7.10"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #f4f0fd;
      padding: 24px;
    }
    .tabs {
      display: flex;
      gap: 4px;
      margin-bottom: 24px;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 0;
    }
    .tab {
      padding: 8px 16px;
      font-size: 14px;
      font-weight: 500;
      color: #666;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      margin-bottom: -1px;
      background: none;
      border-top: none;
      border-left: none;
      border-right: none;
    }
    .tab.active {
  color: #673de6;
  border-bottom-color: #673de6;
}
    .tab-content { display: none; }
    .tab-content.active { display: block; }
    .header { margin-bottom: 24px; }
    .header h1 { font-size: 20px; font-weight: 600; color: #111; }
    .header p { color: #666; font-size: 14px; margin-top: 4px; }
    .stats {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin-bottom: 24px;
    }
    @media (min-width: 600px) { .stats { grid-template-columns: repeat(4, 1fr); } }
    .stat {
      background: white;
      border-radius: 8px;
      padding: 16px;
      border: 1px solid #e5e7eb;
    }
    .stat-label { font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
    .stat-value { font-size: 24px; font-weight: 700; color: #111; }
    .section-title { font-size: 16px; font-weight: 600; color: #111; margin-bottom: 12px; }
    .table-wrap { background: white; border-radius: 8px; border: 1px solid #e5e7eb; overflow: hidden; }
    table { width: 100%; font-size: 14px; border-collapse: collapse; }
    th { text-align: left; padding: 12px 16px; font-size: 12px; font-weight: 500; color: #666; text-transform: uppercase; border-bottom: 1px solid #e5e7eb; }
    td { padding: 12px 16px; border-bottom: 1px solid #f3f4f6; color: #374151; }
    tr:last-child td { border-bottom: none; }
    .badge { display: inline-flex; padding: 2px 8px; border-radius: 9999px; font-size: 12px; font-weight: 500; }
    .badge-green { background: #d1fae5; color: #065f46; }
    .badge-gray { background: #f3f4f6; color: #6b7280; }
    .badge-yellow { background: #fef3c7; color: #92400e; }
    .badge-purple { background: #ede9fe; color: #5530c4; }
    .empty { text-align: center; padding: 32px; color: #9ca3af; font-size: 14px; }
    .loading { text-align: center; padding: 48px; color: #6b7280; }
    .revenue { color: #059669; font-weight: 600; }
    .payout-card {
      background: white;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
      padding: 24px;
      margin-bottom: 16px;
    }
    .payout-card h3 { font-size: 16px; font-weight: 600; color: #111; margin-bottom: 16px; }
    .payout-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; }
    .payout-row:last-child { border-bottom: none; }
    .payout-row .label { color: #666; }
    .payout-row .value { font-weight: 600; color: #111; }
    .payout-row .value.green { color: #059669; }
    .form-group { margin-bottom: 16px; }
    .form-group label { display: block; font-size: 13px; font-weight: 500; color: #374151; margin-bottom: 6px; }
    .form-group input {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 14px;
      color: #111;
    }
    .form-group input:focus { outline: none; border-color: #673de6; box-shadow: 0 0 0 2px rgba(109,40,217,0.1); }
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
    .success-msg { color: #059669; font-size: 14px; margin-top: 12px; display: none; }
    .next-payout-banner {
      background: linear-gradient(135deg, #673de6, #5530c4);
      color: white;
      border-radius: 8px;
      padding: 20px 24px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .next-payout-banner .label { font-size: 13px; opacity: 0.8; margin-bottom: 4px; }
    .next-payout-banner .amount { font-size: 28px; font-weight: 700; }
    .next-payout-banner .date { font-size: 13px; opacity: 0.8; }
  </style>
</head>
<body>

  <div class="tabs">
    <button class="tab active" onclick="showTab('overview')">Overview</button>
    <button class="tab" onclick="showTab('payouts')">Payouts</button>
    <button class="tab" onclick="showTab('settings')">Settings</button>
  </div>

  <!-- OVERVIEW TAB -->
  <div id="tab-overview" class="tab-content active">
    <div class="header">
      <h1>Kablet Dashboard</h1>
      <p>Your post-purchase revenue performance</p>
    </div>
    <div class="stats">
      <div class="stat"><div class="stat-label">Revenue Generated</div><div class="stat-value" id="stat-revenue">—</div></div>
      <div class="stat"><div class="stat-label">Transactions</div><div class="stat-value" id="stat-tx">—</div></div>
      <div class="stat"><div class="stat-label">Offers Shown</div><div class="stat-value" id="stat-presented">—</div></div>
      <div class="stat"><div class="stat-label">Acceptance Rate</div><div class="stat-value" id="stat-rate">—</div></div>
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
      <p>AED 8 per completed transaction, paid every Monday</p>
    </div>
    <div id="payouts-content" class="loading">Loading...</div>
  </div>

  <!-- SETTINGS TAB -->
  <div id="tab-settings" class="tab-content">
    <div class="header">
      <h1>Payout Settings</h1>
      <p>Your bank details for weekly payouts</p>
    </div>
    <div class="payout-card">
      <h3>Bank Account Details</h3>
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
      <button class="btn" id="save-settings-btn" onclick="saveSettings()">Save Settings</button>
      <div class="success-msg" id="settings-success">✓ Settings saved successfully</div>
    </div>
  </div>

  <script>
    const API = 'https://kablet-backend.onrender.com';
    let appBridgeToken = null;

    const AppBridge = window['app-bridge'];
    const createApp = AppBridge.default;
    const { getSessionToken } = AppBridge.utilities;

    const app = createApp({
      apiKey: '468a9b31e9ad02a319dbc3b88d6b4039',
      host: new URLSearchParams(window.location.search).get('host'),
    });

    function showTab(name) {
      document.querySelectorAll('.tab').forEach((t, i) => {
        t.classList.toggle('active', ['overview','payouts','settings'][i] === name);
      });
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      document.getElementById('tab-' + name).classList.add('active');

      if (name === 'payouts') loadPayouts();
      if (name === 'settings') loadSettings();
    }

    async function getToken() {
      if (!appBridgeToken) {
        appBridgeToken = await getSessionToken(app);
      }
      return appBridgeToken;
    }

    async function loadOverview() {
      const token = await getToken();

      const summaryRes = await fetch(API + '/dashboard/summary', {
        headers: { Authorization: 'Bearer ' + token }
      });
      const summary = await summaryRes.json();

      document.getElementById('stat-revenue').textContent = 'AED ' + Number(summary.total_revenue).toFixed(2);
      document.getElementById('stat-tx').textContent = summary.transactions_processed;
      document.getElementById('stat-presented').textContent = summary.opportunities_presented;
      document.getElementById('stat-rate').textContent = summary.acceptance_rate + '%';

      const txRes = await fetch(API + '/dashboard/transactions', {
        headers: { Authorization: 'Bearer ' + token }
      });
      const txData = await txRes.json();

      if (!txData.transactions || txData.transactions.length === 0) {
        document.getElementById('transactions').innerHTML = '<div class="empty">No transactions yet</div>';
        return;
      }

      let html = '<table><thead><tr><th>Date</th><th>Order Value</th><th>Decision</th><th>Status</th><th>Revenue</th></tr></thead><tbody>';
      txData.transactions.forEach(tx => {
        const decision = tx.decision;
        const instance = tx.instance;
        const date = new Date(tx.received_at).toLocaleDateString();
        const value = tx.transaction_currency + ' ' + Number(tx.transaction_value).toFixed(2);
        const decisionText = decision?.outcome_type === 'OPPORTUNITY_IDENTIFIED' ? 'Offer shown'
          : decision?.outcome_type === 'NO_ELIGIBLE_OPPORTUNITIES' ? 'No match'
          : decision?.outcome_type === 'CATALOG_EMPTY' ? 'No catalog' : '—';

        let statusBadge = '—';
        if (instance) {
          const stateClass = instance.current_state === 'COMPLETED' ? 'badge-green'
            : instance.current_state === 'DECLINED' ? 'badge-gray'
            : instance.current_state === 'PRESENTED' ? 'badge-yellow'
            : 'badge-purple';
          statusBadge = '<span class="badge ' + stateClass + '">' + instance.current_state.toLowerCase() + '</span>';
        }

        const revenue = instance?.outcome_value
          ? '<span class="revenue">AED ' + Number(instance.outcome_value).toFixed(2) + '</span>' : '—';

        html += '<tr><td>' + date + '</td><td>' + value + '</td><td>' + decisionText + '</td><td>' + statusBadge + '</td><td>' + revenue + '</td></tr>';
      });
      html += '</tbody></table>';
      document.getElementById('transactions').innerHTML = html;
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

      // Next payout banner
      html += '<div class="next-payout-banner">';
      html += '<div><div class="label">Next payout</div><div class="amount">AED ' + Number(cw.amount).toFixed(2) + '</div><div class="date">Estimated ' + cw.next_payout_date + '</div></div>';
      html += '<div style="text-align:right"><div class="label">This week</div><div class="amount">' + cw.transactions + ' transactions</div></div>';
      html += '</div>';

      // Current week breakdown
      html += '<div class="payout-card"><h3>Current Week (' + cw.period_start + ' – ' + cw.period_end + ')</h3>';
      html += '<div class="payout-row"><span class="label">Completed transactions</span><span class="value">' + cw.transactions + '</span></div>';
      html += '<div class="payout-row"><span class="label">Rate per transaction</span><span class="value">AED 8.00</span></div>';
      html += '<div class="payout-row"><span class="label">Estimated payout</span><span class="value green">AED ' + Number(cw.amount).toFixed(2) + '</span></div>';
      html += '</div>';

      // Lifetime stats
      html += '<div class="payout-card"><h3>Lifetime Earnings</h3>';
      html += '<div class="payout-row"><span class="label">Total completed transactions</span><span class="value">' + lifetime.transactions + '</span></div>';
      html += '<div class="payout-row"><span class="label">Total earned</span><span class="value green">AED ' + Number(lifetime.earnings).toFixed(2) + '</span></div>';
      html += '</div>';

      // Payout history
      html += '<div class="section-title" style="margin-top:8px">Payout History</div>';
      html += '<div class="table-wrap">';
      if (!payouts || payouts.length === 0) {
        html += '<div class="empty">No payouts yet. Your first payout will arrive next Monday.</div>';
      } else {
        html += '<table><thead><tr><th>Period</th><th>Transactions</th><th>Amount</th><th>Status</th><th>Paid Date</th></tr></thead><tbody>';
        payouts.forEach(p => {
          const statusClass = p.status === 'PAID' ? 'badge-green' : p.status === 'PROCESSING' ? 'badge-yellow' : 'badge-gray';
          html += '<tr>';
          html += '<td>' + p.period_start + ' – ' + p.period_end + '</td>';
          html += '<td>' + p.transactions_count + '</td>';
          html += '<td class="revenue">AED ' + Number(p.total_amount).toFixed(2) + '</td>';
          html += '<td><span class="badge ' + statusClass + '">' + p.status.toLowerCase() + '</span></td>';
          html += '<td>' + (p.paid_at ? new Date(p.paid_at).toLocaleDateString() : '—') + '</td>';
          html += '</tr>';
        });
        html += '</tbody></table>';
      }
      html += '</div>';

      document.getElementById('payouts-content').innerHTML = html;
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
    }

    async function saveSettings() {
      const btn = document.getElementById('save-settings-btn');
      btn.disabled = true;
      btn.textContent = 'Saving...';

      const token = await getToken();
      const res = await fetch(API + '/payouts/settings', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          full_name: document.getElementById('full_name').value,
          account_holder_name: document.getElementById('account_holder_name').value,
          bank_name: document.getElementById('bank_name').value,
          iban: document.getElementById('iban').value,
        })
      });

      btn.disabled = false;
      btn.textContent = 'Save Settings';

      if (res.ok) {
        const msg = document.getElementById('settings-success');
        msg.style.display = 'block';
        setTimeout(() => msg.style.display = 'none', 3000);
      }
    }

    loadOverview();
  </script>
</body>
</html>
    `

    return reply.type('text/html').send(html)
  })
}