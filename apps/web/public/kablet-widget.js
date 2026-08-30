(function () {
  'use strict'

  const script =
    document.currentScript ||
    Array.from(document.scripts).find(function (item) {
      return item.src.includes('kablet-widget.js')
    })

  if (!script) {
    console.warn('Kablet widget: script not found')
    return
  }

  const scriptUrl = new URL(script.src, window.location.href)
  const siteId = scriptUrl.searchParams.get('site')

  if (!siteId) {
    console.warn('Kablet widget: site ID is missing')
    return
  }

  const API_URL = 'https://kablet-backend.onrender.com'
  const processedForms = new WeakSet()

  console.log('Kablet widget loaded')

  function readForm(form) {
    const formData = new FormData(form)
    const fields = {}

    formData.forEach(function (value, key) {
      fields[key] = String(value)
    })

    return fields
  }

  function sendIntent(form) {
    if (!form || processedForms.has(form)) {
      return
    }

    processedForms.add(form)

    const fields = readForm(form)

    return fetch(`${API_URL}/intent/events`, {
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
  email: fields.email || fields['your-email'] || null,
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
          throw new Error(`Intent request failed: ${response.status}`)
        }

        return response.json()
      })
      .then(function (result) {
        if (result.opportunity) {
          result.opportunity.intentEventId = result.intentEventId
          showOffer(result.opportunity)
        }
      })
      .catch(function (error) {
        console.warn('Kablet widget: intent failed', error)
      })
  }

    function showOffer(opportunity) {
    if (document.getElementById('kablet-offer-overlay')) {
      return
    }

    const overlay = document.createElement('div')
    overlay.id = 'kablet-offer-overlay'

    overlay.style.cssText = `
      position:fixed;
      inset:0;
      z-index:999999;
      display:flex;
      align-items:center;
      justify-content:center;
      padding:24px;
      background:rgba(23,20,20,.72);
      backdrop-filter:blur(5px);
      font-family:Arial,sans-serif;
    `

    const modal = document.createElement('div')

    modal.style.cssText = `
      position:relative;
      width:min(1080px,100%);
      max-height:90vh;
      overflow:auto;
      background:#FBF8F5;
      border-radius:24px;
      color:#171414;
      box-shadow:0 30px 80px rgba(23,20,20,.25);
    `

    const image = opportunity.imageUrl || opportunity.visualAssetUrl || ''
    const benefit =
      opportunity.benefit ||
      opportunity.valueProposition ||
      'Get connected with relevant business solution providers and compare your options.'

    modal.innerHTML = `
      <button id="kablet-close" type="button" aria-label="Close"
        style="
          position:absolute;
          top:14px;
          right:14px;
          z-index:2;
          width:40px;
          height:40px;
          border:0;
          border-radius:50%;
          background:transparent;
          color:#171414;
          font-size:25px;
          line-height:1;
          cursor:pointer;
        ">×</button>

      <div style="
        display:grid;
        grid-template-columns:1fr 1fr;
        min-height:520px;
      ">
        <div style="
          display:flex;
          flex-direction:column;
          justify-content:center;
          padding:56px 52px 42px;
        ">
          <div style="
            display:inline-flex;
            align-items:center;
            gap:8px;
            align-self:flex-start;
            margin-bottom:24px;
            padding:8px 12px;
            border:1px solid #E8DDD4;
            border-radius:999px;
            background:#F7F2EA;
            color:#6F6260;
            font-size:12px;
            font-weight:600;
          ">
            <span style="
              display:inline-flex;
              align-items:center;
              justify-content:center;
              width:18px;
              height:18px;
              border-radius:50%;
              background:#560B14;
              color:#F7F2EA;
              font-size:11px;
            ">✓</span>
            Recommended next step
          </div>

          <h2 style="
            margin:0 0 18px;
            max-width:520px;
            color:#171414;
            font-size:clamp(30px,4vw,50px);
            line-height:1.08;
            letter-spacing:-1.5px;
          ">
            ${escapeHtml(opportunity.headline || opportunity.name || 'A relevant option for you')}
          </h2>

          <p style="
            margin:0 0 26px;
            max-width:500px;
            color:#6F6260;
            font-size:18px;
            line-height:1.55;
          ">
            ${escapeHtml(opportunity.description || 'You may also benefit from this relevant business solution.')}
          </p>

          <div style="
            margin-bottom:26px;
            padding:17px 18px;
            border:1px solid #E8DDD4;
            border-radius:14px;
            background:rgba(247,242,234,.55);
            color:#560B14;
            font-size:14px;
            line-height:1.5;
          ">
            <span style="font-weight:700;">✓</span>
            ${escapeHtml(benefit)}
          </div>

          <button id="kablet-accept" type="button"
            style="
              width:100%;
              min-height:56px;
              border:0;
              border-radius:12px;
              background:#560B14;
              color:#F7F2EA;
              cursor:pointer;
              font-size:16px;
              font-weight:700;
            ">
            ${escapeHtml(opportunity.ctaLabel || 'Get options')} →
          </button>

          <button id="kablet-decline" type="button"
            style="
              width:100%;
              margin-top:14px;
              padding:8px;
              border:0;
              background:transparent;
              color:#6F6260;
              cursor:pointer;
              font-size:13px;
              text-decoration:underline;
            ">
            No thanks, I'll do this later
          </button>

          <p style="
            margin:24px 0 0;
            color:#6F6260;
            font-size:12px;
            line-height:1.5;
          ">
            🔒 Your details are only shared with relevant providers after you choose to continue.
          </p>
        </div>

        <div style="
          display:flex;
          align-items:center;
          justify-content:center;
          min-height:360px;
          padding:32px;
          background:#F7F2EA;
        ">
          ${
            image
              ? `<img src="${escapeHtml(image)}" alt="" style="
                  width:100%;
                  height:100%;
                  max-height:450px;
                  object-fit:cover;
                  border-radius:18px;
                ">`
              : `<div style="
                  display:flex;
                  align-items:center;
                  justify-content:center;
                  width:100%;
                  height:100%;
                  min-height:300px;
                  border-radius:18px;
                  background:#CFC5BD;
                  color:#560B14;
                  font-size:70px;
                ">✦</div>`
          }
        </div>
      </div>

      <div style="
        display:flex;
        justify-content:space-between;
        gap:16px;
        padding:16px 28px;
        border-top:1px solid #E8DDD4;
        color:#6F6260;
        font-size:12px;
      ">
        <span>✓ Connecting you with relevant business solution providers.</span>
        <strong style="color:#560B14;">Powered by Kablet</strong>
      </div>
    `

    overlay.appendChild(modal)
    document.body.appendChild(overlay)

    const closeOverlay = function () {
      overlay.remove()
    }

    modal.querySelector('#kablet-close').addEventListener('click', closeOverlay)
    modal.querySelector('#kablet-decline').addEventListener('click', closeOverlay)

    modal.querySelector('#kablet-accept').addEventListener('click', function () {
      const button = modal.querySelector('#kablet-accept')

      button.disabled = true
      button.textContent = 'Saving...'

      fetch(`${API_URL}/intent/consent`, {
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
            throw new Error(`Consent request failed: ${response.status}`)
          }

          return response.json()
        })
        .then(function () {
  modal.innerHTML = `
    <div style="
      min-height:420px;
      display:flex;
      flex-direction:column;
      align-items:center;
      justify-content:center;
      padding:48px 28px;
      text-align:center;
    ">
      <div style="
        display:flex;
        align-items:center;
        justify-content:center;
        width:64px;
        height:64px;
        margin-bottom:22px;
        border-radius:50%;
        background:#560B14;
        color:#F7F2EA;
        font-size:32px;
      ">✓</div>

      <h2 style="
        margin:0 0 12px;
        color:#171414;
        font-size:30px;
      ">
        You’re all set
      </h2>

      <p style="
        max-width:420px;
        margin:0;
        color:#6F6260;
        font-size:16px;
        line-height:1.6;
      ">
        Your request has been recorded. A relevant provider may contact you shortly.
      </p>

      <button id="kablet-confirm-close" type="button"
        style="
          margin-top:28px;
          padding:13px 28px;
          border:0;
          border-radius:12px;
          background:#560B14;
          color:#F7F2EA;
          cursor:pointer;
          font-size:15px;
          font-weight:700;
        ">
        Close
      </button>
    </div>
  `

  modal
    .querySelector('#kablet-confirm-close')
    .addEventListener('click', function () {
      overlay.remove()
    })
})
.catch(function (error) {
  console.warn('Kablet widget: consent failed', error)
  button.disabled = false
  button.textContent = `${opportunity.ctaLabel || 'Get options'} →`
  alert('Something went wrong. Please try again.')
})
    const mobileStyle = document.createElement('style')
    mobileStyle.textContent = `
      @media (max-width: 767px) {
        #kablet-offer-overlay {
          padding:12px !important;
        }

        #kablet-offer-overlay > div {
          grid-template-columns:1fr !important;
          min-height:0 !important;
        }

        #kablet-offer-overlay > div > div:first-child {
          padding:42px 22px 26px !important;
        }

        #kablet-offer-overlay > div > div:nth-child(2) {
          min-height:180px !important;
          padding:18px !important;
        }

        #kablet-offer-overlay > div > div:nth-child(2) img {
          max-height:180px !important;
        }
      }
    `

    document.head.appendChild(mobileStyle)
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;')
  }

  // Standard HTML forms.
  document.addEventListener('submit', function (event) {
    const form = event.target

    if (form && form.tagName === 'FORM') {
      setTimeout(function () {
        sendIntent(form)
      }, 500)
    }
  })

  // Contact Form 7 successful submission event.
  document.addEventListener('wpcf7mailsent', function (event) {
    const form = event.target

    if (form && form.tagName === 'FORM') {
      sendIntent(form)
    }
  })

    // Generic AJAX form detection.
  // Only react when an AJAX success message appears.
  // Do not process forms merely because they were added to the page.
  if (window.MutationObserver) {
    const ajaxObserver = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        mutation.addedNodes.forEach(function (node) {
          if (node.nodeType !== Node.ELEMENT_NODE) {
            return
          }

          const successSelectors = [
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
            '.ff-message-success'
          ]

          const successDetected = successSelectors.some(function (selector) {
            return (
              (node.matches && node.matches(selector)) ||
              (node.querySelector && node.querySelector(selector))
            )
          })

          if (!successDetected) {
            return
          }

          const form =
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

    ajaxObserver.observe(document.body, {
      childList: true,
      subtree: true
    })
  }
})()