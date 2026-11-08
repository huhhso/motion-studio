# motion-studio

Motion graphics videos written as code.

## Layout

- `videos/<name>.html` — one video per file. It links `../brand.css` and sets:
  - `window.DURATION` — length in seconds
  - `window.SIZE` — `[width, height]` (even numbers)
  - `window.render(t)` — draws the exact frame at time `t` (seconds)

  No CSS animations, transitions or timers: all motion is computed from `t`,
  so every render is identical. `render.mjs` warns if it finds any.
- `brand.css` — colors and fonts as CSS variables, plus base page styles.
- `fonts/` — bundled brand fonts (Poppins, Open Sans; free Google Fonts under the OFL,
  licenses included), loaded by `brand.css` so renders work offline.
- `render.mjs` — renders a video with Playwright (Chromium) and ffmpeg.
- `templates/` — reusable video briefs with [brackets] for the parts that change.
- `assets/` — logo and artwork.
- `out/` — rendered MP4s (committed). Stills go to `out/stills/` (ignored by git).

## Rendering

```bash
node render.mjs hello              # -> out/hello.mp4 at 30 fps
node render.mjs hello --stills 3   # -> out/stills/hello-1..3.png (first, middle, last frame)
node render.mjs hello --fps 60     # optional frame-rate override
node render.mjs skill-explainer --variant vertical   # -> out/skill-explainer-vertical.mp4
```

To preview a single frame in a normal browser, open `videos/hello.html?t=1.5`.

Requires Node 18+, ffmpeg on the PATH, and Playwright with Chromium
(a local `npm i playwright` or a global install both work).
`render.mjs` loads every font before the first frame and stops if a font file is missing.

`videos/brand-check.html` shows every brand color and both fonts — render it after
changing `brand.css` to check the result.
