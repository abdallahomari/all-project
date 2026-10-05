import gsap from 'gsap'
import { t, getLang } from '../i18n/index.js'

const ENDPOINT = import.meta.env.VITE_FORM_ENDPOINT
const EMAIL = 'info@bkamber.com'

export function initForm({ scrollTo }) {
  const form = document.querySelector('.form')
  const status = form.querySelector('.form__status')
  const category = form.querySelector('#f-cat')

  const setStatus = (msg, kind = '') => {
    status.textContent = msg
    status.className = 'form__status' + (kind ? ` is-${kind}` : '')
    gsap.fromTo(status, { y: 8, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.5, ease: 'power3.out' })
  }

  const validate = () => {
    let ok = true
    form.querySelectorAll('[required]').forEach((input) => {
      const valid = input.value.trim() !== '' && (input.type !== 'email' || /^\S+@\S+\.\S+$/.test(input.value))
      input.closest('.field').classList.toggle('is-invalid', !valid)
      if (!valid) ok = false
    })
    return ok
  }
  form.addEventListener('input', (e) => e.target.closest('.field')?.classList.remove('is-invalid'))

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    if (!validate()) {
      setStatus(t('js.err'), 'error')
      gsap.fromTo(form.querySelectorAll('.is-invalid'), { x: -6 }, { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' })
      return
    }
    const data = Object.fromEntries(new FormData(form))
    data.sectorLabel = form.querySelector('#f-sector').selectedOptions[0].textContent
    data.categoryLabel = category.selectedOptions[0].textContent
    data.language = getLang()

    if (ENDPOINT) {
      setStatus(t('js.sending'))
      try {
        const res = await fetch(ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(data),
        })
        if (!res.ok) throw new Error(res.status)
        form.reset()
        setStatus(t('js.ok'), 'ok')
      } catch {
        setStatus(t('js.fail'), 'error')
      }
      return
    }

    // No backend configured: hand the request to the visitor's mail client.
    const subject = `RFQ — ${data.organisation} — ${data.categoryLabel}`
    const body = [
      `Name: ${data.name}`,
      `Organisation: ${data.organisation}`,
      `Email: ${data.email}`,
      `Phone: ${data.phone || '-'}`,
      `Sector: ${data.sectorLabel}`,
      `Category: ${data.categoryLabel}`,
      '',
      data.message,
    ].join('\n')
    window.location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    setStatus(t('js.mail'), 'ok')
  })

  // Clicking a service pillar pre-selects it and jumps to the form.
  document.querySelectorAll('.pcard').forEach((card) => {
    const go = () => {
      category.value = card.dataset.category
      scrollTo('#contact')
      gsap.fromTo(category.closest('.field'), { backgroundColor: 'rgba(241,90,36,0.18)' }, { backgroundColor: 'rgba(241,90,36,0)', duration: 2.4, delay: 1.2 })
    }
    card.addEventListener('click', go)
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go() } })
  })
}
