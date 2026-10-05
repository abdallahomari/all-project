# Black Amber — Landing page

A bilingual (English / Arabic) landing page for Black Amber (bkamber.com). It tells the story "from origin to your door" through scroll-driven motion.

**Stack:** Vite, vanilla JS, GSAP 3 (ScrollTrigger, DrawSVG, MotionPath), Lenis smooth scroll. Fonts are self-hosted with Fontsource (Poppins, Inter, IBM Plex Sans Arabic).

## Run

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # outputs static files to dist/
npm run preview   # serves dist/
```

`dist/` is plain static files. Deploy it to any static host (Netlify, Vercel, Cloudflare Pages, Firebase Hosting, cPanel). All paths are relative, so the site also works from a sub-folder.

## Quote form

- **With a backend:** set `VITE_FORM_ENDPOINT` (for example a Formspree or Getform URL, or your own API) in `.env` before building. The form POSTs JSON to that address.
- **Without one:** the form opens the visitor's email app with the request pre-filled, addressed to info@bkamber.com.

The WhatsApp button links to the sales number, +962 79 0300 772.

## Page structure

| # | Section | Motion |
|---|---------|--------|
| — | Preloader | The "B" mark draws itself, a counter runs, then split panels open |
| 1 | Hero | Masked line reveal; floating 3D cartons that follow the mouse and scatter on scroll |
| 2 | Category marquee | Two infinite rows whose speed, direction and skew react to scroll velocity |
| 3 | Manifesto | Pinned; words fill in as you scroll; inline image pills grow in |
| 4 | Four pillars | Pinned horizontal scroll (direction reverses in Arabic); image parallax; hover zoom, colour and corner brackets; clicking a card pre-selects it in the form |
| 5 | Kitting | Pinned SVG scene: items drop into the box → inspection scan and QA badge → flaps fold and tape → label, bounce, "Delivered" |
| 6 | Global sourcing | Routes draw from Europe, Türkiye, UAE, India and China to Amman, with travelling pulses and count-up stats |
| 7 | Sectors | Large rows that fill on hover, with an image that follows the cursor |
| 8 | Why Black Amber | Sticky stacking cards that scale and dim as the next one arrives |
| 9 | Process | Timeline line draws; steps light up |
| 10 | Contact | Floating-label form with validation; magnetic buttons |
| — | Footer | Giant wordmark rises letter by letter |

**Applies to every section:**
- Custom cursor (mouse only).
- Magnetic buttons.
- Nav that hides on scroll down and changes colour per section.
- Scroll progress bar.
- Film grain overlay.
- Language switch with an orange curtain transition.

**Accessibility and fallbacks:**
- `prefers-reduced-motion` removes smooth scroll, pinning and scrubbing; the page renders static.
- Phones get a lighter, vertical version of each scene.

## Translation

- English copy lives in `index.html` and is the source of truth.
- Arabic copy lives in `src/i18n/ar.js`, keyed by each element's `data-i18n` value.
- To change text, edit both places.
- The language is remembered per visitor and can be linked with `?lang=ar` or `?lang=en`.

## Confirm with the client before launch

These are placeholders or assumptions drawn from the company profile:

- **"24h quotation turnaround"**, **"5+ sourcing regions"**, and the five source regions on the map: confirm they are true, or edit them in `index.html`, `ar.js` and `.stats` `data-count`.
- **Photos** in `public/images/` are cut from the company-profile PDF (stock imagery). Replace them with real photography of the warehouse, kits and team.
- **Missing proof points:** client logos, certifications or registrations (UNGM, JFDA), years in business, and testimonials. Add a trust bar once available.
- **Logo:** the "B" mark is a vector re-drawing of the profile logo. Swap in the original SVG if available (`public/logo-b.svg`, plus `#b-mark` in `index.html`).
- **Domain and brand variant:** this build uses **Black Amber** (orange B) and the Amman contact details. The "Black Amber Import" A-mark and the Dubai details on the moodboard were not used.

## Files

```
index.html             markup + English copy
src/main.js            boot: Lenis, plugins, preloader, build/teardown, language switch
src/i18n/              Arabic dictionary + language switching
src/motion/            one module per scene (hero, marquee, manifesto, pillars, kitting, sections)
src/ui/                cursor, magnetic hover, nav, form
src/styles/            base (tokens, type, buttons, nav) + sections
public/images/         imagery
```
