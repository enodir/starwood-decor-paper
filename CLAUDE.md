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
weight against the LCP budget that matters most for B2B buyers (see research §2).

- `index.html` — the entire page, all ten PRD sections in one file.
- `style.css` — single stylesheet. Design tokens as CSS custom properties at the top; sections follow in
  page order.
- `script.js` — single IIFE, no modules/bundler. Independent feature blocks: language switch, mobile nav,
  scroll-reveal, decor filter, kinetic counters, CTA form, the "layer press" signature animation, and the
  process ScrollTrigger scene.
- `assets/fonts.generated.css` + `assets/fonts/*.woff2` — self-hosted, subsetted (cyrillic + latin only —
  Uzbek Latin uses the latin subset) webfonts. Linked directly in `<head>` (not `@import`-ed from
  `style.css`) so the browser preloader fetches it in parallel with `style.css` instead of discovering it
  late.
- `assets/img/` — responsive WebP+JPEG pairs derived from real photo assets: `driftvud_1280x800.jpg` (wood-grain
  decor texture, used in the decor catalog), `uludag-mese-bg.jpg` (oak wood-grain, the sitewide texture
  backdrop — see `--bg-texture` in `style.css`), `hero-decor-swatches-{768,1920}.jpg` (fanned laminate/veneer
  sample photo, hero-section background — see `--hero-bg-photo`; "Samples of Wooden Floor" by cottonbro
  studio via Pexels, free for commercial use, no attribution required), and `hero-swatch-{1..4}-{480,960}.
  {webp,jpg}` (the four Swatch Float cards — square center-crops of real mill samples from
  `assets/img/Papers/` via a one-off Pillow script, not yet re-run as a documented pipeline step below).
  Everything else in the decor catalog is a CSS gradient placeholder (see "Content placeholders" below).
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

It used to also drive the production-process pinned scroll scene (`.stack-bar`, staircase-highlighting in
step with `.process-stage`), but that was replaced by `.process-flow-img` — a per-language animated GIF
diagram (`assets/img/process-flow/process-flow-{ru,en,uz}.gif`, swapped by `applyLang` in script.js, with a
static PNG fallback per language for `prefers-reduced-motion`). `.process-stage` (the numbered text list)
is unchanged and still drives scroll-linked activation via `initProcessScene()`; it just no longer also
toggles a `.stack-bar` sibling since that element is gone.

It no longer appears in the hero — that slot was deliberately handed to a different motif, **"Swatch
Float"** (`#swatch-float`, `.swatch-card`, `assets/img/hero-swatch-{1..4}-{480,960}.{webp,jpg}` sourced
from `assets/img/Papers/`): four real paper-sample photos that settle into a loose scatter on load
(interruptible CSS transition, staggered 70ms per card) and then drift with an independent, slow
ease-in-out bob per card (`--ease-in-out`, 7.5–9s cycles, distinct delays) so the motion reads as organic
rather than synced. Modeled after the floating hero preview cards on tasteskill.dev, re-themed with this
site's own assets, radius (`--radius-card`, not tasteskill's rounder 18px), and shadow language.

Do not add a showpiece to every section — the design brief for this project explicitly calls for *one bold
moment per major section slot* (Swatch Float in the hero, the animated process-flow-img diagram in
process, Layer Press on decor cards) and quiet, disciplined motion everywhere else (progressive
fade/translateY reveals,
grayscale→color logo hovers, kinetic counters).

**Registration-mark eyebrow device** (`.eyebrow` + `.crosshair`): a small crosshair + mono-font label
before every section heading, standing in for generic "eyebrow" labels. Numbering (`01`/`02`/...) is
reserved for the production-process section only, because that's the one place content is a real
sequence — do not add numbering to the advantages grid or other parallel (non-sequential) lists.

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
`script.js` runs. The language switch itself is a 3-button segmented control (`.lang-switch` /
`.lang-option`, `data-lang-set="ru|en|uz"`) in both the header and the footer — not a single
toggle/cycle button, which stopped scaling once a third language was added. `script.js`'s `applyLang()`
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
attributes (`aria-label` on the mobile nav, the decor-filter group, the swatch-float illustration) are still
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
