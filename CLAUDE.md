# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

STARWOOD — a bilingual (RU/EN) B2B marketing site for a decor-paper mill (decorative paper for
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
- `script.js` — single IIFE, no modules/bundler. Independent feature blocks: language toggle, mobile nav,
  scroll-reveal, decor filter, kinetic counters, CTA form, the "layer press" signature animation, and the
  process ScrollTrigger scene.
- `assets/fonts.generated.css` + `assets/fonts/*.woff2` — self-hosted, subsetted (cyrillic + latin only)
  webfonts. Linked directly in `<head>` (not `@import`-ed from `style.css`) so the browser preloader fetches
  it in parallel with `style.css` instead of discovering it late.
- `assets/img/` — responsive WebP+JPEG pairs derived from the one real photo asset
  (`driftvud_1280x800.jpg`, a wood-grain decor texture). Everything else in the decor catalog is a CSS
  gradient placeholder (see "Content placeholders" below).
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
the site is RU/EN only.

### Running locally

No dev server config. Any static file server works:

```bash
python3 -m http.server 8123
```

Verified working via Playwright (`pip3 install --user playwright && python3 -m playwright install chromium`)
in the prior session — no chromium-cli/node toolchain in this environment.

## Design system — keep new work consistent with this

Full rationale in `research/03_design_direction.md`. Summary of the tokens (all in `style.css :root`):

| Token | Hex | Role |
|---|---|---|
| `--press-black` | `#1E1A17` | Dark sections: hero, process, footer |
| `--kraft-brown` | `#845036` | Brand accent (CTA, brand blocks) — fixed by the original brief, do not change |
| `--raw-pulp` | `#E8E4DC` | Light section background — deliberately *not* a warm cream (see cliché note) |
| `--registration-cyan` | `#1C8CA0` | Interactive/working accent (links, active states, eyebrow labels) |
| `--ink-grey` | `#4A433C` | Body text on light backgrounds |
| `--pulp-white` | `#F7F5F1` | Card surfaces on top of raw-pulp |

Typography: **PT Sans Narrow** (display/headings) + **IBM Plex Sans** (body) + **IBM Plex Mono** (decor
codes, stage numbers, eyebrow labels, form labels). Big Shoulders was the original display-font choice in
the design plan but was dropped during implementation because it has no Cyrillic glyphs — PT Sans Narrow
(ParaType) both solves that and fits the brief better (a Russian type foundry's industrial narrow grotesk
for a Russian mill). If you add new display text, verify Cyrillic coverage before picking a typeface.

**Signature motif — "The Layer Press."** One recurring visual idea (kraft paper + printed decor + resin
overlay stacking/compressing into a plate), used in exactly three places and nowhere else:
1. Hero load animation (`#layer-press`, `.layer-press.is-pressed`)
2. Production-process pinned scroll scene (`.stack-bar`, `.process-stage`)
3. Decor-card hover (`.decor-card__corner` — a small "dog-ear" at rest that lifts fully on hover)

Do not add a fourth use of this motif or a competing signature animation elsewhere on the page — the
design brief for this project explicitly calls for *one* bold moment and quiet, disciplined motion
everywhere else (progressive fade/translateY reveals, grayscale→color logo hovers, kinetic counters).

**Registration-mark eyebrow device** (`.eyebrow` + `.crosshair`): a small crosshair + mono-font label
before every section heading, standing in for generic "eyebrow" labels. Numbering (`01`/`02`/...) is
reserved for the production-process section only, because that's the one place content is a real
sequence — do not add numbering to the advantages grid or other parallel (non-sequential) lists.

**Footer is a "colophon"**, not a generic three-column footer — mono-font production specs
(`.colophon`) above the standard nav/contact columns, styled after a print-industry colophon block.

**Anti-cliché constraints** (from the design skill critique in research §03, don't reintroduce these):
- No warm-cream (`#F4F1EA`-style) background paired with a contrast serif display font.
- No single near-black page with exactly one bright accent color — this site deliberately has both light
  and dark sections and two functionally distinct accents (`--kraft-brown` for brand, `--registration-cyan`
  for interaction).

## i18n pattern

Both languages live in the DOM simultaneously as sibling `<span data-i18n-lang="ru">`/`<span
data-i18n-lang="en">` elements; visibility is toggled purely by CSS (`html[lang="ru"|"en"]
[data-i18n-lang="..."] { display: inline }`), so it works even before `script.js` runs. `script.js` only
flips `<html lang>`, persists the choice to `localStorage`, and updates a few things CSS can't reach
(`<title>`, `<meta name="description">`, and `<option>` text — see gotcha below).

**Gotcha:** `<option>` elements cannot contain child elements (the content model is text-only), so decor
category `<option>`s carry `data-ru`/`data-en` attributes instead of nested spans, and `script.js`'s
`applyLang()` rewrites `option.textContent` directly. Follow this pattern for any new `<select>` — don't
nest `<span data-i18n-lang>` inside an `<option>`, it renders broken/invalid HTML.

When adding new translatable copy, always add both spans together — there's no fallback/missing-key
handling, an element without both language spans will simply be blank in one language.

## Content placeholders

Most content is intentionally a placeholder pending real data from the mill (see PRD.md §5 for the full
list): decor images/names beyond the one real wood-texture photo, certificate badges, company stats
(tonnage/years/countries), client logos, contact details/address, and the catalog/sustainability PDFs.
Don't treat any of these as real when reasoning about the business — they're structural placeholders, not
approved copy.
