import gsap from 'gsap'
import { t } from '../i18n/index.js'

// Custom cursor: a dot that tracks exactly and a ring that trails. Fine pointers only.
export function initCursor() {
  const root = document.querySelector('.cursor')
  const dot = root.querySelector('.cursor__dot')
  const ring = root.querySelector('.cursor__ring')
  const label = root.querySelector('.cursor__label')
  document.documentElement.classList.add('has-cursor')
  root.classList.add('is-hidden')

  const dx = gsap.quickTo(dot, 'x', { duration: 0.12, ease: 'power3.out' })
  const dy = gsap.quickTo(dot, 'y', { duration: 0.12, ease: 'power3.out' })
  const rx = gsap.quickTo(ring, 'x', { duration: 0.5, ease: 'power3.out' })
  const ry = gsap.quickTo(ring, 'y', { duration: 0.5, ease: 'power3.out' })

  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return
    dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY)
    root.classList.remove('is-hidden')
  })
  document.addEventListener('pointerleave', () => root.classList.add('is-hidden'))

  document.addEventListener('pointerover', (e) => {
    const labelled = e.target.closest('[data-cursor]')
    const hoverable = e.target.closest('a, button, select, .srow, [data-magnetic]')
    root.classList.toggle('is-label', !!labelled)
    root.classList.toggle('is-hover', !labelled && !!hoverable)
    if (labelled) label.textContent = t('js.' + labelled.dataset.cursor)
  })
  window.addEventListener('mousedown', () => gsap.to(ring, { scale: 0.8, duration: 0.2 }))
  window.addEventListener('mouseup', () => gsap.to(ring, { scale: 1, duration: 0.4, ease: 'back.out(3)' }))
}

// Elements drift toward the pointer while hovered, then spring back.
export function initMagnetic() {
  document.querySelectorAll('[data-magnetic]').forEach((el) => {
    const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3.out' })
    const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3.out' })
    const strength = el.classList.contains('btn--lg') ? 0.3 : 0.4
    el.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return
      const r = el.getBoundingClientRect()
      xTo((e.clientX - (r.left + r.width / 2)) * strength)
      yTo((e.clientY - (r.top + r.height / 2)) * strength)
    })
    el.addEventListener('pointerleave', () => {
      gsap.to(el, { x: 0, y: 0, duration: 1, ease: 'elastic.out(1, 0.4)', overwrite: true })
    })
  })
}

// Hide nav on scroll down, reveal on scroll up; frosted background once off the top.
export function initNav() {
  const nav = document.querySelector('.nav')
  let last = scrollY
  let ticking = false
  const update = () => {
    const y = scrollY
    nav.classList.toggle('is-scrolled', y > 40)
    if (Math.abs(y - last) > 6) {
      nav.classList.toggle('is-hidden', y > last && y > 240)
      last = y
    }
    ticking = false
  }
  window.addEventListener('scroll', () => {
    if (!ticking) { requestAnimationFrame(update); ticking = true }
  }, { passive: true })
  update()
}
