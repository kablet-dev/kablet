(function () {
  'use strict'

  var script =
    document.currentScript ||
    Array.from(document.scripts).find(function (item) {
      return item.src.indexOf('kablet-widget.js') !== -1
    })

  if (!script) return

  var params = new URL(script.src, location.href).searchParams
  var siteId = params.get('site')

  if (!siteId) {
    console.warn('Kablet widget: site ID missing')
    return
  }

  var API = 'https://kablet-backend.onrender.com'
  var processedForms = new WeakSet()
  var previousFocus = null
  var sessionId =
    sessionStorage.getItem('kablet_session_id') ||
    Date.now().toString(36) + Math.random().toString(36).slice(2)

  sessionStorage.setItem('kablet_session_id', sessionId)

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }

  function svg(name, size) {
    var paths = {
      check: '<path d="m5 12 4 4L19 6"/>',
      arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
      close: '<path d="M6 6l12 12M18 6 6 18"/>',
      lock: '<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
      shield:
        '<path d="M12 3 20 6v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-3Z"/><path d="m8 12 2.5 2.5L16 9"/>',
      mail:
        '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
      spark:
        '<path d="m12 3 1.7 6.3L20 11l-6.3 1.7L12 19l-1.7-6.3L4 11l6.3-1.7L12 3Z"/>',
    }

    return (
      '<svg width="' +
      (size || 20) +
      '" height="' +
      (size || 20) +
      '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      (paths[name] || '') +
      '</svg>'
    )
  }

  function track(type, opportunity, metadata) {
    fetch(API + '/intent/widget-events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-kablet-site-id': siteId,
      },
      body: JSON.stringify({
        eventType: type,
        intentEventId: opportunity ? opportunity.intentEventId || null : null,
        opportunityInstanceId: opportunity
          ? opportunity.instanceId || null
          : null,
        sessionId: sessionId,
        pageUrl: location.href,
        metadata: metadata || {},
      }),
    }).catch(function () {})
  }

  function formFields(form) {
    var fields = {}

    new FormData(form).forEach(function (value, key) {
      fields[key] = String(value)
    })

    return fields
  }

  function sendIntent(form) {
    if (!form || processedForms.has(form)) return

    processedForms.add(form)

    var fields = formFields(form)

    fetch(API + '/intent/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-kablet-site-id': siteId,
      },
      body: JSON.stringify({
        eventType: 'FORM_SUBMISSION',
        sourcePlatform: 'WORDPRESS',
        formId: form.id || null,
        pageUrl: location.href,
        hostUrl: location.origin,
        category: document.body.dataset.kabletCategory || null,
        intentText:
          fields.requirement ||
          fields.message ||
          fields['your-message'] ||
          null,
        customer: {
          firstName: fields.firstName || fields['your-name'] || null,
          lastName: fields.lastName || null,
          email:
            fields.email ||
            fields['your-email'] ||
            fields['user-email'] ||
            null,
          phone: fields.phone || fields.tel || null,
        },
        company: {
          name: fields.company || fields.companyName || null,
          industry: fields.industry || null,
        },
        structuredContext: { fields: fields },
      }),
    })
      .then(function (response) {
        if (!response.ok) throw new Error('Intent failed: ' + response.status)
        return response.json()
      })
      .then(function (result) {
        if (!result.opportunity) {
          track('ERROR', null, {
            reason: 'NO_OFFER_RETURNED',
            intentEventId: result.intentEventId || null,
          })
          return
        }

        result.opportunity.intentEventId = result.intentEventId
        result.opportunity.customerEmail =
          fields.email || fields['your-email'] || ''

        renderOffer(result.opportunity)
      })
      .catch(function (error) {
        console.warn('Kablet intent failed', error)
        track('ERROR', null, { reason: 'INTENT_FAILED' })
      })
  }

  function addStyles() {
    var style = document.createElement('style')
    style.id = 'kablet-widget-styles'

    style.textContent = `
      /* ── Reset & base ── */
      #kablet-offer-overlay *,
#kablet-offer-overlay *::before,
#kablet-offer-overlay *::after {
  box-sizing: border-box;
}

      /* ── Overlay ── */
      #kablet-offer-overlay {
        position: fixed;
        inset: 0;
        z-index: 2147483647;
        display: flex;
        align-items: flex-end;
        justify-content: center;
        padding: 0;
        background: rgba(23, 20, 20, 0.6);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        -webkit-font-smoothing: antialiased;
      }

      @media (min-width: 768px) {
        #kablet-offer-overlay {
          align-items: center;
          padding: 24px;
        }
      }

      /* ── Modal shell ── */
      #kablet-offer-modal {
        position: relative;
        width: 100%;
        max-height: 96dvh;
        overflow-y: auto;
        overscroll-behavior: contain;
        border-radius: 24px 24px 0 0;
        background: #FBF8F5;
        color: #171414;
        outline: none;
      }

      @media (min-width: 768px) {
        #kablet-offer-modal {
          width: min(960px, 100%);
          max-height: calc(100vh - 48px);
          border-radius: 20px;
          overflow: hidden;
          box-shadow:
            0 0 0 1px rgba(86, 11, 20, 0.08),
            0 24px 64px rgba(23, 20, 20, 0.22),
            0 4px 12px rgba(23, 20, 20, 0.08);
        }
      }

      /* ── Drag handle (mobile only) ── */
      .kablet-handle {
        display: flex;
        justify-content: center;
        padding: 14px 0 4px;
      }

      .kablet-handle-bar {
        width: 36px;
        height: 4px;
        border-radius: 99px;
        background: #D4C8BF;
      }

      @media (min-width: 768px) {
        .kablet-handle {
          display: none;
        }
      }

      /* ── Close button ── */
      .kablet-close {
        position: absolute;
        top: 14px;
        right: 14px;
        z-index: 4;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        padding: 0;
        border: 1px solid #E8DDD4;
        border-radius: 50%;
        background: #FBF8F5;
        color: #6F6260;
        cursor: pointer;
        transition: background 0.15s, color 0.15s, border-color 0.15s;
      }

      .kablet-close:hover {
        background: #F0E9E1;
        color: #171414;
        border-color: #D4C8BF;
      }

      .kablet-close:focus-visible {
        outline: 2px solid #560B14;
        outline-offset: 2px;
      }

      /* ── Two-column grid ── */
      .kablet-state-grid {
        display: flex;
        flex-direction: column;
      }

      @media (min-width: 768px) {
        .kablet-state-grid {
          display: grid;
          grid-template-columns: 1fr 380px;
          min-height: 520px;
        }
      }

      /* ── Left: copy panel ── */
      .kablet-copy {
        display: flex;
        flex-direction: column;
        justify-content: center;
        padding: 28px 24px 24px;
        order: 2;
      }

      @media (min-width: 768px) {
        .kablet-copy {
          padding: 52px 48px 44px;
          order: unset;
        }
      }

      /* ── Eyebrow badge ── */
      .kablet-badge {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        align-self: flex-start;
        margin-bottom: 20px;
        padding: 6px 12px 6px 8px;
        border-radius: 99px;
        background: rgba(86, 11, 20, 0.08);
        color: #560B14;
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 0.01em;
      }

      .kablet-badge-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #560B14;
        flex-shrink: 0;
      }

      /* ── Headline ── */
      .kablet-copy h2 {
        margin-bottom: 14px;
        color: #171414;
        font-size: clamp(26px, 3.6vw, 42px);
        font-weight: 700;
        line-height: 1.08;
        letter-spacing: -0.03em;
        max-width: 440px;
      }

      /* ── Description ── */
      .kablet-description {
        margin-bottom: 20px;
        color: #6F6260;
        font-size: 15px;
        line-height: 1.6;
        max-width: 420px;
      }

      /* ── Benefit strip ── */
      .kablet-benefit {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        max-width: 420px;
        margin-bottom: 24px;
        padding: 14px 16px;
        border-radius: 10px;
        border-left: 3px solid #560B14;
        background: rgba(86, 11, 20, 0.04);
        color: #3D1A1E;
        font-size: 13.5px;
        line-height: 1.5;
      }

      .kablet-benefit-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        flex: 0 0 22px;
        width: 22px;
        height: 22px;
        border-radius: 50%;
        background: #560B14;
        color: #FBF8F5;
        margin-top: 1px;
      }

      /* ── CTA button ── */
      .kablet-accept {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        width: 100%;
        max-width: 420px;
        min-height: 52px;
        padding: 0 24px;
        border: none;
        border-radius: 10px;
        background: #560B14;
        color: #FBF8F5;
        cursor: pointer;
        font: inherit;
        font-size: 15px;
        font-weight: 650;
        letter-spacing: -0.01em;
        transition: background 0.15s, transform 0.1s, box-shadow 0.15s;
        box-shadow: 0 1px 2px rgba(86, 11, 20, 0.2), 0 4px 12px rgba(86, 11, 20, 0.15);
      }

      .kablet-accept:hover {
        background: #6E1520;
        box-shadow: 0 2px 4px rgba(86, 11, 20, 0.25), 0 8px 20px rgba(86, 11, 20, 0.2);
        transform: translateY(-1px);
      }

      .kablet-accept:active {
        transform: translateY(0);
        box-shadow: 0 1px 2px rgba(86, 11, 20, 0.2);
      }

      .kablet-accept:disabled {
        cursor: wait;
        opacity: 0.65;
        transform: none;
        box-shadow: none;
      }

      .kablet-accept:focus-visible {
        outline: 2px solid #560B14;
        outline-offset: 3px;
      }

      /* ── Decline link ── */
      .kablet-decline {
        align-self: flex-start;
        margin-top: 12px;
        padding: 6px 0;
        border: none;
        background: transparent;
        color: #9C8F8A;
        cursor: pointer;
        font: inherit;
        font-size: 13px;
        text-decoration: underline;
        text-underline-offset: 3px;
        text-decoration-color: transparent;
        transition: color 0.15s, text-decoration-color 0.15s;
      }

      .kablet-decline:hover {
        color: #6F6260;
        text-decoration-color: currentColor;
      }

      /* ── Privacy note ── */
      .kablet-privacy {
        display: flex;
        align-items: flex-start;
        gap: 6px;
        max-width: 420px;
        margin-top: 18px;
        color: #9C8F8A;
        font-size: 11.5px;
        line-height: 1.5;
      }

      .kablet-privacy svg {
        flex: 0 0 13px;
        margin-top: 1px;
        opacity: 0.7;
      }

      /* ── Right: visual panel ── */
      .kablet-visual {
        display: flex;
        align-items: center;
        justify-content: center;
        order: 1;
        min-height: 200px;
        padding: 20px 24px;
        background: #F0E9E1;
      }

      @media (min-width: 768px) {
        .kablet-visual {
          order: unset;
          min-height: unset;
          padding: 32px;
          border-left: 1px solid #E8DDD4;
        }
      }

      .kablet-image {
        width: 100%;
        height: 100%;
        max-height: 180px;
        border-radius: 12px;
        object-fit: cover;
      }

      @media (min-width: 768px) {
        .kablet-image {
          max-height: none;
          border-radius: 14px;
        }
      }

      .kablet-placeholder {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        min-height: 160px;
        border-radius: 12px;
        background: #E8DDD4;
        color: rgba(86, 11, 20, 0.25);
      }

      @media (min-width: 768px) {
        .kablet-placeholder {
          min-height: 360px;
          border-radius: 14px;
        }
      }

      /* ── Footer ── */
      .kablet-modal-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
        padding: 14px 24px;
        border-top: 1px solid #E8DDD4;
        color: #9C8F8A;
        font-size: 11px;
      }

      @media (min-width: 768px) {
        .kablet-modal-footer {
          padding: 14px 32px;
        }
      }

      .kablet-trust {
        display: none;
        align-items: center;
        gap: 6px;
      }

      @media (min-width: 768px) {
        .kablet-trust {
          display: flex;
        }
      }

      .kablet-trust svg {
        color: #560B14;
        opacity: 0.6;
      }

      .kablet-powered {
        margin-left: auto;
      }

      .kablet-powered strong {
        color: #560B14;
        font-weight: 600;
      }

      /* ─────────────────────────────────────────
         CONFIRMATION STATE
      ───────────────────────────────────────── */

      /* Badge */
      .kablet-confirm-badge {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        align-self: flex-start;
        margin-bottom: 20px;
        padding: 6px 14px 6px 8px;
        border-radius: 99px;
        background: rgba(52, 115, 68, 0.1);
        color: #2C6040;
        font-size: 12px;
        font-weight: 600;
      }

      .kablet-confirm-badge-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #347344;
        flex-shrink: 0;
      }

      /* Success icon (inline in badge – keep for reuse) */
      .kablet-success-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        flex: 0 0 22px;
        width: 22px;
        height: 22px;
        border-radius: 50%;
        background: #347344;
        color: #fff;
      }

      /* "What happens next" timeline */
      .kablet-next {
        max-width: 420px;
        margin-bottom: 20px;
      }

      .kablet-next-title {
        margin-bottom: 12px;
        color: #6F6260;
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }

      .kablet-timeline {
        display: flex;
        flex-direction: column;
        gap: 0;
        position: relative;
        padding-left: 14px;
        border-left: 2px solid #D6EAD6;
      }

      .kablet-timeline-row {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 0 0 18px 16px;
        position: relative;
        color: #3D1A1E;
        font-size: 13.5px;
        line-height: 1.45;
      }

      .kablet-timeline-row:last-child {
        padding-bottom: 0;
      }

      .kablet-timeline-dot {
        position: absolute;
        left: -21px;
        top: 3px;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: #347344;
        border: 2px solid #FBF8F5;
        flex-shrink: 0;
      }

      /* Return button */
      .kablet-return {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        width: 100%;
        max-width: 420px;
        min-height: 52px;
        padding: 0 24px;
        border: 1px solid #E8DDD4;
        border-radius: 10px;
        background: #FBF8F5;
        color: #560B14;
        cursor: pointer;
        font: inherit;
        font-size: 15px;
        font-weight: 600;
        transition: background 0.15s, border-color 0.15s, transform 0.1s;
      }

      .kablet-return:hover {
        background: #F0E9E1;
        border-color: #D4C8BF;
        transform: translateY(-1px);
      }

      .kablet-return:active {
        transform: translateY(0);
      }

      .kablet-return:focus-visible {
        outline: 2px solid #560B14;
        outline-offset: 3px;
      }

      /* Confirmation visual panel */
      .kablet-confirm-visual {
        display: flex;
        align-items: center;
        justify-content: center;
        order: 1;
        min-height: 180px;
        background: #EDF4EC;
      }

      @media (min-width: 768px) {
        .kablet-confirm-visual {
          order: unset;
          min-height: unset;
          border-left: 1px solid rgba(52, 115, 68, 0.15);
        }
      }

      .kablet-confirm-art {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        min-height: 160px;
      }

      @media (min-width: 768px) {
        .kablet-confirm-art {
          min-height: 420px;
        }
      }

      /* Animated check ring */
      .kablet-check-ring {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 88px;
        height: 88px;
      }

      @media (min-width: 768px) {
        .kablet-check-ring {
          width: 120px;
          height: 120px;
        }
      }

      .kablet-check-ring svg.kablet-ring-svg {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        transform: rotate(-90deg);
      }

      .kablet-ring-track {
        fill: none;
        stroke: rgba(52, 115, 68, 0.15);
        stroke-width: 3;
      }

      .kablet-ring-fill {
        fill: none;
        stroke: #347344;
        stroke-width: 3;
        stroke-linecap: round;
        stroke-dasharray: 251;
        stroke-dashoffset: 251;
        animation: kablet-ring-draw 0.7s cubic-bezier(0.4, 0, 0.2, 1) 0.1s forwards;
      }

      .kablet-check-inner {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 64px;
        height: 64px;
        border-radius: 50%;
        background: #347344;
        color: #fff;
        animation: kablet-pop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) 0.55s both;
      }

      @media (min-width: 768px) {
        .kablet-check-inner {
          width: 86px;
          height: 86px;
        }
      }

      @keyframes kablet-ring-draw {
        to { stroke-dashoffset: 0; }
      }

      @keyframes kablet-pop {
        from { transform: scale(0.6); opacity: 0; }
        to   { transform: scale(1);   opacity: 1; }
      }

      .kablet-confirm-copy {
        order: 2;
      }

      @media (min-width: 768px) {
        .kablet-confirm-copy {
          order: unset;
        }
      }

      /* ── Reduced motion ── */
      @media (prefers-reduced-motion: reduce) {
        .kablet-ring-fill {
          animation: none;
          stroke-dashoffset: 0;
        }

        .kablet-check-inner {
          animation: none;
          opacity: 1;
          transform: scale(1);
        }

        .kablet-accept,
        .kablet-return,
        .kablet-close {
          transition: none;
        }
      }

      /* ── Hide visual on very short mobile screens ── */
      @media (max-height: 600px) and (max-width: 767px) {
        .kablet-visual,
        .kablet-confirm-visual {
          display: none;
        }
      }
              /* Final host-site protection */
      #kablet-offer-overlay #kablet-offer-modal .kablet-copy {
        display:flex !important;
        flex-direction:column !important;
        justify-content:center !important;
        padding:52px 48px 44px !important;
        margin:0 !important;
        min-width:0 !important;
        width:auto !important;
      }

      #kablet-offer-overlay #kablet-offer-modal .kablet-copy h2 {
        display:block !important;
        max-width:440px !important;
        margin:0 0 18px !important;
        padding:0 !important;
        color:#171414 !important;
        font-family:Inter,Arial,sans-serif !important;
        font-size:clamp(38px,4vw,52px) !important;
        font-weight:750 !important;
        line-height:1.03 !important;
        letter-spacing:-.045em !important;
      }

      #kablet-offer-overlay #kablet-offer-modal .kablet-description {
        display:block !important;
        max-width:450px !important;
        margin:0 0 22px !important;
        padding:0 !important;
        color:#6F6260 !important;
        font-family:Inter,Arial,sans-serif !important;
        font-size:17px !important;
        line-height:1.55 !important;
      }

      #kablet-offer-overlay #kablet-offer-modal .kablet-badge {
        display:inline-flex !important;
        align-self:flex-start !important;
        margin:0 0 25px !important;
        padding:8px 13px !important;
      }

      #kablet-offer-overlay #kablet-offer-modal .kablet-benefit {
        display:flex !important;
        max-width:450px !important;
        margin:0 0 20px !important;
        padding:16px 18px !important;
      }

      #kablet-offer-overlay #kablet-offer-modal .kablet-accept {
        display:flex !important;
        width:100% !important;
        max-width:450px !important;
        min-height:58px !important;
        margin:0 !important;
        padding:0 20px !important;
        border:0 !important;
      }

      #kablet-offer-overlay #kablet-offer-modal .kablet-decline {
        display:block !important;
        align-self:center !important;
        margin:11px 0 0 !important;
        padding:7px !important;
      }

      #kablet-offer-overlay #kablet-offer-modal .kablet-privacy {
        display:flex !important;
        max-width:450px !important;
        margin:16px 0 0 !important;
        padding:0 !important;
      }

      #kablet-offer-overlay #kablet-offer-modal .kablet-state-grid {
        display:grid !important;
        grid-template-columns:minmax(0,1fr) minmax(360px,.92fr) !important;
        min-height:520px !important;
      }

      #kablet-offer-overlay #kablet-offer-modal .kablet-modal-footer {
        display:flex !important;
        width:100% !important;
        min-height:58px !important;
        margin:0 !important;
        padding:18px 28px !important;
      }

      #kablet-offer-overlay #kablet-offer-modal .kablet-visual {
        display:flex !important;
        min-height:520px !important;
        margin:0 !important;
        padding:28px !important;
      }

      #kablet-offer-overlay #kablet-offer-modal .kablet-confirm-copy {
        padding:52px 48px 44px !important;
      }

      #kablet-offer-overlay #kablet-offer-modal .kablet-confirm-visual {
        display:flex !important;
        min-height:520px !important;
        padding:28px !important;
      }

      @media (max-width:767px) {
        #kablet-offer-overlay #kablet-offer-modal .kablet-state-grid {
          display:flex !important;
          flex-direction:column !important;
          min-height:0 !important;
        }

        #kablet-offer-overlay #kablet-offer-modal .kablet-copy,
        #kablet-offer-overlay #kablet-offer-modal .kablet-confirm-copy {
          order:1 !important;
          padding:26px 20px 25px !important;
        }

        #kablet-offer-overlay #kablet-offer-modal .kablet-visual,
        #kablet-offer-overlay #kablet-offer-modal .kablet-confirm-visual {
          order:2 !important;
          min-height:190px !important;
          padding:14px 20px !important;
        }

        #kablet-offer-overlay #kablet-offer-modal .kablet-copy h2,
        #kablet-offer-overlay #kablet-offer-modal .kablet-confirm-copy h2 {
          max-width:none !important;
          font-size:33px !important;
        }

        #kablet-offer-overlay #kablet-offer-modal .kablet-modal-footer {
          order:3 !important;
          min-height:48px !important;
          padding:14px 20px !important;
        }
      }
              @media (min-width:768px) {
        #kablet-offer-overlay #kablet-offer-modal {
          max-height:calc(100vh - 48px) !important;
          overflow:hidden !important;
        }

        #kablet-offer-overlay #kablet-offer-modal .kablet-state-grid {
          min-height:470px !important;
          height:470px !important;
        }

        #kablet-offer-overlay #kablet-offer-modal .kablet-copy {
          justify-content:flex-start !important;
          padding:42px 48px 26px !important;
        }

        #kablet-offer-overlay #kablet-offer-modal .kablet-copy h2 {
          max-width:430px !important;
          margin-bottom:14px !important;
          font-size:44px !important;
          line-height:1.02 !important;
        }

        #kablet-offer-overlay #kablet-offer-modal .kablet-description {
          margin-bottom:16px !important;
          font-size:16px !important;
          line-height:1.42 !important;
        }

        #kablet-offer-overlay #kablet-offer-modal .kablet-benefit {
          margin-bottom:16px !important;
          padding:13px 15px !important;
        }

        #kablet-offer-overlay #kablet-offer-modal .kablet-accept {
          min-height:54px !important;
        }

        #kablet-offer-overlay #kablet-offer-modal .kablet-privacy {
          margin-top:12px !important;
        }

        #kablet-offer-overlay #kablet-offer-modal .kablet-visual {
          min-height:470px !important;
          padding:24px !important;
        }

        #kablet-offer-overlay #kablet-offer-modal .kablet-modal-footer {
          min-height:58px !important;
          height:58px !important;
          padding:15px 28px !important;
        }
      }
    `

    document.head.appendChild(style)
    return style
  }

  function renderOffer(opportunity) {
    if (document.getElementById('kablet-offer-overlay')) return

    previousFocus = document.activeElement

    var style = addStyles()
    var overlay = document.createElement('div')
    overlay.id = 'kablet-offer-overlay'

    var modal = document.createElement('div')
    modal.id = 'kablet-offer-modal'
    modal.setAttribute('role', 'dialog')
    modal.setAttribute('aria-modal', 'true')
    modal.setAttribute('aria-labelledby', 'kablet-title')
    modal.setAttribute('tabindex', '-1')

    var image =
      opportunity.imageUrl ||
      opportunity.visualAssetUrl ||
      opportunity.visual_asset_url ||
      ''

    var visual = image
      ? '<img class="kablet-image" src="' + esc(image) + '" alt="">'
      : '<div class="kablet-placeholder">' + svg('shield', 48) + '</div>'

    modal.innerHTML =
      '<div class="kablet-handle"><div class="kablet-handle-bar"></div></div>' +
      '<button id="kablet-close" class="kablet-close" type="button" aria-label="Close">' +
      svg('close', 16) +
      '</button>' +
      '<div class="kablet-state-grid">' +

      '<section class="kablet-copy">' +
      '<div class="kablet-badge"><span class="kablet-badge-dot"></span><span>Recommended next step</span></div>' +
      '<h2 id="kablet-title">' +
      esc(opportunity.headline || opportunity.name || 'A relevant next step') +
      '</h2>' +
      '<p class="kablet-description">' +
      esc(opportunity.description || 'Explore a relevant option for your business.') +
      '</p>' +
      '<div class="kablet-benefit">' +
      '<span class="kablet-benefit-icon">' + svg('check', 13) + '</span>' +
      '<span>' +
      esc(
        opportunity.benefit ||
        opportunity.valueProposition ||
        'Get connected with relevant providers and compare options.'
      ) +
      '</span></div>' +
      '<button id="kablet-accept" class="kablet-accept" type="button">' +
      esc(opportunity.ctaLabel || 'Get options') +
      ' ' + svg('arrow', 17) +
      '</button>' +
      '<button id="kablet-decline" class="kablet-decline" type="button">No thanks, I\'ll do this later</button>' +
      '<div class="kablet-privacy">' +
      svg('lock', 13) +
      '<span>Your details are only shared with relevant providers after you choose to continue.</span>' +
      '</div>' +
      '</section>' +

      '<section class="kablet-visual">' + visual + '</section>' +

      '</div>' +
      '<footer class="kablet-modal-footer">' +
      '<div class="kablet-trust">' + svg('shield', 14) + '<span>Connecting you with verified, relevant providers.</span></div>' +
      '<div class="kablet-powered">Powered by <strong>Kablet</strong></div>' +
      '</footer>'

    overlay.appendChild(modal)
    document.body.appendChild(overlay)
    document.body.dataset.kabletPreviousOverflow = document.body.style.overflow || ''
    document.body.style.overflow = 'hidden'

    track('DISPLAYED', opportunity)

    function close(type) {
      if (type) track(type, opportunity)
      overlay.remove()
      style.remove()
      document.body.style.overflow = document.body.dataset.kabletPreviousOverflow || ''
      if (previousFocus && previousFocus.focus) previousFocus.focus()
    }

    modal.querySelector('#kablet-close').addEventListener('click', function () {
      close('DISMISSED')
    })

    modal.querySelector('#kablet-decline').addEventListener('click', function () {
      close('DECLINED')
    })

    modal.querySelector('#kablet-accept').addEventListener('click', function () {
      var button = modal.querySelector('#kablet-accept')
      button.disabled = true
      button.setAttribute('aria-busy', 'true')
      button.innerHTML = 'Connecting...'

      fetch(API + '/intent/consent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-kablet-site-id': siteId,
        },
        body: JSON.stringify({
          intentEventId: opportunity.intentEventId,
          instanceId: opportunity.instanceId,
          consentText: 'I agree to be contacted by relevant providers.',
          consentVersion: 'v1',
          sourceUrl: location.href,
        }),
      })
        .then(function (response) {
          if (!response.ok) throw new Error('Consent failed: ' + response.status)
          return response.json()
        })
        .then(function () {
          track('ACCEPTED', opportunity)
          renderConfirmation(modal, opportunity, close)
        })
        .catch(function (error) {
          console.warn('Kablet consent failed', error)
          track('ERROR', opportunity, { reason: 'CONSENT_FAILED' })
          button.disabled = false
          button.removeAttribute('aria-busy')
          button.innerHTML = esc(opportunity.ctaLabel || 'Get options') + ' ' + svg('arrow', 17)
        })
    })

    modal.focus()
  }

  function renderConfirmation(modal, opportunity, close) {
    var category = opportunity.category || opportunity.offerCategory || ''
    var description = category
      ? 'Your request has been shared with relevant ' + category + ' providers. Expect to hear from them shortly.'
      : 'Your request has been shared with relevant providers. Expect to hear from them shortly.'

    modal.innerHTML =
      '<div class="kablet-handle"><div class="kablet-handle-bar"></div></div>' +
      '<button id="kablet-confirm-close" class="kablet-close" type="button" aria-label="Close">' +
      svg('close', 16) +
      '</button>' +
      '<div class="kablet-state-grid">' +

      '<section class="kablet-copy kablet-confirm-copy">' +
      '<div class="kablet-confirm-badge"><span class="kablet-confirm-badge-dot"></span><span>Request received</span></div>' +
      '<h2 id="kablet-title">You\'re all set.</h2>' +
      '<p class="kablet-description kablet-confirm-message">' + esc(description) + '</p>' +

      '<div class="kablet-next">' +
      '<div class="kablet-next-title">What happens next</div>' +
      '<div class="kablet-timeline">' +
      '<div class="kablet-timeline-row"><span class="kablet-timeline-dot"></span><span>Your request has been received</span></div>' +
      '<div class="kablet-timeline-row"><span class="kablet-timeline-dot"></span><span>Relevant providers are being notified</span></div>' +
      '<div class="kablet-timeline-row"><span class="kablet-timeline-dot"></span><span>They\'ll contact you directly with options and next steps</span></div>' +
      '</div>' +
      '</div>' +

      '<div class="kablet-privacy">' + svg('lock', 13) + '<span>Your details are only shared with providers relevant to this request.</span></div>' +

      '<button id="kablet-confirm-return" class="kablet-return" type="button">Back to website ' + svg('arrow', 17) + '</button>' +
      '</section>' +

      '<section class="kablet-visual kablet-confirm-visual">' +
      '<div class="kablet-confirm-art">' +
      '<div class="kablet-check-ring">' +
      '<svg class="kablet-ring-svg" viewBox="0 0 100 100" aria-hidden="true">' +
      '<circle class="kablet-ring-track" cx="50" cy="50" r="40"/>' +
      '<circle class="kablet-ring-fill" cx="50" cy="50" r="40"/>' +
      '</svg>' +
      '<div class="kablet-check-inner">' + svg('check', 32) + '</div>' +
      '</div>' +
      '</div>' +
      '</section>' +

      '</div>' +
      '<footer class="kablet-modal-footer">' +
      '<div class="kablet-trust">' + svg('shield', 14) + '<span>Connecting you with verified, relevant providers.</span></div>' +
      '<div class="kablet-powered">Powered by <strong>Kablet</strong></div>' +
      '</footer>'

    track('CONFIRMATION_DISPLAYED', opportunity)

    modal.querySelector('#kablet-confirm-close').addEventListener('click', function () {
      track('RETURNED_TO_HOST', opportunity)
      close()
    })

    modal.querySelector('#kablet-confirm-return').addEventListener('click', function () {
      track('RETURNED_TO_HOST', opportunity)
      close()
    })
  }

  document.addEventListener('wpcf7mailsent', function (event) {
    if (event.target && event.target.tagName === 'FORM') {
      sendIntent(event.target)
    }
  })

  if (window.MutationObserver) {
    var observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        mutation.addedNodes.forEach(function (node) {
          if (node.nodeType !== Node.ELEMENT_NODE) return

          var successSelectors = [
            '.w-form-done',
            '.wpforms-confirmation-container',
            '.gform_confirmation_message',
            '.elementor-message-success',
            '.formidable_message',
            '.ff-message-success',
            '.form-success',
            '.success-message',
          ]

          var isSuccess = successSelectors.some(function (selector) {
            return (
              (node.matches && node.matches(selector)) ||
              (node.querySelector && node.querySelector(selector))
            )
          })

          if (!isSuccess) return

          var form =
            (node.closest && node.closest('form')) ||
            document.querySelector('form')

          if (form) {
            setTimeout(function () {
              sendIntent(form)
            }, 300)
          }
        })
      })
    })

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    })
  }

  document.addEventListener('keydown', function (event) {
    var modal = document.getElementById('kablet-offer-modal')
    if (!modal) return
    if (event.key === 'Escape') {
      var closeButton = modal.querySelector('#kablet-close, #kablet-confirm-close')
      if (closeButton) closeButton.click()
    }
  })
})()