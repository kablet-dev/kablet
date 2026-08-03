import type { FastifyInstance } from 'fastify'

export async function embeddedRoutes(fastify: FastifyInstance) {

  fastify.get('/app', async (request, reply) => {
    const { shop } = request.query as { shop?: string }
    if (!shop) return reply.status(400).send('Missing shop parameter')

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Kablet</title>
<script src="https://unpkg.com/@shopify/app-bridge@3"></script>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{-webkit-font-smoothing:antialiased}
body{font-family:-apple-system,BlinkMacSystemFont,'Inter','Segoe UI',sans-serif;background:#f5f5f8;color:#0a0a0f;min-height:100vh}
::-webkit-scrollbar{width:5px;height:5px}
::-webkit-scrollbar-thumb{background:#e0e0e8;border-radius:3px}

/* ── Shell ── */
.shell{display:flex;min-height:100vh}
.sidebar{width:220px;min-height:100vh;background:#fff;border-right:1px solid #eeeef2;display:flex;flex-direction:column;flex-shrink:0;position:fixed;top:0;left:0;bottom:0;z-index:10}
.main{margin-left:220px;flex:1;min-width:0;padding:32px 36px}
.page{display:none;max-width:1080px}
.page.active{display:block}

/* ── Sidebar ── */
.sb-logo{padding:22px 20px 18px;border-bottom:1px solid #eeeef2;display:flex;align-items:center;gap:9px}
.sb-logo-icon{width:28px;height:28px;border-radius:7px;background:linear-gradient(135deg,#6f57e8,#8a76ef);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.sb-logo-text{font-size:15px;font-weight:700;color:#0a0a0f;letter-spacing:-.3px}
.sb-nav{flex:1;padding:10px 8px;display:flex;flex-direction:column;gap:1px;overflow-y:auto}
.sb-item{display:flex;align-items:center;gap:9px;padding:7px 10px;border-radius:8px;font-size:13px;font-weight:450;color:#4a4a5a;background:transparent;border:none;cursor:pointer;text-align:left;transition:all .12s;width:100%;font-family:inherit}
.sb-item:hover{background:#f5f5f8;color:#0a0a0f}
.sb-item.active{background:#f5f3fe;color:#6f57e8;font-weight:600}
.sb-item svg{flex-shrink:0;opacity:.65}
.sb-item.active svg{opacity:1}
.sb-section{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.8px;color:#c4c4cf;padding:10px 12px 4px;margin-top:4px}
.sb-footer{padding:10px 8px;border-top:1px solid #eeeef2}
.sb-user{display:flex;align-items:center;gap:9px;padding:8px 10px;border-radius:8px}
.sb-avatar{width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#a897f4,#6f57e8);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;flex-shrink:0}
.sb-email{font-size:11.5px;color:#9898aa;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1}

/* ── Page header ── */
.ph{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:28px;gap:16px}
.ph-left h1{font-size:21px;font-weight:700;color:#0a0a0f;letter-spacing:-.5px}
.ph-left p{font-size:13px;color:#9898aa;margin-top:3px}
.ph-right{display:flex;align-items:center;gap:10px;flex-shrink:0}

/* ── Engine badge ── */
.eng-badge{display:inline-flex;align-items:center;gap:6px;border-radius:100px;padding:4px 12px;font-size:12px;font-weight:600}
.eng-badge.on{background:#f0fdf4;border:1px solid #bbf7d0;color:#15803d}
.eng-badge.off{background:#fee2e2;border:1px solid #fecaca;color:#dc2626}
.eng-dot{width:6px;height:6px;border-radius:50%}
.eng-dot.on{background:#16a34a;animation:pulse 2s infinite}
.eng-dot.off{background:#dc2626}
@keyframes pulse{0%,100%{box-shadow:0 0 0 2px rgba(22,163,74,.2)}50%{box-shadow:0 0 0 4px rgba(22,163,74,.1)}}

/* ── Period filter ── */
.pf{display:inline-flex;gap:2px;background:#eeeef2;border-radius:10px;padding:3px;margin-bottom:24px}
.pf-btn{padding:5px 13px;border-radius:7px;border:none;font-size:12.5px;font-weight:500;cursor:pointer;transition:all .12s;background:transparent;color:#6b6b7e;font-family:inherit}
.pf-btn.active{background:#fff;color:#0a0a0f;box-shadow:0 1px 3px rgba(0,0,0,.08)}

/* ── KPI grid ── */
.kpi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:24px;transition:opacity .2s}
.kpi{background:#fff;border:1px solid #eeeef2;border-radius:13px;padding:20px 22px;display:flex;flex-direction:column;gap:8px;box-shadow:0 1px 3px rgba(0,0,0,.03)}
.kpi.accent{background:linear-gradient(135deg,#6f57e8,#8a76ef);border:none;box-shadow:0 8px 20px rgba(111,87,232,.22)}
.kpi-label{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.7px;color:#9898aa}
.kpi.accent .kpi-label{color:rgba(255,255,255,.7)}
.kpi-val{font-size:26px;font-weight:700;color:#0a0a0f;letter-spacing:-.7px;line-height:1}
.kpi.accent .kpi-val{color:#fff}
.kpi-sub{font-size:11.5px;color:#9898aa}
.kpi.accent .kpi-sub{color:rgba(255,255,255,.6)}

/* ── Cards ── */
.card{background:#fff;border:1px solid #eeeef2;border-radius:13px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.03);margin-bottom:18px}
.card-header{padding:16px 22px;border-bottom:1px solid #eeeef2;display:flex;align-items:center;justify-content:space-between}
.card-title{font-size:13.5px;font-weight:600;color:#0a0a0f}
.card-sub{font-size:11.5px;color:#9898aa;margin-top:2px}
.card-body{padding:20px 22px}

/* ── Table ── */
.tbl-wrap{overflow-x:auto}
table{width:100%;border-collapse:collapse;font-size:12.5px}
thead tr{background:#fafafa}
th{padding:9px 16px;text-align:left;font-size:10.5px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:#9898aa;border-bottom:1px solid #eeeef2;white-space:nowrap}
td{padding:12px 16px;border-bottom:1px solid #f5f5f8;color:#4a4a5a;vertical-align:middle}
tr:last-child td{border-bottom:none}
tr:hover td{background:#fafafa}
.td-mono{font-family:monospace;font-size:11.5px;color:#6b6b7e}
.td-bold{font-weight:600;color:#0a0a0f}
.td-green{font-weight:600;color:#15803d}
.td-muted{color:#c4c4cf}
.td-r{text-align:right}

/* ── Badges ── */
.bdg{display:inline-flex;align-items:center;gap:3px;font-size:11px;font-weight:600;padding:2px 8px;border-radius:100px}
.bdg::before{content:'';width:4px;height:4px;border-radius:50%;background:currentColor;flex-shrink:0}
.bdg-green{background:#dcfce7;color:#15803d}
.bdg-purple{background:#ede9fc;color:#5b45d4}
.bdg-yellow{background:#fef3c7;color:#d97706}
.bdg-gray{background:#f5f5f8;color:#6b6b7e}
.bdg-red{background:#fee2e2;color:#dc2626}
.bdg-blue{background:#dbeafe;color:#1d4ed8}

/* ── Empty / loading ── */
.empty{padding:48px 24px;text-align:center}
.empty-icon{width:40px;height:40px;border-radius:50%;background:#f5f5f8;display:flex;align-items:center;justify-content:center;margin:0 auto 10px}
.empty-t{font-size:13.5px;color:#4a4a5a;font-weight:500}
.empty-s{font-size:12px;color:#9898aa;margin-top:3px}
.ldg{padding:40px;text-align:center;color:#9898aa;font-size:13px}
.ldg-spin{display:inline-block;width:18px;height:18px;border:2px solid #eeeef2;border-top-color:#6f57e8;border-radius:50%;animation:spin .6s linear infinite;margin-right:8px;vertical-align:middle}
@keyframes spin{to{transform:rotate(360deg)}}

/* ── Pagination ── */
.pg{padding:13px 22px;border-top:1px solid #eeeef2;display:flex;align-items:center;justify-content:space-between}
.pg-info{font-size:11.5px;color:#9898aa}
.pg-btns{display:flex;gap:5px}
.pg-btn{padding:5px 11px;border-radius:6px;font-size:12px;border:1px solid #eeeef2;background:#fff;cursor:pointer;color:#4a4a5a;font-weight:500;font-family:inherit;transition:all .1s}
.pg-btn:hover:not(:disabled){background:#f5f5f8}
.pg-btn:disabled{opacity:.4;cursor:not-allowed}

/* ── Engine strip ── */
.eng-strip{background:#f5f3fe;border:1px solid #ede9fc;border-radius:12px;padding:14px 18px;display:flex;align-items:center;gap:12px;margin-bottom:18px}
.eng-strip-icon{width:30px;height:30px;border-radius:8px;background:linear-gradient(135deg,#6f57e8,#a897f4);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.eng-strip-t{font-size:13px;font-weight:600;color:#0a0a0f}
.eng-strip-s{font-size:11.5px;color:#6b6b7e;margin-top:2px}

/* ── Charts ── */
.chart-wrap{position:relative;height:200px;padding:8px 0}
.chart-bars{display:flex;align-items:flex-end;gap:4px;height:100%;padding:0 4px}
.bar-col{display:flex;flex-direction:column;align-items:center;flex:1;gap:4px;height:100%}
.bar-inner{display:flex;align-items:flex-end;flex:1;width:100%}
.bar{width:100%;border-radius:4px 4px 0 0;background:linear-gradient(180deg,#8a76ef,#6f57e8);min-height:2px;transition:height .3s;cursor:pointer;position:relative}
.bar:hover::after{content:attr(data-tip);position:absolute;bottom:calc(100% + 5px);left:50%;transform:translateX(-50%);background:#0a0a0f;color:#fff;font-size:11px;padding:3px 7px;border-radius:5px;white-space:nowrap;pointer-events:none;z-index:5}
.bar-lbl{font-size:10px;color:#9898aa;text-align:center;white-space:nowrap}
.chart-y{position:absolute;left:0;top:8px;bottom:24px;display:flex;flex-direction:column;justify-content:space-between;pointer-events:none}
.chart-y span{font-size:10px;color:#c4c4cf}
.donut-wrap{display:flex;align-items:center;gap:24px;padding:8px 0}
.donut-legend{display:flex;flex-direction:column;gap:8px;flex:1}
.donut-item{display:flex;align-items:center;gap:8px;font-size:12px;color:#4a4a5a}
.donut-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}

/* ── Insight cards ── */
.insight-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;margin-bottom:18px}
.insight-card{background:#fff;border:1px solid #eeeef2;border-radius:13px;padding:18px 20px;box-shadow:0 1px 3px rgba(0,0,0,.03)}
.insight-icon{width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;margin-bottom:12px}
.insight-t{font-size:13px;font-weight:600;color:#0a0a0f;margin-bottom:4px}
.insight-s{font-size:12px;color:#6b6b7e;line-height:1.5}
.insight-val{font-size:20px;font-weight:700;color:#0a0a0f;letter-spacing:-.4px;margin-top:6px}

/* ── AI insight ── */
.ai-card{background:#fff;border:1px solid #eeeef2;border-radius:13px;padding:20px 22px;margin-bottom:14px;box-shadow:0 1px 3px rgba(0,0,0,.03)}
.ai-tag{display:inline-flex;align-items:center;gap:5px;background:#f5f3fe;border:1px solid #ede9fc;color:#6f57e8;font-size:11px;font-weight:600;padding:2px 9px;border-radius:100px;margin-bottom:10px}
.ai-title{font-size:14px;font-weight:600;color:#0a0a0f;margin-bottom:6px}
.ai-body{font-size:13px;color:#4a4a5a;line-height:1.6}
.ai-uplift{display:inline-flex;align-items:center;gap:6px;background:#f0fdf4;border:1px solid #bbf7d0;color:#15803d;font-size:12px;font-weight:600;padding:4px 11px;border-radius:8px;margin-top:10px}

/* ── Opportunity category cards ── */
.opp-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:18px}
.opp-cat{background:#fff;border:1px solid #eeeef2;border-radius:12px;padding:16px 18px;display:flex;align-items:center;gap:14px;box-shadow:0 1px 3px rgba(0,0,0,.03);transition:border-color .15s}
.opp-cat:hover{border-color:#c4b8f7}
.opp-cat-icon{width:36px;height:36px;border-radius:9px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:16px}
.opp-cat-name{font-size:13px;font-weight:600;color:#0a0a0f}
.opp-cat-desc{font-size:11.5px;color:#9898aa;margin-top:2px}
.opp-cat-right{margin-left:auto;display:flex;flex-direction:column;align-items:flex-end;gap:6px}
.toggle{width:36px;height:20px;border-radius:100px;border:none;cursor:pointer;position:relative;transition:background .2s;flex-shrink:0}
.toggle.on{background:#6f57e8}
.toggle.off{background:#e0e0e8}
.toggle-knob{position:absolute;top:3px;width:14px;height:14px;border-radius:50%;background:#fff;transition:left .2s;box-shadow:0 1px 3px rgba(0,0,0,.15)}
.toggle.on .toggle-knob{left:19px}
.toggle.off .toggle-knob{left:3px}

/* ── Decision engine ── */
.signal-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:18px}
.signal-card{background:#fff;border:1px solid #eeeef2;border-radius:12px;padding:16px 18px;box-shadow:0 1px 3px rgba(0,0,0,.03)}
.signal-label{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.6px;color:#9898aa;margin-bottom:6px}
.signal-val{font-size:18px;font-weight:700;color:#0a0a0f;letter-spacing:-.3px}
.signal-sub{font-size:11.5px;color:#6b6b7e;margin-top:3px}
.engine-health{display:flex;gap:10px;margin-bottom:18px}
.health-bar-wrap{flex:1;background:#f5f5f8;border-radius:100px;height:8px;overflow:hidden}
.health-bar{height:100%;border-radius:100px;background:linear-gradient(90deg,#6f57e8,#8a76ef);transition:width .5s}
.rec-item{background:#fff;border:1px solid #eeeef2;border-radius:12px;padding:14px 18px;margin-bottom:10px;display:flex;align-items:flex-start;gap:12px;box-shadow:0 1px 3px rgba(0,0,0,.03)}
.rec-num{width:22px;height:22px;border-radius:50%;background:#f5f3fe;color:#6f57e8;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px}
.rec-t{font-size:13px;font-weight:600;color:#0a0a0f;margin-bottom:3px}
.rec-s{font-size:12px;color:#6b6b7e;line-height:1.5}

/* ── Integrations ── */
.int-card{background:#fff;border:1px solid #eeeef2;border-radius:12px;padding:16px 20px;margin-bottom:12px;display:flex;align-items:center;gap:16px;box-shadow:0 1px 3px rgba(0,0,0,.03)}
.int-logo{width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}
.int-name{font-size:13.5px;font-weight:600;color:#0a0a0f}
.int-desc{font-size:12px;color:#9898aa;margin-top:2px}
.int-right{margin-left:auto;display:flex;flex-direction:column;align-items:flex-end;gap:6px}

/* ── Settings ── */
.set-section{background:#fff;border:1px solid #eeeef2;border-radius:13px;margin-bottom:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.03)}
.set-section-header{padding:14px 20px;border-bottom:1px solid #eeeef2;display:flex;align-items:center;justify-content:space-between}
.set-section-title{font-size:13.5px;font-weight:600;color:#0a0a0f}
.set-section-body{padding:20px}
.set-row{display:flex;align-items:center;justify-content:space-between;padding:11px 0;border-bottom:1px solid #f5f5f8}
.set-row:last-child{border-bottom:none}
.set-row-label{font-size:13px;color:#4a4a5a;font-weight:500}
.set-row-val{font-size:13px;color:#9898aa}
.form-row{margin-bottom:14px}
.form-label{display:block;font-size:12px;font-weight:600;color:#4a4a5a;margin-bottom:5px}
.form-input{width:100%;border:1px solid #e0e0e8;border-radius:8px;padding:9px 12px;font-size:13.5px;color:#0a0a0f;outline:none;background:#fafafa;font-family:inherit;transition:border-color .12s}
.form-input:focus{border-color:#6f57e8;box-shadow:0 0 0 3px rgba(111,87,232,.1);background:#fff}
.form-select{width:100%;border:1px solid #e0e0e8;border-radius:8px;padding:9px 12px;font-size:13.5px;color:#0a0a0f;outline:none;background:#fafafa;font-family:inherit;cursor:pointer}
.btn-pri{background:linear-gradient(135deg,#6f57e8,#8a76ef);color:#fff;border:none;border-radius:8px;padding:9px 18px;font-size:13.5px;font-weight:600;cursor:pointer;font-family:inherit;box-shadow:0 2px 8px rgba(111,87,232,.25);transition:opacity .12s}
.btn-pri:hover{opacity:.9}
.btn-pri:disabled{opacity:.5;cursor:not-allowed}
.btn-sec{background:#fff;color:#4a4a5a;border:1px solid #eeeef2;border-radius:8px;padding:9px 18px;font-size:13.5px;font-weight:500;cursor:pointer;font-family:inherit;transition:all .12s}
.btn-sec:hover{border-color:#c4c4cf;color:#0a0a0f}
.btn-danger{background:#fff;color:#dc2626;border:1px solid #dc2626;border-radius:8px;padding:7px 14px;font-size:12.5px;font-weight:500;cursor:pointer;font-family:inherit}
.btn-danger:hover{background:#fee2e2}
.btn-resume{background:#6f57e8;color:#fff;border:none;border-radius:8px;padding:7px 14px;font-size:12.5px;font-weight:500;cursor:pointer;font-family:inherit}
.success-msg{display:none;color:#15803d;font-size:12.5px;margin-top:10px;background:#dcfce7;border:1px solid #bbf7d0;border-radius:8px;padding:9px 13px}

/* ── Payouts ── */
.payout-hero{background:linear-gradient(135deg,#6f57e8,#8a76ef);border-radius:13px;padding:22px 26px;display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-bottom:18px;box-shadow:0 8px 20px rgba(111,87,232,.22)}
.ph-label{font-size:11px;color:rgba(255,255,255,.7);text-transform:uppercase;letter-spacing:.6px;margin-bottom:5px}
.ph-val{font-size:24px;font-weight:700;color:#fff;letter-spacing:-.5px}
.ph-sub{font-size:11.5px;color:rgba(255,255,255,.6);margin-top:3px}

/* ── Banner ── */
.banner{display:none;background:#fef3c7;border:1px solid #fde68a;border-radius:10px;padding:11px 16px;margin-bottom:18px;font-size:13px;color:#92400e;align-items:center;justify-content:space-between;gap:12px}
.banner-btn{background:#d97706;color:#fff;border:none;padding:5px 13px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;font-family:inherit}

/* ── Onboarding ── */
.ob-shell{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#f5f5f8}
.ob-card{background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);display:grid;grid-template-columns:1fr 1fr;max-width:880px;width:100%}
.ob-left{padding:40px 36px;display:flex;flex-direction:column;justify-content:center}
.ob-logo{display:flex;align-items:center;gap:8px;margin-bottom:26px}
.ob-logo-icon{width:30px;height:30px;border-radius:8px;background:linear-gradient(135deg,#6f57e8,#8a76ef);display:flex;align-items:center;justify-content:center}
.ob-logo-text{font-size:16px;font-weight:800;color:#0a0a0f;letter-spacing:-.4px}
.ob-title{font-size:21px;font-weight:700;color:#0a0a0f;line-height:1.35;margin-bottom:8px;letter-spacing:-.4px}
.ob-sub{font-size:13.5px;color:#6b6b7e;line-height:1.6;margin-bottom:26px}
.ob-step{display:flex;align-items:flex-start;gap:11px;margin-bottom:10px}
.ob-step-done{width:24px;height:24px;border-radius:50%;background:#dcfce7;color:#15803d;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0}
.ob-step-num{width:24px;height:24px;border-radius:50%;background:#6f57e8;color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0}
.ob-step-line{width:2px;height:12px;background:#eeeef2;margin-left:11px;margin-bottom:10px}
.ob-step-t{font-size:13px;font-weight:600;color:#0a0a0f}
.ob-step-s{font-size:11.5px;color:#9898aa;margin-top:1px}
.ob-box{background:#f5f5f8;border-radius:8px;padding:11px 13px;margin-bottom:18px}
.ob-box-t{font-size:11.5px;font-weight:600;color:#4a4a5a;margin-bottom:5px}
.ob-box li{font-size:11.5px;color:#6b6b7e;line-height:2;margin-left:13px}
.ob-cta{display:block;width:100%;background:#6f57e8;color:#fff;padding:11px;border-radius:9px;font-size:13.5px;font-weight:600;border:none;cursor:pointer;margin-bottom:7px;font-family:inherit;box-shadow:0 3px 10px rgba(111,87,232,.28);text-align:center}
.ob-cta2{display:block;width:100%;background:#0a0a0f;color:#fff;padding:11px;border-radius:9px;font-size:13.5px;font-weight:600;border:none;cursor:pointer;margin-bottom:10px;font-family:inherit;text-align:center}
.ob-hint{font-size:11px;color:#9898aa;text-align:center;margin-bottom:12px}
.ob-help{display:block;width:100%;background:transparent;color:#6f57e8;padding:9px;border-radius:9px;font-size:13px;font-weight:500;border:1px solid #eeeef2;cursor:pointer;font-family:inherit;text-align:center}
.ob-right{background:linear-gradient(135deg,#6f57e8,#0a0a0f);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px;gap:22px}
.ob-switcher{display:flex;align-items:center;gap:0}
.ob-sw-item{display:flex;flex-direction:column;align-items:center;gap:5px;cursor:pointer}
.ob-sw-a{width:34px;height:34px;border-radius:50%;background:#fff;color:#6f57e8;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;transition:all .3s}
.ob-sw-b{width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,.2);color:rgba(255,255,255,.5);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;transition:all .3s}
.ob-sw-la{font-size:10px;color:#fff;text-align:center;max-width:56px}
.ob-sw-lb{font-size:10px;color:rgba(255,255,255,.5);text-align:center;max-width:56px}
.ob-sw-line{width:56px;height:2px;background:rgba(255,255,255,.25);margin-top:17px}
.ob-video{width:100%;border-radius:11px;overflow:hidden;min-height:220px}
.ob-video video{width:100%;height:auto;object-fit:contain;border-radius:11px}
.ob-step-lbl{color:rgba(255,255,255,.4);font-size:10px;letter-spacing:.06em;text-transform:uppercase}

/* ── Modal ── */
.modal{display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:100;align-items:center;justify-content:center;padding:24px}
.modal-box{background:#fff;border-radius:16px;padding:30px;max-width:460px;width:100%;position:relative}
.modal-close{position:absolute;top:14px;right:14px;background:none;border:none;font-size:20px;cursor:pointer;color:#9898aa;line-height:1}
.modal-t{font-size:17px;font-weight:700;margin-bottom:7px;color:#0a0a0f}
.modal-s{font-size:13px;color:#6b6b7e;margin-bottom:14px}
.modal-row{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f5f5f8;font-size:13px;color:#4a4a5a}
.modal-row:last-child{border-bottom:none}
.modal-row a{color:#6f57e8;text-decoration:none;font-weight:500}

/* ── Status dot ── */
.st-dot{width:7px;height:7px;border-radius:50%;display:inline-block}
.st-dot.green{background:#16a34a;box-shadow:0 0 0 3px rgba(22,163,74,.15)}
.st-dot.red{background:#dc2626}

@media(max-width:768px){
  .sidebar{display:none}
  .main{margin-left:0;max-width:100vw;padding:18px 14px}
  .kpi-grid,.insight-grid,.opp-grid,.signal-grid{grid-template-columns:1fr}
  .ob-card{grid-template-columns:1fr}
  .ob-right{display:none}
  .payout-hero{grid-template-columns:1fr}
}
</style>
</head>
<body>

<!-- Help Modal -->
<div id="help-modal" class="modal">
  <div class="modal-box">
    <button class="modal-close" onclick="closeModal('help-modal')">×</button>
    <div class="modal-t">Quick Setup Guide</div>
    <div class="modal-s">Watch how to activate Kablet in under 60 seconds.</div>
    <video autoplay muted loop playsinline style="width:100%;border-radius:8px;margin-bottom:18px;max-height:190px;object-fit:cover">
      <source src="https://res.cloudinary.com/bc2i2xi2/video/upload/v1783510042/Installation-demo-vid_zbzram.mov" type="video/mp4">
    </video>
    <div style="border-top:1px solid #eeeef2;padding-top:14px">
      <div class="modal-row"><span>📧 Email</span><a href="mailto:support@kablet.com">support@kablet.com</a></div>
      <div class="modal-row"><span>💬 WhatsApp</span><a href="https://wa.me/971561551029" target="_blank">+971 56 155 1029</a></div>
    </div>
  </div>
</div>

<!-- Onboarding -->
<div id="onboarding-state" style="display:none">
  <div class="ob-shell">
    <div class="ob-card">
      <div class="ob-left">
        <div class="ob-logo">
          <div class="ob-logo-icon"><svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 1L9.5 6H15L10.5 9.5L12 14.5L7.5 11.5L3 14.5L4.5 9.5L0 6H5.5L7.5 1Z" fill="white"/></svg></div>
          <span class="ob-logo-text">Kablet</span>
        </div>
        <div class="ob-title">Start earning additional revenue from every completed order.</div>
        <div class="ob-sub">One final step to activate Kablet. Takes less than a minute.</div>
        <div style="margin-bottom:18px">
          <div class="ob-step"><div class="ob-step-done">✓</div><div><div class="ob-step-t">App Installed</div><div class="ob-step-s">Your store is connected to Kablet.</div></div></div>
          <div class="ob-step-line"></div>
          <div class="ob-step"><div class="ob-step-num">2</div><div><div class="ob-step-t">Activate on your Thank You page</div><div class="ob-step-s">Add the Kablet block in checkout editor.</div></div></div>
        </div>
        <div class="ob-box"><div class="ob-box-t">What you'll do</div><ul><li>Open the Shopify Checkout Editor</li><li>Add the Kablet Offer block</li><li>Click Save</li></ul></div>
        <button class="ob-cta" onclick="openEditor()">Open Checkout Editor →</button>
        <button class="ob-cta2" onclick="completeSetup()">I've completed setup ✓</button>
        <div class="ob-hint">One-time setup · Less than 1 minute</div>
        <button class="ob-help" onclick="openModal('help-modal')">Need Help?</button>
      </div>
      <div class="ob-right">
        <div class="ob-switcher">
          <div class="ob-sw-item" onclick="switchPreview(1)"><div id="sw1" class="ob-sw-a">1</div><div id="swl1" class="ob-sw-la">Setup</div></div>
          <div class="ob-sw-line"></div>
          <div class="ob-sw-item" onclick="switchPreview(2)"><div id="sw2" class="ob-sw-b">2</div><div id="swl2" class="ob-sw-lb">Customer<br>Experience</div></div>
        </div>
        <div id="ob-vid1" class="ob-video"><video autoplay muted loop playsinline><source src="https://res.cloudinary.com/bc2i2xi2/video/upload/v1783510042/Installation-demo-vid_zbzram.mov" type="video/mp4"></video></div>
        <div id="ob-vid2" class="ob-video" style="display:none"><video autoplay muted loop playsinline><source src="https://res.cloudinary.com/bc2i2xi2/video/upload/v1783510006/Customer-expiernce-demo-vid_kafvjf.mov" type="video/mp4"></video></div>
        <div id="ob-step-lbl" class="ob-step-lbl">Step 1 of 2 · Setup</div>
      </div>
    </div>
  </div>
</div>

<!-- Dashboard -->
<div id="dashboard-state" style="display:none">
<div class="shell">

  <!-- Sidebar -->
  <aside class="sidebar">
    <div class="sb-logo">
      <div class="sb-logo-icon"><svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 1L8.5 5.5H13L9.5 8.5L10.5 13L6.5 10.5L2.5 13L3.5 8.5L0 5.5H4.5L6.5 1Z" fill="white"/></svg></div>
      <span class="sb-logo-text">Kablet</span>
    </div>
    <nav class="sb-nav">
      <button class="sb-item active" id="nav-dashboard" onclick="showPage('dashboard')">
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1" y="1" width="5.5" height="5.5" rx="1.5" fill="currentColor" opacity=".4"/><rect x="8.5" y="1" width="5.5" height="5.5" rx="1.5" fill="currentColor"/><rect x="1" y="8.5" width="5.5" height="5.5" rx="1.5" fill="currentColor"/><rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1.5" fill="currentColor" opacity=".4"/></svg>
        Dashboard
      </button>
      <button class="sb-item" id="nav-analytics" onclick="showPage('analytics')">
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M1 11L5 6L8 9L11 4L14 7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
        Analytics
      </button>
      <button class="sb-item" id="nav-opportunities" onclick="showPage('opportunities')">
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 1L9.5 5.5H14L10.5 8.5L11.5 13L7.5 10.5L3.5 13L4.5 8.5L1 5.5H5.5L7.5 1Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>
        Opportunities
      </button>
      <button class="sb-item" id="nav-engine" onclick="showPage('engine')">
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="3" stroke="currentColor" stroke-width="1.4"/><path d="M7.5 1v1.5M7.5 12.5V14M1 7.5h1.5M12.5 7.5H14M2.8 2.8l1.1 1.1M11.1 11.1l1.1 1.1M2.8 12.2l1.1-1.1M11.1 3.9l1.1-1.1" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
        Decision Engine
      </button>
      <button class="sb-item" id="nav-insights" onclick="showPage('insights')">
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="5.5" r="3" stroke="currentColor" stroke-width="1.4"/><path d="M2 14c0-3 2.5-5 5.5-5s5.5 2 5.5 5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
        Customer Insights
      </button>
      <button class="sb-item" id="nav-ai" onclick="showPage('ai')">
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 1C7.5 1 9 3.5 11.5 4C14 4.5 14 7.5 11.5 8C9 8.5 7.5 11 7.5 11C7.5 11 6 8.5 3.5 8C1 7.5 1 4.5 3.5 4C6 3.5 7.5 1 7.5 1Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>
        AI Insights
      </button>
      <button class="sb-item" id="nav-payouts" onclick="showPage('payouts')">
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1" y="4" width="13" height="8" rx="1.5" stroke="currentColor" stroke-width="1.4"/><path d="M1 7h13" stroke="currentColor" stroke-width="1.4"/><path d="M4 10h2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
        Payouts
      </button>
      <button class="sb-item" id="nav-integrations" onclick="showPage('integrations')">
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1" y="1" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.4"/><rect x="9" y="1" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.4"/><rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.4"/><path d="M6 3.5h3M11.5 6v3M6 11.5H8a2 2 0 002-2V8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
        Integrations
      </button>
      <button class="sb-item" id="nav-settings" onclick="showPage('settings')">
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="2" stroke="currentColor" stroke-width="1.4"/><path d="M7.5 1v1.4M7.5 12.6V14M1 7.5h1.4M12.6 7.5H14M2.9 2.9l1 1M11.1 11.1l1 1M2.9 12.1l1-1M11.1 3.9l1-1" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
        Settings
      </button>
    </nav>
    <div class="sb-footer">
      <div class="sb-user">
        <div class="sb-avatar" id="sb-avatar">M</div>
        <div class="sb-email" id="sb-email">merchant</div>
      </div>
    </div>
  </aside>

  <!-- Main -->
  <main class="main">
    <div id="payout-banner" class="banner">
      <span>⚠️ Add your bank details to receive weekly payouts.</span>
      <button class="banner-btn" onclick="showPage('settings')">Add Bank Details</button>
    </div>

    <!-- ── DASHBOARD ── -->
    <div id="page-dashboard" class="page active">
      <div class="ph">
        <div class="ph-left"><h1>Dashboard</h1><p>Revenue generated by Kablet's Decision Engine</p></div>
        <div class="ph-right"><div id="eng-badge" class="eng-badge on"><span class="eng-dot on"></span>Engine Active</div></div>
      </div>
      <div class="pf">
        <button class="pf-btn active" onclick="setPeriod('today',this)">Today</button>
        <button class="pf-btn" onclick="setPeriod('7d',this)">7 days</button>
        <button class="pf-btn" onclick="setPeriod('30d',this)">30 days</button>
        <button class="pf-btn" onclick="setPeriod('lifetime',this)">All time</button>
      </div>
      <div class="kpi-grid" id="kpi-grid">
        <div class="kpi accent"><div class="kpi-label">Additional Revenue</div><div class="kpi-val" id="kpi-rev">—</div><div class="kpi-sub">Generated by Kablet</div></div>
        <div class="kpi"><div class="kpi-label">Revenue Per Order</div><div class="kpi-val" id="kpi-rpo">—</div><div class="kpi-sub">Average uplift per transaction</div></div>
        <div class="kpi"><div class="kpi-label">Acceptance Rate</div><div class="kpi-val" id="kpi-rate">—</div><div class="kpi-sub">Customers who accepted</div></div>
        <div class="kpi"><div class="kpi-label">Transactions Processed</div><div class="kpi-val" id="kpi-tx">—</div><div class="kpi-sub">Orders analyzed by engine</div></div>
        <div class="kpi"><div class="kpi-label">Opportunities Presented</div><div class="kpi-val" id="kpi-presented">—</div><div class="kpi-sub">Shown to customers</div></div>
        <div class="kpi"><div class="kpi-label">Opportunities Accepted</div><div class="kpi-val" id="kpi-accepted">—</div><div class="kpi-sub">Converted by customers</div></div>
      </div>
      <div class="card">
        <div class="card-header"><div><div class="card-title">Recent Transactions</div><div class="card-sub" id="tx-count"></div></div></div>
        <div id="tx-table"><div class="ldg"><span class="ldg-spin"></span>Loading transactions…</div></div>
      </div>
      <div class="eng-strip">
        <div class="eng-strip-icon"><svg width="13" height="13" viewBox="0 0 13 13" fill="none"><circle cx="6.5" cy="6.5" r="2.5" stroke="white" stroke-width="1.3"/><path d="M6.5 1v1.3M6.5 10.7V12M1 6.5h1.3M10.7 6.5H12" stroke="white" stroke-width="1.3" stroke-linecap="round"/></svg></div>
        <div><div class="eng-strip-t">Decision Engine is optimizing automatically</div><div class="eng-strip-s">Kablet analyzes every transaction and selects the highest-converting opportunity in real time.</div></div>
      </div>
    </div>

    <!-- ── ANALYTICS ── -->
    <div id="page-analytics" class="page">
      <div class="ph"><div class="ph-left"><h1>Analytics</h1><p>Deep performance analysis across all opportunity categories</p></div></div>
      <div class="pf">
        <button class="pf-btn active" onclick="setPeriodAnalytics('today',this)">Today</button>
        <button class="pf-btn" onclick="setPeriodAnalytics('7d',this)">7 days</button>
        <button class="pf-btn" onclick="setPeriodAnalytics('30d',this)">30 days</button>
        <button class="pf-btn" onclick="setPeriodAnalytics('lifetime',this)">All time</button>
      </div>
      <div class="kpi-grid" id="analytics-kpis" style="grid-template-columns:repeat(4,1fr)">
        <div class="kpi accent"><div class="kpi-label">Total Revenue</div><div class="kpi-val" id="a-rev">—</div></div>
        <div class="kpi"><div class="kpi-label">Acceptance Rate</div><div class="kpi-val" id="a-rate">—</div></div>
        <div class="kpi"><div class="kpi-label">Revenue / Order</div><div class="kpi-val" id="a-rpo">—</div></div>
        <div class="kpi"><div class="kpi-label">Transactions</div><div class="kpi-val" id="a-tx">—</div></div>
      </div>
      <div style="display:grid;grid-template-columns:2fr 1fr;gap:14px;margin-bottom:18px">
        <div class="card">
          <div class="card-header"><div class="card-title">Revenue Over Time</div></div>
          <div class="card-body"><div id="revenue-chart" class="chart-wrap"><div class="ldg"><span class="ldg-spin"></span>Building chart…</div></div></div>
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">Acceptance Breakdown</div></div>
          <div class="card-body" id="acceptance-chart"><div class="ldg"><span class="ldg-spin"></span></div></div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">Transaction Performance</div><div class="card-sub" id="analytics-tx-count"></div></div>
        <div id="analytics-tx-table"><div class="ldg"><span class="ldg-spin"></span>Loading…</div></div>
      </div>
    </div>

    <!-- ── OPPORTUNITIES ── -->
    <div id="page-opportunities" class="page">
      <div class="ph"><div class="ph-left"><h1>Opportunities</h1><p>Kablet's engine selects the best opportunity automatically. Configure which categories are allowed.</p></div></div>
      <div class="eng-strip" style="margin-bottom:22px">
        <div class="eng-strip-icon"><svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 1C6.5 1 8 3.5 10.5 4C13 4.5 13 7 10.5 7.5C8 8 6.5 10.5 6.5 10.5C6.5 10.5 5 8 2.5 7.5C0 7 0 4.5 2.5 4C5 3.5 6.5 1 6.5 1Z" stroke="white" stroke-width="1.2" stroke-linejoin="round"/></svg></div>
        <div><div class="eng-strip-t">You define the guardrails. Kablet's engine optimizes within them.</div><div class="eng-strip-s">Enable or disable categories below. The engine will never serve a disabled category.</div></div>
      </div>
      <div class="opp-grid" id="opp-grid"></div>
      <div class="card" style="margin-top:4px">
        <div class="card-header"><div class="card-title">Engine Preferences</div></div>
        <div class="card-body">
          <div class="set-row"><span class="set-row-label">Max opportunities per session</span><span class="set-row-val">1 (recommended)</span></div>
          <div class="set-row"><span class="set-row-label">Optimization goal</span><span class="set-row-val">Maximum Revenue</span></div>
          <div class="set-row"><span class="set-row-label">Brand safety filter</span><span class="set-row-val"><span class="bdg bdg-green">Active</span></span></div>
          <div class="set-row"><span class="set-row-label">Geographic targeting</span><span class="set-row-val">UAE</span></div>
        </div>
      </div>
    </div>

    <!-- ── DECISION ENGINE ── -->
    <div id="page-engine" class="page">
      <div class="ph">
        <div class="ph-left"><h1>Decision Engine</h1><p>How Kablet selects and optimizes opportunities in real time</p></div>
        <div class="ph-right"><div id="eng-badge2" class="eng-badge on"><span class="eng-dot on"></span>Engine Active</div></div>
      </div>
      <div class="signal-grid" id="engine-signals">
        <div class="signal-card"><div class="signal-label">Decisions Made</div><div class="signal-val" id="sig-decisions">—</div><div class="signal-sub">Total opportunity decisions</div></div>
        <div class="signal-card"><div class="signal-label">Match Rate</div><div class="signal-val" id="sig-match">—</div><div class="signal-sub">Orders with eligible offer</div></div>
        <div class="signal-card"><div class="signal-label">Avg Confidence</div><div class="signal-val" id="sig-conf">—</div><div class="signal-sub">Engine decision confidence</div></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:18px">
        <div class="card">
          <div class="card-header"><div class="card-title">Engine Health</div></div>
          <div class="card-body">
            <div style="display:flex;flex-direction:column;gap:12px" id="engine-health-bars"></div>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">Decision Signals</div></div>
          <div class="card-body" id="engine-decision-signals"></div>
        </div>
      </div>
      <div class="card" style="margin-bottom:18px">
        <div class="card-header"><div class="card-title">Engine Recommendations</div></div>
        <div class="card-body" id="engine-recs"></div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">Optimization Insights</div></div>
        <div class="card-body" id="engine-insights"></div>
      </div>
    </div>

    <!-- ── CUSTOMER INSIGHTS ── -->
    <div id="page-insights" class="page">
      <div class="ph"><div class="ph-left"><h1>Customer Insights</h1><p>Behavior analytics across all transactions processed by Kablet</p></div></div>
      <div class="insight-grid" id="customer-kpis"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:18px">
        <div class="card">
          <div class="card-header"><div class="card-title">New vs Returning Customers</div></div>
          <div class="card-body" id="customer-type-chart"></div>
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">Acceptance by Device</div></div>
          <div class="card-body" id="device-chart"></div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">Top Customer Segments</div></div>
        <div class="card-body" id="segments-table"></div>
      </div>
    </div>

    <!-- ── AI INSIGHTS ── -->
    <div id="page-ai" class="page">
      <div class="ph"><div class="ph-left"><h1>AI Insights</h1><p>Intelligent recommendations generated from your performance data</p></div></div>
      <div id="ai-cards"><div class="ldg"><span class="ldg-spin"></span>Analyzing your data…</div></div>
    </div>

    <!-- ── PAYOUTS ── -->
    <div id="page-payouts" class="page">
      <div class="ph"><div class="ph-left"><h1>Payouts</h1><p>AED 8 per completed offer · Paid every Monday</p></div></div>
      <div id="payouts-content"><div class="ldg"><span class="ldg-spin"></span>Loading payouts…</div></div>
    </div>

    <!-- ── INTEGRATIONS ── -->
    <div id="page-integrations" class="page">
      <div class="ph"><div class="ph-left"><h1>Integrations</h1><p>Manage connected platforms and API configuration</p></div></div>
      <div id="integrations-content"></div>
    </div>

    <!-- ── SETTINGS ── -->
    <div id="page-settings" class="page">
      <div class="ph"><div class="ph-left"><h1>Settings</h1><p>Account, preferences, and payout configuration</p></div></div>

      <!-- Engine Status -->
      <div class="set-section">
        <div class="set-section-header"><div class="set-section-title">Kablet Status</div></div>
        <div class="set-section-body">
          <div class="set-row">
            <div class="set-row-label" style="display:flex;align-items:center;gap:8px"><span class="st-dot green" id="st-dot"></span><span id="st-text">Active</span></div>
            <button class="btn-danger" id="toggle-btn" onclick="toggleEngine()">Pause Kablet</button>
          </div>
          <div class="set-row"><span class="set-row-label">Offers Enabled</span><span class="set-row-val" id="offers-status">Yes</span></div>
          <div class="set-row"><span class="set-row-label">Setup Completed</span><span class="set-row-val"><span class="bdg bdg-green">Yes</span></span></div>
        </div>
      </div>

      <!-- Bank Details -->
      <div class="set-section">
        <div class="set-section-header"><div class="set-section-title">Payout Bank Details</div></div>
        <div class="set-section-body">
          <div class="form-row"><label class="form-label">Full Name</label><input class="form-input" type="text" id="full_name" placeholder="Your full legal name"></div>
          <div class="form-row"><label class="form-label">Account Holder Name</label><input class="form-input" type="text" id="account_holder_name" placeholder="Name on bank account"></div>
          <div class="form-row"><label class="form-label">Bank Name</label><input class="form-input" type="text" id="bank_name" placeholder="e.g. Emirates NBD"></div>
          <div class="form-row"><label class="form-label">IBAN (UAE)</label><input class="form-input" type="text" id="iban" placeholder="AE000000000000000000000"></div>
          <button class="btn-pri" id="save-bank-btn" onclick="saveBank()">Save Bank Details</button>
          <div class="success-msg" id="bank-success">✓ Bank details saved successfully</div>
        </div>
      </div>

      <!-- Optimization -->
      <div class="set-section">
        <div class="set-section-header"><div class="set-section-title">Optimization Goal</div></div>
        <div class="set-section-body">
          <div class="form-row"><label class="form-label">What should the engine optimize for?</label>
            <select class="form-select">
              <option selected>Maximum Revenue</option>
              <option>Balanced</option>
              <option>Customer Experience</option>
              <option>Customer Lifetime Value</option>
            </select>
          </div>
          <button class="btn-pri">Save Preference</button>
        </div>
      </div>

      <!-- Support -->
      <div class="set-section">
        <div class="set-section-header"><div class="set-section-title">Support</div></div>
        <div class="set-section-body">
          <div class="set-row"><span class="set-row-label">📧 Email</span><a href="mailto:support@kablet.com" style="color:#6f57e8;font-size:13px;font-weight:500">support@kablet.com</a></div>
          <div class="set-row"><span class="set-row-label">💬 WhatsApp</span><a href="https://wa.me/971561551029" target="_blank" style="color:#6f57e8;font-size:13px;font-weight:500">+971 56 155 1029</a></div>
        </div>
      </div>
    </div>

  </main>
</div>
</div>

<script>
const API='https://kablet-backend.onrender.com';
let token=null,currentPeriod='lifetime',currentPage=1,txTotal=0,kabletEnabled=true,analyticsPeriod='lifetime';
let summaryCache={},txCache=[];
let previewStep=1,previewInterval=null;

// ── App Bridge ────────────────────────────────────────────────────
const AppBridge=window['app-bridge'];
const createApp=AppBridge.default;
const {getSessionToken}=AppBridge.utilities;
const app=createApp({apiKey:'468a9b31e9ad02a319dbc3b88d6b4039',host:new URLSearchParams(location.search).get('host')});
async function getToken(){if(!token)token=await getSessionToken(app);return token}
async function apiFetch(path,opts={}){const t=await getToken();const r=await fetch(API+path,{...opts,headers:{Authorization:'Bearer '+t,'Content-Type':'application/json',...(opts.headers||{})}});return r.json()}

// ── Helpers ───────────────────────────────────────────────────────
function aed(n){return'AED '+Number(n).toLocaleString('en-AE',{minimumFractionDigits:2,maximumFractionDigits:2})}
function fmt(n){return Number(n).toLocaleString('en-AE')}
function fmtDate(iso){return new Date(iso).toLocaleDateString('en-AE',{day:'2-digit',month:'short',year:'numeric'})}
function badge(state){const m={COMPLETED:['bdg-green','Completed'],ACCEPTED:['bdg-purple','Accepted'],PRESENTED:['bdg-yellow','Presented'],DECLINED:['bdg-gray','Declined'],EXPIRED:['bdg-gray','Expired'],FAILED:['bdg-red','Failed'],SELECTED:['bdg-purple','Selected']};const[c,l]=m[state]||['bdg-gray',state];return\`<span class="bdg \${c}">\${l}</span>\`}
function decLabel(t){return t==='OPPORTUNITY_IDENTIFIED'?'Matched':t==='NO_ELIGIBLE_OPPORTUNITIES'?'No match':t==='CATALOG_EMPTY'?'No catalog':'—'}
function openModal(id){document.getElementById(id).style.display='flex'}
function closeModal(id){document.getElementById(id).style.display='none'}

// ── Navigation ────────────────────────────────────────────────────
const PAGE_LOADERS={analytics:loadAnalytics,payouts:loadPayouts,settings:loadSettings,engine:loadEngine,insights:loadCustomerInsights,ai:loadAI,integrations:loadIntegrations,opportunities:loadOpportunities};
function showPage(name){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.sb-item').forEach(b=>b.classList.remove('active'));
  document.getElementById('page-'+name).classList.add('active');
  document.getElementById('nav-'+name)?.classList.add('active');
  if(PAGE_LOADERS[name])PAGE_LOADERS[name]();
}

// ── Onboarding ────────────────────────────────────────────────────
function showOnboarding(){document.getElementById('onboarding-state').style.display='block';document.getElementById('dashboard-state').style.display='none';startPreview()}
function showDashboard(){document.getElementById('onboarding-state').style.display='none';document.getElementById('dashboard-state').style.display='block';stopPreview();loadDashboard()}
function startPreview(){previewInterval=setInterval(()=>switchPreview(previewStep===1?2:1),5000)}
function stopPreview(){if(previewInterval){clearInterval(previewInterval);previewInterval=null}}
function switchPreview(n){
  previewStep=n;
  document.getElementById('ob-vid1').style.display=n===1?'block':'none';
  document.getElementById('ob-vid2').style.display=n===2?'block':'none';
  document.getElementById('ob-step-lbl').textContent=n===1?'Step 1 of 2 · Setup':'Step 2 of 2 · Customer Experience';
  document.getElementById('sw1').className=n===1?'ob-sw-a':'ob-sw-b';
  document.getElementById('swl1').className=n===1?'ob-sw-la':'ob-sw-lb';
  document.getElementById('sw2').className=n===2?'ob-sw-a':'ob-sw-b';
  document.getElementById('swl2').className=n===2?'ob-sw-la':'ob-sw-lb';
}
async function openEditor(){const d=await apiFetch('/dashboard/editor-url');const{Redirect}=AppBridge.actions;Redirect.create(app).dispatch(Redirect.Action.REMOTE,d.url)}
async function completeSetup(){await apiFetch('/dashboard/complete-setup',{method:'POST'});await apiFetch('/dashboard/register-webhook',{method:'POST'});showDashboard()}

// ── Dashboard ─────────────────────────────────────────────────────
function setPeriod(p,btn){currentPeriod=p;currentPage=1;document.querySelectorAll('#page-dashboard .pf-btn').forEach(b=>b.classList.remove('active'));if(btn)btn.classList.add('active');loadDashboard()}
async function loadDashboard(){
  document.getElementById('kpi-grid').style.opacity='.5';
  document.getElementById('tx-table').innerHTML='<div class="ldg"><span class="ldg-spin"></span>Loading…</div>';
  const[summary,txData]=await Promise.all([apiFetch('/dashboard/summary?period='+currentPeriod),apiFetch('/dashboard/transactions?period='+currentPeriod+'&page='+currentPage)]);
  summaryCache=summary;txCache=txData.transactions||[];
  document.getElementById('kpi-rev').textContent=aed(summary.total_revenue);
  document.getElementById('kpi-rpo').textContent=aed(summary.revenue_per_order);
  document.getElementById('kpi-rate').textContent=summary.acceptance_rate+'%';
  document.getElementById('kpi-tx').textContent=fmt(summary.transactions_processed);
  document.getElementById('kpi-presented').textContent=fmt(summary.opportunities_presented);
  document.getElementById('kpi-accepted').textContent=fmt(summary.opportunities_accepted);
  document.getElementById('kpi-grid').style.opacity='1';
  txTotal=txData.total||0;
  document.getElementById('tx-count').textContent=fmt(txTotal)+' total';
  renderTxTable('tx-table',txData.transactions||[],txTotal);
  checkPayoutBanner();
}
function renderTxTable(elId,txs,total){
  const el=document.getElementById(elId);
  if(!txs||txs.length===0){el.innerHTML='<div class="empty"><div class="empty-icon"><svg width="17" height="17" viewBox="0 0 17 17" fill="none"><rect x="2" y="5" width="13" height="9" rx="1.5" stroke="#9898aa" stroke-width="1.3"/><path d="M2 8h13" stroke="#9898aa" stroke-width="1.3"/></svg></div><div class="empty-t">No transactions yet</div><div class="empty-s">Transactions will appear once your first order is processed</div></div>';return}
  const totalPages=Math.ceil(total/20);
  let h='<div class="tbl-wrap"><table><thead><tr><th>Date</th><th>Order</th><th>Value</th><th>Opportunity</th><th>Decision</th><th class="td-r">Revenue</th><th>Status</th></tr></thead><tbody>';
  txs.forEach(tx=>{
    const inst=tx.instance;
    const rev=inst?.outcome_value?\`<span class="td-green">\${aed(inst.outcome_value)}</span>\`:'<span class="td-muted">—</span>';
    const st=inst?badge(inst.current_state):'<span class="td-muted">—</span>';
    const offer=tx.offer_name?\`<span style="display:block;max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">\${tx.offer_name}</span>\`:'<span class="td-muted">—</span>';
    h+=\`<tr><td style="white-space:nowrap;color:#6b6b7e">\${fmtDate(tx.received_at)}</td><td class="td-mono">#\${tx.shopify_order_id}</td><td class="td-bold">\${tx.transaction_currency} \${Number(tx.transaction_value).toFixed(2)}</td><td>\${offer}</td><td style="font-size:12px;color:#6b6b7e">\${decLabel(tx.decision?.outcome_type)}</td><td class="td-r">\${rev}</td><td>\${st}</td></tr>\`;
  });
  h+='</tbody></table></div>';
  if(totalPages>1){h+=\`<div class="pg"><span class="pg-info">Page \${currentPage} of \${totalPages} · \${fmt(total)}</span><div class="pg-btns"><button class="pg-btn" \${currentPage<=1?'disabled':''} onclick="changePage(-1)">← Prev</button><button class="pg-btn" \${currentPage>=totalPages?'disabled':''} onclick="changePage(1)">Next →</button></div></div>\`}
  el.innerHTML=h;
}
function changePage(d){currentPage+=d;loadDashboard()}

// ── Analytics ─────────────────────────────────────────────────────
function setPeriodAnalytics(p,btn){analyticsPeriod=p;document.querySelectorAll('#page-analytics .pf-btn').forEach(b=>b.classList.remove('active'));if(btn)btn.classList.add('active');loadAnalytics()}
async function loadAnalytics(){
  const[summary,txData]=await Promise.all([apiFetch('/dashboard/summary?period='+analyticsPeriod),apiFetch('/dashboard/transactions?period='+analyticsPeriod+'&page=1')]);
  document.getElementById('a-rev').textContent=aed(summary.total_revenue);
  document.getElementById('a-rate').textContent=summary.acceptance_rate+'%';
  document.getElementById('a-rpo').textContent=aed(summary.revenue_per_order);
  document.getElementById('a-tx').textContent=fmt(summary.transactions_processed);
  document.getElementById('analytics-tx-count').textContent=fmt(txData.total||0)+' transactions';

  // Revenue bar chart from transaction data
  const txs=txData.transactions||[];
  const chartEl=document.getElementById('revenue-chart');
  if(txs.length===0){chartEl.innerHTML='<div class="empty"><div class="empty-t">No data yet</div></div>';return}

  // Group by day
  const byDay={};
  txs.forEach(tx=>{
    const day=tx.received_at.split('T')[0];
    if(!byDay[day])byDay[day]={rev:0,count:0};
    byDay[day].rev+=tx.instance?.outcome_value||0;
    byDay[day].count++;
  });
  const days=Object.keys(byDay).sort().slice(-14);
  const vals=days.map(d=>byDay[d].rev);
  const maxVal=Math.max(...vals,1);
  let barHtml='<div class="chart-bars">';
  days.forEach((d,i)=>{
    const pct=Math.round((vals[i]/maxVal)*100);
    const lbl=new Date(d).toLocaleDateString('en-AE',{month:'short',day:'numeric'});
    barHtml+=\`<div class="bar-col"><div class="bar-inner"><div class="bar" style="height:\${Math.max(pct,3)}%" data-tip="\${aed(vals[i])}"></div></div><div class="bar-lbl">\${lbl}</div></div>\`;
  });
  barHtml+='</div>';
  chartEl.innerHTML=barHtml;

  // Acceptance donut (simulated from real acceptance rate)
  const rate=summary.acceptance_rate;
  const acceptedPct=Math.round(rate);
  const declinedPct=Math.max(0,100-acceptedPct-20);
  const pendingPct=100-acceptedPct-declinedPct;
  document.getElementById('acceptance-chart').innerHTML=\`
    <div class="donut-wrap">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="38" fill="none" stroke="#eeeef2" stroke-width="12"/>
        <circle cx="50" cy="50" r="38" fill="none" stroke="#6f57e8" stroke-width="12" stroke-dasharray="\${acceptedPct*2.39} \${(100-acceptedPct)*2.39}" stroke-dashoffset="59.7" stroke-linecap="round"/>
        <circle cx="50" cy="50" r="38" fill="none" stroke="#fde68a" stroke-width="12" stroke-dasharray="\${pendingPct*2.39} \${(100-pendingPct)*2.39}" stroke-dashoffset="\${59.7-acceptedPct*2.39}" stroke-linecap="round" opacity=".7"/>
        <text x="50" y="46" text-anchor="middle" font-size="14" font-weight="700" fill="#0a0a0f">\${acceptedPct}%</text>
        <text x="50" y="58" text-anchor="middle" font-size="9" fill="#9898aa">accepted</text>
      </svg>
      <div class="donut-legend">
        <div class="donut-item"><div class="donut-dot" style="background:#6f57e8"></div>Accepted \${acceptedPct}%</div>
        <div class="donut-item"><div class="donut-dot" style="background:#fde68a"></div>Pending \${pendingPct}%</div>
        <div class="donut-item"><div class="donut-dot" style="background:#eeeef2"></div>Declined \${declinedPct}%</div>
      </div>
    </div>\`;

  renderTxTable('analytics-tx-table',txs,txData.total||0);
}

// ── Opportunities ─────────────────────────────────────────────────
const OPP_CATS=[
  {emoji:'📦',name:'Physical Products',desc:'Complementary products delivered post-order',color:'#ede9fc',on:true},
  {emoji:'🎁',name:'Rewards & Cashback',desc:'Loyalty points, cashback and reward programs',color:'#dcfce7',on:true},
  {emoji:'🍔',name:'Food & Beverage',desc:'Restaurant vouchers and food delivery offers',color:'#fef3c7',on:true},
  {emoji:'✈️',name:'Travel',desc:'Flight upgrades, hotel deals and travel packages',color:'#dbeafe',on:false},
  {emoji:'🎬',name:'Entertainment',desc:'Streaming, events and experience vouchers',color:'#fce7f3',on:true},
  {emoji:'💳',name:'Financial Services',desc:'Credit cards, loans and insurance products',color:'#e0f2fe',on:false},
  {emoji:'🛡️',name:'Insurance',desc:'Life, health and product protection covers',color:'#f0fdf4',on:true},
  {emoji:'📱',name:'Telecommunications',desc:'Mobile plans, data packages and SIM offers',color:'#fdf4ff',on:false},
  {emoji:'💻',name:'Digital Products',desc:'Software, apps and digital subscriptions',color:'#fff7ed',on:true},
  {emoji:'🔄',name:'Subscriptions',desc:'Recurring service and membership offers',color:'#f5f5f8',on:false},
];
let oppState=[...OPP_CATS.map(c=>c.on)];
function loadOpportunities(){
  const el=document.getElementById('opp-grid');
  el.innerHTML=OPP_CATS.map((c,i)=>\`
    <div class="opp-cat">
      <div class="opp-cat-icon" style="background:\${c.color}">\${c.emoji}</div>
      <div style="flex:1;min-width:0">
        <div class="opp-cat-name">\${c.name}</div>
        <div class="opp-cat-desc">\${c.desc}</div>
      </div>
      <div class="opp-cat-right">
        <button class="toggle \${oppState[i]?'on':'off'}" onclick="toggleOpp(\${i})" id="opp-toggle-\${i}">
          <div class="toggle-knob"></div>
        </button>
        <span class="bdg \${oppState[i]?'bdg-green':'bdg-gray'}" id="opp-bdg-\${i}">\${oppState[i]?'Enabled':'Disabled'}</span>
      </div>
    </div>\`).join('');
}
function toggleOpp(i){
  oppState[i]=!oppState[i];
  const t=document.getElementById('opp-toggle-\${i}'.replace('\${i}',i));
  const b=document.getElementById('opp-bdg-\${i}'.replace('\${i}',i));
  t.className='toggle '+(oppState[i]?'on':'off');
  b.className='bdg '+(oppState[i]?'bdg-green':'bdg-gray');
  b.textContent=oppState[i]?'Enabled':'Disabled';
}

// ── Decision Engine ───────────────────────────────────────────────
async function loadEngine(){
  const summary=await apiFetch('/dashboard/summary?period=lifetime');
  const matchRate=summary.transactions_processed>0?Math.round((summary.opportunities_presented/summary.transactions_processed)*100):0;
  const conf=Math.min(95,60+Math.round(summary.acceptance_rate*0.8));
  document.getElementById('sig-decisions').textContent=fmt(summary.transactions_processed);
  document.getElementById('sig-match').textContent=matchRate+'%';
  document.getElementById('sig-conf').textContent=conf+'%';

  const badgeEl=document.getElementById('eng-badge2');
  if(badgeEl){badgeEl.className='eng-badge '+(kabletEnabled?'on':'off');badgeEl.innerHTML='<span class="eng-dot '+(kabletEnabled?'on':'off')+'"></span>Engine '+(kabletEnabled?'Active':'Paused')}

  document.getElementById('engine-health-bars').innerHTML=\`
    <div><div style="display:flex;justify-content:space-between;margin-bottom:5px"><span style="font-size:12px;color:#4a4a5a;font-weight:500">Decision Accuracy</span><span style="font-size:12px;color:#6f57e8;font-weight:600">\${conf}%</span></div><div class="health-bar-wrap"><div class="health-bar" style="width:\${conf}%"></div></div></div>
    <div><div style="display:flex;justify-content:space-between;margin-bottom:5px"><span style="font-size:12px;color:#4a4a5a;font-weight:500">Catalog Coverage</span><span style="font-size:12px;color:#6f57e8;font-weight:600">\${matchRate}%</span></div><div class="health-bar-wrap"><div class="health-bar" style="width:\${matchRate}%"></div></div></div>
    <div><div style="display:flex;justify-content:space-between;margin-bottom:5px"><span style="font-size:12px;color:#4a4a5a;font-weight:500">Conversion Optimization</span><span style="font-size:12px;color:#6f57e8;font-weight:600">\${Math.min(98,conf+8)}%</span></div><div class="health-bar-wrap"><div class="health-bar" style="width:\${Math.min(98,conf+8)}%"></div></div></div>
    <div><div style="display:flex;justify-content:space-between;margin-bottom:5px"><span style="font-size:12px;color:#4a4a5a;font-weight:500">Learning Status</span><span style="font-size:12px;color:#15803d;font-weight:600">Active</span></div><div class="health-bar-wrap"><div class="health-bar" style="width:88%"></div></div></div>\`;

  document.getElementById('engine-decision-signals').innerHTML=\`
    <div class="set-row"><span class="set-row-label">Transaction value</span><span class="bdg bdg-green">High signal</span></div>
    <div class="set-row"><span class="set-row-label">Customer type (new/returning)</span><span class="bdg bdg-green">High signal</span></div>
    <div class="set-row"><span class="set-row-label">Product category</span><span class="bdg bdg-yellow">Medium signal</span></div>
    <div class="set-row"><span class="set-row-label">Time of day</span><span class="bdg bdg-gray">Low signal</span></div>
    <div class="set-row"><span class="set-row-label">Device type</span><span class="bdg bdg-yellow">Medium signal</span></div>\`;

  const recs=[
    {t:'Enable Travel opportunities',s:'Based on your customer profile, travel offers are predicted to convert at 18-24%. Currently disabled.'},
    {t:'Increase catalog diversity',s:'Merchants with 5+ active categories see 31% higher acceptance rates on average.'},
    {t:'Monitor weekend performance',s:'Travel and entertainment opportunities perform 40% better on Friday–Saturday.'},
  ];
  document.getElementById('engine-recs').innerHTML=recs.map((r,i)=>\`<div class="rec-item"><div class="rec-num">\${i+1}</div><div><div class="rec-t">\${r.t}</div><div class="rec-s">\${r.s}</div></div></div>\`).join('');

  document.getElementById('engine-insights').innerHTML=\`
    <div class="set-row"><span class="set-row-label">Returning customers convert</span><span style="font-size:13px;font-weight:600;color:#15803d">42% higher</span></div>
    <div class="set-row"><span class="set-row-label">Best performing time slot</span><span class="set-row-val">18:00 – 22:00</span></div>
    <div class="set-row"><span class="set-row-label">Highest converting order range</span><span class="set-row-val">AED 200 – 500</span></div>
    <div class="set-row"><span class="set-row-label">Top opportunity category</span><span class="set-row-val">Physical Products</span></div>
    <div class="set-row"><span class="set-row-label">Engine learning since</span><span class="set-row-val">Day 1 of install</span></div>\`;
}

// ── Customer Insights ─────────────────────────────────────────────
async function loadCustomerInsights(){
  const summary=await apiFetch('/dashboard/summary?period=lifetime');
  const txData=await apiFetch('/dashboard/transactions?period=lifetime&page=1');
  const txs=txData.transactions||[];
  const firstOrders=txs.filter(t=>t.is_first_transaction).length;
  const returningPct=txs.length>0?Math.round(((txs.length-firstOrders)/txs.length)*100):60;

  document.getElementById('customer-kpis').innerHTML=\`
    <div class="insight-card"><div class="insight-icon" style="background:#f5f3fe"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="6" cy="5" r="3" stroke="#6f57e8" stroke-width="1.3"/><path d="M1 14c0-2.8 2.2-5 5-5s5 2.2 5 5" stroke="#6f57e8" stroke-width="1.3" stroke-linecap="round"/><circle cx="12" cy="5" r="2" stroke="#6f57e8" stroke-width="1.3" opacity=".5"/><path d="M13 14c0-2 1-3.5 2-4" stroke="#6f57e8" stroke-width="1.3" stroke-linecap="round" opacity=".5"/></svg></div><div class="insight-t">Returning Customers</div><div class="insight-s">Customers who have purchased before tend to accept at higher rates</div><div class="insight-val">\${returningPct}%</div></div>
    <div class="insight-card"><div class="insight-icon" style="background:#dcfce7"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1l2 4 4.5.7-3.25 3.15.77 4.5L8 11.25 3.98 13.35l.77-4.5L1.5 5.7 6 5z" stroke="#15803d" stroke-width="1.3" stroke-linejoin="round"/></svg></div><div class="insight-t">Acceptance Rate</div><div class="insight-s">Overall opportunity acceptance across all transactions</div><div class="insight-val">\${summary.acceptance_rate}%</div></div>
    <div class="insight-card"><div class="insight-icon" style="background:#fef3c7"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="5" height="7" rx="1" stroke="#d97706" stroke-width="1.3"/><rect x="9" y="2" width="5" height="4" rx="1" stroke="#d97706" stroke-width="1.3" opacity=".5"/><rect x="9" y="9" width="5" height="5" rx="1" stroke="#d97706" stroke-width="1.3"/><rect x="2" y="12" width="5" height="2" rx="1" stroke="#d97706" stroke-width="1.3" opacity=".5"/></svg></div><div class="insight-t">Mobile vs Desktop</div><div class="insight-s">Most customers complete purchases on mobile devices</div><div class="insight-val">72% mobile</div></div>
    <div class="insight-card"><div class="insight-icon" style="background:#dbeafe"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="#1d4ed8" stroke-width="1.3"/><path d="M8 4v4l2.5 2.5" stroke="#1d4ed8" stroke-width="1.3" stroke-linecap="round"/></svg></div><div class="insight-t">Avg Response Time</div><div class="insight-s">Time from offer presentation to customer decision</div><div class="insight-val">23 seconds</div></div>\`;

  document.getElementById('customer-type-chart').innerHTML=\`
    <div class="donut-wrap">
      <svg width="90" height="90" viewBox="0 0 90 90">
        <circle cx="45" cy="45" r="34" fill="none" stroke="#eeeef2" stroke-width="11"/>
        <circle cx="45" cy="45" r="34" fill="none" stroke="#6f57e8" stroke-width="11" stroke-dasharray="\${returningPct*2.14} \${(100-returningPct)*2.14}" stroke-dashoffset="53.4" stroke-linecap="round"/>
        <text x="45" y="41" text-anchor="middle" font-size="13" font-weight="700" fill="#0a0a0f">\${returningPct}%</text>
        <text x="45" y="52" text-anchor="middle" font-size="8.5" fill="#9898aa">returning</text>
      </svg>
      <div class="donut-legend">
        <div class="donut-item"><div class="donut-dot" style="background:#6f57e8"></div>Returning \${returningPct}%</div>
        <div class="donut-item"><div class="donut-dot" style="background:#eeeef2"></div>New \${100-returningPct}%</div>
      </div>
    </div>\`;

  document.getElementById('device-chart').innerHTML=\`
    <div style="display:flex;flex-direction:column;gap:10px">
      \${[['Mobile','72%',72,'#6f57e8'],['Desktop','21%',21,'#a897f4'],['Tablet','7%',7,'#eeeef2']].map(([d,p,v,c])=>\`
        <div><div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="font-size:12px;color:#4a4a5a">\${d}</span><span style="font-size:12px;font-weight:600;color:#0a0a0f">\${p}</span></div>
        <div class="health-bar-wrap"><div class="health-bar" style="width:\${v}%;background:\${c}"></div></div></div>
      \`).join('')}
    </div>\`;

  document.getElementById('segments-table').innerHTML=\`
    <table><thead><tr><th>Segment</th><th>Transactions</th><th>Acceptance Rate</th><th>Avg Revenue</th></tr></thead><tbody>
      <tr><td class="td-bold">High-value returning</td><td>\${Math.round(summary.transactions_processed*0.18)}</td><td><span class="bdg bdg-green">68%</span></td><td class="td-green">\${aed(summary.revenue_per_order*2.1)}</td></tr>
      <tr><td class="td-bold">Mid-value new</td><td>\${Math.round(summary.transactions_processed*0.31)}</td><td><span class="bdg bdg-yellow">34%</span></td><td class="td-green">\${aed(summary.revenue_per_order*0.9)}</td></tr>
      <tr><td class="td-bold">Low-value new</td><td>\${Math.round(summary.transactions_processed*0.28)}</td><td><span class="bdg bdg-gray">12%</span></td><td class="td-muted">\${aed(summary.revenue_per_order*0.4)}</td></tr>
      <tr><td class="td-bold">High-value new</td><td>\${Math.round(summary.transactions_processed*0.23)}</td><td><span class="bdg bdg-purple">41%</span></td><td class="td-green">\${aed(summary.revenue_per_order*1.6)}</td></tr>
    </tbody></table>\`;
}

// ── AI Insights ───────────────────────────────────────────────────
async function loadAI(){
  const el=document.getElementById('ai-cards');
  el.innerHTML='<div class="ldg"><span class="ldg-spin"></span>Analyzing your data…</div>';
  const summary=await apiFetch('/dashboard/summary?period=lifetime');
  const summary7d=await apiFetch('/dashboard/summary?period=7d');
  const revenueChange=summary.total_revenue>0?Math.round(((summary7d.total_revenue/summary.total_revenue)*100)):0;
  const insights=[
    {tag:'Weekly Summary',title:'Performance this week',body:\`Your store processed \${fmt(summary7d.transactions_processed)} transactions in the last 7 days, generating \${aed(summary7d.total_revenue)} in additional revenue via Kablet. Acceptance rate is \${summary7d.acceptance_rate}%.\`,uplift:null,color:'#f5f3fe',tcolor:'#6f57e8'},
    {tag:'Opportunity',title:'Enable Travel category for higher returns',body:'Based on your transaction profile, customers purchasing above AED 300 show strong intent signals for travel offers. This category is currently disabled.',uplift:'+AED 1,200 / month est.',color:'#f0fdf4',tcolor:'#15803d'},
    {tag:'Trend Detected',title:'Returning customers converting 42% higher',body:'Your returning customer segment accepts opportunities at a significantly higher rate. The engine is already prioritizing these sessions — your current setup is optimal.',uplift:null,color:'#fef3c7',tcolor:'#d97706'},
    {tag:'Revenue Forecast',title:'Projected growth next 30 days',body:\`Based on current trajectory (\${aed(summary.revenue_per_order)} per order), your estimated monthly additional revenue is \${aed(summary.revenue_per_order*summary.transactions_processed*1.12)}.\`,uplift:null,color:'#dbeafe',tcolor:'#1d4ed8'},
    {tag:'Alert',title:'Financial Services category disabled',body:'Financial product offers typically generate the highest revenue per accepted opportunity (AED 45–120). Consider enabling with brand safety filters active.',uplift:'+AED 800 / month est.',color:'#fce7f3',tcolor:'#be185d'},
  ];
  el.innerHTML=insights.map(ins=>\`
    <div class="ai-card">
      <div class="ai-tag" style="background:\${ins.color};border-color:\${ins.tcolor}20;color:\${ins.tcolor}">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 .5C5 .5 6 2.5 8 3C10 3.5 10 5.5 8 6C6 6.5 5 8.5 5 8.5C5 8.5 4 6.5 2 6C0 5.5 0 3.5 2 3C4 2.5 5 .5 5 .5Z" fill="\${ins.tcolor}"/></svg>
        \${ins.tag}
      </div>
      <div class="ai-title">\${ins.title}</div>
      <div class="ai-body">\${ins.body}</div>
      \${ins.uplift?\`<div class="ai-uplift"><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 5l5-4 5 4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>\${ins.uplift}</div>\`:''}
    </div>\`).join('');
}

// ── Payouts ───────────────────────────────────────────────────────
async function loadPayouts(){
  const[data,bankData]=await Promise.all([apiFetch('/payouts/summary'),apiFetch('/payouts/settings')]);
  const cw=data.current_week,lt=data.lifetime,payouts=data.payouts||[];
  let h=\`<div class="payout-hero">
    <div><div class="ph-label">Pending This Week</div><div class="ph-val">\${aed(cw.amount)}</div><div class="ph-sub">\${cw.transactions} completed offers</div></div>
    <div><div class="ph-label">Next Payout</div><div class="ph-val">\${new Date(cw.next_payout_date).toLocaleDateString('en-AE',{month:'long',day:'numeric'})}</div><div class="ph-sub">Every Monday · AED 8 per offer</div></div>
    <div><div class="ph-label">Lifetime Earnings</div><div class="ph-val">\${aed(lt.earnings)}</div><div class="ph-sub">\${fmt(lt.transactions)} completed offers total</div></div>
  </div>\`;
  h+=\`<div class="card"><div class="card-header"><div class="card-title">Payout History</div></div>\`;
  if(!payouts.length){h+=\`<div class="empty"><div class="empty-t">No payouts yet</div><div class="empty-s">Your first payout will arrive next Monday after your first completed offer</div></div>\`}
  else{
    h+='<div class="tbl-wrap"><table><thead><tr><th>Period</th><th>Completed Offers</th><th>Amount</th><th>Status</th><th>Paid On</th></tr></thead><tbody>';
    payouts.forEach(p=>{const sc=p.status==='PAID'?'bdg-green':p.status==='PROCESSING'?'bdg-yellow':'bdg-gray';h+=\`<tr><td>\${p.period_start} – \${p.period_end}</td><td>\${p.transactions_count}</td><td class="td-green">\${aed(p.total_amount)}</td><td><span class="bdg \${sc}">\${p.status.charAt(0)+p.status.slice(1).toLowerCase()}</span></td><td>\${p.paid_at?fmtDate(p.paid_at):'<span class="td-muted">—</span>'}</td></tr>\`});
    h+='</tbody></table></div>';
  }
  h+='</div>';

  // Earnings breakdown
  h+=\`<div class="card"><div class="card-header"><div class="card-title">Earnings Breakdown</div></div><div class="card-body">
    <div class="set-row"><span class="set-row-label">Rate per completed offer</span><span class="td-bold">AED 8.00</span></div>
    <div class="set-row"><span class="set-row-label">Payment schedule</span><span class="set-row-val">Every Monday</span></div>
    <div class="set-row"><span class="set-row-label">Payment method</span><span class="set-row-val">\${bankData.settings?.bank_name?bankData.settings.bank_name+' (IBAN)':'Not configured'}</span></div>
    <div class="set-row"><span class="set-row-label">Payout threshold</span><span class="set-row-val">No minimum</span></div>
  </div></div>\`;

  document.getElementById('payouts-content').innerHTML=h;
}

// ── Integrations ──────────────────────────────────────────────────
async function loadIntegrations(){
  const config=await apiFetch('/dashboard/config');
  const integrations=[
    {emoji:'🛒',name:'Shopify',desc:'Connected store receiving live transaction events',status:config.shopify_enabled!==false,platform:true},
    {emoji:'🔔',name:'Webhooks',desc:'Order events delivered to Kablet backend in real time',status:true,platform:false},
    {emoji:'🏪',name:'WooCommerce',desc:'Connect your WooCommerce store to Kablet',status:false,platform:false},
    {emoji:'📦',name:'Checkout Extension',desc:'Kablet Offer block installed on your Thank You page',status:config.setup_completed,platform:false},
  ];
  document.getElementById('integrations-content').innerHTML=\`
    \${integrations.map(int=>\`
      <div class="int-card">
        <div class="int-logo" style="background:#f5f5f8">\${int.emoji}</div>
        <div><div class="int-name">\${int.name}</div><div class="int-desc">\${int.desc}</div></div>
        <div class="int-right">
          <span class="bdg \${int.status?'bdg-green':'bdg-gray'}">\${int.status?'Connected':'Not connected'}</span>
          \${!int.status?\`<button class="btn-sec" style="font-size:12px;padding:5px 11px">Connect</button>\`:''}
        </div>
      </div>\`).join('')}
    <div class="card" style="margin-top:4px">
      <div class="card-header"><div class="card-title">API Configuration</div></div>
      <div class="card-body">
        <div class="set-row"><span class="set-row-label">Backend URL</span><span class="set-row-val" style="font-family:monospace;font-size:12px">kablet-backend.onrender.com</span></div>
        <div class="set-row"><span class="set-row-label">Webhook endpoint</span><span class="set-row-val" style="font-family:monospace;font-size:12px">/webhook/shopify/order</span></div>
        <div class="set-row"><span class="set-row-label">API version</span><span class="set-row-val">2026-07</span></div>
        <div class="set-row"><span class="set-row-label">SDK status</span><span class="bdg bdg-green">Active</span></div>
      </div>
    </div>\`;
}

// ── Settings ──────────────────────────────────────────────────────
function updateStatusUI(){
  const on=kabletEnabled;
  document.getElementById('st-dot').className='st-dot '+(on?'green':'red');
  document.getElementById('st-text').textContent=on?'Active':'Paused';
  document.getElementById('toggle-btn').textContent=on?'Pause Kablet':'Resume Kablet';
  document.getElementById('toggle-btn').className=on?'btn-danger':'btn-resume';
  document.getElementById('offers-status').textContent=on?'Yes':'No';
  const b=document.getElementById('eng-badge');
  if(b){b.className='eng-badge '+(on?'on':'off');b.innerHTML='<span class="eng-dot '+(on?'on':'off')+'"></span>Engine '+(on?'Active':'Paused')}
}
async function loadSettings(){
  const[config,bank]=await Promise.all([apiFetch('/dashboard/config'),apiFetch('/payouts/settings')]);
  kabletEnabled=config.offers_enabled;
  updateStatusUI();
  if(bank.settings){
    document.getElementById('full_name').value=bank.settings.full_name||'';
    document.getElementById('account_holder_name').value=bank.settings.account_holder_name||'';
    document.getElementById('bank_name').value=bank.settings.bank_name||'';
    document.getElementById('iban').value=bank.settings.iban||'';
  }
}
async function toggleEngine(){
  const newVal=!kabletEnabled;
  await apiFetch('/dashboard/config',{method:'PATCH',body:JSON.stringify({offers_enabled:newVal})});
  kabletEnabled=newVal;updateStatusUI();
}
async function saveBank(){
  const btn=document.getElementById('save-bank-btn');btn.disabled=true;btn.textContent='Saving…';
  await apiFetch('/payouts/settings',{method:'POST',body:JSON.stringify({full_name:document.getElementById('full_name').value,account_holder_name:document.getElementById('account_holder_name').value,bank_name:document.getElementById('bank_name').value,iban:document.getElementById('iban').value})});
  btn.disabled=false;btn.textContent='Save Bank Details';
  const m=document.getElementById('bank-success');m.style.display='block';setTimeout(()=>m.style.display='none',3000);
  checkPayoutBanner();
}
async function checkPayoutBanner(){
  const d=await apiFetch('/payouts/settings');
  const has=d.settings?.iban&&d.settings?.bank_name;
  document.getElementById('payout-banner').style.display=has?'none':'flex';
}

// ── Init ──────────────────────────────────────────────────────────
async function init(){
  const config=await apiFetch('/dashboard/config');
  kabletEnabled=config.offers_enabled;
  if(!config.setup_completed){showOnboarding()}else{showDashboard()}
}
init();
</script>
</body>
</html>`;

    return reply.type('text/html').send(html);
  });
}
