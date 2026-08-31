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
    console.warn('Kablet widget: missing site ID')
    return
  }

  var API_URL = 'https://kablet-backend.onrender.com'
  var processedForms = new WeakSet()
  var sessionId =
    sessionStorage.getItem('kablet_session_id') ||
    Date.now().toString(36) + Math.random().toString(36).slice(2)

  sessionStorage.setItem('kablet_session_id', sessionId)

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }

  function icon(name, size) {
    var s = size || 20
    var paths = {
      check:
        '<path d="m5 12 4 4L19 6" />',
      arrow:
        '<path d="M5 12h14M13 6l6 6-6 6" />',
      x:
        '<path d="M6 6l12 12M18 6 6 18" />',
      mail:
        '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
      spark:
        '<path d="m12 3 1.8 6.2L20 11l-6.2 1.8L12 19l-1.8-6.2L4 11l6.2-1.8L12 3Z"/>',
    }

    return (
      '<svg width="' +
      s +
      '" height="' +
      s +
      '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      (paths[name] || '') +
      '</svg>'
    )
  }

  function readForm(form) {
    var fields = {}

    new FormData(form).forEach(function (value, key) {
      fields[key] = String(value)
    })

    return fields
  }

  function emailFromFields(fields) {
    return (
      fields.email ||
      fields['your-email'] ||
      fields['user-email'] ||
      fields.customer_email ||
      ''
    )
  }

  function track(eventType, opportunity, metadata) {
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
    }).catch(function () {})
  }

  console.log('Kablet widget loaded')
  track('LOADED')

  function sendIntent(form) {
    if (!form || processedForms.has(form)) return

    processedForms.add(form)

    var fields = readForm(form)
    var customerEmail = emailFromFields(fields)

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
        if (!result.opportunity) {
          track('ERROR', null, {
            reason: 'NO_OFFER_RETURNED',
            intentEventId: result.intentEventId || null,
          })
          return
        }

        result.opportunity.intentEventId = result.intentEventId
        result.opportunity.customerEmail = customerEmail

        showOffer(result.opportunity)
      })
      .catch(function (error) {
        console.warn('Kablet widget: intent failed', error)
        track('ERROR', null, {
          reason: 'INTENT_FAILED',
          message: error.message,
        })
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
      'You may also need a relevant solution'

    var description =
      opportunity.description ||
      'Explore a relevant option for your business.'

    var benefit =
      opportunity.benefit ||
      opportunity.valueProposition ||
      'Get connected with trusted providers and compare suitable options.'

    var ctaText = opportunity.ctaLabel || 'Get options'

    var overlay = document.createElement('div')
    overlay.id = 'kablet-offer-overlay'

    var modal = document.createElement('div')
    modal.id = 'kablet-offer-modal'

    var imageMarkup = imageUrl
      ? '<img class="kablet-offer-image" src="' +
        escapeHtml(imageUrl) +
        '" alt="">'
      : '<div class="kablet-image-placeholder">' +
        icon('spark', 58) +
        '</div>'

    modal.innerHTML =
      '<button id="kablet-close" class="kablet-close" type="button" aria-label="Close">' +
      icon('x', 23) +
      '</button>' +
      '<div class="kablet-offer-layout">' +
      '<section class="kablet-offer-copy">' +
      '<div class="kablet-badge">' +
      icon('spark', 16) +
      '<span>Recommended next step</span></div>' +
      '<h2>' +
      escapeHtml(headline) +
      '</h2>' +
      '<p class="kablet-description">' +
      escapeHtml(description) +
      '</p>' +
      '<div class="kablet-benefit">' +
      '<span class="kablet-benefit-icon">' +
      icon('check', 17) +
      '</span><span>' +
      escapeHtml(benefit) +
      '</span></div>' +
      '<button id="kablet-accept" class="kablet-accept" type="button">' +
      escapeHtml(ctaText) +
      '<span>' +
      icon('arrow', 19) +
      '</span></button>' +
      '<button id="kablet-decline" class="kablet-decline" type="button">No thanks, I’ll do this later</button>' +
      '<div class="kablet-footer"><span>Private until you choose to continue</span><span>Powered by <strong>Kablet</strong></span></div>' +
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
        z-index:2147483647;
        display:flex;
        align-items:center;
        justify-content:center;
        padding:20px;
        background:rgba(18,20,18,.68);
        backdrop-filter:blur(8px);
        font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
      }

      #kablet-offer-modal {
        position:relative;
        width:min(900px,100%);
        height:620px;
        max-height:calc(100vh - 40px);
        overflow:hidden;
        border:1px solid rgba(40,32,28,.08);
        border-radius:24px;
        background:#fbfaf8;
        color:#1d1b1a;
        box-shadow:0 28px 90px rgba(0,0,0,.28);
      }

      #kablet-offer-modal *,
      #kablet-offer-modal *::before,
      #kablet-offer-modal *::after {
        box-sizing:border-box;
      }

      .kablet-close {
        position:absolute;
        top:18px;
        right:18px;
        z-index:5;
        display:flex;
        align-items:center;
        justify-content:center;
        width:42px;
        height:42px;
        padding:0;
        border:0;
        border-radius:50%;
        background:rgba(255,255,255,.45);
        color:#302b29;
        cursor:pointer;
      }

      .kablet-close:hover {
        background:#fff;
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
        padding:48px 42px 84px;
      }

      .kablet-badge {
        display:inline-flex;
        align-items:center;
        gap:9px;
        align-self:flex-start;
        margin-bottom:27px;
        padding:9px 14px;
        border:1px solid #e2d8ce;
        border-radius:999px;
        background:#f6f1eb;
        color:#6f111c;
        font-size:13px;
        font-weight:700;
        letter-spacing:.01em;
      }

      .kablet-badge svg {
        fill:#6f111c;
      }

      .kablet-offer-copy h2 {
        max-width:390px;
        margin:0 0 19px;
        color:#191716;
        font-size:clamp(36px,4vw,48px);
        line-height:1.02;
        letter-spacing:-.055em;
      }

      .kablet-description {
        max-width:400px;
        margin:0 0 21px;
        color:#716965;
        font-size:17px;
        line-height:1.48;
      }

      .kablet-benefit {
        display:flex;
        align-items:flex-start;
        gap:10px;
        max-width:400px;
        margin-bottom:20px;
        padding:14px 15px;
        border:1px solid #e5dbd1;
        border-radius:12px;
        background:#fffdfa;
        color:#5f1019;
        font-size:13px;
        line-height:1.45;
      }

      .kablet-benefit-icon {
        display:flex;
        align-items:center;
        justify-content:center;
        flex:0 0 25px;
        width:25px;
        height:25px;
        border-radius:50%;
        background:#73131e;
        color:#fff;
      }

      .kablet-accept {
        display:flex;
        align-items:center;
        justify-content:center;
        gap:8px;
        width:100%;
        max-width:400px;
        min-height:54px;
        border:0;
        border-radius:10px;
        background:#73131e;
        color:#fff;
        cursor:pointer;
        font:inherit;
        font-size:15px;
        font-weight:750;
      }

      .kablet-accept:hover {
        background:#5d0f18;
      }

      .kablet-accept:disabled {
        cursor:wait;
        opacity:.7;
      }

      .kablet-decline {
        width:100%;
        max-width:400px;
        margin-top:12px;
        padding:8px;
        border:0;
        background:transparent;
        color:#776d68;
        cursor:pointer;
        font:inherit;
        font-size:13px;
        text-decoration:underline;
        text-underline-offset:3px;
      }

      .kablet-footer {
        position:absolute;
        right:42px;
        bottom:22px;
        left:42px;
        display:flex;
        justify-content:space-between;
        color:#928780;
        font-size:11px;
      }

      .kablet-footer strong {
        color:#73131e;
      }

      .kablet-offer-visual {
        display:flex;
        align-items:center;
        justify-content:center;
        min-width:0;
        height:100%;
        padding:25px;
        overflow:hidden;
        background:#f4eee7;
      }

      .kablet-offer-image,
      .kablet-image-placeholder {
        display:flex;
        align-items:center;
        justify-content:center;
        width:100%;
        height:100%;
        min-width:0;
        min-height:0;
        border-radius:17px;
        object-fit:contain;
        background:#eee7df;
      }

      .kablet-image-placeholder {
        color:#73131e;
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
        padding:48px 44px 86px;
      }

      .kablet-confirm-badge {
        display:inline-flex;
        align-items:center;
        gap:10px;
        align-self:flex-start;
        margin-bottom:29px;
        padding:7px 16px 7px 8px;
        border:1px solid #bdcbbb;
        border-radius:999px;
        background:#edf3ec;
        color:#315d3a;
        font-size:14px;
        font-weight:750;
      }

      .kablet-confirm-badge span {
        display:flex;
        align-items:center;
        justify-content:center;
        width:34px;
        height:34px;
        border-radius:50%;
        background:#315d3a;
        color:#fff;
      }

      .kablet-confirm-copy h2 {
        max-width:410px;
        margin:0 0 21px;
        color:#171615;
        font-size:clamp(37px,4vw,48px);
        line-height:1.03;
        letter-spacing:-.055em;
      }

      .kablet-confirm-message {
        max-width:400px;
        margin:0 0 25px;
        color:#45403d;
        font-size:16px;
        font-weight:650;
        line-height:1.42;
      }

      .kablet-confirm-email {
        display:flex;
        align-items:center;
        gap:11px;
        max-width:400px;
        margin-bottom:18px;
        padding:10px 13px;
        border:1px solid #c8d0c5;
        border-radius:8px;
        background:#eef1eb;
        color:#6b6c65;
        font-size:12px;
        line-height:1.35;
      }

      .kablet-confirm-email strong {
        color:#171615;
        font-size:13px;
      }

      .kablet-confirm-email-icon {
        display:flex;
        align-items:center;
        justify-content:center;
        flex:0 0 29px;
        width:29px;
        height:29px;
        border-radius:50%;
        background:#315d3a;
        color:#fff;
      }

      .kablet-confirm-return {
        display:flex;
        align-items:center;
        justify-content:center;
        gap:8px;
        width:100%;
        max-width:400px;
        min-height:49px;
        border:1px solid #e4d8cf;
        border-radius:8px;
        background:#fffdfa;
        color:#73131e;
        cursor:pointer;
        font:inherit;
        font-size:14px;
        font-weight:750;
      }

      .kablet-confirm-return:hover {
        background:#f8f0eb;
      }

      .kablet-confirm-footer {
        position:absolute;
        right:44px;
        bottom:22px;
        left:44px;
        display:flex;
        justify-content:space-between;
        color:#928780;
        font-size:11px;
      }

      .kablet-confirm-footer strong {
        color:#73131e;
      }

      .kablet-confirm-privacy {
        text-decoration:underline;
        text-underline-offset:3px;
      }

      .kablet-confirm-visual {
        display:flex;
        align-items:center;
        justify-content:center;
        min-width:0;
        height:100%;
        padding:25px;
        overflow:hidden;
        background:#f4eee7;
      }

      .kablet-confirm-image {
        display:flex;
        align-items:center;
        justify-content:center;
        width:100%;
        height:100%;
        border-radius:17px;
        background:#fbfaf8;
      }

      .kablet-confirm-envelope {
        display:flex;
        align-items:center;
        justify-content:center;
        width:190px;
        height:135px;
        border-radius:16px;
        background:#d4e4d1;
        color:#315d3a;
        box-shadow:0 18px 40px rgba(49,93,58,.14);
      }

      @media (max-width:767px) {
        #kablet-offer-overlay {
          padding:10px;
        }

        #kablet-offer-modal {
          width:100%;
          height:auto;
          max-height:calc(100vh - 20px);
          overflow-y:auto;
          border-radius:21px;
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
          height:180px;
          min-height:180px;
          padding:14px;
        }

        .kablet-offer-image,
        .kablet-image-placeholder {
          height:152px;
          border-radius:14px;
        }

        .kablet-offer-copy {
          order:2;
          justify-content:flex-start;
          padding:22px 20px 68px;
        }

        .kablet-badge {
          margin-bottom:17px;
          padding:7px 11px;
          font-size:12px;
        }

        .kablet-offer-copy h2 {
          max-width:none;
          margin-bottom:13px;
          font-size:31px;
        }

        .kablet-description {
          margin-bottom:16px;
          font-size:15px;
        }

        .kablet-benefit {
          margin-bottom:16px;
          padding:12px;
          font-size:12px;
        }

        .kablet-footer {
          right:20px;
          bottom:20px;
          left:20px;
          font-size:9px;
        }

        .kablet-confirm-visual {
          order:1;
          width:100%;
          height:205px;
          min-height:205px;
          padding:14px;
        }

        .kablet-confirm-copy {
          order:2;
          justify-content:flex-start;
          padding:25px 20px 68px;
          text-align:center;
        }

        .kablet-confirm-badge {
          align-self:center;
          margin-bottom:21px;
          font-size:13px;
        }

        .kablet-confirm-copy h2 {
          max-width:none;
          margin-bottom:16px;
          font-size:34px;
        }

        .kablet-confirm-message {
          max-width:none;
          margin-bottom:20px;
          font-size:15px;
        }

        .kablet-confirm-email,
        .kablet-confirm-return {
          max-width:none;
        }

        .kablet-confirm-email {
          text-align:left;
        }

        .kablet-confirm-footer {
          right:20px;
          bottom:20px;
          left:20px;
          text-align:left;
        }

        .kablet-confirm-envelope {
          width:160px;
          height:112px;
        }
      }
    `

    document.head.appendChild(style)
    overlay.appendChild(modal)
    document.body.appendChild(overlay)

    track('DISPLAYED', opportunity)

    function closePopup(eventType) {
      if (eventType) track(eventType, opportunity)
      overlay.remove()
      style.remove()
    }

    modal.querySelector('#kablet-close').addEventListener('click', function () {
      closePopup('DISMISSED')
    })

    modal
      .querySelector('#kablet-decline')
      .addEventListener('click', function () {
        closePopup('DECLINED')
      })

    modal
      .querySelector('#kablet-accept')
      .addEventListener('click', function () {
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
            track('ACCEPTED', opportunity)

            var email =
              opportunity.customerEmail || 'your email address'

            modal.innerHTML =
              '<button id="kablet-confirm-close" class="kablet-close" type="button" aria-label="Close">' +
              icon('x', 23) +
              '</button>' +
              '<div class="kablet-confirm-layout">' +
              '<section class="kablet-confirm-copy">' +
              '<div class="kablet-confirm-badge"><span>' +
              icon('check', 21) +
              '</span><span>Request received</span></div>' +
              '<h2>We’ve received<br>your request!</h2>' +
              '<p class="kablet-confirm-message">We’ll connect you with trusted providers shortly. You can expect to hear from them within the next 48 hours.</p>' +
              '<div class="kablet-confirm-email"><span class="kablet-confirm-email-icon">' +
              icon('mail', 16) +
              '</span><span>We’ve sent a confirmation to<br><strong>' +
              escapeHtml(email) +
              '</strong></span></div>' +
              '<button id="kablet-confirm-return" class="kablet-confirm-return" type="button">Close & return to website ' +
              icon('arrow', 18) +
              '</button>' +
              '<div class="kablet-confirm-footer"><span>Powered by <strong>Kablet</strong></span><span class="kablet-confirm-privacy">Privacy</span></div>' +
              '</section>' +
              '<section class="kablet-confirm-visual"><div class="kablet-confirm-image"><div class="kablet-confirm-envelope">' +
              icon('mail', 64) +
              '</div></div></section>' +
              '</div>'

            modal
              .querySelector('#kablet-confirm-close')
              .addEventListener('click', function () {
                closePopup()
              })

            modal
              .querySelector('#kablet-confirm-return')
              .addEventListener('click', function () {
                closePopup()
              })
          })
          .catch(function (error) {
            console.warn('Kablet widget: consent failed', error)

            track('ERROR', opportunity, {
              reason: 'CONSENT_FAILED',
              message: error.message,
            })

            button.disabled = false
            button.innerHTML = escapeHtml(ctaText) + ' ' + icon('arrow', 19)
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

          var selectors = [
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

          var successDetected = selectors.some(function (selector) {
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