# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

DECOSTAR — a trilingual (RU/EN/UZ-Latin) B2B marketing site for a decor-paper mill (decorative paper for
particleboard/MDF laminate). Static site, no build step, no framework, no test suite.

**Read before making design or content decisions:**
1. `PRD.md` — information architecture, section-by-section content spec, design tokens, motion spec.
2. `research/01_industry_and_ux_research.md` — industry terminology, competitor patterns (Schattdecor,
   Lamigraf, etc.), B2B UX best practices that justify the site structure.
3. `research/02_plan.md` — open questions log and decisions already made (product line scope, language,
   CTA priority) — don't re-ask these.
4. `research/03_design_direction.md` — the design rationale (two-pass brainstorm + critique against
   AI-default clichés) behind every token in the design system below. Read this before changing colors,
   type, or adding new visual motifs, so new work stays consistent with *why* choices were made, not just
   *what* they are.

`1_instruction.md` is the original generic brief and is superseded by the above — no longer needs to be
read or updated.

## Stack and structure

Plain HTML5 + CSS3 + vanilla JS, GSAP/ScrollTrigger loaded from CDN (`unpkg.com/gsap@3.12.5`) with a
non-GSAP fallback (IntersectionObserver) for reduced-motion / library-load-failure cases. Chosen over a
framework because this is a single static page with no app state — a framework runtime would only add
weight against the LCP budget that matters most for B2B buyers (see research §2). One more CDN library,
three.js (`unpkg.com/three@0.184.0`), is loaded only for the hero motif — see `assets/mdf-stack.js` below.

- `index.html` — the entire page, all ten PRD sections in one file.
- `style.css` — single stylesheet. Design tokens as CSS custom properties at the top; sections follow in
  page order.
- `script.js` — single IIFE, no modules/bundler. Independent feature blocks: language switch, mobile nav,
  scroll-reveal, decor filter, kinetic counters, CTA form, the "layer press" signature animation, and the
  process ScrollTrigger scene.
- `assets/mdf-stack.js` — the **one** ES module in the project (three.js is ESM-only, so it can't live in
  `script.js`). Renders the hero's laminated-MDF board stack; `index.html` carries the import map for it in
  `<head>` (import maps must be parsed before any module loads) and the `<script type="module">` tag at the
  bottom. It reads `prefers-reduced-motion` itself rather than sharing `script.js`'s `reduceMotion`. Don't
  convert the rest of the site to modules on account of this file — it's an isolated exception, and
  `script.js` still has to run in browsers that would otherwise skip a module.
- `assets/fonts.generated.css` + `assets/fonts/*.woff2` — self-hosted, subsetted (cyrillic + latin only —
  Uzbek Latin uses the latin subset) webfonts. Linked directly in `<head>` (not `@import`-ed from
  `style.css`) so the browser preloader fetches it in parallel with `style.css` instead of discovering it
  late.
- `assets/img/` — responsive WebP+JPEG pairs derived from real photo assets: `driftvud_1280x800.jpg` (wood-grain
  decor texture, used in the decor catalog), `uludag-mese-bg.jpg` (oak wood-grain, the sitewide texture
  backdrop — see `--bg-texture` in `style.css`), `hero-decor-swatches-{768,1920}.jpg` (fanned laminate/veneer
  sample photo, hero-section background — see `--hero-bg-photo`; "Samples of Wooden Floor" by cottonbro
  studio via Pexels, free for commercial use, no attribution required), and `hero-swatch-{1..8}-{480,960}.
  {webp,jpg}` (square center-crops of real mill samples from `assets/img/Papers/` via a one-off Pillow
  script — these fed the retired Swatch Float hero motif and are currently **unreferenced**; keep them
  only if a future section wants sample thumbnails). Everything else in the decor catalog is a CSS gradient placeholder (see "Content placeholders" below).
- `deploy/` — a separate Vercel deployment target (has its own `.vercel/`). It is **not** auto-synced with
  the root files — copy `index.html`/`style.css`/`script.js` into it manually before deploying.

### Regenerating assets

No package.json / build tooling. Image and font pipelines were run ad hoc with Python:

```bash
# Images: Pillow (pip3 install --user Pillow) resizes + re-encodes to WebP/JPEG pairs
python3 -c "from PIL import Image; ..."   # see git history for the exact resize/crop script

# Fonts: fetch Google Fonts CSS2 API, keep only cyrillic+latin @font-face blocks, download the woff2 files
curl -s -A "<desktop UA>" "https://fonts.googleapis.com/css2?family=...&display=swap" -o /tmp/f.css
# then parse @font-face blocks and urllib.request.urlretrieve() each url into assets/fonts/
```

