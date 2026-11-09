(function () {
  'use strict';
  var H = window.HUELLA, AREAS = H.areas, CIU = AREAS.filter(function (a) { return a.tipo === 'ciudad'; })[0], PUE = AREAS.filter(function (a) { return a.tipo === 'pueblo'; });
  var W = 1600, HH = 900, cv = document.getElementById('lienzo'), ctx = cv.getContext('2d');
  var $ = function (id) { return document.getElementById(id); };
  var fmt = function (v, d) { return v == null || isNaN(v) ? '—' : Number(v).toLocaleString('es-AR', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); };
  var GR = H.grupos, R_ING = ['#3b2a5a', '#2A5C7E', '#2f8a8a', '#6E9A50', '#c9b43a', '#e07a2e', '#c0392b'];
  function hex(c) { return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; }
  function rampa(st, t) { t = Math.max(0, Math.min(1, t)); var p = t * (st.length - 1), i = Math.min(st.length - 2, Math.floor(p)), f = p - i, a = hex(st[i]), b = hex(st[i + 1]); return 'rgb(' + a.map(function (v, k) { return Math.round(v + (b[k] - v) * f); }).join(',') + ')'; }
  function grupoDe(a) { for (var i = 0; i < GR.length; i++) if (GR[i][1].indexOf(a) >= 0) return i; return -1; }
  function colGrupo(i) { return rampa(R_ING, i / (GR.length - 1)); }
  var C84 = { muro: '#7A4E33', cerco: '#A2934A', alambrado: '#C4AE84', baldio: null, otro: '#9c9581' };
  var N84 = { muro: 'Lote con muro', cerco: 'Con cerco', alambrado: 'Con alambrado', baldio: 'Baldío' };

  /* ---------- estado y preferencias ---------- */
  var CAPAS = [
    { id: 'base', n: 'Imagen satelital de fondo', f: 'Esri World Imagery, versión Wayback 29/10/2026 (n.º 43291): referencia fija, la misma de las detecciones del SIG', on: true, op: 1 },
    { id: 'huella', n: 'Huella urbana por período', f: 'Ciudad: clasificación Landsat 1976–2026 · pueblos: huella de Google fechada con Landsat 1976–2023', on: true, op: 0.88 },
    { id: 'p1884', n: 'Planta urbana de 1884', f: 'Cerramiento de cada lote (muro, cerco, alambrado, baldío) · Atlas de Mensuras de Giles', on: true, op: 1 },
    { id: 'mz', n: 'Manzanas 2024', f: 'Parcelario COU 2024 (SIG municipal), sólo el contorno', on: false, op: 0.7 },
    { id: 'lim', n: 'Límites de la Ciudad y los Pagos', f: 'Capa de Pagos ajustada el 01/11/2026', on: true, op: 0.8 }
  ];
  var LS = (function () { try { return JSON.parse(localStorage.getItem('huella.capas') || '{}'); } catch (e) { return {}; } })();
  CAPAS.forEach(function (c) { if (LS[c.id]) { c.on = !!LS[c.id].on; c.op = +LS[c.id].op || c.op; } });
  var CP = {}; CAPAS.forEach(function (c) { CP[c.id] = c; });
  function guardarCapas() { try { var o = {}; CAPAS.forEach(function (c) { o[c.id] = { on: c.on, op: c.op }; }); localStorage.setItem('huella.capas', JSON.stringify(o)); } catch (e) { /* sin almacenamiento */ } }
  var S = { vista: 'todas', s: 0, play: false, ritmo: 1, grabando: false };

  /* ---------- proyección ---------- */
  var RT = 6378137, ORI = 20037508.342789244;
  function mx(lon) { return RT * lon * Math.PI / 180; }
  function my(lat) { return RT * Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360)); }
  function bboxM(b) { return [mx(b[0]), my(b[1]), mx(b[2]), my(b[3])]; }
  var COSL = Math.cos(34.45 * Math.PI / 180); // metros reales por metro Mercator

  /* ---------- línea de tiempo ---------- */
  var T = { a: 3.0, b: 2.2, c: 22.0, d: 4.0 };
  function total() { return (T.a + T.b + T.c + T.d) * S.ritmo; }
  function momento(s) {
    var k = S.ritmo, a = T.a * k, b = T.b * k, c = T.c * k;
    if (s < a) return { fase: '1884', anio: 1884, f: s / a };
    if (s < a + b) { var f = (s - a) / b; return { fase: 'salto', anio: 1884 + 92 * f, f: f }; }
    if (s < a + b + c) { var g = (s - a - b) / c; return { fase: 'serie', anio: 1976 + 50 * g, f: g }; }
    return { fase: 'fin', anio: 2026, f: Math.min(1, (s - a - b - c) / (T.d * k)) };
  }

  /* ---------- superficie por época ---------- */
  function serieDe(ar) {
    if (ar.tipo === 'ciudad') return ar.serie.map(function (x) { return [x.a, x.ha]; });
    return ar.serie.filter(function (x) { return x.ha != null && x.a <= 2023; }).map(function (x) { return [x.a, x.ha]; });
  }
  function haEn(ar, anio) {
    var s = serieDe(ar); if (!s.length || anio < s[0][0]) return null;
    for (var i = s.length - 1; i >= 0; i--) {
      if (anio >= s[i][0]) {
        var d = anio - s[i][0];
        if (i === s.length - 1 || d < 0.25) return { v: s[i][1], exacto: true };
        return { v: s[i][1] + (s[i + 1][1] - s[i][1]) * d / (s[i + 1][0] - s[i][0]), exacto: false };
      }
    }
    return null;
  }

  /* ---------- diseño ---------- */
  var L = {};
  function rectsTodas() {
    var top = 128, alto = 576, pan = [{ ar: CIU, x: 24, y: top, w: 660, h: alto }];
    var x0 = 708, w0 = 1576 - x0, cols = 4, gap = 12, cw = (w0 - gap * (cols - 1)) / cols, ch = (alto - gap) / 2;
    PUE.forEach(function (ar, i) { pan.push({ ar: ar, x: x0 + (i % cols) * (cw + gap), y: top + Math.floor(i / cols) * (ch + gap), w: cw, h: ch, rotulo: 42 }); });
    L.vacio = PUE.length < 8 ? { x: x0 + (PUE.length % cols) * (cw + gap), y: top + Math.floor(PUE.length / cols) * (ch + gap), w: cw, h: ch - 42 } : null;
    return pan;
  }
  function ajustar(pan, mismaEscala) {
    var mppP = 0;
    pan.forEach(function (p) {
      var b = bboxM(p.ar.bbox), hRot = p.rotulo || 46, cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2;
      var ext = p.ar.tipo === 'ciudad' && p.ar.p1884 ? b : b;
      p.cx = cx; p.cy = cy; p.mh = p.h - hRot;
      var mg = p.ar.tipo === 'ciudad' ? 1.05 : 1.1;
      p.mpp = Math.max((b[2] - b[0]) * mg / p.w, (b[3] - b[1]) * mg / p.mh);
      if (p.ar.tipo === 'pueblo') mppP = Math.max(mppP, p.mpp);
    });
    if (mismaEscala) pan.forEach(function (p) { if (p.ar.tipo === 'pueblo') p.mpp = mppP; });
    pan.forEach(function (p) { p.mpp = Math.max(p.mpp, 1.2); });
    return pan;
  }
  function disenar() {
    var pan;
    if (S.vista === 'todas') pan = ajustar(rectsTodas(), true);
    else { L.vacio = null; var ar = AREAS.filter(function (a) { return a.id === S.vista; })[0]; pan = ajustar([{ ar: ar, x: 24, y: 128, w: 1552, h: 576 }], false); }
    pan.forEach(prepararPanel);
    L.pan = pan;
  }
  function proy(p, lon, lat) { return [p.w / 2 + (mx(lon) - p.cx) / p.mpp, p.mh / 2 - (my(lat) - p.cy) / p.mpp]; }
  function camino(p, g) {
    var path = new Path2D(), polys = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
    polys.forEach(function (poly) { poly.forEach(function (ring) { ring.forEach(function (c, i) { var q = proy(p, c[0], c[1]); if (i) path.lineTo(q[0], q[1]); else path.moveTo(q[0], q[1]); }); path.closePath(); }); });
    return path;
  }
  function prepararPanel(p) {
    var ar = p.ar;
    p.ing = ar.ing.map(function (x) { return { a: x.a, ha: x.ha, path: camino(p, x.g), col: x.a ? colGrupo(grupoDe(x.a)) : '#a59f90' }; }).sort(function (u, v) { return (u.a || 9999) - (v.a || 9999); });
    p.p84 = (ar.p1884 || []).map(function (x) { return { oc: x.oc, path: camino(p, x.g) }; });
    p.mz = ar.mz ? camino(p, ar.mz) : null;
    p.lim = H.limites.features.map(function (f) { return camino(p, f.geometry); });
    p.base = null; cargarBase(p);
  }

  /* ---------- fondo satelital (teselas con CORS: el lienzo puede grabarse) ---------- */
  var URLT = 'https://wayback.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/WMTS/1.0.0/default028mm/MapServer/tile/' + H.fondo.n + '/{z}/{y}/{x}';
  var CACHE = {}, fallas = 0;
  function cargarBase(p) {
    var z = Math.max(10, Math.min(18, Math.ceil(Math.log2(156543.03392 / p.mpp)))), ts = 2 * ORI / Math.pow(2, z);
    var x0 = p.cx - p.w / 2 * p.mpp, x1 = p.cx + p.w / 2 * p.mpp, y1 = p.cy + p.mh / 2 * p.mpp, y0 = p.cy - p.mh / 2 * p.mpp;
    var tx0 = Math.floor((x0 + ORI) / ts), tx1 = Math.floor((x1 + ORI) / ts), ty0 = Math.floor((ORI - y1) / ts), ty1 = Math.floor((ORI - y0) / ts);
    var oc = document.createElement('canvas'); oc.width = Math.ceil(p.w); oc.height = Math.ceil(p.mh); var o = oc.getContext('2d');
    var faltan = 0;
    for (var tx = tx0; tx <= tx1; tx++) for (var ty = ty0; ty <= ty1; ty++) (function (tx, ty) {
      faltan++;
      var url = URLT.replace('{z}', z).replace('{x}', tx).replace('{y}', ty);
      var img = CACHE[url];
      var pintar = function () { var px = (tx * ts - ORI - x0) / p.mpp, py = (ORI - ty * ts - y1) / p.mpp * -1, sz = ts / p.mpp; o.drawImage(img, px, py, sz + 0.6, sz + 0.6); };
      var listo = function () { faltan--; if (!faltan) { p.base = oc; pedir(); } };
      if (img && img.complete && img.naturalWidth) { pintar(); p.base = oc; p.teselas = (p.teselas || 0) + 1; listo(); return; }
      if (!img) { img = new Image(); img.crossOrigin = 'anonymous'; img.src = url; CACHE[url] = img; }
      img.addEventListener('load', function () { pintar(); p.base = oc; p.teselas = (p.teselas || 0) + 1; pedir(); listo(); });
      img.addEventListener('error', function () { fallas++; avisarFallas(); listo(); });
    })(tx, ty);
  }
  function avisarFallas() { if (fallas === 1) $('estado').textContent = 'Algunas teselas de la imagen de fondo no cargaron: la huella se ve igual, sobre fondo liso.'; }

  /* ---------- colores del tema ---------- */
  function tema() {
    var cs = getComputedStyle(document.documentElement), v = function (k, d) { return (cs.getPropertyValue(k) || '').trim() || d; };
    return { bg: v('--hz-blanco', '#fff'), suave: v('--hz-g50', '#FAF8F5'), tx: v('--hz-suelo', '#3A3027'), t2: v('--hz-g500', '#5F574D'), t3: v('--hz-g300', '#7D7366'), borde: v('--hz-borde', '#E4DED3'), ac: v('--hz-cardo', '#7B5A8E'), osc: document.documentElement.getAttribute('data-hz') === 'oscuro' };
  }
  var FT = '"Plus Jakarta Sans","Segoe UI",system-ui,sans-serif';
  function fuente(w, px) { return w + ' ' + px + 'px ' + FT; }

  /* ---------- dibujo ---------- */
  function dibujar() {
    var m = momento(S.s), C = tema();
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, HH);
    cabecera(m, C);
    L.pan.forEach(function (p) { panel(p, m, C); });
    if (L.vacio) sinSerie(L.vacio, C);
    banda(m, C);
    $('anioOut').textContent = m.fase === 'salto' ? '…' : Math.floor(m.anio);
    if (!S.arrastrando) $('regla').value = Math.round(S.s / total() * 1000);
  }
  function cabecera(m, C) {
    var una = S.vista !== 'todas', ar = una ? L.pan[0].ar : null;
    ctx.fillStyle = C.t3; ctx.font = fuente(700, 15); ctx.textBaseline = 'alphabetic';
    ctx.fillText('SAN ANDRÉS DE GILES  /  ' + (una && ar.tipo === 'pueblo' ? ar.primera + '–2023' : '1884–2026'), 24, 40);
    ctx.fillStyle = C.tx; ctx.font = fuente(800, 40);
    ctx.fillText(una ? (ar.tipo === 'ciudad' ? 'La Ciudad, de la planta trazada a la huella' : ar.n + ': la huella fechada') : 'Las áreas urbanas del Partido', 24, 86);
    ctx.fillStyle = C.t2; ctx.font = fuente(500, 16);
    if (m.fase === 'fin' && m.f > 0.05) { ctx.globalAlpha = Math.min(1, m.f * 3); ctx.fillStyle = C.ac; ctx.font = fuente(700, 16); ctx.fillText(cierre(una ? ar : null), 24, 112); ctx.globalAlpha = 1; } else
    ctx.fillText(una ? 'Evolución de la huella urbana · ' + pagoTxt(ar) : 'Evolución de la huella urbana · la Ciudad y siete pueblos; los pueblos, a la misma escala entre sí', 24, 112);
    ctx.textAlign = 'right'; ctx.fillStyle = C.t3; ctx.font = fuente(700, 14); ctx.fillText('AÑO', 1576, 36);
    ctx.fillStyle = C.tx; ctx.font = fuente(800, 64);
    ctx.fillText(m.fase === 'salto' ? Math.floor(m.anio) : String(Math.floor(m.anio)), 1576, 98);
    if (m.fase === 'salto') { ctx.fillStyle = C.ac; ctx.font = fuente(600, 15); ctx.fillText('92 años sin imágenes: de la planta de 1884 al primer Landsat', 1576, 118); }
    ctx.textAlign = 'left';
  }
  function alfaEpoca(a, anio) { if (anio < a) return 0; return Math.min(1, 0.2 + (anio - a) / 1.1); }
  function panel(p, m, C) {
    var ar = p.ar, hRot = p.rotulo || 46;
    ctx.save(); ctx.translate(p.x, p.y);
    // marco del mapa
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, p.w, p.mh); ctx.clip();
    ctx.fillStyle = C.suave; ctx.fillRect(0, 0, p.w, p.mh);
    var foto = p.foto = CP.base.on && !!p.base && CP.base.op > 0.35 && p.teselas > 0;
    if (CP.base.on && p.base) { ctx.globalAlpha = CP.base.op; ctx.drawImage(p.base, 0, 0); ctx.globalAlpha = 1; if (CP.base.op > 0.3) { ctx.fillStyle = C.osc ? 'rgba(0,0,0,.18)' : 'rgba(255,255,255,.08)'; ctx.fillRect(0, 0, p.w, p.mh); } }
    if (CP.mz.on && p.mz) { ctx.globalAlpha = CP.mz.op; ctx.strokeStyle = foto ? 'rgba(255,255,255,.75)' : C.t3; ctx.lineWidth = 0.7; ctx.stroke(p.mz); ctx.globalAlpha = 1; }
    if (CP.lim.on) { ctx.globalAlpha = CP.lim.op; ctx.strokeStyle = foto ? 'rgba(255,255,255,.9)' : C.t2; ctx.lineWidth = 1.4; ctx.setLineDash([6, 4]); p.lim.forEach(function (q) { ctx.stroke(q); }); ctx.setLineDash([]); ctx.globalAlpha = 1; }
    // 1884
    if (CP.p1884.on && p.p84.length) {
      var a84 = m.fase === '1884' ? 1 : m.fase === 'salto' ? 1 - 0.65 * m.f : 0.35;
      p.p84.forEach(function (q) {
        ctx.globalAlpha = CP.p1884.op * a84;
        if (C84[q.oc]) { ctx.fillStyle = C84[q.oc]; ctx.fill(q.path, 'evenodd'); }
        ctx.strokeStyle = q.oc === 'baldio' ? '#C4AE84' : 'rgba(58,48,39,.55)'; ctx.lineWidth = q.oc === 'baldio' ? 1 : 0.4; if (q.oc === 'baldio') ctx.setLineDash([3, 3]); ctx.stroke(q.path); ctx.setLineDash([]);
      });
      ctx.globalAlpha = 1;
    }
    // huella
    if (CP.huella.on && (m.fase === 'serie' || m.fase === 'fin')) {
      p.ing.forEach(function (q) {
        var al;
        if (q.a === 0) al = ar.tipo === 'pueblo' && m.anio >= 2023 ? Math.min(1, (m.anio - 2023) / 1.2) : 0;
        else al = alfaEpoca(q.a, m.anio);
        if (al <= 0) return;
        ctx.globalAlpha = CP.huella.op * al; ctx.fillStyle = q.col; ctx.fill(q.path, 'evenodd');
        ctx.strokeStyle = q.col; ctx.lineWidth = 0.6; ctx.stroke(q.path);
      });
      ctx.globalAlpha = 1;
    }
    // notas sobre el mapa
    ctx.font = fuente(600, ar.tipo === 'ciudad' ? 15 : 12); ctx.fillStyle = foto ? '#fff' : C.tx; ctx.shadowColor = foto ? 'rgba(0,0,0,.65)' : 'transparent'; ctx.shadowBlur = foto ? 4 : 0;
    var nota = '';
    if (ar.tipo === 'ciudad' && m.fase === '1884') nota = '1884 · planta trazada: ' + fmt(sumaP84(ar), 0) + ' ha de lotes; con muro, ' + fmt(haP84(ar, 'muro'), 1) + ' ha';
    else if (ar.tipo === 'ciudad' && CP.p1884.on && (m.fase === 'serie' || m.fase === 'fin')) { var kk = cob84(ar, m.anio); if (kk) nota = 'Planta de 1884 ocupada: ' + fmt(kk.pct) + ' % · huella fuera de ella: ' + fmt(kk.fuera) + ' ha'; }
    else if (ar.tipo === 'pueblo' && (m.fase === 'serie' || m.fase === 'fin') && ar.primera && m.anio < ar.primera) nota = 'Landsat todavía no lo distingue del campo';
    else if (ar.tipo === 'pueblo' && m.anio > 2023.4) nota = S.vista === 'todas' ? 'Sin dato posterior a 2023' : 'Sin dato posterior a 2023. En gris, huella anterior a 2023 que Landsat no logra fechar (lotes muy arbolados)';
    if (nota) wrap(nota, 10, ar.tipo === 'pueblo' && S.vista === 'todas' ? 20 : p.mh - (ar.tipo === 'ciudad' ? 40 : 30), p.w - 20, ar.tipo === 'ciudad' ? 18 : 14);
    ctx.shadowBlur = 0;
    if (ar.tipo === 'ciudad' && S.vista === 'todas') ventanaPueblos(p, C);
    escala(p, C);
    ctx.restore();
    // rótulo
    ctx.strokeStyle = C.borde; ctx.lineWidth = 1; ctx.strokeRect(0.5, 0.5, p.w - 1, p.mh - 1);
    var h = haEn(ar, Math.min(m.anio, ar.tipo === 'pueblo' ? 2023 : 2026)), grande = ar.tipo === 'ciudad';
    ctx.fillStyle = C.tx; ctx.font = fuente(800, grande ? 20 : 14); ctx.fillText(ar.n, 0, p.mh + (grande ? 26 : 18));
    var anchoN = ctx.measureText(ar.n).width;
    ctx.textAlign = 'right'; ctx.font = fuente(800, grande ? 20 : 14); ctx.fillStyle = C.ac;
    var vis = m.fase === 'serie' || m.fase === 'fin';
    ctx.fillText(vis && h ? (h.exacto ? '' : '≈ ') + fmt(h.v, h.v < 20 ? 1 : 0) + ' ha' : (ar.tipo === 'ciudad' && !vis ? fmt(sumaP84(ar), 0) + ' ha trazadas' : '—'), p.w, p.mh + (grande ? 26 : 18));
    ctx.textAlign = 'left'; ctx.fillStyle = C.t3;
    ajustarTexto(grande ? 'Clasificación Landsat directa · 150 escenas · ' + pagoTxt(ar) : pagoTxt(ar), 0, p.mh + (grande ? 44 : 34), p.w, 500, grande ? 13 : 11, 9);
    ctx.restore();
  }
  function ajustarTexto(t, x, y, w, peso, px, min) {
    var f = px; ctx.font = fuente(peso, f); while (ctx.measureText(t).width > w && f > min) { f -= 0.5; ctx.font = fuente(peso, f); }
    if (ctx.measureText(t).width > w) { while (t.length > 3 && ctx.measureText(t + '…').width > w) t = t.slice(0, -1); t += '…'; }
    ctx.fillText(t, x, y);
  }
  function pagoTxt(ar) { return ar.tipo === 'ciudad' ? 'Pago Ciudad cabecera' : (ar.pagos.length > 1 ? 'Pagos ' : 'Pago ') + ar.pagos.join(' y '); }
  function sinSerie(v, C) {
    ctx.save(); ctx.translate(v.x, v.y); ctx.strokeStyle = C.borde; ctx.setLineDash([5, 4]); ctx.strokeRect(0.5, 0.5, v.w - 1, v.h - 1); ctx.setLineDash([]);
    ctx.fillStyle = C.tx; ctx.font = fuente(800, 14); ctx.fillText('Franklin', 12, 26);
    ctx.fillStyle = C.t2; ctx.font = fuente(500, 12); wrap('Sin serie. Falta procesar la celda de edificaciones de Google que lo cubre; no se lo dibuja para no inventar su huella.', 12, 48, v.w - 24, 16);
    ctx.restore();
  }
  function wrap(t, x, y, w, lh) { var pal = t.split(' '), l = '', ys = y; pal.forEach(function (q) { var pr = l ? l + ' ' + q : q; if (ctx.measureText(pr).width > w && l) { ctx.fillText(l, x, ys); ys += lh; l = q; } else l = pr; }); if (l) ctx.fillText(l, x, ys); }
  function cierre(ar) {
    if (!ar) { var s = serieDe(CIU), a = s[0], b = s[s.length - 1], cz = CIU.censos, h10 = haEn(CIU, 2010).v, h22 = haEn(CIU, 2022).v;
      return 'La Ciudad: de ' + fmt(a[1]) + ' a ' + fmt(b[1]) + ' ha (×' + fmt(b[1] / a[1], 1) + '). Entre 2010 y 2022, +' + fmt((cz['2022'].pob / cz['2010'].pob - 1) * 100) + ' % de habitantes y +' + fmt((h22 / h10 - 1) * 100) + ' % de huella.'; }
    var t = serieDe(ar), a0 = t[0], b0 = t[t.length - 1];
    return ar.n + ': de ' + fmt(a0[1], a0[1] < 20 ? 1 : 0) + ' ha en ' + epocaTxt(a0[0]) + ' a ' + fmt(b0[1], b0[1] < 20 ? 1 : 0) + ' ha en ' + epocaTxt(b0[0]) + ' (×' + fmt(b0[1] / a0[1], 1) + ')' + (ar.pob22 >= 30 ? '; ' + fmt((ar.huella_ha || b0[1]) * 1e4 / ar.pob22) + ' m² de huella por habitante censado en 2022.' : '.');
  }
  function cob84(ar, anio) { var k = null; (ar.cob84 || []).forEach(function (x) { if (x.a <= anio) k = x; }); return k; }
  function sumaP84(ar) { return (ar.p1884 || []).reduce(function (s, x) { return s + x.ha; }, 0); }
  function haP84(ar, k) { var x = (ar.p1884 || []).filter(function (q) { return q.oc === k; })[0]; return x ? x.ha : 0; }
  function escala(p, C) {
    var mReal = p.mpp * COSL, opciones = [100, 200, 250, 500, 1000, 2000], lm = opciones[0];
    opciones.forEach(function (o) { if (o / mReal <= p.w * 0.28) lm = o; });
    var px = lm / mReal, x = p.w - px - 12, y = p.mh - 14;
    ctx.fillStyle = p.foto ? 'rgba(0,0,0,.45)' : C.bg; ctx.globalAlpha = p.foto ? 1 : 0.8; ctx.fillRect(x - 6, y - 18, px + 12, 26); ctx.globalAlpha = 1;
    ctx.fillStyle = p.foto ? '#fff' : C.tx; ctx.fillRect(x, y, px, 3);
    ctx.font = fuente(600, 11); ctx.textAlign = 'center'; ctx.fillText(lm >= 1000 ? lm / 1000 + ' km' : lm + ' m', x + px / 2, y - 5); ctx.textAlign = 'left';
  }
  function ventanaPueblos(p, C) {
    var q = L.pan.filter(function (x) { return x.ar.tipo === 'pueblo'; })[0]; if (!q) return;
    var k = q.mpp / p.mpp, w = q.w * q.mpp / p.mpp, h = q.mh * q.mpp / p.mpp;
    ctx.font = fuente(600, 12); ctx.fillStyle = p.foto ? '#fff' : C.t2; ctx.shadowColor = p.foto ? 'rgba(0,0,0,.7)' : 'transparent'; ctx.shadowBlur = 3;
    if (w < p.w * 0.4 && h < p.mh * 0.5) {
      var x = p.w - w - 12, y = 12; ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 1.2; ctx.setLineDash([4, 3]); ctx.strokeRect(x, y, w, h); ctx.setLineDash([]);
      ctx.textAlign = 'right'; ctx.fillText('lo que abarca cada cuadro de pueblo', x - 6, y + 12); ctx.textAlign = 'left';
    } else ctx.fillText('La Ciudad se dibuja ' + fmt(k, 1) + ' veces más grande que los pueblos', 12, 22);
    ctx.shadowBlur = 0;
  }

  /* ---------- banda inferior: cifras, curva y leyenda ---------- */
  function banda(m, C) {
    var y0 = 726, vis = m.fase === 'serie' || m.fase === 'fin';
    ctx.strokeStyle = C.borde; ctx.beginPath(); ctx.moveTo(24, y0 - 8); ctx.lineTo(1576, y0 - 8); ctx.stroke();
    // cifras
    ctx.fillStyle = C.t3; ctx.font = fuente(700, 13); ctx.fillText('ÁREA URBANA', 24, y0 + 14);
    if (S.vista === 'todas') {
      var hc = vis ? haEn(CIU, m.anio) : null, hp = vis ? sumaPueblos(Math.min(m.anio, 2023)) : null;
      ctx.fillStyle = C.tx; ctx.font = fuente(800, 40); ctx.fillText(hc ? (hc.exacto ? '' : '≈') + fmt(hc.v) : fmt(sumaP84(CIU)), 24, y0 + 58);
      ctx.font = fuente(600, 14); ctx.fillStyle = C.t2; ctx.fillText(hc ? 'ha en la Ciudad' : 'ha trazadas en 1884 (Ciudad)', 24, y0 + 78);
      ctx.fillStyle = C.tx; ctx.font = fuente(800, 26); ctx.fillText(hp && hp.n ? (hp.todos ? '' : '≥ ') + fmt(hp.v) : '—', 24, y0 + 118);
      ctx.font = fuente(600, 14); ctx.fillStyle = C.t2; ctx.fillText(hp && hp.n ? 'ha en ' + (hp.todos ? 'los siete pueblos' : hp.n + ' de los 7 pueblos fechables') : 'pueblos: sin imagen todavía', 24, y0 + 138);
    } else {
      var ar = L.pan[0].ar, h = vis ? haEn(ar, Math.min(m.anio, ar.tipo === 'pueblo' ? 2023 : 2026)) : null, s0 = serieDe(ar)[0];
      ctx.fillStyle = C.tx; ctx.font = fuente(800, 44); ctx.fillText(h ? (h.exacto ? '' : '≈') + fmt(h.v, h.v < 20 ? 1 : 0) : (ar.tipo === 'ciudad' && !vis ? fmt(sumaP84(ar)) : '—'), 24, y0 + 60);
      ctx.font = fuente(600, 14); ctx.fillStyle = C.t2; ctx.fillText(h ? 'ha de huella' : (ar.tipo === 'ciudad' && !vis ? 'ha trazadas en 1884' : 'sin imagen que lo distinga'), 24, y0 + 82);
      if (h && s0) { ctx.fillStyle = C.ac; ctx.font = fuente(700, 18); ctx.fillText('×' + fmt(h.v / s0[1], 1) + ' desde ' + epocaTxt(s0[0]), 24, y0 + 118); }
    }
    curva(m, C, 440, y0 + 6, 750, 122);
    leyenda(m, C, 1214, y0 + 4);
    ctx.fillStyle = C.t3; ctx.font = fuente(500, 11);
    ctx.fillText('Fuentes: Landsat 2–9 (USGS/NASA, servicio Esri) · Google Open Buildings v3 (≤ may. 2023) · Atlas de Mensuras de Giles (planta 1884) · Fondo: Esri World Imagery, versión 29/10/2026 · Plan SAG · Arq. J. P. Addesso, CMDOT', 24, 892);
  }
  function epocaTxt(a) { var e = H.epocas.filter(function (x) { return x.a === a; })[0]; return e ? e.ep : String(a); }
  function sumaPueblos(anio) { var v = 0, n = 0; PUE.forEach(function (ar) { var h = haEn(ar, anio); if (h) { v += h.v; n++; } }); return { v: v, n: n, todos: n === PUE.length }; }
  function curva(m, C, x, y, w, h) {
    var series = S.vista === 'todas' ? [{ ar: CIU, col: C.ac, gr: 3 }].concat(PUE.map(function (ar) { return { ar: ar, col: C.t3, gr: 1 }; })) : [{ ar: L.pan[0].ar, col: C.ac, gr: 3 }];
    var max = 0; series.forEach(function (s) { serieDe(s.ar).forEach(function (q) { max = Math.max(max, q[1]); }); });
    if (S.vista === 'todas') { for (var a = 2013; a <= 2023; a++) { var sp = sumaPueblos(a); if (sp.todos) max = Math.max(max, sp.v); } }
    max = Math.ceil(max * 1.1 / (max > 200 ? 100 : max > 50 ? 20 : 5)) * (max > 200 ? 100 : max > 50 ? 20 : 5);
    var X = function (a) { return x + (a - 1976) / 50 * w; }, Y = function (v) { return y + h - v / max * h; };
    ctx.fillStyle = C.t3; ctx.font = fuente(700, 12); ctx.fillText('SUPERFICIE ACUMULADA (ha)', x, y + 8);
    ctx.strokeStyle = C.borde; ctx.lineWidth = 1; ctx.font = fuente(500, 11);
    [1980, 1990, 2000, 2010, 2020].forEach(function (a) { ctx.beginPath(); ctx.moveTo(X(a), y + 14); ctx.lineTo(X(a), y + h); ctx.stroke(); ctx.fillStyle = C.t3; ctx.textAlign = 'center'; ctx.fillText(a, X(a), y + h + 14); });
    [max / 2, max].forEach(function (v) { ctx.beginPath(); ctx.moveTo(x, Y(v)); ctx.lineTo(x + w, Y(v)); ctx.stroke(); ctx.textAlign = 'right'; ctx.fillStyle = C.t3; ctx.fillText(fmt(v), x - 6, Y(v) + 4); });
    ctx.textAlign = 'left';
    var hasta = m.fase === 'serie' || m.fase === 'fin' ? m.anio : 1975;
    function linea(pts, col, gr, guion) {
      var ps = pts.filter(function (q) { return q[0] <= hasta; }); if (!ps.length) return;
      var ult = pts.filter(function (q) { return q[0] > hasta; })[0];
      ctx.strokeStyle = col; ctx.lineWidth = gr; ctx.setLineDash(guion ? [6, 4] : []); ctx.beginPath();
      ps.forEach(function (q, i) { if (i) ctx.lineTo(X(q[0]), Y(q[1])); else ctx.moveTo(X(q[0]), Y(q[1])); });
      if (ult) { var a0 = ps[ps.length - 1], f = (hasta - a0[0]) / (ult[0] - a0[0]); ctx.lineTo(X(hasta), Y(a0[1] + (ult[1] - a0[1]) * f)); }
      ctx.stroke(); ctx.setLineDash([]);
      if (gr > 1) { ctx.fillStyle = col; ps.forEach(function (q) { ctx.beginPath(); ctx.arc(X(q[0]), Y(q[1]), gr > 2 ? 3 : 2, 0, 7); ctx.fill(); }); }
    }
    series.slice().reverse().forEach(function (s) { linea(serieDe(s.ar), s.col, s.gr, false); });
    if (S.vista === 'todas') {
      var sp = []; for (var a = 2013; a <= 2023; a++) { var q = sumaPueblos(a); if (q.todos) sp.push([a, q.v]); }
      linea(sp, C.tx, 2, true);
      ctx.font = fuente(600, 11);
      var lab = [[C.ac, 'Ciudad'], [C.tx, 'Siete pueblos (desde 2013, cuando todos se distinguen)'], [C.t3, 'Cada pueblo']];
      lab.forEach(function (l, i) { ctx.strokeStyle = l[0]; ctx.lineWidth = i === 0 ? 3 : i === 1 ? 2 : 1; ctx.setLineDash(i === 1 ? [6, 4] : []); ctx.beginPath(); ctx.moveTo(x + 210 + [0, 70, 410][i], y + 4); ctx.lineTo(x + 230 + [0, 70, 410][i], y + 4); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = C.t2; ctx.fillText(l[1], x + 234 + [0, 70, 410][i], y + 8); });
    }
    if (hasta >= 1976) { ctx.strokeStyle = C.ac; ctx.globalAlpha = 0.5; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(X(Math.min(hasta, 2026)), y + 14); ctx.lineTo(X(Math.min(hasta, 2026)), y + h); ctx.stroke(); ctx.globalAlpha = 1; }
  }
  function leyenda(m, C, x, y) {
    ctx.fillStyle = C.t3; ctx.font = fuente(700, 12);
    var en84 = m.fase === '1884' || m.fase === 'salto';
    if (en84 && CP.p1884.on) {
      ctx.fillText('1884 · CERRAMIENTO DE CADA LOTE', x, y + 8);
      ['muro', 'cerco', 'alambrado', 'baldio'].forEach(function (k, i) {
        var yy = y + 24 + i * 22; if (C84[k]) { ctx.fillStyle = C84[k]; ctx.fillRect(x, yy - 10, 18, 12); } else { ctx.strokeStyle = '#C4AE84'; ctx.setLineDash([3, 3]); ctx.strokeRect(x + 0.5, yy - 9.5, 17, 11); ctx.setLineDash([]); }
        ctx.fillStyle = C.t2; ctx.font = fuente(500, 13); ctx.fillText(N84[k] + ' · ' + fmt(haP84(CIU, k), 1) + ' ha', x + 26, yy);
      });
      return;
    }
    ctx.fillText('PERÍODO EN QUE APARECE', x, y + 8);
    GR.forEach(function (g, i) {
      var col = Math.floor(i / 5), fila = i % 5, xx = x + col * 180, yy = y + 26 + fila * 21, act = (m.fase === 'serie' || m.fase === 'fin') && m.anio >= g[1][0];
      ctx.globalAlpha = act ? 1 : 0.3; ctx.fillStyle = colGrupo(i); ctx.fillRect(xx, yy - 10, 18, 12);
      ctx.fillStyle = C.t2; ctx.font = fuente(act ? 600 : 500, 13); ctx.fillText(g[0], xx + 26, yy); ctx.globalAlpha = 1;
    });
    ctx.fillStyle = '#a59f90'; ctx.fillRect(x + 180, y + 26 + 3 * 21 - 10, 18, 12); ctx.fillStyle = C.t2; ctx.font = fuente(500, 12); ctx.fillText('Sin fecha (pueblos)', x + 206, y + 26 + 3 * 21);
  }

  /* ---------- animación ---------- */
  var ult = 0, raf = 0, pend = false;
  function pedir() { if (!S.play && !pend) { pend = true; requestAnimationFrame(function () { pend = false; dibujar(); }); } }
  function bucle(t) {
    if (!S.play) return;
    var dt = ult ? (t - ult) / 1000 : 0; ult = t; S.s += dt;
    if (S.s >= total()) { S.s = total(); dibujar(); parar(); if (S.grabando) terminarGrabacion(); return; }
    dibujar(); raf = requestAnimationFrame(bucle);
  }
  function arrancar() { if (S.s >= total() - 0.01) S.s = 0; S.play = true; ult = 0; $('btPlay').textContent = '❚❚ Pausa'; $('btPlay').setAttribute('aria-pressed', 'true'); raf = requestAnimationFrame(bucle); }
  function parar() { S.play = false; cancelAnimationFrame(raf); $('btPlay').textContent = '▶ Reproducir'; $('btPlay').setAttribute('aria-pressed', 'false'); }

  /* ---------- grabación (el lienzo entero: mapa, cifras, curva y fuentes) ---------- */
  var rec = null, trozos = [];
  function tipoVideo() { var t = ['video/mp4;codecs=avc1.42E01E', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm']; for (var i = 0; i < t.length; i++) if (window.MediaRecorder && MediaRecorder.isTypeSupported(t[i])) return t[i]; return null; }
  function grabar() {
    var tipo = tipoVideo(); if (!tipo || !cv.captureStream) { $('estado').textContent = 'Este navegador no puede grabar el lienzo. Probá con Chrome o Edge de escritorio.'; return; }
    try {
      var st = cv.captureStream(30); trozos = []; rec = new MediaRecorder(st, { mimeType: tipo, videoBitsPerSecond: 9000000 });
      rec.ondataavailable = function (e) { if (e.data && e.data.size) trozos.push(e.data); };
      rec.onstop = function () {
        var b = new Blob(trozos, { type: tipo.split(';')[0] }), a = document.createElement('a'), ext = tipo.indexOf('mp4') >= 0 ? 'mp4' : 'webm';
        a.href = URL.createObjectURL(b); a.download = 'huella_urbana_SAG_' + (S.vista) + '.' + ext; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
        $('estado').textContent = 'Video listo (' + ext.toUpperCase() + ', ' + fmt(b.size / 1048576, 1) + ' MB). Si la red social no acepta WebM, convertilo a MP4.';
        S.grabando = false; $('btGrabar').disabled = false;
      };
      S.grabando = true; $('btGrabar').disabled = true; $('estado').textContent = 'Grabando la animación completa (' + Math.round(total()) + ' s)…';
      S.s = 0; dibujar(); rec.start(500); arrancar();
    } catch (e) { $('estado').textContent = 'No se pudo grabar: ' + e.message; S.grabando = false; $('btGrabar').disabled = false; }
  }
  function terminarGrabacion() { setTimeout(function () { if (rec && rec.state !== 'inactive') rec.stop(); }, 600); }

  /* ---------- controles ---------- */
  function controles() {
    var sv = $('selVista');
    sv.innerHTML = '<option value="todas">Todas las áreas urbanas</option>' + AREAS.map(function (a) { return '<option value="' + a.id + '">' + a.n + '</option>'; }).join('');
    sv.onchange = function () { S.vista = sv.value; disenar(); dibujar(); };
    $('selRitmo').onchange = function () { var f = S.s / total(); S.ritmo = +this.value; S.s = f * total(); dibujar(); };
    $('btPlay').onclick = function () { if (S.play) parar(); else arrancar(); };
    var rg = $('regla');
    rg.addEventListener('input', function () { S.arrastrando = true; parar(); S.s = rg.value / 1000 * total(); dibujar(); S.arrastrando = false; });
    $('btGrabar').onclick = grabar;
    var bp = $('btPantalla');
    if (!cv.requestFullscreen && !cv.webkitRequestFullscreen) bp.hidden = true;
    else bp.onclick = function () { var f = cv.requestFullscreen || cv.webkitRequestFullscreen; try { var r = f.call(cv); if (r && r.catch) r.catch(function () {}); if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(function () {}); } catch (e) { /* sin pantalla completa */ } };
    $('btPng').onclick = function () { cv.toBlob(function (b) { var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'huella_urbana_SAG_' + S.vista + '_' + Math.floor(momento(S.s).anio) + '.png'; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 3000); }); };
    var box = $('capas');
    CAPAS.forEach(function (c) {
      var d = document.createElement('div'); d.className = 'hu-capa';
      d.innerHTML = '<input type="checkbox" id="cp-' + c.id + '"' + (c.on ? ' checked' : '') + '><label for="cp-' + c.id + '">' + c.n + '</label><input type="range" min="0" max="100" value="' + Math.round(c.op * 100) + '" aria-label="Opacidad de ' + c.n + '"><small>' + c.f + '</small>';
      d.querySelector('input[type=checkbox]').onchange = function () { c.on = this.checked; guardarCapas(); dibujar(); };
      d.querySelector('input[type=range]').oninput = function () { c.op = this.value / 100; guardarCapas(); dibujar(); };
      box.appendChild(d);
    });
    document.addEventListener('keydown', function (e) { if (e.target === document.body && e.code === 'Space') { e.preventDefault(); if (S.play) parar(); else arrancar(); } });
    new MutationObserver(function () { dibujar(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-hz'] });
  }

  /* ---------- textos y tablas ---------- */
  function textos() {
    var sc = serieDe(CIU), c0 = sc[0], cN = sc[sc.length - 1], c22 = haEn(CIU, 2022).v, K = CIU.cob84 || [], k0 = K[0] || {}, kN = K[K.length - 1] || {};
    var tot23 = sumaPueblos(2023).v, vr = PUE.filter(function (a) { return a.n === 'Villa Ruiz'; })[0];
    $('txtResumen').innerHTML = 'La Ciudad pasó de ' + fmt(c0[1]) + ' ha en ' + epocaTxt(c0[0]) + ' a ' + fmt(cN[1]) + ' ha en ' + epocaTxt(cN[0]) + ' (×' + fmt(cN[1] / c0[1], 1) + '). En 1884 ya había ' + fmt(sumaP84(CIU)) + ' ha de lotes trazados; en ' + epocaTxt(k0.a) + ' la huella cubría el ' + fmt(k0.pct) + ' % de esa planta y ya ocupaba ' + fmt(k0.fuera) + ' ha fuera de ella; en ' + epocaTxt(kN.a) + ' cubre el ' + fmt(kN.pct) + ' %, con ' + fmt(kN.fuera) + ' ha afuera. La Ciudad salió de su trazado antes de llenarlo. Los siete pueblos con serie suman ' + fmt(tot23) + ' ha de huella en 2023, ' + fmt(tot23 / haEn(CIU, 2023).v * 100) + ' % de lo que ocupa la Ciudad ese año' + (vr ? '. Entre 2013 y 2023 Villa Ruiz pasó de ' + fmt(haEn(vr, 2013).v) + ' a ' + fmt(haEn(vr, 2023).v) + ' ha (+' + fmt(haEn(vr, 2023).v - haEn(vr, 2013).v) + '), mientras la Ciudad, con cuarenta veces más habitantes, sumaba ' + fmt(haEn(CIU, 2023).v - haEn(CIU, 2013).v) + ' ha' : '') + '.';
    var cz = CIU.censos, hab = [['1991', 1991], ['2001', 2001], ['2010', 2010], ['2022', 2022]].map(function (q) { var hh = haEn(CIU, q[1]).v, p = cz[q[0]] ? cz[q[0]].pob : null; return { a: q[0], pob: p, ha: hh, m2: p ? hh * 1e4 / p : null }; });
    $('tablaHab').innerHTML = '<thead><tr><th class="izq">Censo</th><th>Habitantes</th><th>Huella Landsat (ha)</th><th>m² de huella por habitante</th></tr></thead><tbody>' + hab.map(function (r) { return '<tr><td>' + r.a + '</td><td>' + fmt(r.pob) + '</td><td>' + fmt(r.ha, 1) + '</td><td>' + fmt(r.m2) + '</td></tr>'; }).join('') + '</tbody>';
    var h10 = hab[2], h22 = hab[3];
    var filas = [CIU].concat(PUE).map(function (ar) {
      var s = serieDe(ar), s0 = s[0], sN = s[s.length - 1], h13 = haEn(ar, 2013), pob = ar.tipo === 'ciudad' ? cz['2022'].pob : ar.pob22, hu = ar.tipo === 'ciudad' ? c22 : ar.huella_ha;
      return '<tr><td>' + ar.n + '</td><td class="izq">' + (ar.tipo === 'ciudad' ? 'Ciudad cabecera' : ar.pagos.join(' · ')) + '</td><td>' + epocaTxt(s0[0]) + '</td><td>' + fmt(s0[1], 1) + '</td><td>' + (h13 ? fmt(h13.v, 1) : '—') + '</td><td>' + fmt(sN[1], 1) + ' <small>(' + epocaTxt(sN[0]) + ')</small></td><td>×' + fmt(sN[1] / s0[1], 1) + '</td><td>' + (ar.sin_fecha_ha ? fmt(ar.sin_fecha_ha, 1) : '—') + '</td><td>' + (pob >= 30 ? fmt(pob) : '—') + '</td><td>' + (pob >= 30 ? fmt(hu * 1e4 / pob) : '—') + '</td></tr>';
    });
    $('tabla').innerHTML = '<thead><tr><th class="izq">Área</th><th class="izq">Pago</th><th>Primera época</th><th>ha entonces</th><th>ha 2013</th><th>Última época (ha)</th><th>Veces (desde la primera)</th><th>Sin fecha (ha)</th><th>Hab. 2022</th><th>m² por hab.</th></tr></thead><tbody>' + filas.join('') + '</tbody>';
    $('tablaNota').textContent = 'Ciudad: clasificación Landsat directa (unión de los polígonos por época). Pueblos: huella de Google Open Buildings v3 (imágenes anteriores a mayo de 2023) fechada con Landsat sobre el área completa de cada pueblo, aunque cruce el límite de un Pago; «sin fecha» son lotes muy arbolados que Landsat no logra fechar. m² por habitante: huella 2022 en la Ciudad y huella ≤ 2023 en los pueblos, sobre los habitantes del Censo 2022 repartidos por el SIG; en los pueblos chicos el reparto de radios rurales es aproximado. Franklin queda afuera: no tiene edificaciones de Google procesadas.';
    var vrm = vr && vr.pob22 ? vr.huella_ha * 1e4 / vr.pob22 : null;
    $('pregunta').innerHTML = '<p><b>Pregunta abierta.</b> Entre 2010 y 2022 la Ciudad sumó un ' + fmt((h22.pob / h10.pob - 1) * 100) + ' % de habitantes y su huella creció un ' + fmt((h22.ha / h10.ha - 1) * 100) + ' %: cada habitante ocupa hoy ' + fmt(h22.m2) + ' m² de suelo urbano, contra ' + fmt(h10.m2) + ' en 2010.' + (vrm ? ' En Villa Ruiz son ' + fmt(vrm) + ' m² por habitante censado.' : '') + '</p><p>La Ciudad ocupó suelo nuevo afuera de su planta fundacional mientras dentro de ella quedaban lotes sin construir. ¿Qué retuvo esos lotes: el precio, la herencia, la espera de valorización? ¿Y qué atrajo afuera: la ruta, el loteo barato, la quinta?</p><p>¿Es expansión, segunda residencia, quinta productiva o un modo de habitar que el Código todavía llama urbano sin que lo sea? ¿Qué mide una huella cuando la casa está vacía la mitad del año, y quién paga las calles, el agua y la luz que esa huella pide?</p>';
    var F = H.fuentes || {};
    $('fuentes').innerHTML = [
      '<b>Ciudad, 1976–2026.</b> ' + (F.ciudad ? F.ciudad.producto + '. ' + F.ciudad.fecha + '. ' + F.ciudad.res + '.' : '') + ' Recortada al límite de la Ciudad. Cada época es la combinación de sus escenas; los años entre épocas no tienen dato: la animación funde de una época a la otra y el contador marca con ≈ los valores interpolados.',
      '<b>Pueblos, 1976–2023.</b> Huella de Google Open Buildings v3 (imágenes de 50 cm anteriores a mayo de 2023, sin fecha por edificio) fechada con las mismas escenas Landsat: una celda de 30 m entra en la época en que empieza a comportarse como construida y lo sostiene en 6 de cada 10 épocas siguientes. Antes de la primera época que se distingue no se dibuja nada; después de 2023 no hay huella. Mismo código y mismos datos que las páginas de cada Pago, calculado sobre el área completa de cada pueblo.',
      '<b>1884.</b> Planta urbana con el cerramiento de cada lote (muro, cerco, alambrado, baldío), del Atlas de Mensuras de Giles (Archivo Histórico de Geodesia, PBA). Es lo trazado y cercado, no una huella edificada: el muro es lo más parecido a una casa que el plano registra.',
      '<b>Fondo.</b> Esri World Imagery, versión Wayback del 29/10/2026 (n.º 43291), la misma sobre la que el SIG midió la vegetación. Es una referencia fija: la huella de 1976 se ve sobre la ciudad de hoy. A diferencia de otras animaciones, no hay relieve: en la pampa ondulada el relieve no ordena la expansión; la ordenan las vías, las rutas y el parcelario.',
      '<b>Escala.</b> Los siete pueblos se dibujan a la misma escala entre sí; la Ciudad, a otra. El recuadro punteado sobre la Ciudad muestra cuánto abarca cada cuadro de pueblo.',
      '<b>Video.</b> «Grabar video» registra el lienzo completo (mapa, cifras, curva y fuentes) mientras corre la animación; según el navegador sale en MP4 o en WebM.'
    ].map(function (t) { return '<li>' + t + '</li>'; }).join('');
  }

  /* ---------- arranque ---------- */
  function iniciar() {
    controles(); textos(); disenar(); dibujar();
    var q = new URLSearchParams(location.search);
    if (q.get('vista') && AREAS.some(function (a) { return a.id === q.get('vista'); })) { S.vista = q.get('vista'); $('selVista').value = S.vista; disenar(); dibujar(); }
    if (!window.matchMedia || !window.matchMedia('(prefers-reduced-motion: reduce)').matches) setTimeout(arrancar, 700);
  }
  if (document.fonts && document.fonts.load) Promise.all([document.fonts.load(fuente(800, 40)), document.fonts.load(fuente(600, 14))]).then(iniciar, iniciar); else iniciar();
})();
