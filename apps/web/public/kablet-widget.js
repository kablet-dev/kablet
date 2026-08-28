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
        category: null,
        intentText:
          fields.requirement ||
          fields.message ||
          fields.your-message ||
          null,
        geography: null,
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
      position: fixed;
      inset: 0;
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      background: rgba(0, 0, 0, 0.5);
      font-family: Arial, sans-serif;
    `

    const modal = document.createElement('div')

    modal.style.cssText = `
      width: min(430px, 100%);
      box-sizing: border-box;
      padding: 28px;
      background: #ffffff;
      border-radius: 16px;
      color: #111827;
      box-shadow: 0 20px 70px rgba(0, 0, 0, 0.3);
    `

    const bullets = Array.isArray(opportunity.valueBullets)
      ? opportunity.valueBullets
          .map(function (item) {
            return `<li>${escapeHtml(item)}</li>`
          })
          .join('')
      : ''

    modal.innerHTML = `
      <div style="font-size:12px;color:#6b7280;margin-bottom:8px;">
        A relevant option for you
      </div>

      <h2 style="margin:0 0 12px;font-size:24px;">
        ${escapeHtml(opportunity.headline || opportunity.name || '')}
      </h2>

      <p style="color:#4b5563;line-height:1.5;">
        ${escapeHtml(opportunity.description || '')}
      </p>

      ${
        opportunity.valueProposition
          ? `<p style="font-weight:bold;">${escapeHtml(
              opportunity.valueProposition
            )}</p>`
          : ''
      }

      ${
        bullets
          ? `<ul style="padding-left:20px;line-height:1.8;">${bullets}</ul>`
          : ''
      }

      <button id="kablet-accept" type="button" style="
        width:100%;
        padding:13px;
        border:0;
        border-radius:8px;
        background:#111827;
        color:white;
        cursor:pointer;
        font-size:15px;
        margin-top:12px;
      ">
        ${escapeHtml(opportunity.ctaLabel || 'Get options')}
      </button>

      <button id="kablet-decline" type="button" style="
        width:100%;
        padding:12px;
        border:0;
        background:transparent;
        color:#6b7280;
        cursor:pointer;
        font-size:14px;
      ">
        No thanks
      </button>
    `

    overlay.appendChild(modal)
    document.body.appendChild(overlay)

    modal
      .querySelector('#kablet-decline')
      .addEventListener('click', function () {
        overlay.remove()
      })

    modal
      .querySelector('#kablet-accept')
      .addEventListener('click', function () {
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
            consentText:
              'I agree to be contacted by relevant providers.',
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
            overlay.remove()
            alert('Thank you. Your request has been recorded.')
          })
          .catch(function (error) {
            console.warn('Kablet widget: consent failed', error)
            button.disabled = false
            button.textContent = opportunity.ctaLabel || 'Get options'
            alert('Something went wrong. Please try again.')
          })
      })
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
})()