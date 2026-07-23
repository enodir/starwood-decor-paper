(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Language switch: RU / EN / UZ ---------- */
  var LANG_KEY = 'starwood-lang';
  var LANGS = ['ru', 'en', 'uz'];
  var html = document.documentElement;
  var langOptionButtons = document.querySelectorAll('.lang-option');

  var META = {
    ru: {
      title: 'STARWOOD — Декоративная бумага для ламината ДСП/МДФ',
      description: 'STARWOOD производит декоративную бумагу для ламинирования ДСП и МДФ: коллекции декоров, контроль качества, поставка образцов.'
    },
    en: {
      title: 'STARWOOD — Decor Paper for Particleboard & MDF Laminate',
      description: 'STARWOOD manufactures decor paper for particleboard and MDF lamination: decor collections, quality control, sample requests.'
    },
    uz: {
      title: "STARWOOD — DSP va MDF laminati uchun dekorativ qog'oz",
      description: "STARWOOD DSP va MDF laminatsiyasi uchun dekorativ qog'oz ishlab chiqaradi: dekor to'plamlari, sifat nazorati, namuna so'rovlari."
    }
  };

  var PROCESS_FLOW_ALT = {
    ru: 'Схема процесса: сырьё, печать, пропитка, прессование, контроль качества',
    en: 'Process diagram: raw material, printing, impregnation, pressing, quality control',
    uz: 'Jarayon sxemasi: xom ashyo, chop etish, shimdirish, presslash, nazorat'
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
    /* Each language has its own baked-in-text process-flow GIF (see
       assets/img/process-flow/) — src/srcset are swapped here rather than
       shipping all three and hiding two with CSS, since display:none
       doesn't reliably stop a browser from fetching an <img>'s src. */
    var flowImg = document.querySelector('.process-flow-img');
    if (flowImg) {
      flowImg.src = 'assets/img/process-flow/process-flow-' + lang + '.gif';
      flowImg.alt = PROCESS_FLOW_ALT[lang];
    }
    var flowReducedSrc = document.querySelector('.process-flow-reduced-src');
    if (flowReducedSrc) {
      flowReducedSrc.srcset = 'assets/img/process-flow/process-flow-' + lang + '-static.png';
    }
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
  var THEME_KEY = 'starwood-theme';
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

  /* ---------- Hero visual: Swatch Float ---------- */
  var swatchFloat = document.getElementById('swatch-float');

  function runSwatchFloat() {
    if (!swatchFloat) return;
    if (reduceMotion) {
      swatchFloat.classList.add('is-visible');
      return;
    }
    requestAnimationFrame(function () {
      setTimeout(function () { swatchFloat.classList.add('is-visible'); }, 200);
    });
  }
  runSwatchFloat();

  /* ---------- Process pinned scroll scene ---------- */
  function initProcessScene() {
    var stages = document.querySelectorAll('.process-stage');
    if (!stages.length) return;

    var hasGSAP = window.gsap && window.ScrollTrigger;

    if (hasGSAP && !reduceMotion) {
      gsap.registerPlugin(ScrollTrigger);
      var processSection = document.querySelector('.process');

      stages.forEach(function (stage, i) {
        ScrollTrigger.create({
          trigger: stage,
          start: 'top center',
          end: 'bottom center',
          onEnter: function () { setActiveStage(i); },
          onEnterBack: function () { setActiveStage(i); }
        });
      });
    } else {
      /* Fallback: IntersectionObserver-based stage activation, no pinning */
      if ('IntersectionObserver' in window) {
        var stageObserver = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            var idx = Array.prototype.indexOf.call(stages, entry.target);
            if (entry.isIntersecting) setActiveStage(idx);
          });
        }, { threshold: 0.5 });
        stages.forEach(function (s) { stageObserver.observe(s); });
      } else {
        setActiveStage(0);
      }
    }

    function setActiveStage(index) {
      stages.forEach(function (s, i) { s.classList.toggle('is-active', i <= index); });
    }
  }

  window.addEventListener('DOMContentLoaded', initProcessScene);
})();
