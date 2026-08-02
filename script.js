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
     .decor-grid) handles landing on a card edge either way. */
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
        decorGrid.scrollBy({
          left: direction * decorGrid.clientWidth * 0.92,
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
        decorNavTicking = false;
      });
    }, { passive: true });

    window.addEventListener('resize', updateDecorNav);
    updateDecorNav();
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
        }, 180);
      }
    });
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

  /* ---------- Process flow: connector dots ----------
     The draw-in stroke on .process-connector__progress is plain CSS gated
     by .process-flow.is-visible (see style.css — same class the shared
     reveal observer above already adds). The continuous travelling dot
     can't be pure CSS since it needs to loop indefinitely without ever
     re-triggering the entrance, so it's a one-shot Web Animations API
     loop per connector, started the first time the section scrolls into
     view — same one-shot IntersectionObserver shape as the kinetic
     counters above, just animating a dot instead of a number. */
  function initProcessFlowDots() {
    var flow = document.querySelector('.process-flow');
    if (!flow || reduceMotion || !('IntersectionObserver' in window)) return;

    function runDots() {
      flow.querySelectorAll('.process-connector').forEach(function (conn, idx) {
        var dot = conn.querySelector('.process-connector__dot');
        setTimeout(function () {
          dot.style.opacity = '1';
          dot.animate(
            [
              { transform: 'translateX(0px)', opacity: 0 },
              { transform: 'translateX(0px)', opacity: 1, offset: 0.08 },
              { transform: 'translateX(96px)', opacity: 1, offset: 0.92 },
              { transform: 'translateX(100px)', opacity: 0 }
            ],
            { duration: 1600, easing: 'cubic-bezier(0.65,0,0.35,1)', iterations: Infinity, delay: 300 }
          );
        }, idx * 550);
      });
    }

    var flowObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          setTimeout(runDots, 700);
          flowObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });
    flowObserver.observe(flow);
  }

  window.addEventListener('DOMContentLoaded', initProcessFlowDots);
})();
