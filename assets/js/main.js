// No So Far Away — Austrália Sem Fronteiras
// Interactions: mobile nav toggle, scroll-reveal, footer year.

(function(){
  "use strict";

  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Footer year
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Mobile nav toggle
  var toggle = document.getElementById('nav-toggle');
  var nav = document.getElementById('main-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function(){
      var isOpen = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
    nav.querySelectorAll('a').forEach(function(link){
      link.addEventListener('click', function(){
        nav.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // Live AUD -> BRL exchange rate (AwesomeAPI, free, no key, CORS-open)
  var fxEls = document.querySelectorAll('[data-fx-value]');
  if (fxEls.length) {
    fetch('https://economia.awesomeapi.com.br/last/AUD-BRL')
      .then(function (r) { if (!r.ok) throw new Error('fx fetch failed'); return r.json(); })
      .then(function (data) {
        var rate = parseFloat(data.AUDBRL.bid);
        var formatted = rate.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        fxEls.forEach(function (el) { el.textContent = 'R$ ' + formatted; });
        document.querySelectorAll('[data-fx-status]').forEach(function (el) {
          el.textContent = '';
        });
      })
      .catch(function () {
        fxEls.forEach(function (el) { el.textContent = 'indisponível'; });
        document.querySelectorAll('[data-fx-status]').forEach(function (el) {
          el.textContent = 'não foi possível carregar a cotação';
        });
      });
  }

  // Boarding board — split-flap word cycle (decorative, aria-hidden in markup)
  var boardWord = document.getElementById('board-word');
  if (boardWord && !prefersReduced) {
    var boardWords = ['ESTUDAR', 'TRABALHAR', 'MORAR', 'RECOMEÇAR'];
    var boardIndex = 0;
    setInterval(function () {
      boardWord.classList.add('is-flipping');
      setTimeout(function () {
        boardIndex = (boardIndex + 1) % boardWords.length;
        boardWord.textContent = boardWords[boardIndex];
      }, 250);
      setTimeout(function () {
        boardWord.classList.remove('is-flipping');
      }, 500);
    }, 2600);
  }

  // Flight tracker — plane position mirrors scroll progress (Brasil → Austrália)
  var trackerPlane = document.getElementById('flight-tracker-plane');
  var trackerTrack = trackerPlane ? trackerPlane.parentElement : null;
  if (trackerPlane && trackerTrack) {
    var tickingTracker = false;
    var updateTracker = function () {
      tickingTracker = false;
      var docEl = document.documentElement;
      var scrollable = docEl.scrollHeight - docEl.clientHeight;
      var progress = scrollable > 0 ? window.scrollY / scrollable : 0;
      progress = Math.max(0, Math.min(1, progress));
      var trackWidth = trackerTrack.clientWidth;
      var planeWidth = trackerPlane.offsetWidth;
      var x = progress * (trackWidth - planeWidth);
      trackerPlane.style.transform = 'translate(' + x + 'px, -50%)';
    };
    var onTrackerScroll = function () {
      if (!tickingTracker) {
        tickingTracker = true;
        requestAnimationFrame(updateTracker);
      }
    };
    window.addEventListener('scroll', onTrackerScroll, { passive: true });
    window.addEventListener('resize', onTrackerScroll);
    updateTracker();
  }

  // Lead form (check-in) — PLACEHOLDER: front-end only, no real submission yet.
  // Wire this to a real endpoint/e-mail/CRM during the WordPress build.
  var leadForm = document.getElementById('lead-form');
  if (leadForm) {
    leadForm.addEventListener('submit', function(e){
      e.preventDefault();
      if (!leadForm.checkValidity()) { leadForm.reportValidity(); return; }
      leadForm.querySelector('.checkin-card__body').hidden = true;
      leadForm.querySelector('.checkin-card__success').hidden = false;
    });
  }

  // Scroll-reveal
  var revealTargets = document.querySelectorAll(
    '.origin-card, .stamp-card, .boarding-pass, .faq-item, .beyond-note'
  );
  revealTargets.forEach(function(el){ el.setAttribute('data-reveal', ''); });

  if ('IntersectionObserver' in window && !prefersReduced) {
    var observer = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    revealTargets.forEach(function(el){ observer.observe(el); });
  } else {
    revealTargets.forEach(function(el){ el.classList.add('is-visible'); });
  }

})();
