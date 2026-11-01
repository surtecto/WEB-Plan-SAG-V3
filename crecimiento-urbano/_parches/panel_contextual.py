"""Panel contextual «En el mapa ahora» para el SIG de la Ciudad y los nueve Pagos.
Aplica los mismos reemplazos a las 10 páginas (el código del SIG es idéntico en todas)."""
import glob, sys

ROOT = '/home/claude/web-plan-sag-v3/crecimiento-urbano/'
pages = sorted(glob.glob(ROOT + 'pagos/*/index.html')) + [ROOT + 'ciudad/index.html']

FUNCS = r'''
  /* ---------------- qué se ve: procedencia precisa según lo que está en pantalla ---------------- */
  function clasifCorto() {
    var r = S.hr && S.hrActual && S.hr[S.hrActual]; if (!r) return null;
    return (r.fecha === 'actual' ? 'Esri World Imagery de hoy' : 'Esri Wayback ' + dmy(r.fecha)) + (r.toma && r.toma.fecha ? ', toma ' + dmy(r.toma.fecha) : '');
  }
  function clasifTxt() {
    var r = S.hr && S.hrActual && S.hr[S.hrActual]; if (!r) return null;
    return clasifCorto() + (r.toma && r.toma.fuente ? ' (' + r.toma.fuente + (r.toma.res ? ', ' + fmt(r.toma.res, 2) + ' m' : '') + ')' : '') +
      ' · nivel z' + r.z + ' · ' + (r.ambito === 'mancha' ? 'pueblos y áreas suburbanas' : 'la vista del mapa de ese momento') + ' · calculada en este navegador el ' + r.cuando;
  }
  function procDe(e) {
    var id = e.id, ep = S.epoca;
    if (id === 'epoca') return ep ? [ep.tit, ep.src, ep.res].filter(Boolean).join(' · ') : (e.fd || e.f);
    if (id === 'clasif') return clasifTxt() || 'Todavía no se analizó ninguna imagen (pestaña Vegetación → Analizar una imagen)';
    if (id === 'mapbiomas') return 'MapBiomas Argentina, colección 2 · año ' + S.mbAnio + ' (todas las escenas Landsat de ese año) · 30 m';
    if (id === 'satDens' || id === 'hrSerie' || id === 'satComp') return 'Clasificación Landsat propia · época ' + epocaTxt(S.satAnio) + ' (la de la regla)';
    return e.fd || e.f || '';
  }
  var QV_SEC = {
    'fichaEpoca': ['epoca', 'satDens', 'hrSerie', 'satComp', 'satIng', 'radios', 'p1884', 'r1874', 'parcelas'],
    'sec-pueblos': ['pueblosA', 'satDens', 'satIng', 'satComp', 'hrMancha', 'hrVida', 'hrSerie'],
    'sec-rural': ['agrup', 'hrEdif', 'estancias', 'actividades'],
    'sec-cmp': ['satDens', 'hrSerie', 'satComp', 'satIng', 'cmp'],
    'sec-sup': ['hrMancha', 'hrEdif', 'hrVida', 'hrPil', 'hrCalle', 'clasif'],
    'sec-hr25': ['hrMancha', 'hrEdif', 'hrVida', 'hrPil', 'hrCalle'],
    'sec-sat': ['satDens', 'hrSerie', 'satComp', 'satIng', 'cmp']
  };
  function pintarVista() {
    var box = $('secVista'); if (!box) return;
    var rf = revisarFondo(), capas = ORDEN.filter(function (k) { return CAPAS[k].on; }).map(function (k) { return CAPAS[k]; });
    var tema = on_('manzanas') && S.tema !== 'ninguno' ? TEMAS.filter(function (t) { return t[0] === S.tema; })[0] : null;
    var fila = function (e) { return '<li><b>' + escH(e.n) + (e.id === 'manzanas' && tema ? ': ' + escH(tema[1]) : '') + '</b><span>' + escH(procDe(e)) + '</span></li>'; };
    box.innerHTML = '<div class="eyebrow">En el mapa ahora</div>' +
      '<div class="qv-f"><span>Imagen de fondo</span><b>' + escH(rf.f.txt) + '</b></div>' +
      rf.av.map(function (a) { return '<div class="qv-av">' + escH(a.t) + (a.b ? ' <button type="button" class="lnk" data-fix="' + a.fix + '">' + escH(a.b) + '</button>' : '') + '</div>'; }).join('') +
      (capas.length ? '<div class="qv-t">Capas, de arriba hacia abajo</div><ol class="qv">' + capas.map(fila).join('') + '</ol>' : '<p class="nota">Sólo el fondo: no hay capas encendidas.</p>') +
      '<p class="nota">Abajo, sólo las lecturas que corresponden a estas capas. El resumen general del territorio está al final del panel.</p>';
    Object.keys(QV_SEC).forEach(function (id) { var el = $(id); if (el) el.classList.toggle('qv-fuera', !QV_SEC[id].some(on_)); });
    var tm = $('temaMz'), tmS = tm && tm.closest('.sec'); if (tmS) tmS.classList.toggle('qv-fuera', !on_('manzanas'));
    LISTA.forEach(function (e) { var c = document.querySelector('.cf[data-id="' + e.id + '"] .cfd'); if (c) c.textContent = procDe(e); });
    var ex = $('expQue');
    if (ex) ex.innerHTML = '<b>Lo que sale en el mapa exportado</b><div><span>Fondo</span> ' + escH(rf.f.txt) + '</div>' +
      (capas.length ? capas.map(function (e) { return '<div><span>' + escH(e.n) + '</span> ' + escH(procDe(e)) + '</div>'; }).join('') : '<div>Sin capas encendidas.</div>');
  }
  (function () { var el = document.getElementById('secVista'); if (el) el.addEventListener('click', function (ev) { var b = ev.target.closest('[data-fix]'); if (b) arreglarFondo(b.getAttribute('data-fix')); }); })();
'''

