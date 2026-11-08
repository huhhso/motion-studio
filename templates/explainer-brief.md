# Explainer video brief (template)

Copy this, fill in the [brackets], and send it. Reference build: `videos/skill-explainer.html`
(rendered as `out/skill-explainer.mp4` and `out/skill-explainer-vertical.mp4`).

---

CONTEXT: I run W Creative for entrepreneurs looking to use AI to improve their business.
This video plays on [YOUTUBE / VERTICAL (Reels, Shorts, TikTok) / BOTH / MY WEBSITE]
for entrepreneurs looking to use AI to improve their business.

RESULT: A [15]-second animated explainer, [1920x1080 and/or 1080x1920], using brand.css.
Tee-up line: "[TEE-UP, e.g. Got a result you love?]"
Title: "[TITLE]" (highlight word in orange: [WORD])
Then these steps appear one at a time, each with a big number, a short headline and one small line under it:
1. [STEP 1 HEADLINE] / [STEP 1 LINE]
2. [STEP 2 HEADLINE] / [STEP 2 LINE]
3. [STEP 3 HEADLINE] / [STEP 3 LINE]
End on the W Creative logo with "[CALL TO ACTION]".
Artwork: [MASCOT / OTHER ARTWORK FILE / NONE].
Smooth easing, no hard cuts.

OFF-LIMITS: No stock footage, no people, no words I didn't write, no colors outside brand.css
(the logo and mascot keep their own colors). If anything is unclear, ask me before you build.

SHOW YOUR WORK: Before you write code, give me a scene-by-scene storyboard with timings and
wait for my OK. After you build it, run --stills 3 and show me the stills before the full render.

NEVER TWICE: When I approve the video, save the brief as a template in the templates folder
with [brackets] for the parts that change.

---

## Filled-in example: "Turn it into a skill"

- Platform: both (YouTube 1920x1080 + vertical 1080x1920), 15 seconds
- Tee-up: "Got a result you love?"
- Title: "Turn it into a skill." (highlight: skill)
- 1. Capture the moment / Like turning a client answer into a post.
- 2. Say “make this a skill” / It saves your steps, style and rules.
- 3. Reuse it anytime / Paste the next answer. Get the next post.
- Call to action: "Follow me for more AI shortcuts"
- Artwork: mascot (robot + Louie)

## Notes for the build

- The layout follows the brand and design rules in `CLAUDE.md`: generous white space, the logo above
  any artwork, and the end card style.
- One HTML file renders both formats:
  - `node render.mjs NAME` for the landscape version.
  - `node render.mjs NAME --variant vertical` for the vertical version.
- Steps that take 2.6 seconds each fit in 15 seconds. For longer lines, ask for 20 seconds.
