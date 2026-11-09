/* ==========================================================================
   MARCO COMÚN de la web del Plan «Sendas del Habitar»
   1) Versión clara u oscura, elegida por quien lee y recordada en el equipo.
   2) Encabezado fijo, subnavegación de la sección y pie, iguales en todas las
      páginas (la portada ya los tiene escritos; acá solo suma el selector).
   3) Gráficos (Chart.js) a tono con la versión elegida.
   Se carga en <head>, sin defer, para fijar el tema antes de pintar.
   ========================================================================== */
(function () {
  'use strict';
  var d = document.documentElement, CLAVE = 'plan-sag.tema';
  var src = (document.currentScript && document.currentScript.src) || '';
  var RAIZ = src.replace(/js\/marco\.js.*$/, '');

  function leer() { try { return localStorage.getItem(CLAVE); } catch (e) { return null; } }
  function guardar(v) { try { localStorage.setItem(CLAVE, v); } catch (e) { /* sin almacenamiento */ } }
  function tema() { return d.getAttribute('data-hz') === 'oscuro' ? 'oscuro' : 'claro'; }

  function aplicar(t, recordar) {
    d.setAttribute('data-hz', t);
    d.setAttribute('data-theme', t === 'oscuro' ? 'dark' : 'light');
    if (recordar) guardar(t);
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute('content', t === 'oscuro' ? '#110F0D' : '#3A3027');
    pintarSelector(); graficos();
  }

  /* tema antes de pintar */
  aplicar(leer() === 'oscuro' ? 'oscuro' : 'claro', false);

  /* si una página cambia su tema por su cuenta, el marco la acompaña */
  if (window.MutationObserver) {
    new MutationObserver(function () {
      var quiere = d.getAttribute('data-theme') === 'dark' ? 'oscuro' : 'claro';
      if (tema() !== quiere) { d.setAttribute('data-hz', quiere); guardar(quiere); pintarSelector(); graficos(); }
    }).observe(d, { attributes: true, attributeFilter: ['data-theme'] });
  }

  /* ---------- selector ---------- */
  var SOL = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M5.3 5.3l1.7 1.7M17 17l1.7 1.7M5.3 18.7 7 17M17 7l1.7-1.7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
  var LUNA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>';
  function selectorHTML() {
    return '<span class="hz-tema" role="group" aria-label="Versión de la página">' +
      '<button type="button" data-tema="claro" aria-pressed="false" title="Versión clara">' + SOL + '<span>Clara</span></button>' +
      '<button type="button" data-tema="oscuro" aria-pressed="false" title="Versión oscura">' + LUNA + '<span>Oscura</span></button></span>';
  }
  function pintarSelector() {
    var t = tema();
    Array.prototype.forEach.call(document.querySelectorAll('.hz-tema-uno'), function (b) {
      var osc = t === 'oscuro';
      b.innerHTML = osc ? SOL : LUNA;
      b.setAttribute('aria-label', osc ? 'Pasar a la versión clara' : 'Pasar a la versión oscura');
      b.setAttribute('title', osc ? 'Versión clara' : 'Versión oscura');
    });
    Array.prototype.forEach.call(document.querySelectorAll('.hz-tema button'), function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-tema') === t ? 'true' : 'false');
    });
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.hz-tema button');
    if (b) aplicar(b.getAttribute('data-tema'), true);
    if (e.target.closest && e.target.closest('.hz-tema-uno')) aplicar(tema() === 'oscuro' ? 'claro' : 'oscuro', true);
  });

  /* ---------- gráficos ---------- */
  var PARES = [['#3A3027', '#E6DFD3'], ['#4A4138', '#D6CDBF']];
  function convertir(v, osc) {
    if (typeof v !== 'string') return v;
    var l = v.toUpperCase();
    for (var i = 0; i < PARES.length; i++) {
      if (l === (osc ? PARES[i][0] : PARES[i][1])) return osc ? PARES[i][1] : PARES[i][0];
    }
    return v;
  }
  function mapear(ch) {
    var osc = tema() === 'oscuro';
    ((ch.config && ch.config.data && ch.config.data.datasets) || []).forEach(function (ds) {
      ['backgroundColor', 'borderColor', 'pointBackgroundColor', 'pointBorderColor'].forEach(function (k) {
        if (Array.isArray(ds[k])) ds[k] = ds[k].map(function (c) { return convertir(c, osc); });
        else if (ds[k]) ds[k] = convertir(ds[k], osc);
      });
    });
  }
  function graficos() {
    var C = window.Chart; if (!C || !C.defaults) return;
    var osc = tema() === 'oscuro';
    C.defaults.color = osc ? '#D6CDBF' : '#4A4138';
    C.defaults.borderColor = osc ? 'rgba(239,233,223,.12)' : 'rgba(58,48,39,.10)';
    if (!C.__hzTema && C.register) { C.__hzTema = true; C.register({ id: 'hzTema', beforeUpdate: mapear }); }
    var inst = C.instances || {};
    Object.keys(inst).forEach(function (k) { try { inst[k].update('none'); } catch (e) { /* gráfico sin lienzo */ } });
  }

  /* ---------- marco ---------- */
  var SUB = {
    censos: { t: 'Giles en sus censos', p: [['censos/', 'Censos 1980–2022'], ['censos/informe-radios-2022.html', 'Informe Censo 2022']] },
    presupuesto: { t: 'Observatorio económico', p: [['presupuesto/', 'El presupuesto de Giles, 2008–2026'], ['salud/', 'La salud que cuenta']] },
    salud: { t: 'Observatorio de salud', p: [['salud/', 'La salud que cuenta'], ['presupuesto/', 'El presupuesto de Giles']] },
    poblamiento: { t: 'Poblamiento y Vegetación', p: [
      ['crecimiento-urbano/', 'El Partido'], ['crecimiento-urbano/huella/', 'La huella urbana'], ['crecimiento-urbano/ciudad/', 'Ciudad'],
      ['crecimiento-urbano/pagos/de-a-caballo/', 'de a Caballo', '1'], ['crecimiento-urbano/pagos/campo-y-ciudad/', 'Campo y Ciudad', '2'],
      ['crecimiento-urbano/pagos/canada-de-la-cruz/', 'Cañada de la Cruz', '3'], ['crecimiento-urbano/pagos/canada-de-giles/', 'Cañada de Giles', '4'],
      ['crecimiento-urbano/pagos/tuyuti/', 'Tuyutí', '5'], ['crecimiento-urbano/pagos/heavy/', 'Heavy', '6'],
      ['crecimiento-urbano/pagos/produccion-norte/', 'Producción Norte', '7'], ['crecimiento-urbano/pagos/produccion-sur/', 'Producción Sur', '8'],
      ['crecimiento-urbano/pagos/recuperacion/', 'Recuperación', '9']] }
  };
  function aqui() {
    var r = location.href.split('#')[0].split('?')[0];
    var rel = r.indexOf(RAIZ) === 0 ? r.slice(RAIZ.length) : r.replace(/^.*?\/(censos|presupuesto|salud|crecimiento-urbano)\//, '$1/');
    return rel.replace(/index\.html$/, '');
  }
  function seccion(rel) {
    if (/^censos\//.test(rel)) return 'censos';
    if (/^presupuesto\//.test(rel)) return 'presupuesto';
    if (/^salud\//.test(rel)) return 'salud';
    if (/^crecimiento-urbano\//.test(rel)) return 'poblamiento';
    return 'plan';
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function lista(items, rel) {
    return items.map(function (x) {
      var cur = x[0] === rel ? ' aria-current="page"' : '';
      return '<li><a href="' + RAIZ + x[0] + '"' + cur + '>' + (x[2] ? '<small>' + x[2] + '</small>' : '') + esc(x[1]) + '</a></li>';
    }).join('');
  }

  function armar() {
    if (d.classList.contains('hz-plan')) {           /* portada: ya tiene encabezado y pie */
      var der = document.querySelector('.top-bar-content > span:last-child');
      if (der && !der.querySelector('.hz-tema')) der.insertAdjacentHTML('afterbegin', selectorHTML());
      pintarSelector(); graficos(); return;
    }
    if (document.querySelector('.hzm-tira')) return;
    var rel = aqui(), sec = seccion(rel), s = SUB[sec];
    var pagina = '';
    if (s) s.p.forEach(function (p) { if (p[0] === rel) pagina = (p[2] ? p[2] + ' · ' : '') + p[1]; });
    var titulo = s ? s.t : 'Plan SAG';
    if (pagina === titulo) pagina = '';

    /* ---- tira superior mínima con panel desplegable ---- */
    var t = document.createElement('header');
    t.className = 'hzm-tira';
    t.innerHTML =
      '<div class="hzm-in">' +
      '<a class="hzm-casa" href="' + RAIZ + '" title="Ir al inicio del Plan"><img src="' + RAIZ + 'img/escudo.webp" width="80" height="112" alt=""><b>PLAN SAG</b><span class="hzm-anios">2020–2035</span></a>' +
      '<span class="hzm-donde"><span class="hzm-sec">' + esc(titulo) + '</span>' + (pagina ? '<span class="hzm-pag">' + esc(pagina) + '</span>' : '') + '</span>' +
      '<button type="button" class="hz-tema-uno" aria-pressed="false"></button>' +
      '<button type="button" class="hzm-abrir" aria-expanded="false" aria-controls="hzm-panel"><span>Secciones</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
      '</div>' +
      '<div class="hzm-panel" id="hzm-panel" hidden><div class="hzm-in"><div class="hzm-cols">' +
      '<nav aria-label="El Plan"><h6>El Plan</h6><ul>' + lista([['', 'Inicio'], ['#fundamentos', 'De la recta a la senda'], ['#sendas', 'Sendas y Ocasiones'], ['#mapa', 'Mapa de Ocasiones'], ['#pueblos', 'Pueblos rurales'], ['#lineas', 'Líneas propositivas'], ['#educacion', 'Espacio Educativo'], ['#documentos', 'Los siete tomos'], ['#participacion', 'Participar']], rel) + '</ul></nav>' +
      '<nav aria-label="Datos abiertos"><h6>Datos abiertos</h6><ul>' + lista([['censos/', 'Giles en sus censos'], ['censos/informe-radios-2022.html', 'Informe Censo 2022'], ['presupuesto/', 'El presupuesto de Giles'], ['salud/', 'La salud que cuenta'], ['crecimiento-urbano/', 'Poblamiento y Vegetación']], rel) + '</ul></nav>' +
      (s && sec === 'poblamiento' ? '<nav aria-label="' + esc(s.t) + '" class="hzm-col-ancha"><h6>' + esc(s.t) + '</h6><ul>' + lista(s.p, rel) + '</ul></nav>' : '') +
      '</div><div class="hzm-panel-pie"><span>Partido de San Andrés de Giles · Consejo Municipal para el Desarrollo y el Ordenamiento Territorial (CMDOT)</span>' +
      selectorHTML() + '<a href="https://www.sanandresdegiles.gob.ar/" target="_blank" rel="noopener">Portal Municipalidad ↗</a></div>' +
      '</div></div>';
    var primero = document.body.firstElementChild;
    while (primero && /(^|\s)(sr|skip-link|cargando)(\s|$)/.test(primero.className)) primero = primero.nextElementSibling;
    document.body.insertBefore(t, primero);

    /* ---- pie en una tira ---- */
    var pie = document.createElement('footer');
    pie.className = 'hzm-pie';
    pie.innerHTML = '<div class="hzm-in">' +
      '<span class="hzm-pie-id"><b>PLAN SAG 2020–2035</b> · CMDOT · San Andrés de Giles · Ord. 2239/19 y 2747/25</span>' +
      '<nav class="hzm-pie-links" aria-label="Enlaces del pie">' +
      [['', 'Inicio'], ['#documentos', 'Tomos'], ['censos/', 'Censos'], ['presupuesto/', 'Presupuesto'], ['salud/', 'Salud'], ['crecimiento-urbano/', 'Poblamiento'], ['#participacion', 'Participar']]
        .map(function (x) { return '<a href="' + RAIZ + x[0] + '">' + esc(x[1]) + '</a>'; }).join('') +
      '<a href="https://www.sanandresdegiles.gob.ar/" target="_blank" rel="noopener">Municipalidad ↗</a></nav>' +
      '<a class="hzm-pie-arriba" href="#">↑ Arriba</a></div>';
    document.body.appendChild(pie);

    var bt = t.querySelector('.hzm-abrir'), panel = t.querySelector('.hzm-panel');
    function abrir(si) {
      bt.setAttribute('aria-expanded', si ? 'true' : 'false');
      panel.hidden = !si;
    }
    bt.addEventListener('click', function () { abrir(bt.getAttribute('aria-expanded') !== 'true'); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) { abrir(false); bt.focus(); } });
    document.addEventListener('click', function (e) { if (!panel.hidden && !t.contains(e.target)) abrir(false); });

    /* alto real de la tira, para que las páginas a pantalla completa (SIG) no se desborden */
    function medir() { d.style.setProperty('--hzm-arriba', t.querySelector('.hzm-in').offsetHeight + 'px'); }
    medir(); window.addEventListener('resize', medir);
    setTimeout(function () { try { window.dispatchEvent(new Event('resize')); } catch (e) { /* navegador viejo */ } }, 60);
    pintarSelector(); graficos();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', armar); else armar();
  window.addEventListener('load', graficos);
})();
