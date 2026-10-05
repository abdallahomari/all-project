import gsap from 'gsap'

// Flap geometry (isometric). Open = folded outwards, closed = folded over the opening.
const FLAPS = {
  bl: { closed: '300,60 109.5,170 204.8,225 395.3,115', fill: '#3a3834' },
  fr: { closed: '490.5,170 300,280 204.7,225 395.2,115', fill: '#36342f' },
  br: { closed: '300,60 490.5,170 395.2,225 204.7,115', fill: '#4a4741' },
  fl: { closed: '109.5,170 300,280 395.3,225 204.8,115', fill: '#45423c' },
}
const TAPE_TOP = '192.6,122 216.9,108 407.4,218 383.1,232'
const TAPE_FRONT = '383.1,232 407.4,218 407.4,306 383.1,320'

// Items drop in through the V between the open back flaps.
const STARTS = [
  [250, -240], [300, -300], [350, -250], [280, -360], [320, -330], [300, -420],
]

export function buildKitTimeline() {
  const items = gsap.utils.toArray('.kitsvg .item')
  const tl = gsap.timeline({ paused: true, defaults: { ease: 'power2.inOut' } })

  items.forEach((item, i) => {
    const [tx, ty] = item.dataset.to.split(',').map(Number)
    gsap.set(item, { x: tx, y: ty, transformOrigin: '50% 50%' })
    tl.fromTo(item,
      { x: STARTS[i][0], y: STARTS[i][1], rotation: gsap.utils.random(-140, 140), opacity: 0, scale: 0.7 },
      { x: tx, y: ty, rotation: 0, opacity: 1, scale: 1, duration: 1.1, ease: 'back.out(1.3)' },
      i * 0.38)
  })

  // inspect
  tl.addLabel('inspect', 3.2)
    .fromTo('.kitsvg .scan', { y: 20, opacity: 0 }, { opacity: 1, duration: 0.2 }, 'inspect')
    .to('.kitsvg .scan', { y: 450, duration: 1.4, ease: 'none' }, 'inspect')
    .to('.kitsvg .scan', { opacity: 0, duration: 0.2 }, 'inspect+=1.3')
    .to(items, { keyframes: [{ opacity: 0.55, duration: 0.15 }, { opacity: 1, duration: 0.15 }], stagger: 0.12 }, 'inspect+=0.2')
    .fromTo('.kitsvg .badge', { scale: 0, rotation: -120, transformOrigin: '50% 50%' }, { scale: 1, rotation: 0, duration: 0.6, ease: 'back.out(2)' }, 'inspect+=1.1')
    .fromTo('.kitsvg .badge__check', { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.4 }, 'inspect+=1.4')

  // assemble
  tl.addLabel('assemble', 5.2)
    .to('.kitsvg .badge', { scale: 0, duration: 0.4, ease: 'power2.in' }, 'assemble')
    .to(items, { y: '+=46', opacity: 0, duration: 0.6, stagger: 0.04 }, 'assemble')
    .to('.kitsvg .flap--bl', { attr: { points: FLAPS.bl.closed, fill: FLAPS.bl.fill }, duration: 0.7 }, 'assemble+=0.3')
    .to('.kitsvg .flap--fr', { attr: { points: FLAPS.fr.closed, fill: FLAPS.fr.fill }, duration: 0.7 }, 'assemble+=0.45')
    .to('.kitsvg .flap--br', { attr: { points: FLAPS.br.closed, fill: FLAPS.br.fill }, duration: 0.7 }, 'assemble+=1.05')
    .to('.kitsvg .flap--fl', { attr: { points: FLAPS.fl.closed, fill: FLAPS.fl.fill }, duration: 0.7 }, 'assemble+=1.2')
    .to('.kitsvg .tape--top', { attr: { points: TAPE_TOP }, duration: 0.55, ease: 'power1.inOut' }, 'assemble+=1.95')
    .to('.kitsvg .tape--front', { attr: { points: TAPE_FRONT }, duration: 0.4, ease: 'power1.out' }, 'assemble+=2.45')

  // deliver
  tl.addLabel('deliver', 7.9)
    .fromTo('.kitsvg .klabel', { opacity: 0, y: -40, scale: 1.25, transformOrigin: '50% 50%' }, { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: 'back.out(1.6)' }, 'deliver')
    .to('.kitsvg .kb', { y: -26, duration: 0.45, ease: 'power2.out' }, 'deliver+=0.55')
    .to('.kitsvg .kb', { y: 0, duration: 0.6, ease: 'bounce.out' }, 'deliver+=1')
    .fromTo('.kitsvg .delivered', { opacity: 0, y: 24, scale: 0.9, transformOrigin: '50% 50%' }, { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: 'back.out(1.6)' }, 'deliver+=1.2')
    .to({}, { duration: 0.6 })

  return tl
}

export function kitting({ desktop }) {
  const tl = buildKitTimeline()
  const steps = gsap.utils.toArray('.step')
  const rail = document.querySelector('.steps__rail span')
  const marks = [0, 3.2 / tl.duration(), 5.2 / tl.duration(), 7.9 / tl.duration()]
  let active = -1

  const setStep = (p) => {
    let idx = 0
    marks.forEach((m, i) => { if (p >= m - 0.01) idx = i })
    if (idx !== active) {
      active = idx
      steps.forEach((s, i) => s.classList.toggle('is-active', i === idx))
    }
    gsap.set(rail, { scaleY: p })
  }

  gsap.to(tl, {
    progress: 1,
    ease: 'none',
    scrollTrigger: {
      trigger: '.kit',
      start: 'top top',
      end: desktop ? '+=320%' : '+=240%',
      pin: true,
      scrub: 0.7,
      onUpdate: (self) => setStep(self.progress),
    },
  })
  setStep(0)

  gsap.from('.kit__art', {
    y: 80, autoAlpha: 0, duration: 1.4, ease: 'expo.out',
    scrollTrigger: { trigger: '.kit', start: 'top 70%' },
  })

  return () => tl.kill()
}

// Reduced motion: a single meaningful still frame.
export function kittingStatic() {
  const tl = buildKitTimeline()
  tl.progress(0.42)
  return () => { tl.progress(0).kill() }
}
