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
    var navIcon = navToggle.querySelector('.t-icon-swap');
    var setNavState = function (isOpen) {
      navToggle.setAttribute('aria-expanded', String(isOpen));
      navToggle.setAttribute('aria-label', isOpen ? 'Закрыть меню' : 'Открыть меню');
      if (navIcon) navIcon.setAttribute('data-state', isOpen ? 'b' : 'a');
    };
    var closeNav = function () {
      mainNav.classList.remove('is-open');
      setNavState(false);
    };
    navToggle.addEventListener('click', function () {
      setNavState(mainNav.classList.toggle('is-open'));
    });
    mainNav.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', closeNav);
    });
    /* Close on outside click/tap or on scroll — an absolutely positioned
       menu left open otherwise sits on top of the page content. */
    document.addEventListener('click', function (e) {
      if (mainNav.classList.contains('is-open') && !mainNav.contains(e.target) && !navToggle.contains(e.target)) {
        closeNav();
      }
    });
    window.addEventListener('scroll', function () {
      if (mainNav.classList.contains('is-open')) closeNav();
    }, { passive: true });
  }

  /* ---------- Section names resolve a letter at a time ----------
     Splits every section <h2> into per-letter spans so the heading types
     itself in as the section scrolls in, instead of arriving as one block.

     Three structural decisions here, each load-bearing:

     1. Letters nest inside a per-word wrapper. Bare inline-block letters let
        the browser break a line between any two of them, so a heading could
        wrap mid-word at narrow widths. The wrapper is the unbreakable unit;
        line breaks still happen at spaces only.
     2. The split spans are aria-hidden, with a .sr-only copy of the real
        text beside them. Screen readers spell per-letter spans out loud
        ("P-A-R-T-N-E-R-S"); the hidden copy is what actually gets announced.
        It sits inside the language span, so the existing display toggle
        hides it in the two inactive languages for free — no aria-label to
        keep in sync on every language switch.
     3. --char-i counts across the whole heading, not per word, so the
        cascade runs evenly instead of restarting at each space.

     All three language spans are split up front, not just the active one.
     Every language already lives in the DOM at once (see the i18n pattern),
     so applyLang() stays a pure CSS visibility flip and a language switch
     can never race, re-split, or double-wrap a heading.

     The hero <h1> is deliberately excluded — it carries a nested
     <em class="hero-accent"> that a textContent split would flatten away. */
  document.querySelectorAll('h2').forEach(function (heading) {
    heading.querySelectorAll('[data-i18n-lang]').forEach(function (langSpan) {
      if (langSpan.querySelector('.headline-word')) return;
      var text = langSpan.textContent.trim();
      var words = text.split(/\s+/).filter(Boolean);
      if (!words.length) return;

      langSpan.textContent = '';

      var readable = document.createElement('span');
      readable.className = 'sr-only';
      readable.textContent = text;
      langSpan.appendChild(readable);

      var charIndex = 0;
      words.forEach(function (word, w) {
        var wordSpan = document.createElement('span');
        wordSpan.className = 'headline-word';
        wordSpan.setAttribute('aria-hidden', 'true');
        word.split('').forEach(function (char) {
          var charSpan = document.createElement('span');
          charSpan.className = 'headline-char';
          charSpan.style.setProperty('--char-i', charIndex);
          charSpan.textContent = char;
          wordSpan.appendChild(charSpan);
          charIndex++;
        });
        langSpan.appendChild(wordSpan);
        /* A plain text-node space between word wrappers — deliberately not a
           span or an &nbsp;, either of which would remove the only place the
           heading is allowed to break. The gap still advances the counter so
           the cascade keeps an even rhythm across it rather than stalling. */
        if (w < words.length - 1) {
          langSpan.appendChild(document.createTextNode(' '));
          charIndex++;
        }
      });
    });
  });

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
     scroll-snap all keep working untouched.

     overflow-x:auto only takes horizontal input from a trackpad swipe, a
     touchscreen, or the (hidden) scrollbar — a plain vertical mouse wheel
     does nothing to it by default, and a mouse has no built-in way to drag
     it at all. Both are wired up below so every input method actually
     scrolls the rail; a real click still reaches the per-card
     click-to-centre listener because a drag is only recognised past a
     small movement threshold (DECOR_DRAG_THRESHOLD). */
  var decorGrid = document.getElementById('decor-grid');
  var decorNavButtons = document.querySelectorAll('[data-decor-nav]');
  var DECOR_DRAG_THRESHOLD = 4; /* px of pointer movement before a press counts as a drag, not a click */
  var decorSuppressClick = false;

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

    /* Vertical wheel input steers the rail horizontally, same idea as a
       trackpad's horizontal swipe. preventDefault only while the rail can
       actually move further that way — at either end the event is left
       alone so the page keeps scrolling normally underneath the cursor. */
    decorGrid.addEventListener('wheel', function (e) {
      if (Math.abs(e.deltaX) >= Math.abs(e.deltaY)) return; /* already horizontal (trackpad) — nothing to convert */
      var atStart = decorGrid.scrollLeft <= 0;
      var atEnd = decorGrid.scrollLeft >= decorGrid.scrollWidth - decorGrid.clientWidth - 1;
      if ((e.deltaY < 0 && atStart) || (e.deltaY > 0 && atEnd)) return;
      e.preventDefault();
      decorGrid.scrollLeft += e.deltaY;
    }, { passive: false });

    /* Click-and-drag for mouse pointers — touch and pen already get native
       drag-scroll from the browser, so this is gated to pointerType
       'mouse'. Scroll-snap is switched off mid-drag (.is-dragging in
       style.css) so it can't fight the scrollLeft this sets every move;
       it re-engages on release and settles the rail on the nearest card. */
    var decorDrag = null;
    decorGrid.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      decorDrag = { startX: e.clientX, startScroll: decorGrid.scrollLeft, moved: false };
    });
    window.addEventListener('pointermove', function (e) {
      if (!decorDrag) return;
      var dx = e.clientX - decorDrag.startX;
      if (!decorDrag.moved && Math.abs(dx) > DECOR_DRAG_THRESHOLD) {
        decorDrag.moved = true;
        decorGrid.classList.add('is-dragging');
      }
      if (decorDrag.moved) decorGrid.scrollLeft = decorDrag.startScroll - dx;
    });
    window.addEventListener('pointerup', function () {
      if (!decorDrag) return;
      /* A real drag just ended — swallow the click it generates, so
         releasing the mouse over a card doesn't also fire that card's
         click-to-centre handler on top of the drag that just moved it. */
      if (decorDrag.moved) decorSuppressClick = true;
      decorDrag = null;
      decorGrid.classList.remove('is-dragging');
    });
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

  /* ---------- Cover Flow focus readout ----------
     One name/category line below the rail for whichever card is centred,
     built by cloning that card's own i18n spans rather than duplicating
     translations — the CSS-based lang toggle then just works on the clone
     for free. Category text comes from the matching decor-filter button's
     spans (same data-filter value), for the same reason. */
  var decorFocusInfo = document.getElementById('decor-focus-info');
  var decorFocusName = document.getElementById('decor-focus-name');
  var decorFocusCategory = document.getElementById('decor-focus-category');
  var decorCategoryLabels = {};
  document.querySelectorAll('.decor-filter[data-filter]').forEach(function (btn) {
    if (btn.dataset.filter === 'all') return;
    decorCategoryLabels[btn.dataset.filter] = btn.innerHTML;
  });
  var decorFocusedCard = null;

  function setDecorFocusCard(card) {
    if (card === decorFocusedCard) return;
    decorFocusedCard = card;
    if (!decorFocusInfo) return;
    if (!card) {
      decorFocusInfo.hidden = true;
      return;
    }
    decorFocusInfo.hidden = false;
    /* Swap the text under an opacity dip instead of an instant jump —
       transition is declared on .decor-focus-info in style.css. */
    decorFocusInfo.style.opacity = '0';
    window.requestAnimationFrame(function () {
      var nameEl = card.querySelector('.decor-card__name');
      if (nameEl && decorFocusName) decorFocusName.innerHTML = nameEl.innerHTML;
      var label = decorCategoryLabels[card.dataset.category];
      if (label && decorFocusCategory) decorFocusCategory.innerHTML = label;
      decorFocusInfo.style.opacity = '1';
    });
  }

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

    var focusCard = null;
    var focusA = Infinity;

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
      /* Whichever card sits closest to the middle drives the focus readout
         below the rail, tracked here rather than re-derived from the
         data-decor-offset attribute so it settles on a single card even
         while several are within the "centred" threshold below. */
      if (a < focusA) { focusA = a; focusCard = card; }

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

    setDecorFocusCard(focusCard);
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
        /* Swallow the click a drag-to-scroll release just generated (see
           the pointerup handler above) — otherwise releasing a drag over a
           card both scrolls the rail and re-centres on whatever card the
           mouse happened to be over. */
        if (decorSuppressClick) { decorSuppressClick = false; return; }
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

  /* ---------- Sticky LMDF board ----------
     Continues the hero's laminated-MDF board stack (assets/mdf-stack.js)
     past the hero itself, showing the same real photo of the mill's fanned
     board stack (--lmdf-photo in style.css, assets/img/process-flow/
     LDSP2.jpg) rather than a flat colour, in two places:

     1. initLmdfBackground() (below) reveals a fixed, page-anchored tint of
        that photo (.lmdf-bg in style.css) the instant the hero's own
        stack-closing scroll span completes — starting on the same belaya-
        korona (white) finish the boards close on, which is close to
        achromatic and so renders the photo close to desaturated: the
        literal "extracted white board" the hero hands off into — then
        keeps it cross-fading through the palette as the reader scrolls.
        It's a thin accent, not the main visual.
     2. Every section below the hero also carries its own .lmdf-parallax
        layer showing that same photo, recoloured to one specific finish —
        but that positioning, recolouring, *and* the parallax/continuity
        itself are pure CSS ([data-lmdf="..."] and background-attachment:
        fixed in style.css), not JS. No per-section script needed for any
        of it; see the comment on .lmdf-parallax in style.css for how the
        fixed attachment gets both properties from one declaration.

     PALETTE here only needs the six names for #1 — the actual colour
     values live in style.css ([data-lmdf="..."] rules) and are duplicated
     to FINISHES in assets/mdf-stack.js. Keep all three in sync by hand if a
     finish's colour changes; script.js can't import either of the others
     directly (one's an ES module, one's a stylesheet). */
  var PALETTE = ['belaya-korona', 'uludag-mese', 'acik-kok', 'wenge', 'dub-kataniya', 'astana'];
  var PALETTE_HEX = {
    'belaya-korona': ['#efe9e0', '#ffffff'],
    'uludag-mese':   ['#b98d5a', '#e0b985'],
    'acik-kok':      ['#d9c3a2', '#f2e4cb'],
    'wenge':         ['#33241d', '#6b4a34'],
    'dub-kataniya':  ['#8d7a66', '#bcaa93'],
    'astana':        ['#b6a894', '#dbd0bd']
  };
  var LMDF_PHOTO = 'url(assets/img/process-flow/process-ldsp2-1000.jpg)';

  function initLmdfBackground() {
    var bg = document.querySelector('.lmdf-bg');
    var hero = document.querySelector('.hero');
    if (!bg || !hero) return;
    var tints = bg.querySelectorAll('.lmdf-bg__tint');
    if (tints.length < 2) return;

    var HERO_SPAN = 0.34; // keep matched to SPAN in assets/mdf-stack.js
    var sections = Array.prototype.slice.call(document.querySelectorAll('[data-lmdf]'));

    var shownSlot = 0;    // index (0/1) of the tint element currently visible
    var paletteAt = -1;   // palette index currently painted, so repeats no-op
    var revealed = false; // gone active yet (hero's stack has closed)

    function paint(index) {
      if (index === paletteAt) return;
      paletteAt = index;
      var hex = PALETTE_HEX[PALETTE[index % PALETTE.length]];
      var nextSlot = 1 - shownSlot;
      var el = tints[nextSlot];
      el.style.backgroundImage = 'linear-gradient(' + hex[0] + ',' + hex[1] + '), ' + LMDF_PHOTO;
      // Read layout back before flipping opacity — otherwise the browser
      // can coalesce the background swap and the class change into one
      // paint and the cross-fade never happens.
      void el.offsetWidth;
      tints[shownSlot].classList.remove('is-shown');
      el.classList.add('is-shown');
      shownSlot = nextSlot;
    }

    function update() {
      if (!revealed) {
        var r = hero.getBoundingClientRect();
        var span = r.height * HERO_SPAN;
        var heroProgress = span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 0;
        if (heroProgress < 1) return;
        revealed = true;
        bg.classList.add('is-active');
        paint(0); // belaya-korona — the hero stack's own closing colour
        return;
      }

      // Whichever tracked section currently owns the viewport's vertical
      // centre is "active" — the last one whose top has scrolled above it.
      var mid = innerHeight / 2;
      var activeIndex = 0;
      for (var i = 0; i < sections.length; i++) {
        var rect = sections[i].getBoundingClientRect();
        if (rect.top <= mid && rect.bottom >= 0) activeIndex = i;
      }
      paint(activeIndex);
    }

    addEventListener('scroll', update, { passive: true });
    addEventListener('resize', update);
    update();
  }

  window.addEventListener('DOMContentLoaded', initLmdfBackground);
})();
