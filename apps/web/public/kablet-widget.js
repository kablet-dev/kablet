(function () {
  'use strict'

  const script =
    document.currentScript ||
    Array.from(document.scripts).find(function (item) {
      return item.src.includes('kablet-widget.js')
    })

  if (!script) return

  const scriptUrl = new URL(script.src, window.location.href)
  const siteId = scriptUrl.searchParams.get('site')

  if (!siteId) {
    console.warn('Kablet widget: site ID is missing')
    return
  }

  const API_URL = 'https://kablet-backend.onrender.com'
  const processedForms = new WeakSet()

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;')
  }

  function readForm(form) {
    const fields = {}
    new FormData(form).forEach(function (value, key) {
      fields[key] = String(value)
    })
    return fields
  }

  function sendIntent(form) {
    if (!form || processedForms.has(form)) return

    processedForms.add(form)

    const fields = readForm(form)

    fetch(`${API_URL}/intent/events`, {
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
          fields,
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
    if (document.getElementById('kablet-offer-overlay')) return

    const imageUrl =
      opportunity.imageUrl ||
      opportunity.visualAssetUrl ||
      opportunity.visual_asset_url ||
      ''

    const headline =
      opportunity.headline ||
      opportunity.name ||
      'You may also need a relevant business solution'

    const description =
      opportunity.description ||
      'Explore a relevant option for your business.'

    const benefit =
      opportunity.benefit ||
      opportunity.valueProposition ||
      'Get connected with relevant providers and compare your options.'

    const ctaText = opportunity.ctaLabel || 'Get options'

    const overlay = document.createElement('div')
    overlay.id = 'kablet-offer-overlay'

    const modal = document.createElement('div')
    modal.id = 'kablet-offer-modal'

    const imageMarkup = imageUrl
      ? `
        <img
          src="${escapeHtml(imageUrl)}"
          alt=""
          class="kablet-offer-image"
        >
      `
      : `
        <div class="kablet-image-placeholder">✦</div>
      `

    modal.innerHTML = `
      <button
        id="kablet-close"
        class="kablet-close"
        type="button"
        aria-label="Close"
      >×</button>

      <div class="kablet-offer-layout">
        <section class="kablet-offer-copy">
          <div class="kablet-badge">
            <span>✦</span>
            Recommended next step
          </div>

          <h2>${escapeHtml(headline)}</h2>

          <p class="kablet-description">
            ${escapeHtml(description)}
          </p>

          <div class="kablet-benefit">
            <span>✓</span>
            <span>${escapeHtml(benefit)}</span>
          </div>

          <button id="kablet-accept" class="kablet-accept" type="button">
            ${escapeHtml(ctaText)} <span>→</span>
          </button>

          <button id="kablet-decline" class="kablet-decline" type="button">
            No thanks, I'll do this later
          </button>

          

          <div class="kablet-footer">
  <span>🔒 Shared only after you choose to continue.</span>
  <span>Powered by <strong>Kablet</strong></span>
</div>
        </section>

        <section class="kablet-offer-visual">
          ${imageMarkup}
        </section>
      </div>
    `

    const style = document.createElement('style')

    style.textContent = `
      #kablet-offer-overlay {
        position:fixed;
        inset:0;
        z-index:999999;
        display:flex;
        align-items:center;
        justify-content:center;
        padding:20px;
        box-sizing:border-box;
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
        box-sizing:border-box;
        background:#FBF8F5;
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
        top:18px;
        right:20px;
        z-index:3;
        width:40px;
        height:40px;
        border:0;
        background:transparent;
        color:#171414;
        font-size:30px;
        line-height:1;
        cursor:pointer;
      }

      .kablet-offer-layout {
        display:grid;
        grid-template-columns:1fr 1fr;
        width:100%;
        height:100%;
      }

      .kablet-offer-copy {
        display:flex;
        flex-direction:column;
        justify-content:center;
        min-width:0;
        padding:34px 40px 92px;
      }

      .kablet-badge {
        display:inline-flex;
        align-items:center;
        gap:8px;
        align-self:flex-start;
        margin-bottom:24px;
        padding:9px 13px;
        border:1px solid #E8DDD4;
        border-radius:999px;
        background:#F7F2EA;
        color:#560B14;
        font-size:13px;
        font-weight:600;
      }

      .kablet-badge span {
        font-size:18px;
      }

      .kablet-offer-copy h2 {
        max-width:390px;
        margin:0 0 18px;
        color:#171414;
        font-size:38px;
        line-height:1.05;
        letter-spacing:-1.5px;
      }

      .kablet-description {
        max-width:410px;
        margin:0 0 18px;
        color:#6F6260;
        font-size:17px;
        line-height:1.45;
      }

      .kablet-benefit {
        display:flex;
        align-items:flex-start;
        gap:10px;
        max-width:410px;
        margin-bottom:18px;
padding:13px 16px;
        border:1px solid #E8DDD4;
        border-radius:13px;
        background:#FBF8F5;
        color:#560B14;
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
        background:#560B14;
        color:#F7F2EA;
        cursor:pointer;
        font-size:16px;
        font-weight:700;
      }

      .kablet-accept span {
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
        color:#6F6260;
        cursor:pointer;
        font-size:13px;
        text-decoration:underline;
      }

      .kablet-privacy {
        max-width:410px;
        margin:14px 0 0;
        color:#6F6260;
        font-size:11px;
        line-height:1.45;
      }

      .kablet-footer {
        position:absolute;
        bottom:0;
        left:0;
        display:flex;
        justify-content:space-between;
        width:50%;
        padding:15px 32px;
align-items:center;
        border-top:1px solid #E8DDD4;
        color:#8A7D78;
        font-size:11px;
      }

      .kablet-footer strong {
        color:#560B14;
      }

      .kablet-footer-privacy {
        text-decoration:underline;
      }

      .kablet-offer-visual {
        display:flex;
        align-items:center;
        justify-content:center;
        min-width:0;
        height:100%;
        padding:24px;
        overflow:hidden;
        background:#F7F2EA;
      }

      .kablet-offer-image,
      .kablet-image-placeholder {
        display:block;
        width:100%;
        height:100%;
        max-height:512px;
        border-radius:18px;
        object-fit:contain;
background:#F7F2EA;
      }

      .kablet-image-placeholder {
        display:flex;
        align-items:center;
        justify-content:center;
        background:#CFC5BD;
        color:#560B14;
        font-size:72px;
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
          overflow:hidden;
          border-radius:22px;
        }

        .kablet-offer-layout {
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
          line-height:1.05;
          letter-spacing:-.8px;
        }

        .kablet-description {
          margin-bottom:16px;
          font-size:15px;
          line-height:1.4;
        }

        .kablet-benefit {
          margin-bottom:16px;
          padding:12px 13px;
          font-size:12px;
        }

        .kablet-accept {
          min-height:52px;
        }

        .kablet-privacy {
          margin-top:14px;
          font-size:10px;
        }

        .kablet-footer {
          left:0;
          bottom:0;
          width:100%;
          padding:11px 18px;
font-size:9px;
line-height:1.3;
        }
      }
    `

    document.head.appendChild(style)
    overlay.appendChild(modal)
    document.body.appendChild(overlay)

    function close() {
      overlay.remove()
      style.remove()
    }

    modal.querySelector('#kablet-close').addEventListener('click', close)
    modal.querySelector('#kablet-decline').addEventListener('click', close)

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
              align-items:center;
              justify-content:center;
              flex-direction:column;
              padding:40px;
              text-align:center;
            ">
              <div style="
                width:60px;
                height:60px;
                display:flex;
                align-items:center;
                justify-content:center;
                margin-bottom:20px;
                border-radius:50%;
                background:#560B14;
                color:#F7F2EA;
                font-size:30px;
              ">✓</div>

              <h2 style="
                margin:0 0 12px;
                color:#171414;
                font-size:30px;
              ">You're all set</h2>

              <p style="
                max-width:360px;
                margin:0;
                color:#6F6260;
                font-size:15px;
                line-height:1.5;
              ">
                Your request has been recorded. A relevant provider may contact you shortly.
              </p>

              <button type="button" id="kablet-confirm-close"
                style="
                  margin-top:24px;
                  padding:12px 26px;
                  border:0;
                  border-radius:10px;
                  background:#560B14;
                  color:#F7F2EA;
                  cursor:pointer;
                  font-weight:700;
                ">
                Close
              </button>
            </div>
          `

          modal
            .querySelector('#kablet-confirm-close')
            .addEventListener('click', close)
        })
        .catch(function (error) {
          console.warn('Kablet widget: consent failed', error)
          button.disabled = false
          button.textContent = `${ctaText} →`
        })
    })
  }

  document.addEventListener('submit', function (event) {
    const form = event.target

    if (form && form.tagName === 'FORM') {
      setTimeout(function () {
        sendIntent(form)
      }, 500)
    }
  })

  document.addEventListener('wpcf7mailsent', function (event) {
    const form = event.target

    if (form && form.tagName === 'FORM') {
      sendIntent(form)
    }
  })

  if (window.MutationObserver) {
    const observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        mutation.addedNodes.forEach(function (node) {
          if (node.nodeType !== Node.ELEMENT_NODE) return

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
            '.ff-message-success',
          ]

          const successDetected = successSelectors.some(function (selector) {
            return (
              (node.matches && node.matches(selector)) ||
              (node.querySelector && node.querySelector(selector))
            )
          })

          if (!successDetected) return

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

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    })
  }
})()