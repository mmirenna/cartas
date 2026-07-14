/* ============================================================
   Cartas digitales — render de una carta
   No hace joins ni cálculos: el JSON ya viene armado y filtrado.
   ============================================================ */
(function () {
  var qs = new URLSearchParams(location.search);
  var CARTA = document.body.dataset.carta || qs.get('carta');
  var BASE = document.body.dataset.base || '';
  var LANGS = ['es', 'en', 'pt'];
  var lang = LANGS.indexOf(qs.get('lang')) >= 0 ? qs.get('lang') : 'es';
  var data = null;

  var app = document.getElementById('app');
  var bar = document.getElementById('bar');

  var UI = {
    es: { buscar: 'Buscar un plato…', sin: 'No encontramos nada con eso.', act: 'Actualizado' },
    en: { buscar: 'Search a dish…', sin: 'Nothing matches that.', act: 'Updated' },
    pt: { buscar: 'Buscar um prato…', sin: 'Nada encontrado.', act: 'Atualizado' }
  };

  // Texto con fallback a español: si no hay traducción, se muestra el original.
  function t(obj) {
    if (!obj) return '';
    return obj[lang] || obj.es || '';
  }

  function precio(v) {
    if (v === 'CONSULTAR') return t({ es: 'Consultar', en: 'Ask us', pt: 'Consultar' });
    return '$ ' + Number(v).toLocaleString('es-AR', { maximumFractionDigits: 0 });
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function norm(s) {
    return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  if (window.__DATA__) {           // vista previa offline (archivo único)
    data = window.__DATA__;
    render();
  } else {
    fetch(BASE + 'data/' + CARTA + '.json?v=' + Date.now())
      .then(function (r) {
        if (!r.ok) throw new Error(r.status);
        return r.json();
      })
      .then(function (d) { data = d; render(); })
      .catch(function () {
        app.innerHTML = '<p class="empty">No pudimos cargar la carta. Probá recargar la página.</p>';
      });
  }

  function render() {
    var c = data.carta;
    document.body.dataset.tema = c.tema;
    document.title = c.nombre;

    var idiomas = c.idiomas || ['es'];
    bar.innerHTML =
      '<div class="bar__top">' +
        (c.logo ? '<img class="bar__logo" src="' + BASE + 'assets/img/logos/' + esc(c.logo) + '" alt="">' : '') +
        '<h1 class="bar__name">' + esc(c.nombre) + '</h1>' +
        (idiomas.length > 1 ? '<div class="bar__lang">' + idiomas.map(function (l) {
          return '<button data-lang="' + l + '" aria-pressed="' + (l === lang) + '">' + l + '</button>';
        }).join('') + '</div>' : '') +
      '</div>' +
      '<div class="search"><input id="q" type="search" autocomplete="off" placeholder="' +
        esc(UI[lang].buscar) + '" aria-label="' + esc(UI[lang].buscar) + '"></div>' +
      '<nav class="chips" id="chips">' + data.secciones.map(function (s) {
        return '<a href="#' + s.id + '">' + esc(t(s.nombre)) + '</a>';
      }).join('') + '</nav>';

    bar.querySelectorAll('.bar__lang button').forEach(function (b) {
      b.addEventListener('click', function () {
        lang = b.dataset.lang;
        qs.set('lang', lang);
        history.replaceState(null, '', '?' + qs.toString());
        render();
      });
    });
    bar.querySelector('#q').addEventListener('input', function (e) { filtrar(e.target.value); });

    paint(data.secciones);
    spy();
  }

  function paint(secciones) {
    var fecha = new Date(data.carta.actualizado)
      .toLocaleDateString(lang === 'en' ? 'en-GB' : lang === 'pt' ? 'pt-BR' : 'es-AR');

    var html = '<div class="wrap">';
    if (!secciones.length) {
      html += '<p class="empty">' + esc(UI[lang].sin) + '</p></div>';
      app.innerHTML = html;
      return;
    }

    secciones.forEach(function (s) {
      html += '<section class="sec" id="' + s.id + '">';
      if (s.foto) {
        html += '<img class="sec__foto" src="' + BASE + 'assets/img/secciones/' + esc(s.foto) +
                '" alt="" loading="lazy" onerror="this.remove()">';
      }
      html += '<h2 class="sec__title">' + esc(t(s.nombre)) + '</h2>';
      if (t(s.nota)) html += '<p class="sec__note">' + esc(t(s.nota)) + '</p>';
      html += '<hr class="sec__rule">';

      s.items.forEach(function (i) {
        html += '<article class="item">' +
          '<div class="item__head">' +
            '<span class="item__name">' + esc(t(i.nombre)) + '</span>' +
            '<span class="item__dots"></span>' +
            '<span class="item__price">' + esc(precio(i.precio)) + '</span>' +
          '</div>';
        if (t(i.descripcion)) html += '<p class="item__desc">' + esc(t(i.descripcion)) + '</p>';
        if (i.tags && i.tags.length) {
          html += '<div class="item__tags">' + i.tags.map(function (tg) {
            var lbl = data.tags[tg] ? t(data.tags[tg]) : tg;
            return '<span class="tag tag--' + tg.toLowerCase() + '">' + esc(lbl) + '</span>';
          }).join('') + '</div>';
        }
        html += '</article>';
      });
      html += '</section>';
    });

    var vt = data.carta.ver_tambien;
    var LBL = { es: 'Ver la carta de vinos', en: 'See the wine list', pt: 'Ver a carta de vinhos' };
    html += '<footer class="foot">' +
      (vt ? '<p><a href="' + BASE + 'carta/' + esc(vt) + '/">' + esc(LBL[lang]) + ' &rarr;</a></p>' : '') +
      (t(data.carta.pie) ? '<p>' + esc(t(data.carta.pie)) + '</p>' : '') +
      '<p>' + esc(UI[lang].act) + ': ' + fecha + '</p>' +
      '</footer></div>';

    app.innerHTML = html;
  }

  function filtrar(q) {
    var n = norm(q.trim());
    if (!n) { paint(data.secciones); spy(); return; }
    var res = data.secciones.map(function (s) {
      var items = s.items.filter(function (i) {
        return norm(t(i.nombre) + ' ' + t(i.descripcion)).indexOf(n) >= 0;
      });
      return items.length ? Object.assign({}, s, { items: items, foto: '' }) : null;
    }).filter(Boolean);
    paint(res);
  }

  // Marca el chip de la sección visible.
  function spy() {
    var chips = document.querySelectorAll('#chips a');
    if (!('IntersectionObserver' in window)) return;
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        chips.forEach(function (a) {
          var on = a.getAttribute('href') === '#' + e.target.id;
          a.setAttribute('aria-current', on);
          if (on) a.scrollIntoView({ block: 'nearest', inline: 'center' });
        });
      });
    }, { rootMargin: '-130px 0px -70% 0px' });
    document.querySelectorAll('.sec').forEach(function (s) { obs.observe(s); });
  }
})();
