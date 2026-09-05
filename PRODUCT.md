# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Three B2B roles at particleboard/MDF, furniture, and flooring manufacturers, all arriving with a specific
sourcing task rather than browsing:

- **Technologist / production engineer** — evaluates technical characteristics, the decor range, and
  conformance to standards.
- **Procurement / supply buyer** — compares suppliers on price, lead time, delivery terms, and certificates.
- **Owner or director of a smaller manufacturer** — judges the mill's credibility and scale from the first
  screen before delegating.

Shared trait: they value speed and clarity over visual effect, and they are evaluating whether this mill is
worth contacting at all.

## Product Purpose

A trilingual (RU / EN / UZ-Latin) B2B marketing site for DECOSTAR, a decor-paper mill producing decorative
paper for lamination onto particleboard and MDF.

The site has 60–90 seconds to convince a technologist or buyer that the mill is competent, and to convert
that into a sample request. Success is a submitted **"Request a sample"** enquiry; browsing the decor
catalogue is the secondary path.

## Positioning

A full-cycle decor-paper mill operating in Tashkent, Uzbekistan, serving Uzbekistan's regions and
neighbouring countries — a regional supplier positioned against distant European incumbents (Schattdecor,
Interprint, Lamigraf) on proximity, lead time, and willingness to customise decors for the customer, rather
than on catalogue scale.

Trilingual RU / EN / UZ-Latin coverage is itself part of the position: the audience spans Russian-speaking
procurement, Uzbek-language local industry, and English-language export contacts.

## Operating Context

- Buyers evaluate suppliers by requesting **physical decor samples** — the site's job is to make that
  request effortless, not to close a sale online.
- Decors are identified by **code** (e.g. `WD-114`) and grouped into four industry-standard categories:
  wood grain, stone/concrete, textile/abstract, and unicolors.
- The real production sequence is: raw stock → design and colour separation → rotogravure printing → resin
  impregnation → drying → pressing onto particleboard/MDF → quality control → packing and logistics. This
  is a genuine ordered sequence, which is why it is the one place in the product where step numbering is
  meaningful.
- Buyers also expect a downloadable PDF catalogue as a self-service path alongside the sample request.

## Capabilities and Constraints

- **Product line is decor paper only.** Impregnated paper and finish foil are explicitly out of scope and
  must not be presented as offerings.
- **Trilingual RU / EN / UZ-Latin**, with all three languages present in the DOM simultaneously and toggled
  by CSS, so language works before scripts run.
- **Static site**: plain HTML/CSS/JS with no build step, no framework, and no test suite. GSAP/ScrollTrigger
  and three.js load from CDN with non-JS fallbacks.
- Deployment target is Vercel; the `deploy/` directory is a separate, manually synced copy of the root files.
- **Out of scope:** partner login/account area, full 3D decor configurator, product lines beyond decor
  paper, and languages beyond RU/EN/UZ.
- Site-wide **day/night theme** toggle, persisted per visitor.

## Brand Commitments

- Name **DECOSTAR**, used as the mill's identity throughout.
- **Trilingual parity is non-negotiable** (confirmed as binding this session): every piece of copy must
  exist in all three languages. An element missing a language is a defect, not a gap — there is no
  fallback or missing-key handling.
- Typography must cover **Cyrillic**; any display face without Cyrillic glyphs is disqualified regardless
  of aesthetic fit. (This already eliminated one candidate face during implementation.)
- Existing visual system — palette tokens, the "Layer Press" motif, and the registration-mark device — is
  recorded in `CLAUDE.md` and `research/03_design_direction.md`, not here. Those are design authority, and
  `PRD.md` §3.0 is partly out of date relative to the shipped code.

## Evidence on Hand

**Confirmed real:**

- **Production location and geography** — Tashkent, Uzbekistan; export to Uzbekistan's regions and
  neighbouring countries.
- **Decor sample photography** — `assets/img/Papers/` (ABANOZ, ACIK KOK, ACIK HARELI CEVIZ, Uludag Mese,
  Belaya Korona, Dub Votan and others) are genuine samples from the mill's actual range, as are the derived
  card crops in `assets/img/process-flow/`.

**Not confirmed — must not be presented as fact:**

- **Phone `+998 99 000 00 00`** — *not* confirmed real this session, despite `PRD.md` §5 asserting that
  contacts are already real. Treat as a masked placeholder until the mill supplies a reachable number, and
  correct PRD.md when it is.
- Sales email (`…@decostar-decor.example`) — placeholder domain.
- Company figures (tonnes/year, years in business, countries served, catalogue size), certificate badges,
  client/partner logos, social links (currently `#`), and the catalogue and sustainability PDFs.
- The **Uzbek translation is machine-quality**, written without a native speaker, and requires review
  before launch.

The project is a **real client engagement heading to launch**, so these placeholders are awaiting genuine
data from the mill — not decorative filler. Nothing in this list may be replaced with invented values.

## Product Principles

1. **Answer the buyer's question before expressing anything.** The audience arrives with a sourcing task;
   clarity and speed outrank visual ambition on every screen.
2. **The sample request is the product's success.** Every section either builds the credibility that earns
   that request or removes friction from making it.
3. **Placeholders stay visibly provisional.** Unsupplied data is never dressed up as real; fabricating a
   figure, a certificate, or a client would damage a real mill's credibility.
4. **Three languages, one product.** Copy, layout, and components are designed for the longest of the three
   languages, not retrofitted after the Russian version fits.
5. **Ground the design in the real object.** Paper, print registration, resin, and pressed board are the
   product's actual materials; the visual language earns its authority by referring to them rather than to
   generic industrial styling.

## Accessibility & Inclusion

- WCAG **AA** contrast is a standing requirement, verified against composited rendering rather than token
  values where surfaces are translucent.
- `prefers-reduced-motion` must be honoured explicitly per component; the site relies on scroll and hover
  motion heavily enough that a blanket duration override is insufficient.
- Semantic HTML with a correct heading order, and no reliance on JavaScript for language selection or
  core content.
- **Known gap:** a few `aria-label` attributes (mobile nav, decor filter group, hero illustration) remain
  Russian-only in all three languages.