If you add a new font weight/family, keep only `cyrillic` and `latin` subsets (drop `-ext`/`vietnamese`) —
Uzbek Latin is covered by the `latin` subset (it needs `'` for apostrophed letters like `o'`/`g'`, no extra
glyphs beyond that), Russian needs `cyrillic`.

### Running locally

No dev server config. Any static file server works:

```bash
python3 -m http.server 8123
```

Verified working via Playwright (`pip3 install --user playwright && python3 -m playwright install chromium`)
in the prior session — no chromium-cli/node toolchain in this environment.

## Required skills for interface work

Apply these on every UI change, not just new features — a small tweak should still leave the touched
element feeling considered, not just "changed":

1. **`emil-design-eng`** — for all interfaces, so the site feels alive rather than static: motion,
   component polish, and the invisible interaction details (hover/press states, timing, easing) that make
   an interface feel handcrafted instead of default.
2. **`impeccable`** — for typography, color contrast, layout, and spacing across the entire interface. Use
   it to check/derive type scale, spacing rhythm, and WCAG contrast before shipping a visual change, not
   just when something looks obviously broken.
3. **A taste skill** (e.g. `design-taste-frontend`, `high-end-visual-design`, `ui-ux-pro-max`) — for overall
   visual quality on any new section or redesign, so work doesn't default to generic/templated AI-look
   patterns (see the cliché note in `research/03_design_direction.md`).

These sit on top of, not instead of, the design system below — the tokens, motifs, and rationale already
established here are the site's specific point of view; the skills above are how new or changed work stays
polished while remaining consistent with that point of view, not a license to redesign it wholesale.

## Design system — keep new work consistent with this

Full rationale in `research/03_design_direction.md`. Summary of the tokens (all in `style.css :root`):

| Token | Hex | Role |
|---|---|---|
| `--press-black` | `#1E1A17` | **Ink/text color only** — headings, decor-card names, focus rings, `.btn-outline-dark`. Do not use for large backgrounds (see below). |
| `--surface-dark` | `#4F4438` | Background for large dark sections (hero, process, certificates, footer). Lightened on request from an earlier near-black `#1E1A17` — kept as a separate token from `--press-black` specifically so lightening it doesn't also wash out ink/text colors that reuse the same name. |
| `--kraft-brown` | `#8C776E` | Brand accent (CTA, brand blocks) — updated from the original brief's `#845036` |
| `--raw-pulp` | `#E8E4DC` | Light section background — deliberately *not* a warm cream (see cliché note). Do not lighten this further toward `#F4F1EA` — that's the exact AI-default cream this project is avoiding. |
| `--registration-cyan` | `#1C8CA0` | Interactive/working accent (links, active states, eyebrow labels, active language option) |
| `--ink-grey` | `#4A433C` | Body text on light backgrounds |
| `--pulp-white` | `#F7F5F1` | Card surfaces on top of raw-pulp; also text color on dark surfaces |
| `--muted-on-dark` / `--muted-on-dark-soft` | `#C9C2B8` / `#C4BAAC` | Secondary text on dark surfaces (lead copy, stat labels, footer nav). Both were picked/verified for ≥4.5:1 contrast against `--surface-dark` — if you darken `--surface-dark` further, recheck contrast before reusing these. |

**When touching backgrounds vs. text color, mind the split above.** `--press-black` and `--surface-dark`
look similar in a swatch but serve different jobs; conflating them again (e.g. reintroducing
`background: var(--press-black)` on a large section) silently drags the whole site back toward the darker
look this token split was created to move away from.

Typography: **PT Sans Narrow** (display/headings) + **IBM Plex Sans** (body) + **IBM Plex Mono** (decor
codes, stage numbers, eyebrow labels, form labels). Big Shoulders was the original display-font choice in
the design plan but was dropped during implementation because it has no Cyrillic glyphs — PT Sans Narrow
(ParaType) both solves that and fits the brief better (a Russian type foundry's industrial narrow grotesk
for a Russian mill). If you add new display text, verify Cyrillic coverage before picking a typeface.

