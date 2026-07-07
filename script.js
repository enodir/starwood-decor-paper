(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Language toggle ---------- */
  var LANG_KEY = 'starwood-lang';
  var html = document.documentElement;
  var langToggles = [document.getElementById('lang-toggle'), document.getElementById('lang-toggle-footer')]
    .filter(Boolean);

  function applyLang(lang) {
    html.setAttribute('lang', lang);
    html.setAttribute('data-lang', lang);
    document.title = lang === 'ru'
      ? 'STARWOOD — Декоративная бумага для ламината ДСП/МДФ'
      : 'STARWOOD — Decor Paper for Particleboard & MDF Laminate';
    var metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', lang === 'ru'
        ? 'STARWOOD производит декоративную бумагу для ламинирования ДСП и МДФ: коллекции декоров, контроль качества, поставка образцов.'
        : 'STARWOOD manufactures decor paper for particleboard and MDF lamination: decor collections, quality control, sample requests.');
    }
    langToggles.forEach(function (btn) { btn.textContent = lang === 'ru' ? 'RU / EN' : 'EN / RU'; });
    document.querySelectorAll('option[data-ru]').forEach(function (opt) {
      opt.textContent = lang === 'ru' ? opt.dataset.ru : opt.dataset.en;
    });
    try { localStorage.setItem(LANG_KEY, lang); } catch (e) {}
  }

  var savedLang = null;
  try { savedLang = localStorage.getItem(LANG_KEY); } catch (e) {}
  applyLang(savedLang === 'en' ? 'en' : 'ru');

  langToggles.forEach(function (btn) {
    btn.addEventListener('click', function () {
      applyLang(html.getAttribute('lang') === 'ru' ? 'en' : 'ru');
    });
  });

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

  /* ---------- Decor catalog filter ---------- */
  var filterButtons = document.querySelectorAll('.decor-filter');
  var decorCards = document.querySelectorAll('.decor-card');
  var decorEmpty = document.querySelector('.decor-empty');

  function applyFilter(category) {
    var visibleCount = 0;
    decorCards.forEach(function (card) {
      var match = category === 'all' || card.dataset.category === category;
      card.style.display = match ? '' : 'none';
      if (match) visibleCount++;
    });
    if (decorEmpty) decorEmpty.hidden = visibleCount !== 0;
  }

  filterButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      filterButtons.forEach(function (b) { b.classList.remove('is-active'); });
      btn.classList.add('is-active');
      applyFilter(btn.dataset.filter);
    });
  });

  /* ---------- Kinetic counters ---------- */
  var counters = document.querySelectorAll('[data-count-to]');
  function animateCounter(el) {
    var target = parseFloat(el.dataset.countTo);
    var suffix = el.dataset.countSuffix || '';
    if (reduceMotion) {
      el.textContent = target + suffix;
      return;
    }
    var start = null;
    var duration = 1400;
    function step(ts) {
      if (!start) start = ts;
      var progress = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
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
  var ctaForm = document.getElementById('sample-form');
  if (ctaForm) {
    ctaForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var status = document.getElementById('cta-status');
      if (status) {
        status.textContent = html.getAttribute('lang') === 'ru'
          ? 'Заявка принята. Мы свяжемся с вами в течение рабочего дня.'
          : 'Request received. Our team will contact you within one business day.';
      }
      ctaForm.reset();
    });
  }

  /* ---------- Signature element: The Layer Press ---------- */
  var heroPress = document.getElementById('layer-press');

  function runHeroPress() {
    if (!heroPress) return;
    if (reduceMotion) {
      heroPress.classList.add('is-pressed');
      return;
    }
    requestAnimationFrame(function () {
      setTimeout(function () { heroPress.classList.add('is-pressed'); }, 200);
    });
  }
  runHeroPress();

  /* ---------- Process pinned scroll scene ---------- */
  function initProcessScene() {
    var stages = document.querySelectorAll('.process-stage');
    var stackLayers = document.querySelectorAll('.stack-bar');
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
      stackLayers.forEach(function (l, i) { l.classList.toggle('is-active', i <= index); });
    }
  }

  window.addEventListener('DOMContentLoaded', initProcessScene);
})();
