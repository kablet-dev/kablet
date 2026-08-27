(function () {
  const config = window.KabletConfig || {}

  if (!config.siteId && !config.siteKey) {
  console.warn('Kablet: siteId is missing')
  return
}

  const API_URL =
    config.apiUrl || 'http://localhost:3001'

  const formSelector =
    config.formSelector || 'form'

  function getFormData(form) {
    const data = new FormData(form)
    const fields = {}

    data.forEach(function (value, key) {
      fields[key] = String(value)
    })

    return fields
  }

  function createModal(opportunity) {
    const overlay = document.createElement('div')

    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.45);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999999;
      font-family: Arial, sans-serif;
    `

    const modal = document.createElement('div')

    modal.style.cssText = `
      width: min(420px, calc(100% - 32px));
      background: white;
      border-radius: 16px;
      padding: 28px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
      color: #111827;
    `

    const image = opportunity.visualAssetUrl
      ? `<img src="${opportunity.visualAssetUrl}" style="width:100%;height:180px;object-fit:cover;border-radius:10px;margin-bottom:18px;">`
      : ''

    const bullets = Array.isArray(opportunity.valueBullets)
      ? opportunity.valueBullets
          .map(function (item) {
            return `<li>${item}</li>`
          })
          .join('')
      : ''

    modal.innerHTML = `
      ${image}

      <div style="font-size:12px;color:#6b7280;margin-bottom:8px;">
        A relevant option for you
      </div>

      <h2 style="margin:0 0 10px;font-size:24px;">
        ${opportunity.headline || opportunity.name}
      </h2>

      <p style="color:#4b5563;line-height:1.5;">
        ${opportunity.description || ''}
      </p>

      ${
        opportunity.valueProposition
          ? `<p style="font-weight:bold;">${opportunity.valueProposition}</p>`
          : ''
      }

      ${
        bullets
          ? `<ul style="padding-left:20px;line-height:1.8;">${bullets}</ul>`
          : ''
      }

      <button id="kablet-accept" style="
        width:100%;
        border:0;
        border-radius:8px;
        padding:13px;
        background:#111827;
        color:white;
        font-size:15px;
        cursor:pointer;
        margin-top:12px;
      ">
        ${opportunity.ctaLabel || 'Get options'}
      </button>

      <button id="kablet-decline" style="
        width:100%;
        border:0;
        background:transparent;
        color:#6b7280;
        padding:12px;
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
      .addEventListener('click', async function () {
        const acceptButton = modal.querySelector('#kablet-accept')

        acceptButton.disabled = true
        acceptButton.textContent = 'Saving...'

        try {
          const response = await fetch(`${API_URL}/intent/consent`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-kablet-site-id': config.siteId,
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

          if (!response.ok) {
            throw new Error('Consent request failed')
          }

          window.dispatchEvent(
            new CustomEvent('kablet:accepted', {
              detail: opportunity,
            })
          )

          overlay.remove()
          alert('Thank you. Your request has been recorded.')
        } catch (error) {
          console.error('Kablet consent error:', error)

          acceptButton.disabled = false
          acceptButton.textContent =
            opportunity.ctaLabel || 'Get options'

          alert('Something went wrong. Please try again.')
        }
      })
  }

  async function sendIntent(form) {
    const fields = getFormData(form)

    const response = await fetch(`${API_URL}/intent/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-kablet-site-id': config.siteId,
      },
      body: JSON.stringify({
        eventType: 'FORM_SUBMISSION',
        sourcePlatform: config.sourcePlatform || 'JAVASCRIPT',
        formId: form.id || null,
        pageUrl: window.location.href,
        hostUrl: window.location.origin,
        category: config.category || null,
        intentText: fields.requirement || fields.message || null,
        geography: config.geography || null,
        customer: {
          firstName: fields.firstName || fields.first_name || null,
          lastName: fields.lastName || fields.last_name || null,
          email: fields.email || null,
          phone: fields.phone || null,
        },
        company: {
          name: fields.company || fields.companyName || null,
          industry: fields.industry || null,
          geography: fields.city || fields.country || null,
        },
        structuredContext: {
          fields: fields,
        },
      }),
    })

    if (!response.ok) {
      console.warn('Kablet: intent request failed')
      return
    }

    const result = await response.json()

    if (result.opportunity) {
  result.opportunity.intentEventId = result.intentEventId
  createModal(result.opportunity)
}
  }

  document.addEventListener('submit', function (event) {
    const form = event.target

    if (!form.matches || !form.matches(formSelector)) {
      return
    }

    // Give the host form a moment to complete its normal submission logic.
    setTimeout(function () {
      sendIntent(form).catch(function (error) {
        console.warn('Kablet: could not process form', error)
      })
    }, 300)
  })
})()