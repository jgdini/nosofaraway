// Página Notícias: lê assets/data/noticias.json (gerado automaticamente por
// scripts/build-noticias.mjs, via GitHub Action) e monta os cards. Sem
// chamada externa nenhuma no navegador — evita CORS e mantém a página rápida.
(function () {
  const DATA_URL = 'assets/data/noticias.json';

  function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function newsCard(item) {
    const card = document.createElement('article');
    card.className = 'news-card';
    card.innerHTML = `
      <span class="news-card__source">${item.source}</span>
      <h3 class="news-card__title"><a href="${item.link}" target="_blank" rel="noopener">${item.title}</a></h3>
      <p class="news-card__desc">${item.description}</p>
      <span class="news-card__date">${formatDate(item.pubDate)}</span>
    `;
    return card;
  }

  function videoCard(item) {
    const card = document.createElement('article');
    card.className = 'video-card';
    card.innerHTML = `
      <button class="video-card__thumb" type="button" aria-label="Assistir: ${item.title}">
        <img src="${item.thumbnail}" alt="" loading="lazy">
        <svg class="video-card__play" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="rgba(18,23,58,.75)"/><path d="M10 8.3l6 3.7-6 3.7z" fill="#fff"/></svg>
      </button>
      <h3 class="video-card__title">${item.title}</h3>
      <span class="video-card__date">${formatDate(item.published)}</span>
    `;
    const btn = card.querySelector('.video-card__thumb');
    btn.addEventListener('click', () => {
      const iframe = document.createElement('iframe');
      iframe.src = `https://www.youtube.com/embed/${item.videoId}?autoplay=1`;
      iframe.title = item.title;
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
      iframe.allowFullscreen = true;
      iframe.className = 'video-card__iframe';
      btn.replaceWith(iframe);
    }, { once: true });
    return card;
  }

  async function init() {
    const newsGrid = document.getElementById('noticias-grid');
    const videosGrid = document.getElementById('videos-grid');
    const updatedEl = document.getElementById('noticias-updated');

    try {
      const res = await fetch(DATA_URL, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (updatedEl && data.updated_at) {
        updatedEl.textContent = `Atualizado em ${formatDate(data.updated_at)}`;
      }

      if (newsGrid) {
        newsGrid.innerHTML = '';
        if (data.news && data.news.length) {
          data.news.forEach((item) => newsGrid.appendChild(newsCard(item)));
        } else {
          newsGrid.innerHTML = '<p class="noticias-empty">Nenhuma notícia relevante nas últimas atualizações — volte em breve.</p>';
        }
      }

      if (videosGrid) {
        videosGrid.innerHTML = '';
        if (data.videos && data.videos.length) {
          data.videos.forEach((item) => videosGrid.appendChild(videoCard(item)));
        } else {
          videosGrid.innerHTML = '<p class="noticias-empty noticias-empty--light">Nenhum vídeo encontrado no momento.</p>';
        }
      }
    } catch (err) {
      console.error('Falha ao carregar notícias:', err);
      if (newsGrid) newsGrid.innerHTML = '<p class="noticias-empty">Não foi possível carregar as notícias agora. Tente novamente mais tarde.</p>';
      if (videosGrid) videosGrid.innerHTML = '<p class="noticias-empty noticias-empty--light">Não foi possível carregar os vídeos agora.</p>';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
