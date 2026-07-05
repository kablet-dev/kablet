import type { FastifyInstance } from 'fastify'
import { db } from '../db.js'

export async function embeddedRoutes(fastify: FastifyInstance) {

  // Embedded app home — loaded inside Shopify admin
  fastify.get('/app', async (request, reply) => {
    const { shop, session } = request.query as { shop?: string; session?: string }

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
      background: #f6f6f7;
      padding: 24px;
    }
    .header {
      margin-bottom: 24px;
    }
    .header h1 {
      font-size: 20px;
      font-weight: 600;
      color: #111;
    }
    .header p {
      color: #666;
      font-size: 14px;
      margin-top: 4px;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin-bottom: 24px;
    }
    @media (min-width: 600px) {
      .stats { grid-template-columns: repeat(4, 1fr); }
    }
    .stat {
      background: white;
      border-radius: 8px;
      padding: 16px;
      border: 1px solid #e5e7eb;
    }
    .stat-label {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 8px;
    }
    .stat-value {
      font-size: 24px;
      font-weight: 700;
      color: #111;
    }
    .section-title {
      font-size: 16px;
      font-weight: 600;
      color: #111;
      margin-bottom: 12px;
    }
    .table-wrap {
      background: white;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
      overflow: hidden;
    }
    table {
      width: 100%;
      font-size: 14px;
      border-collapse: collapse;
    }
    th {
      text-align: left;
      padding: 12px 16px;
      font-size: 12px;
      font-weight: 500;
      color: #666;
      text-transform: uppercase;
      border-bottom: 1px solid #e5e7eb;
    }
    td {
      padding: 12px 16px;
      border-bottom: 1px solid #f3f4f6;
      color: #374151;
    }
    tr:last-child td { border-bottom: none; }
    .badge {
      display: inline-flex;
      padding: 2px 8px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 500;
    }
    .badge-green { background: #d1fae5; color: #065f46; }
    .badge-gray { background: #f3f4f6; color: #6b7280; }
    .badge-yellow { background: #fef3c7; color: #92400e; }
    .empty {
      text-align: center;
      padding: 32px;
      color: #9ca3af;
      font-size: 14px;
    }
    .loading { text-align: center; padding: 48px; color: #6b7280; }
    .revenue { color: #059669; font-weight: 600; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Kablet Dashboard</h1>
    <p>Your post-purchase revenue performance</p>
  </div>

  <div id="stats" class="stats">
    <div class="stat"><div class="stat-label">Revenue Generated</div><div class="stat-value" id="stat-revenue">—</div></div>
    <div class="stat"><div class="stat-label">Transactions</div><div class="stat-value" id="stat-tx">—</div></div>
    <div class="stat"><div class="stat-label">Offers Shown</div><div class="stat-value" id="stat-presented">—</div></div>
    <div class="stat"><div class="stat-label">Acceptance Rate</div><div class="stat-value" id="stat-rate">—</div></div>
  </div>

  <div class="section-title">Recent Transactions</div>
  <div class="table-wrap">
    <div id="transactions" class="loading">Loading...</div>
  </div>

  <script>
    const shop = '${shop}';
    const API = 'https://kablet-backend.onrender.com';

    // Initialize App Bridge
    const AppBridge = window['app-bridge'];
    const createApp = AppBridge.default;
    const app = createApp({
      apiKey: '67a720f66e77c1e3f597ddef97dbde0e',
      host: new URLSearchParams(window.location.search).get('host'),
    });

    // Get session token for authenticated API calls
    const { getSessionToken } = AppBridge.utilities;

    async function loadDashboard() {
      try {
        const token = await getSessionToken(app);

        // Load summary
        const summaryRes = await fetch(API + '/dashboard/summary', {
          headers: { Authorization: 'Bearer ' + token }
        });
        const summary = await summaryRes.json();

        document.getElementById('stat-revenue').textContent = 'AED ' + Number(summary.total_revenue).toFixed(2);
        document.getElementById('stat-tx').textContent = summary.transactions_processed;
        document.getElementById('stat-presented').textContent = summary.opportunities_presented;
        document.getElementById('stat-rate').textContent = summary.acceptance_rate + '%';

        // Load transactions
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
    : decision?.outcome_type === 'CATALOG_EMPTY' ? 'No catalog'
    : '—';
  
  let statusBadge = '—';
  if (instance) {
    const stateClass = instance.current_state === 'COMPLETED' ? 'badge-green'
      : instance.current_state === 'DECLINED' ? 'badge-gray' : 'badge-yellow';
    statusBadge = '<span class="badge ' + stateClass + '">' + instance.current_state.toLowerCase() + '</span>';
  }

  const revenue = instance?.outcome_value
    ? '<span class="revenue">AED ' + Number(instance.outcome_value).toFixed(2) + '</span>'
    : '—';

  html += '<tr><td>' + date + '</td><td>' + value + '</td><td>' + decisionText + '</td><td>' + statusBadge + '</td><td>' + revenue + '</td></tr>';
});

        html += '</tbody></table>';
        document.getElementById('transactions').innerHTML = html;

      } catch (err) {
        document.getElementById('transactions').innerHTML = '<div class="empty">Error loading data: ' + err.message + '</div>';
      }
    }

    loadDashboard();
  </script>
</body>
</html>
    `

    return reply.type('text/html').send(html)
  })
}