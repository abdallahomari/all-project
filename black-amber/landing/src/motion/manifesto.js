import gsap from 'gsap'
import { splitWords } from '../utils.js'

export function manifesto({ desktop }) {
  const text = document.querySelector('.manifesto__text')
  const words = splitWords(text, { mask: false })
  const pills = words.filter((w) => w.classList.contains('pill'))
  const plain = words.filter((w) => !w.classList.contains('pill'))

  const tl = gsap.timeline({
    scrollTrigger: desktop
      ? { trigger: '.manifesto', start: 'top top', end: '+=140%', pin: true, scrub: 0.6 }
      : { trigger: '.manifesto__text', start: 'top 80%', end: 'bottom 45%', scrub: 0.6 },
  })
  tl.fromTo(plain, { opacity: 0.12 }, { opacity: 1, stagger: 0.05, ease: 'none', duration: 0.4 })
  pills.forEach((p) => {
    const idx = words.indexOf(p)
    tl.fromTo(p, { width: 0, opacity: 0 }, { width: '2.3em', opacity: 1, duration: 0.6, ease: 'power2.out' }, idx * 0.05)
  })
  tl.from('.manifesto__meta span', { y: 20, autoAlpha: 0, stagger: 0.08, duration: 0.6 }, '>-0.4')
}
