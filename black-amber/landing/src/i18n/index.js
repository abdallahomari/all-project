import ar from './ar.js'

// Strings used only from JS (not present in the markup).
const runtime = {
  en: {
    'js.quote': 'Get a quote',
    'js.err': 'Please complete the highlighted fields.',
    'js.sending': 'Sending…',
    'js.ok': 'Thank you — we’ll reply within one business day.',
    'js.mail': 'Your email app is opening with the request ready to send.',
    'js.fail': 'Something went wrong. Please email info@bkamber.com.',
    'meta.title': 'Black Amber — General Supply & Trading, Amman',
  },
  ar: {
    'js.quote': 'اطلب عرضًا',
    'js.err': 'يرجى استكمال الحقول المحدّدة.',
    'js.sending': 'جارٍ الإرسال…',
    'js.ok': 'شكرًا لك — سنرد خلال يوم عمل واحد.',
    'js.mail': 'يتم فتح تطبيق البريد وطلبك جاهز للإرسال.',
    'js.fail': 'حدث خطأ ما. يرجى مراسلتنا على info@bkamber.com.',
    'meta.title': 'بلاك آمبر — توريدات عامة وتجارة، عمّان',
  },
}

const dict = { en: {}, ar: { ...ar } }
let current = 'en'

function storageGet() {
  try { return localStorage.getItem('ba-lang') } catch { return null }
}
function storageSet(v) {
  try { localStorage.setItem('ba-lang', v) } catch { /* private mode */ }
}

// English is the source of truth in index.html: capture it once.
function snapshot() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    dict.en[el.dataset.i18n] ??= el.textContent
  })
  document.querySelectorAll('[data-i18n-html]').forEach((el) => {
    dict.en[el.dataset.i18nHtml] ??= el.innerHTML
  })
  document.querySelectorAll('[data-i18n-attr]').forEach((el) => {
    el.dataset.i18nAttr.split(';').forEach((pair) => {
      const [attr, key] = pair.split(':')
      dict.en[key] ??= el.getAttribute(attr) ?? ''
    })
  })
}

export function t(key) {
  return runtime[current][key] ?? dict[current][key] ?? dict.en[key] ?? key
}

export function getLang() {
  return current
}

export function initialLang() {
  snapshot()
  const q = new URLSearchParams(location.search).get('lang')
  if (q === 'ar' || q === 'en') return q
  const saved = storageGet()
  if (saved === 'ar' || saved === 'en') return saved
  return 'en'
}

export function applyLang(lang) {
  current = lang
  const html = document.documentElement
  html.lang = lang
  html.dir = lang === 'ar' ? 'rtl' : 'ltr'
  document.title = t('meta.title')

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n)
  })
  document.querySelectorAll('[data-i18n-html]').forEach((el) => {
    el.innerHTML = t(el.dataset.i18nHtml)
  })
  document.querySelectorAll('[data-i18n-attr]').forEach((el) => {
    el.dataset.i18nAttr.split(';').forEach((pair) => {
      const [attr, key] = pair.split(':')
      el.setAttribute(attr, t(key))
    })
  })
  document.querySelectorAll('[data-lang-opt]').forEach((el) => {
    el.classList.toggle('is-on', el.dataset.langOpt === lang)
  })

  storageSet(lang)
  const url = new URL(location.href)
  url.searchParams.set('lang', lang)
  history.replaceState(null, '', url)
}
