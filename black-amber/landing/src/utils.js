// Wrap every word of an element's text in spans, leaving child elements (e.g. image pills) intact.
// mask: true  -> <span class="w"><span class="wi">word</span></span>  (for slide-up reveals)
// mask: false -> <span class="mw">word</span>                          (for colour/opacity fills)
export function splitWords(el, { mask = true } = {}) {
  const sel = mask ? '.wi' : '.mw, .pill'
  // already split (translations replace the content, which clears the wrappers)
  if (el.querySelector(mask ? '.wi' : '.mw')) return [...el.querySelectorAll(sel)]
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  const nodes = []
  while (walker.nextNode()) nodes.push(walker.currentNode)
  nodes.forEach((node) => {
    if (node.parentElement.closest('.pill')) return
    const frag = document.createDocumentFragment()
    node.textContent.split(/(\s+)/).forEach((tok) => {
      if (!tok) return
      if (/^\s+$/.test(tok)) return frag.append(document.createTextNode(tok))
      const span = document.createElement('span')
      if (mask) {
        span.className = 'w'
        const inner = document.createElement('span')
        inner.className = 'wi'
        inner.textContent = tok
        span.append(inner)
      } else {
        span.className = 'mw'
        span.textContent = tok
      }
      frag.append(span)
    })
    node.replaceWith(frag)
  })
  return [...el.querySelectorAll(sel)]
}

// Split Latin text into per-character spans (only used for the brand wordmark).
export function splitChars(el) {
  if (el.querySelector('.ch')) return [...el.querySelectorAll('.ch')]
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  const nodes = []
  while (walker.nextNode()) nodes.push(walker.currentNode)
  nodes.forEach((node) => {
    const frag = document.createDocumentFragment()
    ;[...node.textContent].forEach((c) => {
      const s = document.createElement('span')
      s.className = 'ch'
      s.textContent = c === ' ' ? '\u00a0' : c
      frag.append(s)
    })
    node.replaceWith(frag)
  })
  return [...el.querySelectorAll('.ch')]
}

export const finePointer = () => matchMedia('(hover: hover) and (pointer: fine)').matches
export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches
