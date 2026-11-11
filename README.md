# 16th Anniversary microsite — Header / Hero (v0.1)

## Structure
index.html          page
css/style.css       styles (palette = CSS variables in :root)
js/main.js          glass nav, mobile menu, Three.js scene, GSAP intro + scroll
js/glyphs.js        outlines of the "1" and "6" used for the 3D numeral
vendor/             PUT THESE FILES HERE (self-hosted, no CDN at runtime):
  three.min.js         three.js r128   https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js
  gsap.min.js          GSAP 3.12.2     https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js
  ScrollTrigger.min.js GSAP 3.12.2     https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js

Google Fonts (Cormorant Garamond, Lora, Jost) are linked in index.html; download and self-host them
too if the hosting policy disallows third-party requests.

## Sections
Hero -> Venue -> Program (placeholder) -> RSVP (placeholder). Mobile-first CSS: base = phone, min-width queries add tablet/desktop.

## Behaviour
- Nav: transparent at top, glass (blur + tint + gold hairline) after 40px scroll.
- 3D: extruded cream "16" with gold bevel, gold sunburst fan, faint halo rays, gold dust.
- Cursor: numeral tilts, gold light follows the pointer, dust scatters. Idle: light sweeps on its own.
- Scroll: numeral rotates/recedes (GSAP ScrollTrigger scrub). Desktop: sections stack like sticky 3D cards. Phones: each section tilts back as it leaves and unfolds as it arrives, following the finger.
- Touch: drag sideways on the hero to tilt the numeral; scroll speed adds spin and streaks the gold dust.
- Fallbacks: no WebGL -> CSS "16"; prefers-reduced-motion -> static single render, no loop.