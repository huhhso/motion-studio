# W Creative motion studio

Motion graphics videos written as code for W Creative (AI for entrepreneurs).
See README.md for how the studio works.

## Brand guidelines

**Colors** live in `brand.css`. Use only these (plus the reference palette there when needed):
- `--bg` #ffffff white (background)
- `--text` #000000 pure black (text). Never soften it.
- `--accent` #de6537 bright orange: the **primary** accent
- `--accent-2` #ac285b plum/pink: second accent
- `--surface` #efefef light gray: card and section backgrounds, never text
- The reference palette in `brand.css` is extra; don't replace the five above with it.

**Fonts**: Poppins for headlines, Open Sans for body. Both are bundled in `fonts/`.

**Logo**: `assets/w-creative-logo.png`. It keeps its own colors.
- **The logo is always above artwork and clipart**, in both senses:
  - **Placement:** the logo sits higher on the page than any artwork, e.g. logo on top, mascot below.
  - **Layering:** artwork never covers or overlaps the logo; the logo is on the top layer.

**Mascot**: `assets/mascot.png`, a white robot with Louie the black cat. It keeps its own colors.
Its white background is blended away with `mix-blend-mode: multiply`.

## Working rules

- Every time a video is rendered: commit the MP4 in `out/` and push it, so it can be downloaded from GitHub.
- For a new video brief: storyboard first and wait for OK; then run `--stills 3` and show the stills before the full render.
- Don't use words in a video that the user didn't write or approve.
- When the user changes one brand value, change only that value. Don't overwrite others.
