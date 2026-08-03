(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Language switch: RU / EN / UZ ---------- */
  var LANG_KEY = 'decostar-lang';
  var LANGS = ['ru', 'en', 'uz'];
  var html = document.documentElement;
  var langOptionButtons = document.querySelectorAll('.lang-option');

  var META = {
    ru: {
      title: 'DECOSTAR — Декоративная бумага для ламината ДСП/МДФ',
      description: 'DECOSTAR производит декоративную бумагу для ламинирования ДСП и МДФ: коллекции декоров, контроль качества, поставка образцов.'
    },
    en: {
      title: 'DECOSTAR — Decor Paper for Particleboard & MDF Laminate',
      description: 'DECOSTAR manufactures decor paper for particleboard and MDF lamination: decor collections, quality control, sample requests.'
    },
    uz: {
      title: "DECOSTAR — DSP va MDF laminati uchun dekorativ qog'oz",
      description: "DECOSTAR DSP va MDF laminatsiyasi uchun dekorativ qog'oz ishlab chiqaradi: dekor to'plamlari, sifat nazorati, namuna so'rovlari."
    }
  };

  function applyLang(lang) {
    if (LANGS.indexOf(lang) === -1) lang = 'ru';
    html.setAttribute('lang', lang);
    html.setAttribute('data-lang', lang);
    document.title = META[lang].title;
    var metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', META[lang].description);
    langOptionButtons.forEach(function (btn) {
      btn.classList.toggle('is-active', btn.dataset.langSet === lang);
    });
    document.querySelectorAll('option[data-ru]').forEach(function (opt) {
      opt.textContent = opt.dataset[lang] || opt.dataset.ru;
    });
    try { localStorage.setItem(LANG_KEY, lang); } catch (e) {}
  }

  var savedLang = null;
  try { savedLang = localStorage.getItem(LANG_KEY); } catch (e) {}
  applyLang(LANGS.indexOf(savedLang) !== -1 ? savedLang : 'ru');

  langOptionButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var lang = btn.dataset.langSet;
      if (lang === html.getAttribute('lang') || reduceMotion) {
        applyLang(lang);
        return;
      }
      /* Blur/dim veil masks the instant text swap (~50 scattered nodes,
         no single element to crossfade) — see body.is-lang-switching. */
      document.body.classList.add('is-lang-switching');
      setTimeout(function () {
        applyLang(lang);
        requestAnimationFrame(function () {
          document.body.classList.remove('is-lang-switching');
        });
      }, 140);
    });
  });

  /* ---------- Day/night theme ---------- */
  var THEME_KEY = 'decostar-theme';
  var themeToggle = document.getElementById('theme-toggle');

  function applyTheme(theme) {
    if (theme !== 'day' && theme !== 'night') theme = 'night';
    html.setAttribute('data-theme', theme);
    if (themeToggle) themeToggle.setAttribute('aria-pressed', theme === 'day' ? 'true' : 'false');
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}
  }

  var savedTheme = null;
  try { savedTheme = localStorage.getItem(THEME_KEY); } catch (e) {}
  applyTheme(savedTheme === 'day' ? 'day' : 'night');

  if (themeToggle) {
    themeToggle.addEventListener('click', function () {
      applyTheme(html.getAttribute('data-theme') === 'day' ? 'night' : 'day');
    });
  }

  /* ---------- Mobile nav ---------- */
  var navToggle = document.getElementById('nav-toggle');
  var mainNav = document.getElementById('main-nav');
  if (navToggle && mainNav) {
    var closeNav = function () {
      mainNav.classList.remove('is-open');
      navToggle.setAttribute('aria-expanded', 'false');
    };
    navToggle.addEventListener('click', function () {
      var isOpen = mainNav.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', String(isOpen));
    });
    mainNav.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', closeNav);
    });
    /* Close on outside click/tap or on scroll — an absolutely positioned
       menu left open otherwise sits on top of the page content. */
    document.addEventListener('click', function (e) {
      if (mainNav.classList.contains('is-open') && !mainNav.contains(e.target) && e.target !== navToggle) {
        closeNav();
      }
    });
    window.addEventListener('scroll', function () {
      if (mainNav.classList.contains('is-open')) closeNav();
    }, { passive: true });
  }

  /* ---------- Progressive reveal (IntersectionObserver, no GSAP dependency) ---------- */
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function (el) { revealObserver.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ---------- Decor catalog carousel ----------
     Prev/next buttons drive the same horizontal scroller a trackpad or
     touch swipe would — buttons just call scrollBy, scroll-snap (see
     .decor-grid) handles landing on a card edge either way. The Cover Flow
     3D layer below rides on top of that same scroll position; it never
     takes over scrolling, which is why swipe, trackpad, the buttons and
     scroll-snap all keep working untouched. */
  var decorGrid = document.getElementById('decor-grid');
  var decorNavButtons = document.querySelectorAll('[data-decor-nav]');

  function updateDecorNav() {
    if (!decorGrid) return;
    var maxScroll = decorGrid.scrollWidth - decorGrid.clientWidth;
    decorNavButtons.forEach(function (btn) {
      if (btn.dataset.decorNav === 'prev') {
        btn.disabled = decorGrid.scrollLeft <= 1;
      } else {
        btn.disabled = decorGrid.scrollLeft >= maxScroll - 1;
      }
    });
  }

  if (decorGrid) {
    decorNavButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var direction = btn.dataset.decorNav === 'prev' ? -1 : 1;
        /* One card per press, not one screenful: in Cover Flow the centre
           card is the subject, so the buttons step the subject along. */
        var step = decorStep();
        decorGrid.scrollBy({
          left: direction * step,
          behavior: reduceMotion ? 'auto' : 'smooth'
        });
      });
    });

    var decorNavTicking = false;
    decorGrid.addEventListener('scroll', function () {
      if (decorNavTicking) return;
      decorNavTicking = true;
      requestAnimationFrame(function () {
        updateDecorNav();
        layoutCoverflow();
        decorNavTicking = false;
      });
    }, { passive: true });

    window.addEventListener('resize', function () {
      updateDecorNav();
      layoutCoverflow();
    });
    updateDecorNav();
  }

  /* ---------- Decor catalog: Cover Flow ----------
     Each card is rotated, scaled and pushed back in proportion to how far
     its centre sits from the centre of the scroller. That's the whole
     model — there is no carousel state, no current index, no gesture
     handling. Position comes from scrollLeft, which the browser already
     manages, so a swipe, a trackpad, the prev/next buttons and scroll-snap
     all feed the same number and nothing can drift out of sync.

     The card's own width is the unit of distance, so the look is identical
     at every breakpoint even though card width isn't.

     Not applied when the user prefers reduced motion: rotating slabs
     swinging past on every scroll is exactly the kind of motion that rule
     exists for. Without it (and without JS) the section is still the plain
     snap scroller the markup describes. */
  var DECOR_MAX_ROT = 44;      /* deg, at one card-width from centre */
  var DECOR_MAX_DEPTH = 180;   /* px pushed back, same distance */
  var DECOR_MIN_SCALE = 0.68;
  /* Neighbours dim, they don't ghost. Fading them hard made the rail look
     like a stack of transparencies rather than physical sample cards; the
     depth and rotation already say "further away". The floor exists so the
     cards nearest the scroller's clipped edges dissolve instead of being
     guillotined by the overflow. */
  var DECOR_MIN_OPACITY = 0.25;
  var decorCoverflowCards = [];

  /* Distance between adjacent card centres, measured from layout rather
     than derived from CSS. The cards overlap by a negative margin, so this
     is neither the card width nor the gap; taking it from two real
     offsetLefts means the spacing can be retuned in CSS alone. offsetLeft
     is layout geometry — unaffected by the transforms applied below. */
  function decorStep() {
    var seen = null;
    for (var i = 0; i < decorCoverflowCards.length; i++) {
      var el = decorCoverflowCards[i];
      if (el.style.display === 'none') continue;
      if (seen) return el.offsetLeft - seen.offsetLeft;
      seen = el;
    }
    return seen ? seen.offsetWidth : decorGrid.clientWidth * 0.9;
  }

  function layoutCoverflow() {
    if (!decorGrid || reduceMotion) return;
    var box = decorGrid.getBoundingClientRect();
    var mid = box.left + box.width / 2;
    /* Spacing between adjacent card centres, so d === 1 means "exactly one
       card away from the middle" at any breakpoint. */
    var unit = decorStep();
    if (!unit) return;

    for (var i = 0; i < decorCoverflowCards.length; i++) {
      var card = decorCoverflowCards[i];
      if (card.style.display === 'none' || card.classList.contains('is-filtered-out')) {
        /* Reset everything this function owns, not just the transform — a
           card that was centred when the filter hid it would otherwise keep
           its focus shadow and be counted as the centre card forever. */
        card.style.transform = '';
        card.style.opacity = '';
        card.style.zIndex = '';
        card.classList.remove('is-decor-focus');
        card.removeAttribute('data-decor-offset');
        continue;
      }
      /* offsetLeft, not getBoundingClientRect: the rect is post-transform,
         and this card already carries a transform from the previous frame,
         which would feed its own output back into its input. */
      var centre = box.left - decorGrid.scrollLeft + card.offsetLeft + card.offsetWidth / 2;
      var d = (centre - mid) / unit;
      /* Past ~2.2 cards out the difference is invisible but the maths keeps
         going; clamping stops far-off cards from collapsing to nothing and
         from fighting each other for z-index. */
      var c = Math.max(-2.2, Math.min(2.2, d));
      var a = Math.abs(c);

      /* Rotation saturates at one card out; past that only depth, scale and
         opacity keep receding. That's the Cover Flow look — a wall of side
         cards at a constant angle — and it's also a correctness fix: left
         to scale linearly, cards beyond two units cross 90° and present
         their back faces to the viewer. */
      var rot = (c < 0 ? -1 : 1) * DECOR_MAX_ROT * Math.min(1, a);
      var depth = -a * DECOR_MAX_DEPTH;
      var scale = Math.max(DECOR_MIN_SCALE, 1 - a * 0.2);
      var opacity = Math.max(DECOR_MIN_OPACITY, 1 - a * 0.3);

      /* Order matters: transforms apply right to left — scale, then the
         rotation, then the push back into the scene.

         Note what is NOT here: a sideways pull toward the centre. Packing
         the neighbours in that way is tempting and looks right, but CSS
         scroll-snap computes snap areas from the *transformed* border box,
         so shifting cards horizontally also shifts their snap points; the
         rail then settles between two cards with nothing centred, and
         click-to-centre never converges. The cards are packed in layout
         instead (negative margins, see --decor-overlap in style.css),
         which snap measures correctly. Scale and rotation are safe here
         because they leave the box's centre where it was. */
      card.style.transform =
        'translateZ(' + depth.toFixed(1) + 'px) rotateY(' + rot.toFixed(2) + 'deg) scale(' + scale.toFixed(3) + ')';
      card.style.opacity = opacity.toFixed(3);
      /* Nearest to the middle paints on top, so the rotated neighbours
         tuck behind the card being read rather than over it. */
      card.style.zIndex = String(Math.round(100 - a * 20));

      /* Marks a card as "click me to centre this". The centre card is the
         one already being read, so it gets no pointer affordance. */
      var centred = a < 0.4;
      if (centred) card.removeAttribute('data-decor-offset');
      else card.setAttribute('data-decor-offset', c > 0 ? 'after' : 'before');
      /* The card being read gets a real drop shadow, so it reads as lifted
         off the rail rather than as the same card at a bigger scale. */
      card.classList.toggle('is-decor-focus', centred);
    }
  }

  if (decorGrid) {
    decorCoverflowCards = Array.prototype.slice.call(decorGrid.querySelectorAll('.decor-card'));

    /* Click an off-centre card to bring it in. Native scrolling again — it
       drives the same scrollLeft everything else reads.

       Deliberately NOT scrollIntoView({inline:'center'}): that measures the
       card's *transformed* box, and these cards are pulled inward by the
       coverflow, so it lands short — then the relayout pulls the card in
       again, and it converges somewhere off-centre and never focuses.
       offsetLeft is layout geometry, which transforms don't touch. */
    decorCoverflowCards.forEach(function (card) {
      card.addEventListener('click', function () {
        if (!card.hasAttribute('data-decor-offset')) return;
        decorGrid.scrollTo({
          left: card.offsetLeft + card.offsetWidth / 2 - decorGrid.clientWidth / 2,
          behavior: reduceMotion ? 'auto' : 'smooth'
        });
      });
    });

    /* The class is the switch for everything the coverflow needs from CSS
       — currently the negative margins that pack the cards. Adding it here
       rather than in the markup means no-JS and reduced-motion users never
       get layout that only makes sense once the transforms are running. */
    if (!reduceMotion) decorGrid.classList.add('is-coverflow');

    layoutCoverflow();
    /* Images arrive late and can change card height, which moves nothing
       horizontally but does change the box the transforms are measured
       against — recompute once everything has loaded. */
    window.addEventListener('load', layoutCoverflow);
  }

  /* ---------- Decor catalog filter ---------- */
  var filterButtons = document.querySelectorAll('.decor-filter');
  var decorCards = document.querySelectorAll('.decor-card');
  var decorEmpty = document.querySelector('.decor-empty');

  function applyFilter(category) {
    var visibleCount = 0;
    decorCards.forEach(function (card) {
      if (category === 'all' || card.dataset.category === category) visibleCount++;
    });
    if (decorEmpty) decorEmpty.hidden = visibleCount !== 0;

    if (reduceMotion) {
      decorCards.forEach(function (card) {
        var match = category === 'all' || card.dataset.category === category;
        card.style.display = match ? '' : 'none';
      });
      return;
    }

    /* A filter change reshuffles the whole rail, so the scroller goes back
       to the start — otherwise the surviving cards slide under a scroll
       position that was meaningful for a different set. */
    if (decorGrid) decorGrid.scrollTo({ left: 0, behavior: 'smooth' });

    var enterIndex = 0;
    decorCards.forEach(function (card) {
      var match = category === 'all' || card.dataset.category === category;
      var isHidden = card.style.display === 'none';
      if (match && isHidden) {
        /* Entering: unhide, start from the faded/scaled-down state, force a
           reflow so the browser registers it, then transition to normal —
           staggered a beat apart per card. */
        card.style.display = '';
        card.classList.add('is-filtered-out');
        void card.offsetWidth;
        (function (el, delay) {
          setTimeout(function () { el.classList.remove('is-filtered-out'); }, delay);
        })(card, enterIndex * 40);
        enterIndex++;
      } else if (!match && !isHidden) {
        /* Leaving: fade out, then drop from layout once the transition
           finishes. Guarded in case the same card gets re-matched by a
           rapid second click before the timeout fires. */
        card.classList.add('is-filtered-out');
        setTimeout(function () {
          if (card.classList.contains('is-filtered-out')) card.style.display = 'none';
          /* Dropping a card out of the flow moves every card after it, so
             the 3D layout has to be recomputed once it's actually gone. */
          layoutCoverflow();
        }, 180);
      }
    });

    /* And again after the entering cards have all been released, so the
       last one to arrive lands at its correct depth rather than flat. */
    setTimeout(layoutCoverflow, enterIndex * 40 + 60);
    layoutCoverflow();
  }

  filterButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      filterButtons.forEach(function (b) { b.classList.remove('is-active'); });
      btn.classList.add('is-active');
      applyFilter(btn.dataset.filter);
      if (decorGrid) {
        decorGrid.scrollTo({ left: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
        /* Cards leaving the flow do so on a 180ms fade (see applyFilter) —
           scrollWidth isn't settled until that finishes, so re-check nav
           state after it instead of only on the pre-filter layout. */
        setTimeout(updateDecorNav, 220);
      }
    });
  });

  /* ---------- Kinetic counters ----------
     Ticks at a fixed ~40ms cadence rather than every animation frame, and
     bumps a short-lived CSS class on each digit change — reads as a
     mechanical tally counter (the real batch-count hardware on a production
     line) advancing, not a generic smooth-interpolation count-up. */
  var counters = document.querySelectorAll('[data-count-to]');
  function animateCounter(el) {
    var target = parseFloat(el.dataset.countTo);
    var suffix = el.dataset.countSuffix || '';
    if (reduceMotion) {
      el.textContent = target + suffix;
      return;
    }
    var duration = 1400;
    var tickInterval = 40;
    var start = null;
    var lastVal = null;

    function render(ts) {
      if (!start) start = ts;
      var progress = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      var val = Math.round(target * eased);
      if (val !== lastVal) {
        lastVal = val;
        el.textContent = val + suffix;
        el.classList.remove('is-ticking');
        void el.offsetWidth; /* force reflow so the animation restarts */
        el.classList.add('is-ticking');
      }
      if (progress < 1) {
        setTimeout(function () { requestAnimationFrame(render); }, tickInterval);
      }
    }
    requestAnimationFrame(render);
  }

  if ('IntersectionObserver' in window) {
    var counterObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          counterObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { counterObserver.observe(el); });
  } else {
    counters.forEach(animateCounter);
  }

  /* ---------- CTA form (no backend — placeholder submit) ---------- */
  var CTA_STATUS_MESSAGE = {
    ru: 'Заявка принята. Мы свяжемся с вами в течение рабочего дня.',
    en: 'Request received. Our team will contact you within one business day.',
    uz: "So'rov qabul qilindi. Bir ish kuni ichida siz bilan bog'lanamiz."
  };
  var ctaForm = document.getElementById('sample-form');
  if (ctaForm) {
    ctaForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var status = document.getElementById('cta-status');
      if (status) {
        var lang = html.getAttribute('lang');
        status.textContent = CTA_STATUS_MESSAGE[lang] || CTA_STATUS_MESSAGE.ru;
      }
      ctaForm.reset();
    });
  }

  /* ---------- Hero visual: laminated-MDF stack, failure path only ----------
     The scene itself is not driven from here — three.js is ESM-only, so it
     lives in assets/mdf-stack.js and is loaded as a module from index.html
     (it reads prefers-reduced-motion itself rather than borrowing this
     file's `reduceMotion`). What this block owns is the decision to give
     up on it: the hero frame is meant to start empty and have the boards
     fly into it, so the static fallback is revealed only once the scene is
     known not to be coming — no WebGL at all, or nothing rendered after
     MDF_GIVE_UP_MS (module blocked, CDN down, an old browser ignoring
     type="module"). Deliberately long: a slow CDN that arrives at second
     three should still play the animation rather than get pre-empted. */
  var MDF_GIVE_UP_MS = 5000;
  var mdfStack = document.querySelector('.mdf-stack');

  if (mdfStack) {
    var hasWebGL = false;
    try {
      var probe = document.createElement('canvas');
      hasWebGL = !!(probe.getContext('webgl') || probe.getContext('experimental-webgl'));
    } catch (e) { /* some privacy modes throw here rather than return null */ }

    if (!hasWebGL) {
      mdfStack.classList.add('is-fallback');
    } else {
      setTimeout(function () {
        if (!mdfStack.classList.contains('is-live')) mdfStack.classList.add('is-fallback');
      }, MDF_GIVE_UP_MS);
    }
  }

  /* ---------- Process flow: the delivery line ----------
     The whole choreography — truck, rolls, status flags, stage nodes, step
     cards, station machinery — is CSS keyframes gated behind
     .process-flow.is-running (see style.css). All this does is add and
     remove that class as the section enters and leaves the viewport, which
     is the one thing CSS can't do for itself.

     Unlike the kinetic counters and the old connector dots, this observer
     is NOT one-shot: it keeps toggling. Two dozen infinite animations —
     spinning cylinders, a press stroke, drips — would otherwise keep
     running (and keep the compositor awake) for the entire rest of the
     page. Removing the class also parks the truck back off-canvas, so the
     sequence always restarts from the arrival rather than from wherever it
     happened to be when the reader scrolled past.

     reduceMotion is deliberately NOT checked here. The class is what
     attaches the keyframes at all, so skipping it would leave the band
     empty — truck parked off-canvas, nothing lit. style.css handles that
     case instead, pausing the same animations on a frame 20% into the
     cycle. Withholding the class hides the illustration; pausing it shows
     the illustration standing still, which is the point. */
  function initProcessLine() {
    var flow = document.querySelector('.process-flow');
    if (!flow) return;
    if (reduceMotion || !('IntersectionObserver' in window)) { flow.classList.add('is-running'); return; }

    var lineObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        flow.classList.toggle('is-running', entry.isIntersecting);
      });
    }, { threshold: 0.2 });
    lineObserver.observe(flow);
  }

  window.addEventListener('DOMContentLoaded', initProcessLine);
})();
