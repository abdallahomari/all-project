import gsap from 'gsap'

const FACES = ['front', 'back', 'left', 'right', 'top', 'bottom']

// Static DOM for the 3D cartons; built once.
export function buildCubes() {
  document.querySelectorAll('.cube').forEach((cube) => {
    if (cube.querySelector('.cube__body')) return
    const scroll = document.createElement('div')
    scroll.className = 'cube__scroll'
    const float = document.createElement('div')
    float.className = 'cube__float'
    const body = document.createElement('div')
    body.className = 'cube__body'
    FACES.forEach((f) => {
      const face = document.createElement('div')
      face.className = `face face--${f}`
      body.append(face)
    })
    float.append(body)
    scroll.append(float)
    cube.append(scroll)
  })
}

// Returns a paused intro timeline; caller plays it when the preloader (or language curtain) clears.
export function hero({ desktop, rtl }) {
  const cubes = gsap.utils.toArray('.cube')
  const floats = gsap.utils.toArray('.cube__float')
  const scrollers = gsap.utils.toArray('.cube__scroll')
  const dir = rtl ? -1 : 1

  gsap.set(['.hero__scene', '.cube', '.cube__scroll', '.cube__float'], { transformStyle: 'preserve-3d' })

  const intro = gsap.timeline({ paused: true, defaults: { ease: 'expo.out' } })
  intro
    .from('.hero__title .line', { yPercent: 115, rotate: 3 * dir, duration: 1.5, stagger: 0.11 })
    .from('.hero__eyebrow', { y: 20, autoAlpha: 0, duration: 1.1 }, 0.1)
    .from(['.hero__lead', '.hero__ctas'], { y: 30, autoAlpha: 0, duration: 1.2, stagger: 0.1 }, 0.45)
    .from('.hero__foot', { y: 24, autoAlpha: 0, duration: 1.2 }, 0.7)
    .from(cubes, {
      y: () => gsap.utils.random(140, 320),
      z: -300,
      rotationX: () => gsap.utils.random(-70, 70),
      rotationY: () => gsap.utils.random(-120, 120),
      autoAlpha: 0,
      duration: 2.2,
      stagger: { each: 0.08, from: 'random' },
    }, 0.05)
    .from('.hero__glow', { autoAlpha: 0, scale: 0.7, duration: 2.4, ease: 'power2.out' }, 0)

  // idle float
  floats.forEach((f, i) => {
    gsap.to(f, {
      y: gsap.utils.random(-22, 22),
      rotationZ: gsap.utils.random(-4, 4),
      rotationY: gsap.utils.random(-10, 10),
      duration: gsap.utils.random(3.2, 5.2),
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
      delay: i * 0.2,
    })
  })

  // scroll: cartons drift apart, copy lifts away
  gsap.timeline({
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.8 },
  })
    .to(scrollers, {
      x: (i) => dir * (i % 2 ? 1 : -1) * gsap.utils.random(80, 260),
      y: () => gsap.utils.random(-320, -120),
      z: () => gsap.utils.random(-200, 260),
      rotationX: () => gsap.utils.random(-90, 90),
      rotationY: () => gsap.utils.random(-140, 140),
      ease: 'none',
    }, 0)
    .to('.hero__content', { y: -120, autoAlpha: 0.1, ease: 'none' }, 0)
    .to('.hero__glow', { scale: 1.4, autoAlpha: 0.4, ease: 'none' }, 0)

  // pointer parallax on the whole scene
  let onMove
  if (desktop) {
    const rx = gsap.quickTo('.hero__scene', 'rotationX', { duration: 1.2, ease: 'power3.out' })
    const ry = gsap.quickTo('.hero__scene', 'rotationY', { duration: 1.2, ease: 'power3.out' })
    const sx = floats.map((f) => gsap.quickTo(f, 'x', { duration: 1.4, ease: 'power3.out' }))
    onMove = (e) => {
      const nx = e.clientX / innerWidth - 0.5
      const ny = e.clientY / innerHeight - 0.5
      rx(ny * -10)
      ry(nx * 14)
      sx.forEach((fn, i) => fn(nx * (14 + i * 8)))
    }
    window.addEventListener('pointermove', onMove)
  }

  return {
    intro,
    cleanup: () => onMove && window.removeEventListener('pointermove', onMove),
  }
}
