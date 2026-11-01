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
    Array.prototype.forEach.call(document.querySelectorAll('.hz-tema button'), function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-tema') === t ? 'true' : 'false');
    });
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.hz-tema button');
    if (b) aplicar(b.getAttribute('data-tema'), true);
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
  var NAV = [
    ['', 'Inicio', 'plan'], ['#fundamentos', 'De la recta a la senda'], ['#sendas', 'Sendas'], ['#mapa', 'Mapa'],
    ['#pueblos', 'Pueblos'], ['#lineas', 'Líneas'], ['#educacion', 'Aula'], ['#documentos', 'Tomos'], ['|'],
    ['censos/', 'Censos', 'censos', '#7A4E33'], ['presupuesto/', 'Presupuesto', 'presupuesto', '#A2934A'],
    ['salud/', 'Salud', 'salud', '#7B5A8E'], ['crecimiento-urbano/', 'Poblamiento', 'poblamiento', '#C4AE84'],
    ['#participacion', 'Participar', 'cta']
  ];
  var SUB = {
    censos: { t: 'Giles en sus censos', p: [['censos/', 'Censos 1980–2022'], ['censos/informe-radios-2022.html', 'Informe Censo 2022']] },
    presupuesto: { t: 'Observatorio económico', p: [['presupuesto/', 'El presupuesto de Giles, 2008–2026'], ['salud/', 'La salud que cuenta']] },
    salud: { t: 'Observatorio de salud', p: [['salud/', 'La salud que cuenta'], ['presupuesto/', 'El presupuesto de Giles']] },
    poblamiento: { t: 'Poblamiento y Vegetación', p: [
      ['crecimiento-urbano/', 'El Partido'], ['crecimiento-urbano/ciudad/', 'Ciudad'],
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

  function armar() {
    if (d.classList.contains('hz-plan')) {           /* portada: ya tiene encabezado y pie */
      var der = document.querySelector('.top-bar-content > span:last-child');
      if (der && !der.querySelector('.hz-tema')) der.insertAdjacentHTML('afterbegin', selectorHTML());
      pintarSelector(); graficos(); return;
    }
    if (document.querySelector('.hzm-cab')) return;
    var rel = aqui(), sec = seccion(rel), h = [];
    h.push('<div class="hzm-barra"><div class="hzm-in"><span class="hzm-inst">Partido de San Andrés de Giles • Consejo Municipal para el Desarrollo y el Ordenamiento Territorial (CMDOT)</span>' +
      '<span class="hzm-der">' + selectorHTML() + '<a href="https://www.sanandresdegiles.gob.ar/" target="_blank" rel="noopener">Portal Municipalidad ↗</a></span></div></div>');
    h.push('<header class="hzm-cab"><div class="hzm-in">' +
      '<a class="hzm-marca" href="' + RAIZ + '" aria-label="PLAN SAG 2020–2035 · Plan de Ordenamiento Territorial de San Andrés de Giles. Ir al inicio del Plan">' +
      '<img class="hzm-escudo" src="' + RAIZ + 'img/escudo.webp" srcset="' + RAIZ + 'img/escudo.webp 1x, ' + RAIZ + 'img/escudo-2x.webp 2x" width="80" height="112" alt="">' +
      '<img class="hzm-logo" src="' + RAIZ + 'img/logo-plan.webp" srcset="' + RAIZ + 'img/logo-plan.webp 1x, ' + RAIZ + 'img/logo-plan-2x.webp 2x" width="400" height="121" alt=""></a>' +
      '<button class="hzm-hamb" type="button" aria-expanded="false" aria-controls="hzm-nav" aria-label="Abrir menú del Plan"><span class="hamb" aria-hidden="true"><i></i><i></i><i></i></span><span class="hzm-hamb-t">Menú</span></button>' +
      '<nav class="hzm-nav" id="hzm-nav" aria-label="Secciones de la web del Plan">');
    NAV.forEach(function (n) {
      if (n[0] === '|') { h.push('<span class="hzm-sep" aria-hidden="true"></span>'); return; }
      var cls = n[2] === 'cta' ? 'hzm-cta' : (n[3] ? 'hzm-dato' : '');
      var cur = n[2] && n[2] === sec ? ' aria-current="page"' : '';
      h.push('<a href="' + RAIZ + n[0] + '"' + (cls ? ' class="' + cls + '"' : '') + (n[3] ? ' style="--c:' + n[3] + '"' : '') + cur + '>' + esc(n[1]) + '</a>');
    });
    h.push('</nav></div></header>');
    var s = SUB[sec];
    if (s) {
      h.push('<nav class="hzm-sub" aria-label="Páginas de ' + esc(s.t) + '"><div class="hzm-in"><span class="hzm-miga">' + esc(s.t) + '</span>');
      s.p.forEach(function (p) {
        var cur = p[0] === rel ? ' aria-current="page"' : '';
        h.push('<a href="' + RAIZ + p[0] + '"' + cur + '>' + (p[2] ? '<small>' + p[2] + '</small>' : '') + esc(p[1]) + '</a>');
      });
      h.push('</div></nav>');
    }
    var arriba = document.createElement('div');
    arriba.className = 'hzm-arriba';
    arriba.innerHTML = h.join('');
    var primero = document.body.firstElementChild;
    while (primero && /(^|\s)(sr|skip-link|cargando)(\s|$)/.test(primero.className)) primero = primero.nextElementSibling;
    /* barra y subnavegación quedan como hermanas del encabezado para que este quede fijo arriba */
    var nodos = Array.prototype.slice.call(arriba.children);
    nodos.forEach(function (n) { document.body.insertBefore(n, primero); });

    var pie = document.createElement('footer');
    pie.className = 'hzm-pie';
    pie.innerHTML = '<div class="hzm-in"><div class="hzm-pie-grid">' +
      '<div class="hzm-pie-marca"><div class="hzm-pie-ins">' +
      '<img class="hzm-logo" src="' + RAIZ + 'img/logo-plan-2x.webp" width="800" height="241" alt="PLAN 2020–2035 de Ordenamiento Territorial, San Andrés de Giles: planeando diversidades crecientes" loading="lazy">' +
      '<img class="hzm-escudo" src="' + RAIZ + 'img/escudo-2x.webp" width="172" height="240" alt="Escudo de la Municipalidad de San Andrés de Giles" loading="lazy"></div>' +
      '<h5>Consejo Municipal para el Desarrollo y el Ordenamiento Territorial</h5>' +
      '<p>Partido de San Andrés de Giles, Provincia de Buenos Aires.<br>Integrado por el Departamento Ejecutivo Municipal, el Honorable Concejo Deliberante y asesores técnicos externos. Creado por Ordenanza 2239/19 y prorrogado hasta 2035 por Ordenanza 2747/25.</p></div>' +
      '<div><h6>Navegación</h6><ul>' +
      [['', 'Inicio'], ['#fundamentos', 'De la recta a la senda'], ['#sendas', 'Sendas y Ocasiones'], ['#mapa', 'Mapa de Ocasiones'], ['#pueblos', 'Pueblos rurales'], ['#lineas', 'Líneas propositivas'], ['#educacion', 'Espacio Educativo'], ['#documentos', 'Los siete tomos']]
        .map(function (x) { return '<li><a href="' + RAIZ + x[0] + '">' + esc(x[1]) + '</a></li>'; }).join('') + '</ul></div>' +
      '<div><h6>Datos abiertos</h6><ul>' +
      [['censos/', 'Giles en sus censos (1980–2022)'], ['censos/informe-radios-2022.html', 'Informe: los radios del Censo 2022'], ['presupuesto/', 'El presupuesto de Giles (2008–2026)'], ['crecimiento-urbano/', 'Poblamiento y Vegetación (1874–2026)'], ['salud/', 'La salud que cuenta: salud y coparticipación']]
        .map(function (x) { return '<li><a href="' + RAIZ + x[0] + '">' + esc(x[1]) + '</a></li>'; }).join('') + '</ul></div>' +
      '<div><h6>Vínculos oficiales</h6><ul><li><a href="https://www.sanandresdegiles.gob.ar/" target="_blank" rel="noopener">Municipalidad de S. A. de Giles</a></li>' +
      '<li><a href="' + RAIZ + '#documentos">Descargar el Plan (siete tomos)</a></li><li><a href="' + RAIZ + '#participacion">Buzón Ciudadano</a></li></ul></div>' +
      '</div></div><p class="hzm-lema" aria-hidden="true">planeando diversidades crecientes</p>' +
      '<div class="hzm-in"><div class="hzm-pie-fin"><span>PLAN SAG 2020–2035 • Edición digital 2026 • San Andrés de Giles, Buenos Aires, Argentina. Información pública y accesible para toda la comunidad.</span>' +
      '<a href="#">↑ Volver arriba</a></div></div>';
    document.body.appendChild(pie);

    var bt = document.querySelector('.hzm-hamb'), nav = document.getElementById('hzm-nav');
    bt.addEventListener('click', function () {
      var abre = bt.getAttribute('aria-expanded') !== 'true';
      bt.setAttribute('aria-expanded', abre ? 'true' : 'false');
      bt.setAttribute('aria-label', abre ? 'Cerrar menú del Plan' : 'Abrir menú del Plan');
      nav.classList.toggle('show', abre);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('show')) { nav.classList.remove('show'); bt.setAttribute('aria-expanded', 'false'); bt.focus(); }
    });
    var actual = document.querySelector('.hzm-sub a[aria-current]');
    if (actual) { var c = actual.parentNode, x = actual.getBoundingClientRect().left - c.getBoundingClientRect().left + c.scrollLeft; if (x + actual.offsetWidth > c.clientWidth) c.scrollLeft = x - c.clientWidth / 2 + actual.offsetWidth / 2; }
    pintarSelector(); graficos();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', armar); else armar();
  window.addEventListener('load', graficos);
})();
