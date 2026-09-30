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

  // Live AUD -> BRL exchange rate (AwesomeAPI, free, no key, CORS-open).
  // Além do valor cru (data-fx-value, ex: fx-badge do header), também
  // converte valores em AUD pra R$ aproximado onde marcado com
  // data-fx-convert="<valor em AUD>" — usado nos cards de "Alguns
  // números da Austrália" pra não deixar uma cotação fixa (que fica
  // desatualizada) misturada com dados oficiais sourced.
  var fxEls = document.querySelectorAll('[data-fx-value]');
  var fxConvertEls = document.querySelectorAll('[data-fx-convert]');
  if (fxEls.length || fxConvertEls.length) {
    fetch('https://economia.awesomeapi.com.br/last/AUD-BRL')
      .then(function (r) { if (!r.ok) throw new Error('fx fetch failed'); return r.json(); })
      .then(function (data) {
        var rate = parseFloat(data.AUDBRL.bid);
        var formatted = rate.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        fxEls.forEach(function (el) { el.textContent = 'R$ ' + formatted; });
        fxConvertEls.forEach(function (el) {
          var aud = parseFloat(el.getAttribute('data-fx-convert'));
          if (!isFinite(aud)) return;
          var brl = (aud * rate).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          el.textContent = '≈ R$ ' + brl;
        });
        document.querySelectorAll('[data-fx-status]').forEach(function (el) {
          el.textContent = '';
        });
      })
      .catch(function () {
        fxEls.forEach(function (el) { el.textContent = 'indisponível'; });
        fxConvertEls.forEach(function (el) { el.textContent = ''; });
        document.querySelectorAll('[data-fx-status]').forEach(function (el) {
          el.textContent = 'não foi possível carregar a cotação';
        });
      });
  }

  // Count-up numbers + growing bars (LP stat sections), triggered once on scroll into view.
  // NOTE: we observe the *row/card* container, not the bar-fill itself — a bar-fill starts
  // at width:0, and a zero-area element never satisfies an IntersectionObserver threshold.
  var statCards = document.querySelectorAll('.lp-stat-card, .mv-mini-stat');
  var barRows = document.querySelectorAll('.lp-bar-row');

  function formatCount(value, decimals) {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }

  function animateCount(el) {
    // O HTML já traz o valor real e formatado (pra quem não roda JS: robô de
    // preview do WhatsApp, crawler, navegador lento etc. — nunca deve
    // aparecer "0,00" pra ninguém). O JS só reseta pra 0 e recria a contagem
    // como efeito visual puro, por cima do valor que já está certo.
    var target = parseFloat(el.getAttribute('data-target'));
    var decimals = parseInt(el.getAttribute('data-decimals') || '0', 10);
    var duration = 1400;
    var startTime = null;
    el.textContent = formatCount(0, decimals);
    function step(ts) {
      if (!startTime) startTime = ts;
      var progress = Math.min((ts - startTime) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      el.textContent = formatCount(target * eased, decimals);
      if (progress < 1) requestAnimationFrame(step);
      else el.textContent = formatCount(target, decimals);
    }
    requestAnimationFrame(step);
  }

  function triggerStatGroup(container) {
    var count = container.querySelector('.lp-count');
    if (count) animateCount(count);
    var bar = container.querySelector('.lp-bar-fill[data-target-width]');
    if (bar) bar.style.width = bar.getAttribute('data-target-width') + '%';
  }

  if (statCards.length || barRows.length) {
    if ('IntersectionObserver' in window && !prefersReduced) {
      var statObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          triggerStatGroup(entry.target);
          statObserver.unobserve(entry.target);
        });
      }, { threshold: 0.4 });
      statCards.forEach(function (el) { statObserver.observe(el); });
      barRows.forEach(function (el) { statObserver.observe(el); });
    } else {
      // reduced motion (or no IO support): jump straight to final values
      statCards.forEach(triggerStatGroup);
      barRows.forEach(triggerStatGroup);
    }
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

  // Lead form (check-in): embed real da Expert Education (Zoho Forms), cai
  // direto no CRM deles — o próprio script do Zoho (inline no index.html)
  // cuida do envio e do estado de sucesso dentro do iframe.

  // Vídeo de fundo (hero da LP): faz o iframe do YouTube cobrir a seção
  // inteira sem sobrar tarja preta, tipo "background-size:cover" pra
  // vídeo — mede o próprio container (não a viewport), porque a altura
  // do hero muda com o conteúdo.
  var bgVideoBoxes = document.querySelectorAll('[data-bg-video]');
  if (bgVideoBoxes.length) {
    var fitBgVideos = function () {
      bgVideoBoxes.forEach(function (box) {
        var iframe = box.querySelector('iframe');
        var host = box.parentElement;
        if (!iframe || !host) return;
        var cw = host.clientWidth, ch = host.clientHeight;
        if (!cw || !ch) return;
        var videoRatio = 16 / 9;
        if (cw / ch > videoRatio) {
          iframe.style.width = cw + 'px';
          iframe.style.height = Math.ceil(cw / videoRatio) + 'px';
        } else {
          iframe.style.height = ch + 'px';
          iframe.style.width = Math.ceil(ch * videoRatio) + 'px';
        }
      });
    };
    fitBgVideos();
    window.addEventListener('resize', fitBgVideos);
    window.addEventListener('load', fitBgVideos);
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
