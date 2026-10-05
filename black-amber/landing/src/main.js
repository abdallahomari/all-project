import '@fontsource/poppins/400.css'
import '@fontsource/poppins/500.css'
import '@fontsource/poppins/600.css'
import '@fontsource/poppins/700.css'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/ibm-plex-sans-arabic/400.css'
import '@fontsource/ibm-plex-sans-arabic/500.css'
import '@fontsource/ibm-plex-sans-arabic/600.css'
import '@fontsource/ibm-plex-sans-arabic/700.css'
import './styles/base.css'
import './styles/sections.css'

import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin'
import { MotionPathPlugin } from 'gsap/MotionPathPlugin'
import Lenis from 'lenis'

import { initialLang, applyLang, getLang } from './i18n/index.js'
import { finePointer, reducedMotion } from './utils.js'
import { buildCubes, hero } from './motion/hero.js'
import { marquee } from './motion/marquee.js'
import { manifesto } from './motion/manifesto.js'
import { pillars } from './motion/pillars.js'
import { kitting, kittingStatic } from './motion/kitting.js'
import { headings, routes, sectors, stack, process, contact, footer, chrome } from './motion/sections.js'
import { initCursor, initMagnetic, initNav } from './ui/pointer.js'
import { initForm } from './ui/form.js'

gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin, MotionPathPlugin)
ScrollTrigger.config({ ignoreMobileResize: true })

const html = document.documentElement
const reduce = reducedMotion()

// ---------- smooth scroll ----------
let lenis = null
if (!reduce) {
  lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 0.95 })
  lenis.on('scroll', ScrollTrigger.update)
  gsap.ticker.add((time) => lenis.raf(time * 1000))
  gsap.ticker.lagSmoothing(0)
  lenis.stop()
}

function scrollTo(target) {
  const el = typeof target === 'string' ? document.querySelector(target) : target
  if (!el) return
  if (lenis) lenis.scrollTo(el, { duration: 1.6, easing: (t) => 1 - Math.pow(1 - t, 4) })
  else el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' })
}

document.addEventListener('click', (e) => {
  const a = e.target.closest('a[data-scroll]')
  if (!a) return
  const id = a.getAttribute('href')
  if (!id?.startsWith('#')) return
  e.preventDefault()
  scrollTo(id === '#top' ? document.body : id)
})

// ---------- motion build / teardown ----------
let mm = null
let pendingIntro = null

function build() {
  mm = gsap.matchMedia()
  mm.add(
    {
      desktop: '(min-width: 900px) and (prefers-reduced-motion: no-preference)',
      mobile: '(max-width: 899px) and (prefers-reduced-motion: no-preference)',
      reduce: '(prefers-reduced-motion: reduce)',
    },
    (ctx) => {
      const { desktop, mobile, reduce: still } = ctx.conditions
      const env = { desktop, mobile, rtl: html.dir === 'rtl' }

      if (still) {
        const undo = kittingStatic()
        return () => undo()
      }

      const cleanups = []
      const h = hero(env)
      pendingIntro = h.intro
      cleanups.push(h.cleanup)
      cleanups.push(marquee(env))
      manifesto(env)
      pillars(env)
      cleanups.push(kitting(env))
      headings()
      routes()
      const s = sectors(env)
      if (s) cleanups.push(s)
      stack()
      process(env)
      contact()
      footer()
      chrome()
      return () => cleanups.forEach((fn) => fn && fn())
    },
  )
}

function playIntro() {
  if (pendingIntro) {
    pendingIntro.play()
    pendingIntro = null
  }
}

// ---------- preloader ----------
function preloader() {
  const num = document.querySelector('.preloader__num')
  const counter = { v: 0 }
  const ready = Promise.race([
    Promise.all([document.fonts.ready, new Promise((r) => (document.readyState === 'complete' ? r() : addEventListener('load', r, { once: true })))]),
    new Promise((r) => setTimeout(r, 4000)),
  ])

  if (reduce) {
    return ready.then(() => {
      gsap.to('.preloader', { autoAlpha: 0, duration: 0.3 })
      html.classList.remove('is-loading')
    })
  }

  const draw = gsap.timeline()
  draw
    .fromTo('.mark-path', { drawSVG: '0%' }, { drawSVG: '100%', duration: 1.6, ease: 'power2.inOut' })
    .to(counter, { v: 86, duration: 1.6, ease: 'power2.inOut', onUpdate: () => (num.textContent = Math.round(counter.v)) }, 0)

  return Promise.all([ready, draw.then()]).then(
    () =>
      new Promise((resolve) => {
        gsap.timeline({ onComplete: resolve })
          .to(counter, { v: 100, duration: 0.5, ease: 'power2.out', onUpdate: () => (num.textContent = Math.round(counter.v)) })
          .to('.mark-path', { fill: '#F15A24', strokeWidth: 0, duration: 0.5 }, '<')
          .to('.preloader__inner', { y: -40, autoAlpha: 0, duration: 0.7, ease: 'power3.in' }, '+=0.15')
          .to('.preloader__panel--top', { yPercent: -100, duration: 1.1, ease: 'expo.inOut' }, '-=0.25')
          .to('.preloader__panel--bottom', { yPercent: 100, duration: 1.1, ease: 'expo.inOut' }, '<')
          .add(() => {
            html.classList.remove('is-loading')
            lenis?.start()
            playIntro()
          }, '-=0.75')
          .set('.preloader', { display: 'none' })
      }),
  )
}

// ---------- language switch ----------
let switching = false
function switchLang() {
  if (switching) return
  switching = true
  const next = getLang() === 'ar' ? 'en' : 'ar'
  const max = ScrollTrigger.maxScroll(window) || 1
  const ratio = scrollY / max

  const swap = () => {
    mm?.revert()
    applyLang(next)
    build()
    ScrollTrigger.refresh()
    const y = ratio * ScrollTrigger.maxScroll(window)
    if (lenis) lenis.scrollTo(y, { immediate: true, force: true })
    else window.scrollTo(0, y)
    ScrollTrigger.update()
  }

  if (reduce) {
    swap()
    switching = false
    return
  }

  lenis?.stop()
  gsap.timeline({ onComplete: () => { switching = false } })
    .set('.curtain', { transformOrigin: '50% 100%' })
    .to('.curtain', { scaleY: 1, duration: 0.7, ease: 'expo.inOut' })
    .to('.curtain__mark', { autoAlpha: 1, y: 0, duration: 0.4 }, '-=0.2')
    .add(swap)
    .set('.curtain', { transformOrigin: '50% 0%' })
    .to('.curtain__mark', { autoAlpha: 0, duration: 0.3 }, '+=0.1')
    .to('.curtain', { scaleY: 0, duration: 0.8, ease: 'expo.inOut' }, '<')
    .add(() => {
      lenis?.start()
      if (scrollY < innerHeight) playIntro()
      else pendingIntro?.progress(1)
      pendingIntro = null
    }, '-=0.5')
}

// ---------- boot ----------
applyLang(initialLang())
buildCubes()
document.querySelector('.year').textContent = new Date().getFullYear()
document.querySelector('[data-lang-toggle]').addEventListener('click', switchLang)

initNav()
initForm({ scrollTo })
if (!reduce && finePointer()) {
  initCursor()
  initMagnetic()
}

document.fonts.ready.then(() => {
  build()
  preloader()
})

// image loads change layout heights; keep triggers accurate
addEventListener('load', () => ScrollTrigger.refresh())
