import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { splitWords, splitChars, finePointer } from '../utils.js'

// Headline reveals: words slide up through a mask.
export function headings() {
  gsap.utils.toArray('.reveal-words').forEach((el) => {
    const words = splitWords(el)
    gsap.from(words, {
      yPercent: 115,
      duration: 1.15,
      ease: 'expo.out',
      stagger: 0.055,
      scrollTrigger: { trigger: el, start: 'top 86%' },
    })
  })
  gsap.utils.toArray('.label').forEach((el) => {
    gsap.from(el, {
      y: 16, autoAlpha: 0, duration: 0.9, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 90%' },
    })
  })
}

export function routes() {
  const arcs = gsap.utils.toArray('.map .arc')
  const pulses = gsap.utils.toArray('.map .pulses circle')
  const nodes = gsap.utils.toArray('.map .node')

  const tl = gsap.timeline({ scrollTrigger: { trigger: '.routes__map', start: 'top 72%' } })
  tl.from(nodes, { scale: 0, transformOrigin: '50% 50%', autoAlpha: 0, duration: 0.7, ease: 'back.out(2)', stagger: 0.08 })
    .fromTo(arcs, { drawSVG: '0%' }, { drawSVG: '100%', duration: 1.6, ease: 'power2.inOut', stagger: 0.14 }, 0.2)
    .add(() => {
      pulses.forEach((p, i) => {
        gsap.fromTo(p, { autoAlpha: 0 }, {
          keyframes: [{ autoAlpha: 1, duration: 0.2 }, { autoAlpha: 1, duration: 1.6 }, { autoAlpha: 0, duration: 0.2 }],
          repeat: -1, delay: i * 0.45, repeatDelay: 0.6,
        })
        gsap.to(p, {
          motionPath: { path: arcs[i], start: 0, end: 1 },
          duration: 2, ease: 'power1.inOut', repeat: -1, delay: i * 0.45, repeatDelay: 0.6,
        })
      })
    })

  gsap.utils.toArray('.stats__num').forEach((el) => {
    const target = Number(el.dataset.count)
    const obj = { v: 0 }
    gsap.to(obj, {
      v: target,
      duration: 1.8,
      ease: 'power3.out',
      scrollTrigger: { trigger: '.stats', start: 'top 88%' },
      onUpdate: () => { el.textContent = Math.round(obj.v) + (el.dataset.suffix || '') },
    })
  })
  gsap.from('.stats li', {
    y: 30, autoAlpha: 0, duration: 1, ease: 'expo.out', stagger: 0.08,
    scrollTrigger: { trigger: '.stats', start: 'top 88%' },
  })
}

export function sectors({ desktop }) {
  const rows = gsap.utils.toArray('.srow')
  gsap.from(rows, {
    y: 50, autoAlpha: 0, duration: 1.1, ease: 'expo.out', stagger: 0.08,
    scrollTrigger: { trigger: '.srows', start: 'top 85%' },
  })

  if (!desktop || !finePointer()) return

  const float = document.querySelector('.sfloat')
  const inner = float.querySelector('.sfloat__inner')
  const xTo = gsap.quickTo(float, 'x', { duration: 0.7, ease: 'power3.out' })
  const yTo = gsap.quickTo(float, 'y', { duration: 0.7, ease: 'power3.out' })
  const rTo = gsap.quickTo(float, 'rotation', { duration: 0.9, ease: 'power3.out' })
  let lastX = 0
  gsap.set(float, { scale: 0.6 })

  const move = (e) => {
    xTo(e.clientX)
    yTo(e.clientY)
    rTo(gsap.utils.clamp(-14, 14, (e.clientX - lastX) * 0.6))
    lastX = e.clientX
  }
  const enterRow = (e) => {
    const src = e.currentTarget.dataset.img
    inner.style.backgroundImage = `url(${src})`
    gsap.fromTo(inner, { scale: 1.3 }, { scale: 1, duration: 0.8, ease: 'expo.out', overwrite: true })
    gsap.to(float, { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'expo.out', overwrite: 'auto' })
  }
  const leaveList = () => gsap.to(float, { autoAlpha: 0, scale: 0.6, duration: 0.4, ease: 'power3.out', overwrite: 'auto' })
  const list = document.querySelector('.srows')

  // jump into place on first entry so the image doesn't fly in from the corner
  const first = (e) => { gsap.set(float, { x: e.clientX, y: e.clientY }); lastX = e.clientX }
  list.addEventListener('pointerenter', first)
  list.addEventListener('pointermove', move)
  list.addEventListener('pointerleave', leaveList)
  rows.forEach((r) => r.addEventListener('pointerenter', enterRow))

  return () => {
    list.removeEventListener('pointerenter', first)
    list.removeEventListener('pointermove', move)
    list.removeEventListener('pointerleave', leaveList)
    rows.forEach((r) => r.removeEventListener('pointerenter', enterRow))
  }
}

