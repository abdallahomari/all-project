import gsap from 'gsap'

export function pillars({ desktop, rtl }) {
  const track = document.querySelector('.pillars__track')
  const cards = gsap.utils.toArray('.pcard')
  const imgs = cards.map((c) => c.querySelector('.pcard__media img'))

  if (!desktop) {
    cards.forEach((card) => {
      gsap.from(card, {
        y: 60, autoAlpha: 0, duration: 1.1, ease: 'expo.out',
        scrollTrigger: { trigger: card, start: 'top 88%' },
      })
    })
    return
  }

  const distance = () => Math.max(0, track.scrollWidth - innerWidth)
  const setters = imgs.map((img) => gsap.quickSetter(img, 'xPercent'))

  gsap.to(track, {
    x: () => (rtl ? 1 : -1) * distance(),
    ease: 'none',
    scrollTrigger: {
      trigger: '.pillars',
      start: 'top top',
      end: () => '+=' + distance(),
      pin: true,
      scrub: 0.8,
      invalidateOnRefresh: true,
      onUpdate() {
        // image parallax: shift opposite to each card's offset from the viewport centre
        cards.forEach((card, i) => {
          const r = card.getBoundingClientRect()
          const off = (r.left + r.width / 2 - innerWidth / 2) / innerWidth
          setters[i](gsap.utils.clamp(-12, 12, off * -14))
        })
      },
    },
  })

  gsap.from(cards, {
    x: (i) => (rtl ? -1 : 1) * (120 + i * 60),
    autoAlpha: 0,
    duration: 1.4,
    ease: 'expo.out',
    stagger: 0.08,
    scrollTrigger: { trigger: '.pillars', start: 'top 60%' },
  })
}
