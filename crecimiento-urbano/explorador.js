/* Explorador del Partido: métrica sobre el mapa, tira de posición, ficha por territorio,
   buscador de pueblos y tabla ordenable. Lee los datos de la tabla «Los diez territorios»,
   así lo que se ve en el mapa y lo que dice la tabla no pueden separarse. */
(function () {
  'use strict';
  if (typeof map === 'undefined' || typeof lyP === 'undefined' || typeof G === 'undefined') return;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function fmt(v, d) { if (v == null || isNaN(v)) return '—'; return v.toLocaleString('es-AR', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
  function num(t) {
    t = (t || '').replace(/\s/g, ' ').trim();
    if (!t || t === '—' || t === '-') return null;
    var m = t.match(/-?[\d.]+(?:,\d+)?/); if (!m) return null;
    return parseFloat(m[0].replace(/\./g, '').replace(',', '.'));
  }

  /* ---------- 1. datos: la tabla manda ---------- */
  var tabla = $('main table'); if (!tabla) return;
  var COLS = [
    { k: 'ha', n: 'Superficie', u: 'ha', d: 0, th: 1 },
    { k: 'hab', n: 'Habitantes 2022', u: 'hab.', d: 0, th: 2 },
    { k: 'dens', n: 'Densidad', u: 'hab/km²', d: 1, th: 3, log: true },
    { k: 'vsp', n: 'Viviendas sin personas', u: '%', d: 0, th: 4 },
    { k: 'rur', n: 'Parcelas rurales', u: 'parcelas', d: 0, th: 5 },
    { k: 'galp', n: 'Galpones 2021', u: 'galpones', d: 0, th: 6 },
    { k: 'noagr', n: 'Uso no agrícola 2020/21', u: '%', d: 0, th: 7 },
    { k: 'vivr', n: 'Viviendas rurales', u: 'edificaciones', d: 0, th: 8 },
    { k: 'forest', n: 'Vegetación forestal', u: '%', d: 1, th: 9 }
  ];
  var cards = {};
  $$('.cards a.card').forEach(function (a) {
    var h = a.getAttribute('href'); var s = h.indexOf('ciudad') === 0 ? 'ciudad' : h.split('/')[1];
    cards[s] = { href: h, c: a.style.getPropertyValue('--c') || '#7B5A8E', num: ($('.num', a) || {}).textContent, tit: ($('.tit', a) || {}).textContent, desc: ($('.desc', a) || {}).textContent, pue: ($('.pue', a) || {}).textContent };
  });
  var T = [], BY = {};
  $$('tbody tr', tabla).forEach(function (tr) {
    var a = $('a', tr); if (!a) return;
    var h = a.getAttribute('href'); var s = h.indexOf('ciudad') === 0 ? 'ciudad' : h.split('/')[1];
    var td = $$('td', tr), o = { slug: s, nom: a.textContent.trim(), tr: tr, est: /≈/.test(td[2].textContent) };
    COLS.forEach(function (c) { o[c.k] = num(td[c.th] && td[c.th].textContent); });
    T.push(o); BY[s] = o; tr.dataset.slug = s;
  });
  if (!T.length) return;
  var nombreCorto = function (o) { return o.nom.replace(/^\d+ · /, ''); };

  /* ---------- 2. limpieza: capas que ya no existen ---------- */
  ['lyH', 'lyS'].forEach(function (n) { if (window[n]) map.removeLayer(window[n]); });
  $$('#ctl > div').forEach(function (d) { if (/Superposiciones|Suelo sin Pago/.test(d.textContent)) d.remove(); });

  /* ---------- 3. cifras del partido ---------- */
  var tot = { ha: 0, hab: 0 }; T.forEach(function (o) { tot.ha += o.ha || 0; tot.hab += o.hab || 0; });
  var nPue = (G.pueblos && G.pueblos.features || []).length;
  var cif = document.createElement('section'); cif.className = 'xp-cifras'; cif.setAttribute('aria-label', 'El Partido en cifras');
  cif.innerHTML = [
    [tot.ha, 'hectáreas', 'superficie del Partido'],
    [tot.hab, 'habitantes', 'censo 2022'],
    [Math.round(BY.ciudad ? BY.ciudad.hab / tot.hab * 100 : 0), '% en la Ciudad', 'sobre ' + fmt(BY.ciudad ? BY.ciudad.ha / tot.ha * 100 : 0, 1) + ' % del suelo'],
    [9, 'Pagos', 'y la Ciudad cabecera'],
    [nPue, 'pueblos y parajes', 'con área de estudio']
  ].map(function (c) { return '<div class="xp-cifra"><b data-n="' + c[0] + '">' + fmt(c[0]) + '</b><span>' + c[1] + '</span><small>' + c[2] + '</small></div>'; }).join('');
  var mapw = $('.mapw'); mapw.parentNode.insertBefore(cif, mapw);
  if (!reduce && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return; io.disconnect();
        $$('b[data-n]', cif).forEach(function (b) {
          var fin = +b.dataset.n, t0 = performance.now();
          (function paso(t) { var p = Math.min(1, (t - t0) / 900); b.textContent = fmt(fin * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(paso); })(t0);
        });
      });
    }, { threshold: .4 });
    io.observe(cif);
  }

  /* ---------- 4. barra de métricas + buscador ---------- */
  var barra = document.createElement('div'); barra.className = 'xp-barra';
  barra.innerHTML = '<div class="xp-chips" role="tablist" aria-label="Qué pinta el mapa">' +
    '<button type="button" role="tab" data-m="pago" aria-selected="true">Pagos del Plan</button>' +
    COLS.map(function (c) { return '<button type="button" role="tab" data-m="' + c.k + '" aria-selected="false">' + c.n + '</button>'; }).join('') + '</div>' +
    '<div class="xp-busca"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><input type="search" placeholder="Buscá un pueblo, paraje o Pago" aria-label="Buscar un pueblo, paraje o Pago" autocomplete="off"><ul class="xp-sug" role="listbox" hidden></ul></div>';
  mapw.parentNode.insertBefore(barra, mapw);

  /* ---------- 5. tira de posición (sobre el mapa) ---------- */
  var tira = document.createElement('div'); tira.className = 'xp-tira'; tira.hidden = true;
  mapw.appendChild(tira);
  L.DomEvent.disableClickPropagation(tira); L.DomEvent.disableScrollPropagation(tira);

  var RAMPA = ['#F1ECE3', '#DCCDE2', '#BEA5CF', '#9878B0', '#74548C', '#4E3762', '#2F2140'];
  function col(t) { t = Math.max(0, Math.min(1, t)); var i = t * (RAMPA.length - 1), a = Math.floor(i), f = i - a, b = Math.min(RAMPA.length - 1, a + 1); return mezcla(RAMPA[a], RAMPA[b], f); }
  function mezcla(x, y, f) { var p = function (h, i) { return parseInt(h.substr(1 + 2 * i, 2), 16); }; var r = [0, 1, 2].map(function (i) { return Math.round(p(x, i) + (p(y, i) - p(x, i)) * f); }); return '#' + r.map(function (v) { return ('0' + v.toString(16)).slice(-2); }).join(''); }

  var M = 'pago', SEL = null, HOV = null;
  function colDe(k) { return COLS.filter(function (c) { return c.k === k; })[0]; }
  function escala(c) {
    var v = T.map(function (o) { return o[c.k]; }).filter(function (x) { return x != null; });
    var tr = c.log ? function (x) { return Math.log10(Math.max(x, .1)); } : function (x) { return x; };
    var lo = Math.min.apply(null, v.map(tr)), hi = Math.max.apply(null, v.map(tr));
    return function (x) { return x == null ? null : (hi === lo ? .5 : (tr(x) - lo) / (hi - lo)); };
  }
  function rango(c) {
    var v = T.filter(function (o) { return o[c.k] != null; }).sort(function (a, b) { return b[c.k] - a[c.k]; });
    var r = {}; v.forEach(function (o, i) { r[o.slug] = i + 1; }); r._n = v.length; return r;
  }
  function estilo(f) {
    var s = f.properties.slug, act = s === SEL || s === HOV;
    if (M === 'pago') return { color: act ? '#fff' : '#F6F2E7', weight: act ? 3.2 : 1.6, opacity: .95, fillColor: f.properties.color, fillOpacity: Math.min(1, (window.op ? op.pagos : .35) + (act ? .25 : 0)) };
    var c = colDe(M), v = BY[s] && BY[s][M], t = escala(c)(v);
    return { color: act ? '#fff' : 'rgba(255,255,255,.75)', weight: act ? 3.2 : 1.2, opacity: 1, fillColor: t == null ? '#8a8378' : col(t), fillOpacity: (t == null ? .35 : .82) * Math.min(1, (window.op ? op.pagos : .35) / .35), dashArray: t == null ? '4 4' : null };
  }
  lyP.options.style = estilo;
  var LBL = window.lbl ? lbl.getLayers() : [];
  function rotulos() {
    G.limites.features.forEach(function (f, i) {
      var m = LBL[i]; if (!m) return; var s = f.properties.slug, o = BY[s];
      var txt = f.properties.num || 'Ciudad', sub = '';
      if (M !== 'pago' && o) { var c = colDe(M); sub = o[M] == null ? 's/d' : fmt(o[M], c.d) + (c.u === '%' ? ' %' : ''); }
      m.setIcon(L.divIcon({ className: 'xp-rot', html: '<span>' + esc(txt) + (sub ? '<i>' + esc(sub) + '</i>' : '') + '</span>', iconSize: null }));
    });
  }
  function pintarTira() {
    if (M === 'pago') { tira.hidden = true; return; }
    var c = colDe(M), sc = escala(c), rg = rango(c);
    var orden = T.slice().sort(function (a, b) { return (a[M] == null) - (b[M] == null) || a[M] - b[M]; });
    var mx = Math.max.apply(null, T.map(function (o) { return o[M] || 0; }));
    var foco = SEL || HOV;
    tira.hidden = false;
    tira.innerHTML = '<div class="xp-tira-h"><span>' + esc(c.n) + '</span><small>' + (c.log ? 'escala logarítmica' : 'de menor a mayor') + '</small></div>' +
      '<div class="xp-barras" role="list">' + orden.map(function (o) {
        var v = o[M], h = v == null ? 4 : Math.max(5, (c.log ? Math.max(sc(v), .04) : Math.sqrt(v / mx)) * 100), t = sc(v);
        return '<button type="button" role="listitem" class="xp-b' + (o.slug === foco ? ' on' : '') + (v == null ? ' nd' : '') + '" data-s="' + o.slug + '" style="--h:' + h.toFixed(1) + '%;--bc:' + (t == null ? '#8a8378' : col(Math.max(.18, t))) + '" aria-label="' + esc(nombreCorto(o)) + ': ' + (v == null ? 'sin dato' : fmt(v, c.d) + ' ' + c.u) + '">' +
          (o.slug === foco ? '<em>' + (v == null ? 's/d' : fmt(v, c.d) + (c.u === '%' ? ' %' : '')) + '</em>' : '') + '</button>';
      }).join('') + '</div>' +
      '<div class="xp-tira-p">' + (foco && BY[foco] ? '<b>' + esc(nombreCorto(BY[foco])) + '</b> · ' + (rg[foco] ? rg[foco] + '.º de ' + rg._n : 'sin dato') : 'Pasá por una barra o un territorio') + '</div>';
  }
  function repintar() { lyP.setStyle(estilo); rotulos(); pintarTira(); pintarTabla(); }

  tira.addEventListener('mouseover', function (e) { var b = e.target.closest('[data-s]'); if (b && HOV !== b.dataset.s) { HOV = b.dataset.s; lyP.setStyle(estilo); pintarTira(); } });
  tira.addEventListener('mouseleave', function () { HOV = null; lyP.setStyle(estilo); pintarTira(); });
  tira.addEventListener('click', function (e) { var b = e.target.closest('[data-s]'); if (b) abrir(b.dataset.s, true); });

  $('.xp-chips', barra).addEventListener('click', function (e) {
    var b = e.target.closest('[data-m]'); if (!b) return;
    M = b.dataset.m; $$('.xp-chips button', barra).forEach(function (x) { x.setAttribute('aria-selected', x === b ? 'true' : 'false'); });
    repintar();
  });

  /* clic en el mapa: ficha en lugar de salto directo */
  lyP.eachLayer(function (l) {
    l.off('click'); l.off('mouseover'); l.off('mouseout');
    var s = l.feature.properties.slug;
    l.on('click', function () { abrir(s, false); });
    l.on('mouseover', function () { HOV = s; l.setStyle(estilo(l.feature)); pintarTira(); });
    l.on('mouseout', function () { HOV = null; l.setStyle(estilo(l.feature)); pintarTira(); });
    var o = BY[s]; if (o) l.setTooltipContent('<b>' + esc(o.nom) + '</b><br><small>Tocá para ver la ficha</small>');
  });

  /* ---------- 6. ficha ---------- */
  var ficha = document.createElement('aside'); ficha.className = 'xp-ficha'; ficha.setAttribute('aria-hidden', 'true'); ficha.tabIndex = -1;
  document.body.appendChild(ficha);
  function abrir(s, centrar) {
    var o = BY[s], cd = cards[s] || {}; if (!o) return;
    SEL = s; repintar();
    var capa = null; lyP.eachLayer(function (l) { if (l.feature.properties.slug === s) capa = l; });
    if (capa && centrar) map.flyToBounds(capa.getBounds(), { padding: [30, 30], duration: reduce ? 0 : .6 });
    var filas = COLS.map(function (c) {
      var rg = rango(c), v = o[c.k], mx = Math.max.apply(null, T.map(function (x) { return x[c.k] || 0; }));
      return '<li' + (c.k === M ? ' class="on"' : '') + '><span>' + esc(c.n) + '</span><b>' + (v == null ? '—' : fmt(v, c.d) + ' <small>' + esc(c.u) + '</small>') + (c.k === 'hab' && o.est ? ' <abbr title="Incluye la población estimada de los antiguos huecos de la capa">≈</abbr>' : '') + '</b>' +
        '<i class="xp-pos" style="--p:' + (v == null ? 0 : ((c.log ? escala(c)(v) : v / mx) * 100).toFixed(1)) + '%"></i><em>' + (rg[s] ? rg[s] + '.º de ' + rg._n : 's/d') + '</em></li>';
    }).join('');
    ficha.style.setProperty('--fc', cd.c || '#7B5A8E');
    ficha.innerHTML = '<button type="button" class="xp-cerrar" aria-label="Cerrar la ficha">×</button>' +
      '<div class="xp-f-h"><span class="xp-f-num">' + esc(cd.num || '') + '</span><h3>' + esc(cd.tit || o.nom) + '</h3><p>' + esc(cd.desc || '') + '</p>' + (cd.pue && cd.pue.trim() ? '<p class="xp-f-pue">' + esc(cd.pue) + '</p>' : '') + '</div>' +
      '<ul class="xp-f-dat">' + filas + '</ul>' +
      '<a class="xp-f-ir" href="' + esc(cd.href || '#') + '">Abrir el SIG de ' + (s === 'ciudad' ? 'la Ciudad' : 'este Pago') + ' <span aria-hidden="true">→</span></a>' +
      '<p class="xp-f-nota">Puesto: 1.º es el valor más alto entre los diez territorios. Datos de la tabla de abajo; fuentes al pie.</p>';
    ficha.classList.add('abierta'); ficha.setAttribute('aria-hidden', 'false');
    $('.xp-cerrar', ficha).onclick = cerrar; ficha.focus({ preventScroll: true });
  }
  function cerrar() { ficha.classList.remove('abierta'); ficha.setAttribute('aria-hidden', 'true'); SEL = null; repintar(); }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && ficha.classList.contains('abierta')) cerrar(); });

  /* ---------- 7. buscador ---------- */
  var inp = $('.xp-busca input', barra), sug = $('.xp-sug', barra);
  var IDX = T.map(function (o) { return { t: nombreCorto(o), s: o.slug, k: 'Territorio' }; })
    .concat((G.pueblos.features || []).map(function (f) { var p = f.properties; return { t: p.n, s: p.pago, k: (p.tipo || 'pueblo').replace(/^\w/, function (c) { return c.toUpperCase(); }) + (BY[p.pago] ? ' · ' + nombreCorto(BY[p.pago]) : ''), f: f }; }));
  var norm = function (s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); };
  inp.addEventListener('input', function () {
    var q = norm(inp.value.trim()); if (!q) { sug.hidden = true; return; }
    var r = IDX.filter(function (x) { return norm(x.t).indexOf(q) >= 0; }).slice(0, 8);
    sug.innerHTML = r.length ? r.map(function (x, i) { return '<li role="option" data-i="' + IDX.indexOf(x) + '"><b>' + esc(x.t) + '</b><span>' + esc(x.k) + '</span></li>'; }).join('') : '<li class="vacio">Sin coincidencias</li>';
    sug.hidden = false;
  });
  sug.addEventListener('mousedown', function (e) {
    var li = e.target.closest('[data-i]'); if (!li) return; e.preventDefault();
    var x = IDX[+li.dataset.i]; inp.value = x.t; sug.hidden = true;
    if (x.f) { map.flyToBounds(L.geoJSON(x.f).getBounds(), { padding: [60, 60], maxZoom: 15, duration: reduce ? 0 : .7 }); abrir(x.s, false); }
    else abrir(x.s, true);
  });
  inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { var li = $('[data-i]', sug); if (li) li.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); } });
  inp.addEventListener('blur', function () { setTimeout(function () { sug.hidden = true; }, 150); });

  /* ---------- 8. tabla ordenable con barras ---------- */
  tabla.classList.add('xp-tabla');
  var ths = $$('thead th', tabla), ORD = { i: null, asc: false };
  ths.forEach(function (th, i) {
    if (!i) return; th.tabIndex = 0; th.setAttribute('role', 'button'); th.title = 'Ordenar por esta columna';
    var go = function () { ORD = { i: i, asc: ORD.i === i ? !ORD.asc : false }; ordenar(); var c = COLS.filter(function (x) { return x.th === i; })[0]; if (c) { M = c.k; $$('.xp-chips button', barra).forEach(function (x) { x.setAttribute('aria-selected', x.dataset.m === M ? 'true' : 'false'); }); repintar(); } };
    th.addEventListener('click', go); th.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
  });
  function ordenar() {
    var tb = $('tbody', tabla), tot = $('tr.total', tb), c = COLS.filter(function (x) { return x.th === ORD.i; })[0];
    var rows = T.slice().sort(function (a, b) { var x = a[c.k], y = b[c.k]; if (x == null) return 1; if (y == null) return -1; return ORD.asc ? x - y : y - x; });
    rows.forEach(function (o) { tb.insertBefore(o.tr, tot); });
    ths.forEach(function (th, i) { th.setAttribute('aria-sort', i === ORD.i ? (ORD.asc ? 'ascending' : 'descending') : 'none'); });
  }
  function pintarTabla() {
    var c = colDe(M);
    T.forEach(function (o) {
      o.tr.classList.toggle('xp-sel', o.slug === SEL);
      $$('td', o.tr).forEach(function (td, i) {
        var on = c && c.th === i && o[c.k] != null;
        td.classList.toggle('xp-bar', !!on);
        if (on) { var mx = Math.max.apply(null, T.map(function (x) { return x[c.k] || 0; })); td.style.setProperty('--w', (o[c.k] / mx * 100).toFixed(1) + '%'); }
      });
    });
    ths.forEach(function (th, i) { th.classList.toggle('xp-on', !!(c && c.th === i)); });
  }
  T.forEach(function (o) {
    o.tr.addEventListener('mouseenter', function () { HOV = o.slug; lyP.setStyle(estilo); pintarTira(); });
    o.tr.addEventListener('mouseleave', function () { HOV = null; lyP.setStyle(estilo); pintarTira(); });
    o.tr.addEventListener('click', function (e) { if (e.target.closest('a')) return; abrir(o.slug, true); $('#mapa').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' }); });
  });

  /* opacidad de «Pagos y Ciudad» sigue funcionando */
  if (window.estP) window.estP = estilo;
  repintar();
})();