export function stack() {
  const cards = gsap.utils.toArray('.scard')
  cards.forEach((c, i) => c.style.setProperty('--i', i))
  cards.forEach((card, i) => {
    const next = cards[i + 1]
    if (!next) return
    gsap.to(card, {
      scale: 0.9 + i * 0.02,
      filter: 'brightness(0.55)',
      ease: 'none',
      scrollTrigger: { trigger: next, start: 'top bottom', end: 'top 20%', scrub: true },
    })
  })
  cards.forEach((card) => {
    gsap.from(card.querySelectorAll('.scard__body > *, .scard__icon'), {
      y: 40, autoAlpha: 0, duration: 1, ease: 'expo.out', stagger: 0.08,
      scrollTrigger: { trigger: card, start: 'top 70%' },
    })
  })
}

export function process({ desktop }) {
  const steps = gsap.utils.toArray('.tstep')
  const prop = desktop ? 'scaleX' : 'scaleY'
  gsap.fromTo('.timeline__line span', { [prop]: 0 }, {
    [prop]: 1,
    ease: 'none',
    scrollTrigger: {
      trigger: '.timeline',
      start: desktop ? 'top 75%' : 'top 70%',
      end: desktop ? 'top 30%' : 'bottom 60%',
      scrub: 0.5,
      onUpdate(self) {
        steps.forEach((s, i) => s.classList.toggle('is-on', self.progress >= i / (steps.length - 1) - 0.02))
      },
    },
  })
  gsap.from(steps, {
    y: 40, autoAlpha: 0, duration: 1, ease: 'expo.out', stagger: 0.1,
    scrollTrigger: { trigger: '.timeline', start: 'top 85%' },
  })
}

export function contact() {
  gsap.from('.contact__lead, .contact__list li, .wa', {
    y: 30, autoAlpha: 0, duration: 1, ease: 'expo.out', stagger: 0.06,
    scrollTrigger: { trigger: '.contact', start: 'top 65%' },
  })
  gsap.from('.form', {
    y: 80, autoAlpha: 0, duration: 1.4, ease: 'expo.out',
    scrollTrigger: { trigger: '.form', start: 'top 85%' },
  })
}

export function footer() {
  const chars = splitChars(document.querySelector('.footer__word'))
  gsap.from(chars, {
    yPercent: 105,
    duration: 1.3,
    ease: 'expo.out',
    stagger: { each: 0.045, from: 'center' },
    scrollTrigger: { trigger: '.footer__word', start: 'top 95%' },
  })
}

// Progress bar + nav colour; created last so pinned spacing is already measured.
export function chrome() {
  gsap.to('.progress span', {
    scaleX: 1, ease: 'none',
    scrollTrigger: { start: 0, end: 'max', scrub: 0.3 },
  })
  const nav = document.querySelector('.nav')
  gsap.utils.toArray('main > section, .footer').forEach((sec) => {
    ScrollTrigger.create({
      trigger: sec,
      start: 'top 40px',
      end: 'bottom 40px',
      onToggle: (self) => {
        if (self.isActive) nav.classList.toggle('on-light', sec.dataset.theme === 'light')
      },
    })
  })
}