**Signature motif — "The Layer Press."** One recurring visual idea (kraft paper + printed decor + resin
overlay stacking/compressing into a plate), used in exactly one place now:
1. Decor-card hover (`.decor-card__corner` — a small "dog-ear" at rest that lifts fully on hover)

It used to also drive the production-process pinned scroll scene (`.stack-bar` + `.process-stage`), then a
per-language animated GIF diagram, then a five-card flow with connector lines and a travelling cyan dot.
That slot is now **the delivery line** (see below) — none of `.stack-bar`, `.process-stage`,
`.process-flow-img` or `.process-connector` exist any more, and neither does `initProcessScene()`.

It no longer appears in the hero — that slot has its own motif, the **laminated-MDF stack** (`.mdf-stack`,
`#mdf-stage`, `assets/mdf-stack.js`): a real-time three.js scene of six boards, each faced with one of the
mill's decors, that fly in from the edges of the frame on load (staggered 110ms, easeBack overshoot so each
board settles rather than stopping dead), hold in a loose fan, then compress into an aligned stack as the
hero scrolls away. Scroll progress is mapped onto the first **34%** of the hero's exit (`SPAN` in the
module), not its full height — the hero is a normal in-flow section, not the 200vh sticky track the scene
was first designed against, so a 1:1 mapping would have finished the compression after the hero had
already gone. `SPAN` is the whole feel of the interaction: smaller means the boards start moving sooner
and are stacked sooner. The follow smoothing (`0.12`) is the other half of that — lower values read as the
animation starting late rather than as weight. Everything
in the scene is procedural (canvas-generated wood-grain and chipboard-core textures, ~10 hex values per
finish), so it ships no image assets and a finish is retuned by editing `FINISHES`. The lights are keyed to
the site palette rather than a neutral studio rig: raw-pulp sky / surface-dark ground bounce, and a
kraft-brown rim so the boards carry the brand accent along one edge.

This motif replaced Swatch Float (a CSS scatter of `hero-swatch-*` sample photos), which is gone from
`index.html`, `style.css` and `script.js`. Its degradation ladder is the point of most of the module's
complexity, so keep it intact when editing:

- **The hero frame starts empty and that is deliberate** — the boards enter from outside it, so anything
  shown first reads as a flash on every reload. The `<picture>` in `.mdf-stack` is `display: none` by
  default and is an *error* path, not a poster frame. Do not "fix" the empty first moment by revealing it
  earlier.
- Who reveals it: `script.js` (not the module). It adds `.is-fallback` immediately when there's no WebGL
  context at all, or after `MDF_GIVE_UP_MS` (5s) if the module still hasn't reported in — which covers a
  blocked CDN, a failed import map, and old browsers that ignore `type="module"`. The module adds
  `.is-live` after its first successful render; **that class is the handshake between the two files**, so
  don't remove it as "unused CSS". With no JS at all, a `<noscript><style>` in the markup reveals the
  image instead. The fallback `<img>` is `loading="lazy"` precisely so the normal path never fetches it.
- `prefers-reduced-motion` → one static frame at p=0.35, no rAF loop and no scroll link.
- Hero off screen → the rAF loop idles, since the pinned process scene further down wants the frame budget
  more than an invisible canvas does. Sizing comes from a `ResizeObserver`, never from reading
  `clientWidth` inside the loop.

**Sticky LMDF board + continuous section backdrop** (`--lmdf-photo`, `.lmdf-bg`, `.lmdf-parallax`,
`[data-lmdf]`, `initLmdfBackground()` in `script.js`) is the one deliberate exception to "the MDF stack lives
only in the hero" / "one showpiece per section": the board stack's story continues past the hero, into
every section below it, using a real photo — `assets/img/process-flow/LDSP2.jpg` (via the already-generated
`process-ldsp2-1000.jpg`, same asset as `--process-bg-photo`) — of the mill's own fanned board stack, not a
flat colour. Two cooperating pieces:

1. `.lmdf-bg` is a thin, page-anchored accent: a fixed two-layer tint of that photo that reveals itself the
   instant the hero's own stack-closing scroll span (`SPAN` in `assets/mdf-stack.js`) completes, opening on
   the same belaya-korona (white) finish the boards close on — since that finish is close to achromatic,
   the photo renders close to desaturated at that moment, which *is* the literal "extracted white board"
   the hero hands off into — then cross-fading through the palette as the reader scrolls (`HERO_SPAN` in
   `script.js` must stay matched to `SPAN`). It's a faint bleed through the light sections' own translucent
   tints. This is the literal "stuck to the page" continuity; it is not the bold visual.
