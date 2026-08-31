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
      #kablet-offer-overlay {
        position:fixed;
        inset:0;
        z-index:2147483647;
        display:flex;
        align-items:center;
        justify-content:center;
        padding:24px;
        background:rgba(23,20,20,.72);
        backdrop-filter:blur(6px);
        -webkit-backdrop-filter:blur(6px);
        font-family:Inter,Arial,sans-serif;
      }

      #kablet-offer-modal {
        position:relative;
        width:min(1080px,100%);
        max-height:calc(100vh - 48px);
        overflow:hidden;
        border:1px solid rgba(86,11,20,.1);
        border-radius:24px;
        background:#FBF8F5;
        color:#171414;
        box-shadow:0 30px 90px rgba(23,20,20,.28);
      }

      #kablet-offer-modal *,
      #kablet-offer-modal *::before,
      #kablet-offer-modal *::after {
        box-sizing:border-box;
      }

      .kablet-close {
        position:absolute;
        top:16px;
        right:16px;
        z-index:4;
        display:flex;
        align-items:center;
        justify-content:center;
        width:44px;
        height:44px;
        padding:0;
        border:0;
        border-radius:999px;
        background:transparent;
        color:#171414;
        cursor:pointer;
      }

      .kablet-close:hover {
        background:rgba(86,11,20,.06);
      }

      .kablet-state-grid {
        display:grid;
        grid-template-columns:minmax(0,1fr) minmax(360px,.92fr);
      }

      .kablet-copy {
        display:flex;
        flex-direction:column;
        justify-content:center;
        min-width:0;
        padding:56px 48px 42px;
      }

      .kablet-badge {
        display:inline-flex;
        align-items:center;
        gap:8px;
        align-self:flex-start;
        margin-bottom:25px;
        padding:8px 13px;
        border:1px solid #E8DDD4;
        border-radius:999px;
        background:#F7F2EA;
        color:#6F6260;
        font-size:13px;
        font-weight:700;
      }

      .kablet-badge svg {
        padding:4px;
        border-radius:50%;
        background:#560B14;
        color:#F7F2EA;
      }

      .kablet-copy h2 {
        max-width:460px;
        margin:0 0 18px;
        color:#171414;
        font-size:clamp(38px,4vw,52px);
        line-height:1.03;
        letter-spacing:-.045em;
      }

      .kablet-description {
        max-width:450px;
        margin:0 0 22px;
        color:#6F6260;
        font-size:17px;
        line-height:1.55;
      }

      .kablet-benefit {
        display:flex;
        gap:12px;
        max-width:450px;
        margin-bottom:20px;
        padding:16px 18px;
        border:1px solid #E8DDD4;
        border-radius:14px;
        background:rgba(247,242,234,.55);
        color:#171414;
        font-size:14px;
        line-height:1.45;
      }

      .kablet-benefit-icon,
      .kablet-success-icon {
        display:flex;
        align-items:center;
        justify-content:center;
        flex:0 0 28px;
        width:28px;
        height:28px;
        border-radius:50%;
        background:#560B14;
        color:#F7F2EA;
      }

      .kablet-accept,
      .kablet-return {
        display:flex;
        align-items:center;
        justify-content:center;
        gap:8px;
        width:100%;
        max-width:450px;
        min-height:58px;
        border-radius:12px;
        cursor:pointer;
        font:inherit;
        font-size:16px;
        font-weight:700;
      }

      .kablet-accept {
        border:0;
        background:#560B14;
        color:#F7F2EA;
      }

      .kablet-accept:hover {
        background:#741A22;
      }

      .kablet-accept:active,
      .kablet-return:active {
        transform:translateY(1px);
      }

      .kablet-accept:disabled {
        cursor:wait;
        opacity:.7;
      }

      .kablet-decline {
        align-self:center;
        margin:11px 0 0;
        padding:7px;
        border:0;
        background:transparent;
        color:#6F6260;
        cursor:pointer;
        font:inherit;
        font-size:13px;
        text-decoration:underline;
        text-underline-offset:3px;
      }

      .kablet-privacy {
        display:flex;
        align-items:flex-start;
        gap:7px;
        max-width:450px;
        margin-top:16px;
        color:#6F6260;
        font-size:12px;
        line-height:1.45;
      }

      .kablet-privacy svg {
        flex:0 0 15px;
        margin-top:1px;
      }

      .kablet-visual {
        display:flex;
        align-items:center;
        justify-content:center;
        min-height:580px;
        padding:28px;
        background:#F7F2EA;
      }

      .kablet-image,
      .kablet-placeholder {
        display:flex;
        align-items:center;
        justify-content:center;
        width:100%;
        height:100%;
        min-height:420px;
        border-radius:22px;
        object-fit:contain;
        background:#EFE7DE;
      }

      .kablet-placeholder {
        color:#560B14;
      }

      .kablet-modal-footer {
        display:flex;
        justify-content:space-between;
        align-items:center;
        gap:20px;
        padding:18px 28px;
        border-top:1px solid #E8DDD4;
        color:#6F6260;
        font-size:12px;
      }

      .kablet-trust {
        display:flex;
        align-items:center;
        gap:8px;
      }

      .kablet-trust svg {
        color:#560B14;
      }

      .kablet-powered strong {
        color:#560B14;
      }

      .kablet-confirm-badge {
        display:inline-flex;
        align-items:center;
        gap:10px;
        align-self:flex-start;
        margin-bottom:26px;
        padding:7px 15px 7px 8px;
        border:1px solid #CADCC6;
        border-radius:999px;
        background:#EDF4EC;
        color:#347344;
        font-size:14px;
        font-weight:700;
      }

      .kablet-confirm-badge .kablet-success-icon {
        flex-basis:34px;
        width:34px;
        height:34px;
        background:#347344;
      }

      .kablet-next {
        max-width:450px;
        margin:0 0 18px;
        padding:8px 18px;
        border:1px solid #E8DDD4;
        border-radius:14px;
        background:#F7F2EA;
      }

      .kablet-next-title {
        padding:8px 0 5px;
        font-size:14px;
        font-weight:700;
      }

      .kablet-next-row {
        display:flex;
        align-items:center;
        gap:10px;
        min-height:48px;
        border-bottom:1px solid #E8DDD4;
        color:#6F6260;
        font-size:13px;
        line-height:1.35;
      }

      .kablet-next-row:last-child {
        border-bottom:0;
      }

      .kablet-next-row svg {
        flex:0 0 26px;
        padding:5px;
        border-radius:50%;
        background:#347344;
        color:#fff;
      }

      .kablet-return {
        border:1px solid #DCCFC7;
        background:#FBF8F5;
        color:#560B14;
      }

      .kablet-return:hover {
        background:#F7F2EA;
      }

      .kablet-confirm-visual {
        background:#F7F2EA;
      }

      .kablet-confirm-art {
        display:flex;
        align-items:center;
        justify-content:center;
        width:100%;
        min-height:420px;
        border-radius:22px;
        background:#EFE7DE;
      }

      .kablet-confirm-art-inner {
        display:flex;
        align-items:center;
        justify-content:center;
        width:190px;
        height:190px;
        border-radius:50%;
        background:#EDF4EC;
        color:#347344;
      }

      @media (max-width:767px) {
        #kablet-offer-overlay {
          padding:10px;
        }

        #kablet-offer-modal {
          width:100%;
          max-height:calc(100dvh - 20px);
          overflow-y:auto;
          border-radius:20px;
        }

        .kablet-state-grid {
          display:flex;
          flex-direction:column;
        }

        .kablet-copy {
          order:1;
          padding:28px 20px 25px;
        }

        .kablet-copy h2 {
          max-width:none;
          font-size:33px;
        }

        .kablet-description {
          font-size:15px;
        }

        .kablet-visual {
          order:2;
          min-height:190px;
          padding:14px 20px;
        }

        .kablet-image,
        .kablet-placeholder {
          min-height:160px;
          max-height:190px;
          border-radius:15px;
        }

        .kablet-modal-footer {
          order:3;
          padding:14px 20px;
          font-size:10px;
        }

        .kablet-trust {
          display:none;
        }

        .kablet-modal-footer {
          justify-content:flex-end;
        }

        .kablet-confirm-visual {
          order:1;
          min-height:170px;
        }

        .kablet-confirm-copy {
          order:2;
        }

        .kablet-confirm-art {
          min-height:140px;
        }

        .kablet-confirm-art-inner {
          width:100px;
          height:100px;
        }

        .kablet-confirm-copy h2 {
          font-size:34px;
        }

        .kablet-confirm-badge {
          align-self:center;
        }

        .kablet-confirm-copy {
          text-align:center;
        }

        .kablet-next,
        .kablet-privacy,
        .kablet-return {
          max-width:none;
          text-align:left;
        }

        .kablet-modal-footer {
          text-align:left;
        }
      }

      @media (max-height:650px) and (max-width:767px) {
        .kablet-visual,
        .kablet-confirm-visual {
          display:none;
        }
      }

      @media (prefers-reduced-motion:reduce) {
        *,*::before,*::after {
          animation:none !important;
          transition:none !important;
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

    var image =
      opportunity.imageUrl ||
      opportunity.visualAssetUrl ||
      opportunity.visual_asset_url ||
      ''

    var visual = image
      ? '<img class="kablet-image" src="' + esc(image) + '" alt="">'
      : '<div class="kablet-placeholder">' + svg('shield', 54) + '</div>'

    modal.innerHTML =
      '<button id="kablet-close" class="kablet-close" type="button" aria-label="Close Kablet recommendation">' +
      svg('close', 22) +
      '</button>' +
      '<div class="kablet-state-grid">' +
      '<section class="kablet-copy">' +
      '<div class="kablet-badge">' +
      svg('spark', 16) +
      '<span>Recommended next step</span></div>' +
      '<h2 id="kablet-title">' +
      esc(opportunity.headline || opportunity.name || 'A relevant next step') +
      '</h2>' +
      '<p class="kablet-description">' +
      esc(opportunity.description || 'Explore a relevant option for your business.') +
      '</p>' +
      '<div class="kablet-benefit"><span class="kablet-benefit-icon">' +
      svg('check', 17) +
      '</span><span>' +
      esc(
        opportunity.benefit ||
          opportunity.valueProposition ||
          'Get connected with relevant providers and compare options.'
      ) +
      '</span></div>' +
      '<button id="kablet-accept" class="kablet-accept" type="button">' +
      esc(opportunity.ctaLabel || 'Get options') +
      ' ' +
      svg('arrow', 19) +
      '</button>' +
      '<button id="kablet-decline" class="kablet-decline" type="button">No thanks, I’ll do this later</button>' +
      '<div class="kablet-privacy">' +
      svg('lock', 15) +
      '<span>Your details are only shared with relevant providers after you choose to continue.</span></div>' +
      '</section>' +
      '<section class="kablet-visual">' +
      visual +
      '</section>' +
      '</div>' +
      '<footer class="kablet-modal-footer"><div class="kablet-trust">' +
      svg('shield', 16) +
      '<span>Connecting you with verified, relevant providers.</span></div><div class="kablet-powered">Powered by <strong>Kablet</strong></div></footer>'

    overlay.appendChild(modal)
    document.body.appendChild(overlay)
    document.body.dataset.kabletPreviousOverflow =
      document.body.style.overflow || ''
    document.body.style.overflow = 'hidden'

    track('DISPLAYED', opportunity)

    function close(type) {
      if (type) track(type, opportunity)
      overlay.remove()
      style.remove()
      document.body.style.overflow =
        document.body.dataset.kabletPreviousOverflow || ''

      if (previousFocus && previousFocus.focus) previousFocus.focus()
    }

    modal.querySelector('#kablet-close').addEventListener('click', function () {
      close('DISMISSED')
    })

    modal
      .querySelector('#kablet-decline')
      .addEventListener('click', function () {
        close('DECLINED')
      })

    modal
      .querySelector('#kablet-accept')
      .addEventListener('click', function () {
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
            if (!response.ok) {
              throw new Error('Consent failed: ' + response.status)
            }

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
            button.innerHTML = esc(opportunity.ctaLabel || 'Get options') + ' ' + svg('arrow', 19)
          })
      })

    modal.focus()
  }

  function renderConfirmation(modal, opportunity, close) {
    var category = opportunity.category || opportunity.offerCategory || ''
    var description = category
      ? 'We’ve shared your request with relevant ' +
        category +
        ' providers. You can expect to hear from them shortly.'
      : 'We’ve shared your request with relevant providers. You can expect to hear from them shortly.'

    modal.innerHTML =
      '<button id="kablet-confirm-close" class="kablet-close" type="button" aria-label="Close Kablet confirmation">' +
      svg('close', 22) +
      '</button>' +
      '<div class="kablet-state-grid">' +
      '<section class="kablet-copy kablet-confirm-copy">' +
      '<div class="kablet-confirm-badge"><span class="kablet-success-icon">' +
      svg('check', 21) +
      '</span><span>Request received</span></div>' +
      '<h2 id="kablet-title">You’re all set!</h2>' +
      '<p class="kablet-confirm-message kablet-description">' +
      esc(description) +
      '</p>' +
      '<div class="kablet-next"><div class="kablet-next-title">What happens next</div>' +
      '<div class="kablet-next-row">' +
      svg('check', 26) +
      '<span>Your request has been received</span></div>' +
      '<div class="kablet-next-row">' +
      svg('check', 26) +
      '<span>Relevant providers are being notified</span></div>' +
      '<div class="kablet-next-row">' +
      svg('check', 26) +
      '<span>They’ll contact you directly with options and next steps</span></div></div>' +
      '<div class="kablet-privacy">' +
      svg('lock', 15) +
      '<span>Your details are only shared with providers relevant to this request.</span></div>' +
      '<button id="kablet-confirm-return" class="kablet-return" type="button">Close & return to website ' +
      svg('arrow', 19) +
      '</button>' +
      '</section>' +
      '<section class="kablet-visual kablet-confirm-visual"><div class="kablet-confirm-art"><div class="kablet-confirm-art-inner">' +
      svg('check', 76) +
      '</div></div></section>' +
      '</div>' +
      '<footer class="kablet-modal-footer"><div class="kablet-trust">' +
      svg('shield', 16) +
      '<span>Connecting you with verified, relevant providers.</span></div><div class="kablet-powered">Powered by <strong>Kablet</strong></div></footer>'

    track('CONFIRMATION_DISPLAYED', opportunity)

    modal
      .querySelector('#kablet-confirm-close')
      .addEventListener('click', function () {
        track('RETURNED_TO_HOST', opportunity)
        close()
      })

    modal
      .querySelector('#kablet-confirm-return')
      .addEventListener('click', function () {
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