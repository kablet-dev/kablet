(function () {
  'use strict'

  var script =
    document.currentScript ||
    Array.from(document.scripts).find(function (item) {
      return item.src.indexOf('kablet-widget.js') !== -1
    })

  if (!script) return

  var scriptUrl = new URL(script.src, window.location.href)
  var siteId = scriptUrl.searchParams.get('site')

  if (!siteId) {
    console.warn('Kablet widget: site ID is missing')
    return
  }

  console.log('Kablet widget loaded')

  var API_URL = 'https://kablet-backend.onrender.com'
  var processedForms = new WeakSet()
  var sessionId =
    sessionStorage.getItem('kablet_session_id') ||
    (Date.now().toString(36) + Math.random().toString(36).slice(2))

  sessionStorage.setItem('kablet_session_id', sessionId)

  function trackWidgetEvent(eventType, opportunity, metadata) {
    fetch(API_URL + '/intent/widget-events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-kablet-site-id': siteId,
      },
      body: JSON.stringify({
        eventType: eventType,
        intentEventId: opportunity
          ? opportunity.intentEventId || null
          : null,
        opportunityInstanceId: opportunity
          ? opportunity.instanceId || null
          : null,
        sessionId: sessionId,
        pageUrl: window.location.href,
        metadata: metadata || {},
      }),
    }).catch(function (error) {
      console.warn('Kablet analytics event failed', error)
    })
  }

  trackWidgetEvent('LOADED', null)
  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }

  function readForm(form) {
    var fields = {}

    new FormData(form).forEach(function (value, key) {
      fields[key] = String(value)
    })

    return fields
  }

  function getCustomerEmail(fields) {
    return (
      fields.email ||
      fields['your-email'] ||
      fields['user-email'] ||
      fields.customer_email ||
      ''
    )
  }

  function sendIntent(form) {
    if (!form || processedForms.has(form)) return

    processedForms.add(form)

    var fields = readForm(form)
    var customerEmail = getCustomerEmail(fields)

    console.log('Kablet: sending intent', form)

    fetch(API_URL + '/intent/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-kablet-site-id': siteId,
      },
      body: JSON.stringify({
        eventType: 'FORM_SUBMISSION',
        sourcePlatform: 'WORDPRESS',
        formId: form.id || null,
        pageUrl: window.location.href,
        hostUrl: window.location.origin,
        category: document.body.dataset.kabletCategory || null,
        intentText:
          fields.requirement ||
          fields.message ||
          fields['your-message'] ||
          null,
        customer: {
          firstName:
            fields.firstName ||
            fields.first_name ||
            fields['your-name'] ||
            null,
          lastName: fields.lastName || fields.last_name || null,
          email: customerEmail || null,
          phone: fields.phone || fields.tel || null,
        },
        company: {
          name: fields.company || fields.companyName || null,
          industry: fields.industry || null,
        },
        structuredContext: {
          fields: fields,
        },
      }),
    })
      .then(function (response) {
        if (!response.ok) {
          throw new Error('Intent request failed: ' + response.status)
        }

        return response.json()
      })
      .then(function (result) {
        if (!result.opportunity) return

        result.opportunity.intentEventId = result.intentEventId
        result.opportunity.customerEmail = customerEmail

        showOffer(result.opportunity)
      })
      .catch(function (error) {
        console.warn('Kablet widget: intent failed', error)
      })
  }

  function showOffer(opportunity) {
    if (document.getElementById('kablet-offer-overlay')) return

    var imageUrl =
      opportunity.imageUrl ||
      opportunity.visualAssetUrl ||
      opportunity.visual_asset_url ||
      ''

    var headline =
      opportunity.headline ||
      opportunity.name ||
      'You may also need a relevant business solution'

    var description =
      opportunity.description ||
      'Explore a relevant option for your business.'

    var benefit =
      opportunity.benefit ||
      opportunity.valueProposition ||
      'Get connected with relevant providers and compare your options.'

    var ctaText = opportunity.ctaLabel || 'Get options'

    var overlay = document.createElement('div')
    overlay.id = 'kablet-offer-overlay'

    var modal = document.createElement('div')
    modal.id = 'kablet-offer-modal'

    var imageMarkup = imageUrl
      ? '<img class="kablet-offer-image" src="' +
        escapeHtml(imageUrl) +
        '" alt="">'
      : '<div class="kablet-image-placeholder">✦</div>'

    modal.innerHTML =
      '<button id="kablet-close" class="kablet-close" type="button" aria-label="Close">×</button>' +
      '<div class="kablet-offer-layout">' +
      '<section class="kablet-offer-copy">' +
      '<div class="kablet-badge"><span>✦</span>Recommended next step</div>' +
      '<h2>' +
      escapeHtml(headline) +
      '</h2>' +
      '<p class="kablet-description">' +
      escapeHtml(description) +
      '</p>' +
      '<div class="kablet-benefit"><span>✓</span><span>' +
      escapeHtml(benefit) +
      '</span></div>' +
      '<button id="kablet-accept" class="kablet-accept" type="button">' +
      escapeHtml(ctaText) +
      ' <span>→</span></button>' +
      '<button id="kablet-decline" class="kablet-decline" type="button">No thanks, I’ll do this later</button>' +
      '<div class="kablet-footer"><span>🔒 Shared only after you choose to continue.</span><span>Powered by <strong>Kablet</strong></span></div>' +
      '</section>' +
      '<section class="kablet-offer-visual">' +
      imageMarkup +
      '</section>' +
      '</div>'

    var style = document.createElement('style')

    style.textContent = `
      #kablet-offer-overlay {
        position:fixed;
        inset:0;
        z-index:999999;
        display:flex;
        align-items:center;
        justify-content:center;
        padding:20px;
        background:rgba(23,20,20,.72);
        backdrop-filter:blur(5px);
        font-family:Arial,sans-serif;
      }

      #kablet-offer-modal {
        position:relative;
        width:min(900px,100%);
        height:620px;
        max-height:calc(100vh - 32px);
        overflow:hidden;
        background:#fbf8f5;
        border-radius:24px;
        color:#171414;
        box-shadow:0 30px 80px rgba(23,20,20,.3);
      }

      #kablet-offer-modal *,
      #kablet-offer-modal *::before,
      #kablet-offer-modal *::after {
        box-sizing:border-box;
      }

      .kablet-close {
        position:absolute;
        top:17px;
        right:20px;
        z-index:5;
        width:40px;
        height:40px;
        border:0;
        background:transparent;
        color:#171414;
        cursor:pointer;
        font-size:32px;
        line-height:1;
      }

      .kablet-offer-layout {
        display:grid;
        grid-template-columns:1fr 1fr;
        width:100%;
        height:100%;
      }

      .kablet-offer-copy {
        position:relative;
        display:flex;
        flex-direction:column;
        justify-content:center;
        min-width:0;
        padding:42px 40px 88px;
      }

      .kablet-badge {
        display:inline-flex;
        align-items:center;
        gap:8px;
        align-self:flex-start;
        margin-bottom:24px;
        padding:9px 13px;
        border:1px solid #e8ddd4;
        border-radius:999px;
        background:#f7f2ea;
        color:#560b14;
        font-size:13px;
        font-weight:600;
      }

      .kablet-badge span {
        font-size:18px;
      }

      .kablet-offer-copy h2 {
        max-width:390px;
        margin:0 0 18px;
        font-size:38px;
        line-height:1.05;
        letter-spacing:-1.5px;
      }

      .kablet-description {
        max-width:410px;
        margin:0 0 18px;
        color:#6f6260;
        font-size:17px;
        line-height:1.45;
      }

      .kablet-benefit {
        display:flex;
        gap:10px;
        max-width:410px;
        margin-bottom:18px;
        padding:13px 16px;
        border:1px solid #e8ddd4;
        border-radius:13px;
        color:#560b14;
        font-size:13px;
        line-height:1.4;
      }

      .kablet-benefit > span:first-child {
        font-size:18px;
        font-weight:bold;
      }

      .kablet-accept {
        width:100%;
        max-width:410px;
        min-height:54px;
        border:0;
        border-radius:12px;
        background:#560b14;
        color:#f7f2ea;
        cursor:pointer;
        font-size:16px;
        font-weight:700;
      }

      .kablet-accept span,
      .kablet-confirm-return span {
        margin-left:8px;
        font-size:20px;
      }

      .kablet-decline {
        width:100%;
        max-width:410px;
        margin-top:12px;
        padding:8px;
        border:0;
        background:transparent;
        color:#6f6260;
        cursor:pointer;
        font-size:13px;
        text-decoration:underline;
      }

      .kablet-footer {
        position:absolute;
        right:32px;
        bottom:0;
        left:0;
        display:flex;
        justify-content:space-between;
        padding:15px 32px;
        border-top:1px solid #e8ddd4;
        color:#8a7d78;
        font-size:11px;
      }

      .kablet-footer strong,
      .kablet-confirm-footer strong {
        color:#560b14;
      }

      .kablet-offer-visual,
      .kablet-confirm-visual {
        display:flex;
        align-items:center;
        justify-content:center;
        min-width:0;
        height:100%;
        padding:24px;
        overflow:hidden;
        background:#f7f2ea;
      }

      .kablet-offer-image,
      .kablet-image-placeholder {
        display:flex;
        align-items:center;
        justify-content:center;
        width:100%;
        height:100%;
        border-radius:18px;
        object-fit:contain;
        background:#cfc5bd;
      }

      .kablet-image-placeholder {
        color:#560b14;
        font-size:72px;
      }

      .kablet-confirm-layout {
        display:grid;
        grid-template-columns:1fr 1fr;
        width:100%;
        height:100%;
      }

      .kablet-confirm-copy {
        position:relative;
        display:flex;
        flex-direction:column;
        justify-content:center;
        min-width:0;
        padding:54px 44px 86px;
      }

      .kablet-confirm-badge {
        display:inline-flex;
        align-items:center;
        gap:10px;
        align-self:flex-start;
        margin-bottom:32px;
        padding:9px 15px 9px 9px;
        border:1px solid #becbbb;
        border-radius:999px;
        background:#edf2e9;
        color:#315b39;
        font-size:14px;
        font-weight:700;
      }

      .kablet-confirm-badge span {
        display:flex;
        align-items:center;
        justify-content:center;
        width:34px;
        height:34px;
        border-radius:50%;
        background:#315f3b;
        color:#fff;
        font-size:24px;
      }

      .kablet-confirm-copy h2 {
        max-width:390px;
        margin:0 0 22px;
        font-size:40px;
        line-height:1.08;
        letter-spacing:-1.5px;
      }

      .kablet-confirm-message {
        max-width:390px;
        margin:0 0 26px;
        color:#48413e;
        font-size:17px;
        font-weight:600;
        line-height:1.35;
      }

      .kablet-confirm-email {
        display:flex;
        align-items:center;
        gap:12px;
        max-width:390px;
        margin-bottom:18px;
        padding:10px 14px;
        border:1px solid #c8cec3;
        border-radius:7px;
        background:#eef0eb;
        color:#686762;
        font-size:12px;
        line-height:1.35;
      }

      .kablet-confirm-email strong {
        color:#171414;
        font-size:13px;
      }

      .kablet-confirm-email-icon {
        display:flex;
        align-items:center;
        justify-content:center;
        width:28px;
        height:28px;
        flex:0 0 28px;
        border-radius:50%;
        background:#315f3b;
        color:#fff;
        font-size:16px;
      }

      .kablet-confirm-return {
        display:flex;
        align-items:center;
        justify-content:center;
        gap:10px;
        width:100%;
        max-width:390px;
        min-height:49px;
        border:1px solid #e4d8cf;
        border-radius:7px;
        background:transparent;
        color:#710914;
        cursor:pointer;
        font-size:14px;
        font-weight:700;
      }

      .kablet-confirm-footer {
        position:absolute;
        right:44px;
        bottom:22px;
        left:44px;
        display:flex;
        justify-content:space-between;
        color:#8a7d78;
        font-size:11px;
      }

      .kablet-confirm-privacy {
        text-decoration:underline;
      }

      .kablet-confirm-image {
        display:flex;
        align-items:center;
        justify-content:center;
        width:100%;
        height:100%;
        background:#fbf8f5;
      }

      .kablet-confirm-envelope {
        display:flex;
        align-items:center;
        justify-content:center;
        width:190px;
        height:135px;
        border-radius:14px;
        background:#cfe0cc;
        color:#315f3b;
        font-size:66px;
        box-shadow:0 16px 35px rgba(49,95,59,.14);
      }

      @media (max-width:767px) {
        #kablet-offer-overlay {
          align-items:center;
          padding:12px;
        }

        #kablet-offer-modal {
          width:100%;
          height:auto;
          max-height:calc(100vh - 24px);
          overflow:auto;
          border-radius:22px;
        }

        .kablet-offer-layout,
        .kablet-confirm-layout {
          display:flex;
          flex-direction:column;
          height:auto;
        }

        .kablet-offer-visual {
          order:1;
          width:100%;
          height:170px;
          min-height:170px;
          padding:14px;
        }

        .kablet-offer-image,
        .kablet-image-placeholder {
          height:142px;
          max-height:142px;
          border-radius:14px;
        }

        .kablet-offer-copy {
          order:2;
          padding:20px 20px 60px;
        }

        .kablet-badge {
          margin-bottom:16px;
          padding:7px 11px;
          font-size:12px;
        }

        .kablet-offer-copy h2 {
          max-width:none;
          margin-bottom:12px;
          font-size:30px;
        }

        .kablet-description {
          margin-bottom:16px;
          font-size:15px;
        }

        .kablet-benefit {
          margin-bottom:16px;
          padding:12px 13px;
          font-size:12px;
        }

        .kablet-footer {
          right:0;
          width:100%;
          padding:11px 18px;
          font-size:9px;
        }

        .kablet-confirm-visual {
          order:1;
          width:100%;
          height:220px;
          min-height:220px;
          padding:18px;
        }

        .kablet-confirm-copy {
          order:2;
          justify-content:flex-start;
          padding:30px 22px 78px;
          text-align:center;
        }

        .kablet-confirm-badge {
          align-self:center;
          margin-bottom:24px;
        }

        .kablet-confirm-copy h2 {
          max-width:none;
          margin-bottom:18px;
          font-size:34px;
        }

        .kablet-confirm-message {
          max-width:none;
          margin-bottom:22px;
          font-size:16px;
        }

        .kablet-confirm-email,
        .kablet-confirm-return {
          max-width:none;
        }

        .kablet-confirm-email {
          text-align:left;
        }

        .kablet-confirm-footer {
          right:22px;
          bottom:22px;
          left:22px;
        }

        .kablet-confirm-envelope {
          width:165px;
          height:115px;
          font-size:52px;
        }
      }
    `

    document.head.appendChild(style)
    overlay.appendChild(modal)
    document.body.appendChild(overlay)
    trackWidgetEvent('DISPLAYED', opportunity)
        function close() {
      trackWidgetEvent('DISMISSED', opportunity)
      overlay.remove()
      style.remove()
    }

    modal.querySelector('#kablet-close').addEventListener('click', close)
        modal
      .querySelector('#kablet-decline')
      .addEventListener('click', function () {
        trackWidgetEvent('DECLINED', opportunity)
        overlay.remove()
        style.remove()
      })

    modal.querySelector('#kablet-accept').addEventListener('click', function () {
      var button = modal.querySelector('#kablet-accept')

      button.disabled = true
      button.textContent = 'Saving...'

      fetch(API_URL + '/intent/consent', {
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
          sourceUrl: window.location.href,
        }),
      })
        .then(function (response) {
          if (!response.ok) {
            throw new Error('Consent request failed: ' + response.status)
          }

          return response.json()
        })
        .then(function () {
          var email =
            opportunity.customerEmail || 'your email address'

          modal.innerHTML =
            '<button id="kablet-confirm-close-x" class="kablet-close" type="button" aria-label="Close">×</button>' +
            '<div class="kablet-confirm-layout">' +
            '<section class="kablet-confirm-copy">' +
            '<div class="kablet-confirm-badge"><span>✓</span>Request received</div>' +
            '<h2>We’ve received<br>your request!</h2>' +
            '<p class="kablet-confirm-message">We’ll connect you with trusted providers shortly. You can expect to hear from them within the next 48 hours.</p>' +
            '<div class="kablet-confirm-email"><span class="kablet-confirm-email-icon">✉</span><span>We’ve sent a confirmation to<br><strong>' +
            escapeHtml(email) +
            '</strong></span></div>' +
            '<button id="kablet-confirm-return" class="kablet-confirm-return" type="button">Close & return to website <span>→</span></button>' +
            '<div class="kablet-confirm-footer"><span>Powered by <strong>Kablet</strong></span><span class="kablet-confirm-privacy">Privacy</span></div>' +
            '</section>' +
            '<section class="kablet-confirm-visual"><div class="kablet-confirm-image"><div class="kablet-confirm-envelope">✉</div></div></section>' +
            '</div>'

          modal
            .querySelector('#kablet-confirm-close-x')
            .addEventListener('click', close)

          modal
            .querySelector('#kablet-confirm-return')
            .addEventListener('click', close)
        })
        .catch(function (error) {
          console.warn('Kablet widget: consent failed', error)

trackWidgetEvent('ERROR', opportunity, {
  message: error.message,
})

button.disabled = false
          button.textContent = ctaText + ' →'
        })
    })
  }

  document.addEventListener('submit', function (event) {
    var form = event.target

    if (form && form.tagName === 'FORM') {
      setTimeout(function () {
        sendIntent(form)
      }, 500)
    }
  })

  document.addEventListener('wpcf7mailsent', function (event) {
    var form = event.target

    if (form && form.tagName === 'FORM') {
      sendIntent(form)
    }
  })

  if (window.MutationObserver) {
    var observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        mutation.addedNodes.forEach(function (node) {
          if (node.nodeType !== Node.ELEMENT_NODE) return

          var successSelectors = [
            '.success',
            '.form-success',
            '.form-success-message',
            '.success-message',
            '[role="alert"]',
            '.w-form-done',
            '.wpforms-confirmation-container',
            '.gform_confirmation_message',
            '.elementor-message-success',
            '.formidable_message',
            '.ff-message-success',
          ]

          var successDetected = successSelectors.some(function (selector) {
            return (
              (node.matches && node.matches(selector)) ||
              (node.querySelector && node.querySelector(selector))
            )
          })

          if (!successDetected) return

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
})()