2. `.lmdf-parallax` is that bold visual: every section below the hero (plus the footer) carries its own
   layer showing that same photo, statically recoloured via a `data-lmdf="<finish-name>"` attribute on the
   section (`decors`→belaya-korona, `process`→uludag-mese, `advantages`→acik-kok, `sustainability`→wenge,
   `certificates`→dub-kataniya, `clients`→astana, `cta`→belaya-korona again, footer→uludag-mese again —
   cycling the same six hero finishes in page order). The photo is now each section's actual visible
   background, not a subtle accent behind it — and it's **one continuous image across every section, not
   each one re-cropping its own copy**: the photo layer's `background-attachment` is `fixed`, so it's sized
   and positioned against the *viewport*, not each section's own box. A section is just a window moving over
   one shared, viewport-anchored image; scrolling past a section boundary never restarts or re-crops it, and
   "the background stays still while the page scrolls over it" *is* the parallax — one CSS declaration gets
   both continuity and motion, no JS and no per-section margin/seam needed. (The recolour/scrim layers in the
   same `background-image` list stay `background-attachment: scroll` — they're generated per-finish colour,
   not photo content, so they track their own section normally; only the photo layer needs to stay put.)
   This replaced an earlier version where each section had its own oversized, JS-`transform`-driven copy of
   the photo — that produced a visible seam/reset at every section boundary since each section centred its
   own independent crop; don't reintroduce a per-section seam margin or a JS parallax transform on this
   layer to "fix" a look that background-attachment:fixed already fixes structurally. Note this is a
   deliberate, scoped exception to the `.bg-texture` comment's stated avoidance of `background-attachment:
   fixed` (repaint jank, iOS inconsistency) — that guidance is about a layer that's live across the *entire*
   page at all times; here the photo genuinely needs to be one shared backdrop, that's the whole point, and
   it's one such layer, not many independently-animated ones.

   Recolouring is `background-blend-mode: color` between a solid gradient layer and the photo, in the same
   `background-image` list (no extra DOM needed for the duotone effect itself) — the standard duotone-photo
   technique: it takes only the gradient's hue/saturation and keeps the photo's own lightness (board edges,
   grain, highlights) intact. A second, gentler `soft-light` pass on `.lmdf-parallax::after` nudges lightness
   too, which is what keeps a close-hue finish (dub-kataniya, astana) reading as *tinted* rather than "the
   same photo again" — see the git history for the flat-colour-only version this replaced, which had exactly
   that problem.

   **The scrim exists but is deliberately light, on request** — a real photograph has both light patches (a
   pale board face) and dark ones (the shadow between sheets, a board's cut edge) that can land directly
   under text with no card behind it, so some scrim is structurally necessary. `.section--dark`/`.cta-
   section`/`.site-footer` get the sitewide `--shell-scrim-rgb` token at the *same* 0.72 alpha
   `.hero`/`.process`/`.cta-section` already scrim their own photos at (not a heavier one — an earlier pass
   pushed this to 0.97 to hit a clean 4.5:1 everywhere, which left the photo barely visible under what still
   read as the old flat section colour; matching the sitewide precedent instead makes the photo actually
   read as each section's background, which was the explicit ask). The pulp sections get a mirrored light
   scrim (`rgba(232,228,220,0.6)`) in the other direction. `text-shadow` (inherited from each section's
   `.container`, so it reaches every bare text node for free) is the compensating layer: a drop shadow lifts
   text off a busy photo without hiding the photo the way more scrim opacity would.

   Known, accepted trade-off: at this scrim strength, a handful of bare-text elements with no opaque card
   behind them (`#process .pflow-lead`, `#certificates .stat-label`) sample under 4.5:1 by strict WCAG
   luminance math, something the text-shadow compensates for perceptually but doesn't fix numerically. This
   was a deliberate call, not an oversight — the alternative (this session's first pass) pushed scrim past
   0.9 to hit 4.5:1 everywhere, which visibly defeated the point of putting a photo there at all (see git
   history / the design conversation this came out of). If stricter WCAG compliance matters more than the
   photo staying visible, the fix is a heavier per-element scrim or an opaque pill behind just those labels
   — not a blanket scrim increase back toward the earlier version.

   Hex values are duplicated in three places by necessity — `FINISHES` in `assets/mdf-stack.js` (an ES
   module), `PALETTE_HEX` in `script.js` (a plain IIFE, can't import from a module), and the
   `[data-lmdf="..."]` custom-property rules in `style.css` — keep all three in sync by hand if a finish's
   colour ever changes.

**Process section — "the delivery line"** (`.process-flow`, `.pflow-*`, `#process`). Ported from a Claude
Design file (project `4c58dab7-4fc7-486a-9fef-2b775d0c5b7d`, `Production Process.dc.html`; read it with the
DesignSync tool, its share URL 403s to a plain fetch). A DECOSTAR truck arrives at the inbound gate,
unloads three rolls of base paper and leaves, while four line stations — rotogravure, melamine bath, hot
press, lab bench — run their own machinery and each of the five step cards lights in turn. Between the
band and the cards runs the **checkpoint rail** (`.pflow-checks`): five markers that count from a number
to a spinner to a stamped check as the batch clears each stage, on a filling progress bar. Unlike
everything else on the line the checks *latch* — a signed-off stage stays stamped until the next batch
restarts the cycle — which is what makes the rail read as accumulated progress rather than another row of
blinking lights. (It replaced the five plain `.pflow-node` diamonds this slot used to hold; that class is
gone.) All CSS keyframes and inline SVG: no images, no library, no canvas.

Four invariants, all easy to break by accident:

1. **One clock.** `--pflow-cycle` (9s) drives the truck, rolls, status flags, checkpoint rail and card
   highlights together — retime one of them alone and the truck starts arriving out of step with the card
   that announces it. The station machinery deliberately runs on its own short loops (a press stroke, a
   spinning cylinder); those read as continuous plant noise, and tying them to the cycle would make a
   press stroke absurdly slow. The checkpoint spinners are the same split: a cycle-long fade for *which*
   stage is working, plus their own 0.9s `pflow-ck-turn` rotation.
2. **`.is-running` is what attaches the keyframes at all.** `initProcessLine()` adds it when the section
   scrolls in and *removes* it when it leaves — unlike the kinetic counters, this observer is not
   one-shot, because two dozen infinite animations would otherwise keep the compositor awake for the rest
   of the page. It is still added under `prefers-reduced-motion`; style.css pauses those same animations
   on a frame 20% into the cycle (truck arrived, first roll down, step 01 live). Withholding the class
   there would leave an empty band with the truck parked off-canvas.
3. **Colour goes through the `--pf-*` aliases**, which resolve to existing site tokens — that is what makes
   the day/night toggle repaint the whole line for free. Two exceptions are deliberate: `--pf-accent-line`
   (strokes) is the lighter eyebrow cyan, not `--registration-cyan`, which reads as a dark smudge at 1.2px
   on the night shell; and `--pf-tyre`/`--pf-tyre-mark` stay dark in both themes, since `--pf-ink` is
   pulp-white on night and gave the truck white tyres.
4. **Geometry is percentages** (stations at 30/50/70/90%, checkpoints at 10/30/50/70/90%, cards at
   fifths), so the line stays registered with the cards at every width. Below 900px the band and the
   checkpoint rail are hidden outright and the cards go two-up, then one-up at 560px — the cards carry
   the same content as text. The checkpoint markers are opaque (`--shell-bg`, the section's own base
   colour in both themes) because each one has to mask the rail running under it.

The blueprint corner marks on each card are eight gradient layers on one `::after`, not the design's four
`<i>` elements per card — same registration-mark language the `.eyebrow` crosshair already speaks, without
twenty empty nodes in the markup.

Do not add a showpiece to every section — the design brief for this project explicitly calls for *one bold
moment per major section slot* (the MDF stack in the hero, the delivery line in process, Cover Flow in the
decor catalog) and quiet, disciplined motion everywhere else (progressive fade/translateY reveals,
grayscale→color logo hovers, kinetic counters). The sticky LMDF board + per-section parallax (above, under
the hero section) is the deliberate exception: it's the hero's own motif and its own photo continuing
behind every section rather than a new showpiece competing with each section's existing one.

**Client marquee** (`.logo-marquee`, `#clients`): the "trusted by" list drifts right-to-left forever
instead of sitting still, with **every second logo set darker** (`opacity: .78` against the base `.5`) so
the belt has a rhythm rather than reading as one uniform grey line. Four copies of the five clients form a
single **flat** run of 20 spans in the track — not four nested rows — and the track travels exactly one
copy plus one gap, so a copy always lands where the previous one began and the loop has no seam. Three
invariants hold it together and all are easy to break by accident:

1. The track must stay flat. The alternation is `:nth-child(even)` on the track, and five clients is an
   **odd** count, so nth-child scoped per copy would restart the pattern at every seam and put two light
   logos side by side. Flat, the parity carries through the wrap. (A given client therefore alternates
   between passes — that's the intent, not a glitch.)
2. `--marquee-copies` in `style.css` must equal how many times the list is repeated in `index.html`, since
   the keyframe's step is `(100% + gap) / copies`.
3. `(copies − 1) × copy width` must exceed the container width, or a hole opens at the right edge partway
   through the cycle. Five short client names give a ~770px copy against a 1200px container, which is why
   it takes four copies and not the usual two.

The repeats are `aria-hidden` so the five clients are announced once. Hover pauses the belt (hover-capable
pointers only, matching the per-logo hover rule), and `prefers-reduced-motion` stops the track and hides
the repeats (`:nth-child(n+6)`), landing back on the plain centered row the section used to have — the sitewide reduced-motion
rule alone would leave the track parked mid-travel, so that case is spelled out explicitly.

**Registration-mark eyebrow device** (`.eyebrow` + `.crosshair`): a small crosshair + mono-font label
before every section heading, standing in for generic "eyebrow" labels. Numbering (`01`/`02`/...) is
reserved for the production-process section only, because that's the one place content is a real
sequence — do not add numbering to the advantages grid or other parallel (non-sequential) lists.

**Decor catalog — Cover Flow** (`.decor-grid`, `initDecorCoverflow` block in `script.js`): the catalog is a
3D Cover Flow. The centre card faces the reader at full size; neighbours rotate toward it, scale down,
recede and dim with distance. This is now the decor section's bold moment — the Layer Press dog-ear
(`.decor-card__corner`) is still on the cards but reads as the card-level detail underneath it.

The whole thing is driven by `scrollLeft` and nothing else: no current index, no gesture handling, no
carousel state. A swipe, a trackpad, the prev/next buttons, click-to-centre and scroll-snap all feed the
same number, so nothing can drift out of sync, and with JS off or `prefers-reduced-motion` set it is
simply the flat snap scroller the markup describes. Three traps are already paid for — don't re-introduce
them:

1. **Never move a card horizontally with `transform`.** CSS scroll-snap measures the *transformed* border
   box, so a sideways pull moves the snap points with the card: the rail then settles with no card
   centred, and click-to-centre feeds its own output back in and never converges. Cards are packed via
   `--decor-overlap` (negative margins, i.e. layout) for exactly this reason. Scale and rotation are safe
   because they leave the box's centre in place.
2. **Rotation saturates at one card out** (`Math.min(1, a)`). Scaled linearly, cards beyond two units
   cross 90° and show their back faces.
3. **`--decor-overlap` is gated behind `.is-coverflow`**, added by JS only when motion is allowed. The
   overlap only makes sense once cards are rotated and scaled down to tuck under each other; on flat
   full-size cards it just hides half of each one.

Measure spacing with `decorStep()` (from `offsetLeft`), never from `--decor-card-w` + gap — the negative
margins mean the two disagree. And anything the layout function sets on a card (transform, opacity,
z-index, `.is-decor-focus`, `data-decor-offset`) has to be cleared again in its filtered-out branch, or a
card hidden while centred keeps its focus shadow forever.

The filter's exit animation is now a fade only, not the old fade-and-settle: `transform` belongs to the
coverflow and can't be shared with a CSS class.

**Sustainability cards** (`.sustain-card`) carry the one hover in the light sections: a 2px registration
rule along the top edge — a short kraft tab at rest, drawn to full width in `--registration-cyan` on hover
— plus a 3px lift, a lighter surface and a warm shadow. It is deliberately *not* a fourth showpiece; it's
the "quiet, disciplined motion" tier, reusing the registration-mark language rather than inventing a new
motif. Their surface is `--raw-pulp-dark`, which is one step darker than it looks like it should be for a
reason: `--raw-pulp` is the same hex as the day theme's `#sustainability` tint, so at that value the cards
vanish into the section in day theme. `--raw-pulp-dark` separates in both directions — lighter than the
night section, darker than the day one — and is about as dark as the surface can go while `--ink-grey`
body copy still clears AA (5.3:1).

**Footer is a "colophon"**, not a generic three-column footer — mono-font production specs
(`.colophon`) above the standard nav/contact columns, styled after a print-industry colophon block.

**Header** is a translucent light bar (`rgba(247,245,241,0.7)` + `backdrop-filter: blur`), not a solid
dark bar — it sits on request at 70% opacity over both the dark hero and the light sections below, so its
text color is `--press-black` (not `--pulp-white`). Nav links and the logo underline on hover
(`text-decoration: underline` on `:hover`, not just an opacity change).

**Anti-cliché constraints** (from the design skill critique in research §03, don't reintroduce these):
- No warm-cream (`#F4F1EA`-style) background paired with a contrast serif display font.
- No single near-black page with exactly one bright accent color — this site deliberately has both light
  and dark sections and two functionally distinct accents (`--kraft-brown` for brand, `--registration-cyan`
  for interaction).

## i18n pattern (RU / EN / UZ-Latin)

All three languages live in the DOM simultaneously as sibling `<span data-i18n-lang="ru">` / `<span
data-i18n-lang="en">` / `<span data-i18n-lang="uz">` elements; visibility is toggled purely by CSS
(`html[lang="ru"|"en"|"uz"] [data-i18n-lang="..."] { display: inline }`), so it works even before
`script.js` runs. The language switch itself lives in the header only: a compact menu button
(`.lang-current`, showing the active code) that opens a small list of all three options
(`.lang-list` > `.lang-option`, `data-lang-set="ru|en|uz"`). It replaced an always-visible 3-segment
control because that was ~65px wider — too wide for the header's logo and action islands to be equal
widths (`.header-inner` is a `1fr auto 1fr` grid; the header collapses to the hamburger layout at
1120px for the same reason). `script.js`'s `applyLang()`
flips `<html lang>`, marks the matching `.lang-option` as `.is-active`, persists the choice to
`localStorage`, and updates the handful of things CSS can't reach: `<title>`, `<meta
name="description">` (see the `META` object in `script.js`), the CTA form's post-submit status message
(`CTA_STATUS_MESSAGE`), and `<option>` text (see gotcha below).

**Gotcha:** `<option>` elements cannot contain child elements (the content model is text-only), so decor
category `<option>`s carry `data-ru`/`data-en`/`data-uz` attributes instead of nested spans, and
`script.js`'s `applyLang()` rewrites `option.textContent` from `opt.dataset[lang]` directly. Follow this
pattern for any new `<select>` — don't nest `<span data-i18n-lang>` inside an `<option>`, it renders
broken/invalid HTML.

**Gotcha (learned the hard way):** don't try to add a language across the whole page with a scripted
global find-and-replace — several short phrases (e.g. "Дерево", "ESG") repeat verbatim in multiple
unrelated places (nav vs. footer vs. filter buttons vs. `<option>`), so a non-unique string match will
insert translations in the wrong spot or duplicate blocks. Add new language spans with targeted,
one-at-a-time edits anchored on enough surrounding context to be unique, not a blanket substitution pass.

When adding new translatable copy, always add all three spans together — there's no fallback/missing-key
handling, an element missing a language's span will simply be blank in that language. A few accessibility
attributes (`aria-label` on the mobile nav, the decor-filter group, the hero MDF-stack illustration) are still
Russian-only regardless of active language — a known gap, not a bug, if you have time to close it follow
the `META`-object pattern used for title/description.

Uzbek copy in this project is a good-faith machine-quality translation (written by Claude, not reviewed by
a native speaker) — flag it for native review before treating it as final, same as the other content
placeholders below.

## Content placeholders

Most content is intentionally a placeholder pending real data from the mill (see PRD.md §5 for the full
list): decor images/names beyond the one real wood-texture photo, certificate badges, company stats
(tonnage/years/countries), client logos, social links (Instagram/Telegram/LinkedIn point to `#`), and the
catalog/sustainability PDFs. Don't treat any of these as real when reasoning about the business — they're
structural placeholders, not approved copy.

Production contacts/geography (footer, §3.10) ARE real: Tashkent, Uzbekistan; export to Uzbekistan's
regions and neighbouring countries; phone +998 99 000 00 00. The sales email is still a placeholder
domain. The Uzbek (UZ-Latin) translation of all copy is machine-quality, not reviewed by a native
speaker — treat it the same as other placeholders needing sign-off before a real launch.