REPL = [
    # funciones nuevas, antes de la leyenda
    ('  function leyenda() {\n', FUNCS + '  function leyenda() {\n', 1),
    # cada vez que cambia la leyenda, se actualiza el panel contextual
    ("store('leyCerrada', S.leyCerrada); leyenda(); };", "store('leyCerrada', S.leyCerrada); leyenda(); }; pintarVista();", 1),
    # la clasificación dice de qué imagen es
    ("'<b>Clasificación</b>'", "'<b>Clasificación · ' + escH(clasifCorto() || 'imagen analizada') + '</b>'", 1),
    # exportar: qué sale
    ("<div class=\"exp-in\"><label>Título del mapa", "<div class=\"exp-in\"><div class=\"exp-que\" id=\"expQue\"></div><label>Título del mapa", 1),
    ("d.querySelector('details').addEventListener('toggle', marcoExp);", "d.querySelector('details').addEventListener('toggle', marcoExp); d.querySelector('details').addEventListener('toggle', pintarVista);", 1),
    # hoja 2 del PDF: procedencia precisa y fondo
    ("tabla(['Capa', 'Origen', 'Opacidad', 'Fuente o contenido'], info.capas.map(function (e) { return { c: [e.n, ORIG[e.o][0], Math.round(e.op * 100) + ' %', e.f] }; }), [30, 10, 10, 50]);",
     "tabla(['Capa', 'Origen', 'Opacidad', 'Imagen, fecha y fuente'], info.capas.map(function (e) { return { c: [e.n, ORIG[e.o][0], Math.round(e.op * 100) + ' %', procDe(e)] }; }), [30, 10, 10, 50]);", 1),
    ("{ c: ['Época de la regla', ", "{ c: ['Imagen de fondo', fondoActual().txt] },\n      { c: ['Época de la regla', ", 1),
    # HTML: panel contextual arriba; lo general, al final y plegado
    ('<div class="sec guia" id="secGuia">', '<div class="sec qv-sec" id="secVista" aria-live="polite"></div>\n        <div class="sec guia" id="secGuia">', 1),
    ('<div class="sec" id="sec-pago" hidden><div id="resPago"></div></div>', '', 1),
    ('<div class="sec" id="sec-pend" hidden><div class="eyebrow">En proceso</div><h2>Lo que falta medir en este Pago</h2><div id="resPend"></div></div>', '', 1),
]
GEN = ('<details class="sec qv-gen" id="secGeneral"><summary>Resumen general del territorio</summary>'
       '<div class="sec" id="sec-pago" hidden><div id="resPago"></div></div>'
       '<div class="sec" id="sec-pend" hidden><div class="eyebrow">En proceso</div><h2>Lo que falta medir en este Pago</h2><div id="resPend"></div></div></details>\n      </section>\n      <!-- ARBOLADO -->')

for p in pages:
    s = open(p, encoding='utf8').read()
    if 'id="secVista"' in s:
        print('ya aplicado', p); continue
    for a, b, n in REPL:
        c = s.count(a)
        if c != n:
            sys.exit(f'{p}: «{a[:60]}» aparece {c} veces')
        s = s.replace(a, b)
    anchor = '      </section>\n      <!-- ARBOLADO -->'
    if s.count(anchor) != 1:
        sys.exit(f'{p}: ancla de cierre de Crecimiento: {s.count(anchor)}')
    s = s.replace(anchor, '      ' + GEN)
    open(p, 'w', encoding='utf8').write(s)
    print('ok', p.split('/')[-2])

# ---- fase 2: función protegida durante la carga y actualización tras cada análisis en vivo ----
for p in pages:
    s = open(p, encoding='utf8').read()
    if 'function pintarVista0()' in s:
        continue
    a = "  var QV_SEC = {"; b = "  function pintarVista() {\n    var box = $('secVista'); if (!box) return;\n"
    i = s.find(a); j = s.find(b)
    qv = s[i:j].replace('  var QV_SEC = {', '    var QV_SEC = {').replace('\n    ', '\n      ')
    s = s[:i] + "  function pintarVista() { try { pintarVista0(); } catch (err) { /* aún cargando */ } }\n  function pintarVista0() {\n    var box = $('secVista'); if (!box) return;\n" + qv + s[j + len(b):]
    s = s.replace('S.hrActual = r.key;', 'S.hrActual = r.key; setTimeout(pintarVista, 0);')
    a = "if (b) arreglarFondo(b.getAttribute('data-fix')); }); })();\n"
    k = s.find("document.getElementById('secVista')"); j = s.find(a, k)
    s = s[:j + len(a)] + "  setTimeout(pintarVista, 1200);\n" + s[j + len(a):]
    open(p, 'w', encoding='utf8').write(s)
