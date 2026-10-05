import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

export function marquee({ mobile, rtl }) {
  const rows = gsap.utils.toArray('.marquee__row')
  const tweens = []
  const clones = []
  const sign = rtl ? -1 : 1

  rows.forEach((row) => {
    const track = row.querySelector('.marquee__track')
    const clone = track.cloneNode(true)
    clone.setAttribute('aria-hidden', 'true')
    clone.querySelectorAll('[data-i18n]').forEach((n) => n.removeAttribute('data-i18n'))
    row.append(clone)
    clones.push(clone)

    const d = Number(row.dataset.dir) * sign
    const from = d > 0 ? 0 : -50 * sign
    const to = d > 0 ? -50 * sign : 0
    tweens.push(
      gsap.fromTo(row, { xPercent: from }, { xPercent: to, duration: mobile ? 34 : 46, ease: 'none', repeat: -1 }),
    )
  })

  const skew = gsap.quickTo(rows, 'skewX', { duration: 0.5, ease: 'power3.out' })
  let settle
  ScrollTrigger.create({
    trigger: '.marquee',
    start: 'top bottom',
    end: 'bottom top',
    onUpdate(self) {
      const v = self.getVelocity()
      const boost = 1 + Math.min(Math.abs(v) / 250, 6)
      const scale = boost * self.direction
      tweens.forEach((t) => gsap.to(t, { timeScale: scale, duration: 0.2, overwrite: true }))
      skew(gsap.utils.clamp(-8, 8, (v / -220) * sign))
      clearTimeout(settle)
      settle = setTimeout(() => {
        tweens.forEach((t) => gsap.to(t, { timeScale: self.direction, duration: 1.2, overwrite: true }))
        skew(0)
      }, 120)
    },
  })

  return () => {
    clearTimeout(settle)
    clones.forEach((c) => c.remove())
  }
}
