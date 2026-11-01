/* ==========================================================================
   Poblamiento y Vegetación · DETECCIÓN MULTISENSOR
   Ampliación urbana y vegetación con todas las imágenes de la regla:
   · Landsat 2, 3, 5, 7, 8 y 9 (1976–2026, 30 m), escenas reales del
     servicio Esri Landsat/MS, elegidas una por estación y nombradas.
   · Sentinel-2 L2A (2017–2026, 10 y 20 m), escenas de Element 84 Earth
     Search (AWS), con máscara de nubes SCL.
   Clasifica cada píxel con la trayectoria del año (NDVI máximo y mínimo,
   NDBI medio, MNDWI medio) en: construido o impermeable, vegetación verde
   todo el año, cultivos y pasturas, suelo con poca vegetación y agua.
   Mide dentro del Pago, de los pueblos o de la vista; compara períodos.
   Todo se calcula en el navegador: no se guarda en el servidor.
   ========================================================================== */
(function () {
  'use strict';
  var D = window.DATA, C = window.CORE;
  if (!D || !C || !window.L) return;
  var fmt = C.fmt, TER = D.ter || {}, ES_PAGO = TER.tipo === 'pago';
  var NOMBRE = ES_PAGO ? 'el Pago ' + TER.nombre : 'la Ciudad';
  var PFX = 'multi.' + (TER.slug || 'ciudad') + '.';
  var LS_MS = 'https://landsat2.arcgis.com/arcgis/rest/services/Landsat/MS/ImageServer';
  var STAC = 'https://earth-search.aws.element84.com/v1/search';
  var GEOTIFF_SRC = 'https://cdn.jsdelivr.net/npm/geotiff@2.1.3/dist-browser/geotiff.js';
  var HOY = new Date().getUTCFullYear();

  var CLS = [
    { n: 'Sin dato (nubes en todas las fechas o fuera de la escena)', c: 'rgba(0,0,0,0)' },
    { n: 'Construido denso (techos estimados ≥ 20 % de la celda de ≈55 m)', c: '#b3201b' },
    { n: 'Construido medio (techos 10 a 20 %)', c: '#e0602f' },
    { n: 'Construido disperso (techos desde el umbral, 5 % por defecto, hasta 10 %)', c: '#f0a94a' },
    { n: 'Vegetación verde todo el año (montes, cortinas, arboledas y pasturas perennes)', c: '#1d6a34' },
    { n: 'Cultivos y pasturas (verdes por temporada)', c: '#b6cf62' },
    { n: 'Suelo con poca vegetación, rastrojo o pastizal ralo', c: '#d9c49b' },
    { n: 'Agua', c: '#2a7ab8' }
  ];
  var URB = function (k) { return k >= 1 && k <= 3; };
  function haUrb(r) { return r.ha[1] + r.ha[2] + r.ha[3]; }
  var CAMBIO = [
    { n: 'Sin dato en alguna de las dos fechas', c: 'rgba(0,0,0,0)' },
    { n: 'Construido en las dos fechas (cualquier densidad)', c: '#6b6157' },
    { n: 'Construido nuevo (ampliación)', c: '#e0322a' },
    { n: 'Era construido y ya no lo parece (revisar)', c: '#f2c14e' },
    { n: 'Vegetación permanente nueva', c: '#2fa04a' },
    { n: 'Vegetación permanente perdida', c: '#8a4b1f' }
  ];
  var ESTAC = [['verano', 0, 2], ['otoño', 3, 5], ['invierno', 6, 8], ['primavera', 9, 11]];

  function store(k, v) { try { if (v === undefined) { var s = localStorage.getItem(PFX + k); return s == null ? null : JSON.parse(s); } localStorage.setItem(PFX + k, JSON.stringify(v)); } catch (e) { return null; } }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function $(id) { return document.getElementById(id); }
  function dmy(iso) { return iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4) : ''; }
  function cargarGeoTIFF() {
    if (window.GeoTIFF) return Promise.resolve(window.GeoTIFF);
    return new Promise(function (ok, ko) { var s = document.createElement('script'); s.src = GEOTIFF_SRC; s.onload = function () { ok(window.GeoTIFF); }; s.onerror = function () { ko(new Error('no se pudo cargar geotiff.js')); }; document.head.appendChild(s); });
  }

  /* ---------- UTM 21 S (EPSG:32721), la de las escenas Sentinel-2 del Partido ---------- */
  function utm21(lon, lat) {
    var a = 6378137, f = 1 / 298.257223563, k0 = 0.9996, e2 = f * (2 - f), ep2 = e2 / (1 - e2), lon0 = -57 * Math.PI / 180;
    var phi = lat * Math.PI / 180, lam = lon * Math.PI / 180, s = Math.sin(phi), c = Math.cos(phi), t = Math.tan(phi);
    var N = a / Math.sqrt(1 - e2 * s * s), T = t * t, Cc = ep2 * c * c, A = c * (lam - lon0);
    var M = a * ((1 - e2 / 4 - 3 * e2 * e2 / 64 - 5 * e2 * e2 * e2 / 256) * phi - (3 * e2 / 8 + 3 * e2 * e2 / 32 + 45 * e2 * e2 * e2 / 1024) * Math.sin(2 * phi) +
      (15 * e2 * e2 / 256 + 45 * e2 * e2 * e2 / 1024) * Math.sin(4 * phi) - (35 * e2 * e2 * e2 / 3072) * Math.sin(6 * phi));
    var x = k0 * N * (A + (1 - T + Cc) * A * A * A / 6 + (5 - 18 * T + T * T + 72 * Cc - 58 * ep2) * Math.pow(A, 5) / 120) + 500000;
    var y = k0 * (M + N * t * (A * A / 2 + (5 - T + 9 * Cc + 4 * Cc * Cc) * Math.pow(A, 4) / 24 + (61 - 58 * T + T * T + 600 * Cc - 330 * ep2) * Math.pow(A, 6) / 720)) + 10000000;
    return [x, y];
  }

  /* ---------- ámbitos: cada uno es una o varias zonas con su grilla Mercator ---------- */
  function bboxGeom(geoms) {
    var b = [Infinity, Infinity, -Infinity, -Infinity];
    geoms.forEach(function (g) { C.geomRings(g).forEach(function (poly) { poly.forEach(function (ring) { ring.forEach(function (p) { if (p[0] < b[0]) b[0] = p[0]; if (p[1] < b[1]) b[1] = p[1]; if (p[0] > b[2]) b[2] = p[0]; if (p[1] > b[3]) b[3] = p[1]; }); }); }); });
    return b;
  }
  function geomsTer() {
    var fc = TER.poly && TER.poly.features ? TER.poly.features : [];
    if (!fc.length && D.limites) fc = D.limites.features.filter(function (f) { return f.properties.slug === TER.slug; });
    return fc.map(function (f) { return f.geometry; });
  }
  function zonas(ambito, res) {
    var out = [], mk = function (nom, geoms, b) {
      var latc = (b[1] + b[3]) / 2, s = res / Math.cos(latc * Math.PI / 180), m0 = C.merc(b[0], b[3]), m1 = C.merc(b[2], b[1]);
      var x0 = Math.floor(m0[0] / s) * s, y0 = Math.ceil(m0[1] / s) * s, w = Math.ceil((m1[0] - x0) / s), h = Math.ceil((y0 - m1[1]) / s);
      var grid = { x0: x0, y0: y0, sx: s, sy: s, w: w, h: h }, mask = new Uint8Array(w * h);
      if (geoms) geoms.forEach(function (g) { var m = C.rasterizeMask(g, grid); for (var i = 0; i < m.length; i++) if (m[i]) mask[i] = 1; }); else mask.fill(1);
      out.push({ nom: nom, grid: grid, mask: mask, res: res });
    };
    if (ambito === 'pueblos') {
      (D.pueblos ? D.pueblos.features : []).forEach(function (f) { mk(f.properties.n, [f.geometry], bboxGeom([f.geometry])); });
    } else if (ambito === 'vista') {
      var map = window.SIG_MAP, b = map.getBounds();
      mk('Vista del mapa', null, [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]);
    } else {
      var g = geomsTer(); mk(ES_PAGO ? 'Pago ' + TER.nombre : 'Ciudad', g, bboxGeom(g));
    }
    return out;
  }
  function pixeles(zs) { return zs.reduce(function (a, z) { return a + z.grid.w * z.grid.h; }, 0); }

  /* ---------- catálogo de escenas ---------- */
  function envZonas(zs) {
    var b = [Infinity, Infinity, -Infinity, -Infinity];
    zs.forEach(function (z) { var g = z.grid; b[0] = Math.min(b[0], g.x0); b[1] = Math.min(b[1], g.y0 - g.h * g.sy); b[2] = Math.max(b[2], g.x0 + g.w * g.sx); b[3] = Math.max(b[3], g.y0); });
    return b;
  }
  var _catLs = null;
  function catalogoLandsat(zs) {
    var b = envZonas(zs), env = encodeURIComponent(JSON.stringify({ xmin: b[0], ymin: b[1], xmax: b[2], ymax: b[3], spatialReference: { wkid: 3857 } }));
    var key = b.map(function (v) { return Math.round(v); }).join(',');
    if (_catLs && _catLs.key === key) return Promise.resolve(_catLs.f);
    var url = LS_MS + '/query?where=Category%3D1&geometry=' + env + '&geometryType=esriGeometryEnvelope&inSR=3857&spatialRel=esriSpatialRelIntersects&outFields=OBJECTID,AcquisitionDate,CloudCover,SensorName,Name&returnGeometry=false&orderByFields=AcquisitionDate&resultRecordCount=2000&f=json';
    return fetch(url).then(function (r) { return r.json(); }).then(function (j) {
      if (j.error) throw new Error('catálogo Landsat: ' + (j.error.message || 'error'));
      var f = (j.features || []).map(function (x) { var a = x.attributes; return { id: a.OBJECTID, fecha: new Date(a.AcquisitionDate).toISOString().slice(0, 10), nube: a.CloudCover, sensor: a.SensorName, nombre: a.Name }; });
      _catLs = { key: key, f: f }; return f;
    });
  }
  // períodos Landsat: las épocas de una sola escena (1976–2011) y cada año desde 2013
  function periodosLandsat(cat) {
    var porAnio = {};
    cat.forEach(function (e) { var y = +e.fecha.slice(0, 4); (porAnio[y] = porAnio[y] || []).push(e); });
    var anios = Object.keys(porAnio).map(Number).sort(), out = [], viejos = anios.filter(function (y) { return y < 2013; });
    var grupos = [];
    viejos.forEach(function (y) { var g = grupos[grupos.length - 1]; if (g && y - g[g.length - 1] <= 1) g.push(y); else grupos.push([y]); });
    grupos.forEach(function (g) { var es = []; g.forEach(function (y) { es = es.concat(porAnio[y]); }); out.push({ k: 'L' + g[0], t: g.length > 1 ? g[0] + '–' + g[g.length - 1] : String(g[0]), anio: g[g.length - 1], escenas: es }); });
    anios.filter(function (y) { return y >= 2013; }).forEach(function (y) { out.push({ k: 'L' + y, t: String(y), anio: y, escenas: porAnio[y] }); });
    return out;
  }
  // una fecha por estación: la de menos nubes; todas las escenas de esa fecha (filas contiguas)
  function elegirFechas(escenas, nubeMax) {
    var porFecha = {};
    escenas.forEach(function (e) { (porFecha[e.fecha] = porFecha[e.fecha] || []).push(e); });
    var fechas = Object.keys(porFecha), elegidas = [];
    if (fechas.length <= 2) return fechas.sort().map(function (f) { return { fecha: f, items: porFecha[f] }; });
    ESTAC.forEach(function (st) {
      var cand = fechas.filter(function (f) { var m = +f.slice(5, 7) - 1; return m >= st[1] && m <= st[2]; })
        .map(function (f) { var it = porFecha[f], n = it.reduce(function (a, e) { return a + (e.nube == null ? 0.5 : e.nube); }, 0) / it.length; return { fecha: f, items: it, nube: n }; })
        .filter(function (x) { return x.nube <= nubeMax; })
        .sort(function (a, b) { return b.items.length - a.items.length || a.nube - b.nube; });
      if (cand.length) elegidas.push({ fecha: cand[0].fecha, items: cand[0].items, estacion: st[0] });
    });
    return elegidas.sort(function (a, b) { return a.fecha < b.fecha ? -1 : 1; });
  }
  function catalogoS2(zs, anio) {
    var b = envZonas(zs), sw = C.unmerc(b[0], b[1]), ne = C.unmerc(b[2], b[3]);
    var body = { collections: ['sentinel-2-l2a'], bbox: [sw[0], sw[1], ne[0], ne[1]], datetime: anio + '-01-01T00:00:00Z/' + anio + '-12-31T23:59:59Z', limit: 500, query: { 'eo:cloud_cover': { lt: 40 } } };
    return fetch(STAC, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(function (r) { return r.json(); }).then(function (j) {
      return (j.features || []).map(function (f) {
        var p = f.properties, a = f.assets;
        return { id: f.id, bbox: f.bbox, fecha: (p.datetime || '').slice(0, 10), nube: (p['eo:cloud_cover'] || 0) / 100, sensor: p.platform || 'sentinel-2', base: parseFloat(p['s2:processing_baseline'] || '0'), corregido: !!p['earthsearch:boa_offset_applied'],
          tile: p['s2:mgrs_tile'] || p['grid:code'] || f.id.split('_')[1],
          url: { green: a.green && a.green.href, red: a.red && a.red.href, nir: a.nir && a.nir.href, swir16: a.swir16 && a.swir16.href, scl: a.scl && a.scl.href } };
      }).filter(function (e) {
        // sólo COG por https (algunos registros traen JPEG 2000 en s3://, que el navegador no lee)
        return ['green', 'red', 'nir', 'swir16', 'scl'].every(function (b) { return /^https:.*\.tif$/i.test(e.url[b] || ''); });
      }).filter(function (e, i, arr) {
        // una sola versión por fecha y tesela (Earth Search a veces publica dos procesamientos)
        return arr.findIndex(function (x) { return x.fecha === e.fecha && x.tile === e.tile; }) === i;
      });
    });
  }

  /* ---------- lectura de imágenes: cada fecha devuelve bandas en la grilla de cada zona ---------- */
  function leerLandsat(fecha, z) {
    var g = z.grid, ids = fecha.items.map(function (e) { return e.id; });
    var url = LS_MS + '/exportImage?bbox=' + [g.x0, g.y0 - g.h * g.sy, g.x0 + g.w * g.sx, g.y0].join(',') + '&bboxSR=3857&imageSR=3857&size=' + g.w + ',' + g.h +
      '&format=tiff&pixelType=F32&noData=-9999&interpolation=RSP_NearestNeighbor&renderingRule=' + encodeURIComponent(JSON.stringify({ rasterFunction: 'None' })) +
      '&mosaicRule=' + encodeURIComponent(JSON.stringify({ mosaicMethod: 'esriMosaicLockRaster', lockRasterIds: ids })) + '&f=image';
    return fetch(url).then(function (r) { return r.arrayBuffer(); }).then(function (buf) {
      return window.GeoTIFF.fromArrayBuffer(buf).then(function (t) { return t.getImage(); }).then(function (im) { return im.readRasters(); })
        .then(function (ras) {
          var N = g.w * g.h, B = { g: new Float32Array(N), r: new Float32Array(N), n: new Float32Array(N), s: new Float32Array(N), swir: false };
          var mss = /MSS/i.test(fecha.items[0].sensor || '');
          for (var p = 0; p < N; p++) {
            var gr = ras[2][p], rd = ras[3][p], ni = ras[4][p], s1 = ras[5][p];
            var ok = rd > 1 && ni > 1 && rd !== -9999 && ni !== -9999;
            B.g[p] = ok ? gr : NaN; B.r[p] = ok ? rd : NaN; B.n[p] = ok ? ni : NaN; B.s[p] = ok && !mss && s1 > 1 ? s1 : NaN;
            if (ok && !mss && s1 > 1) B.swir = true;
          }
          return B;
        }).catch(function () { return null; }); // fecha sin escena en esta zona
    });
  }
  var _tif = {};
  function abrirCOG(url) { if (!_tif[url]) _tif[url] = window.GeoTIFF.fromUrl(url).then(function (t) { return t.getImage(); }); return _tif[url]; }
  function leerS2(fecha, z, avance) {
    var g = z.grid, N = g.w * g.h;
    // coordenadas UTM del centro de cada píxel de la grilla (una vez por zona)
    if (!z.utm) {
      z.utm = new Float64Array(N * 2);
      for (var j = 0; j < g.h; j++) for (var i = 0; i < g.w; i++) {
        var ll = C.unmerc(g.x0 + (i + 0.5) * g.sx, g.y0 - (j + 0.5) * g.sy), u = utm21(ll[0], ll[1]), p = j * g.w + i;
        z.utm[2 * p] = u[0]; z.utm[2 * p + 1] = u[1];
      }
      var ux = [Infinity, -Infinity], uy = [Infinity, -Infinity];
      for (var q = 0; q < N; q++) { var X = z.utm[2 * q], Y = z.utm[2 * q + 1]; if (X < ux[0]) ux[0] = X; if (X > ux[1]) ux[1] = X; if (Y < uy[0]) uy[0] = Y; if (Y > uy[1]) uy[1] = Y; }
      z.ubox = [ux[0] - z.res, uy[0] - z.res, ux[1] + z.res, uy[1] + z.res];
    }
    var B = { g: new Float32Array(N).fill(NaN), r: new Float32Array(N).fill(NaN), n: new Float32Array(N).fill(NaN), s: new Float32Array(N).fill(NaN), swir: true };
    var bandas = [['green', 'g'], ['red', 'r'], ['nir', 'n'], ['swir16', 's'], ['scl', 'scl']];
    var g0 = C.unmerc(g.x0, g.y0 - g.h * g.sy), g1 = C.unmerc(g.x0 + g.w * g.sx, g.y0);
    var items = fecha.items.filter(function (it) { var bb = it.bbox; return !bb || !(bb[2] < g0[0] || bb[0] > g1[0] || bb[3] < g0[1] || bb[1] > g1[1]); });
    return Promise.all(items.map(function (it) {
      var off = it.base >= 4 && !it.corregido ? 1000 : 0, cap = {}; // Earth Search ya resta el desplazamiento de 1000 de la línea de base 04.00
      return Promise.all(bandas.map(function (bd) {
        return abrirCOG(it.url[bd[0]]).then(function (im) {
          var o = im.getOrigin(), rs = im.getResolution(), W = im.getWidth(), H = im.getHeight();
          var px0 = Math.max(0, Math.floor((z.ubox[0] - o[0]) / rs[0])), px1 = Math.min(W, Math.ceil((z.ubox[2] - o[0]) / rs[0]));
          var py0 = Math.max(0, Math.floor((o[1] - z.ubox[3]) / -rs[1])), py1 = Math.min(H, Math.ceil((o[1] - z.ubox[1]) / -rs[1]));
          if (px1 <= px0 || py1 <= py0) { cap[bd[1]] = null; return; }
          var esc_ = Math.max(1, z.res / rs[0]), ww = Math.max(1, Math.round((px1 - px0) / esc_)), hh = Math.max(1, Math.round((py1 - py0) / esc_));
          return im.readRasters({ window: [px0, py0, px1, py1], width: ww, height: hh, resampleMethod: bd[1] === 'scl' ? 'nearest' : 'bilinear', interleave: false }).then(function (ras) {
            if (avance) avance(bd[0]);
            cap[bd[1]] = { a: ras[0], x0: o[0] + px0 * rs[0], y0: o[1] + py0 * rs[1], dx: (px1 - px0) * rs[0] / ww, dy: (py1 - py0) * -rs[1] / hh, w: ww, h: hh };
          });
        });
      })).catch(function () { cap = {}; /* escena ilegible: se omite */ }).then(function () {
        if (!cap.r || !cap.n) return;
        var smp = function (c, X, Y) { if (!c) return NaN; var ci = Math.floor((X - c.x0) / c.dx), cj = Math.floor((c.y0 - Y) / c.dy); if (ci < 0 || cj < 0 || ci >= c.w || cj >= c.h) return NaN; return c.a[cj * c.w + ci]; };
        for (var p = 0; p < N; p++) {
          var X = z.utm[2 * p], Y = z.utm[2 * p + 1], sc = smp(cap.scl, X, Y);
          if (sc !== sc || sc === 0 || sc === 1 || sc === 3 || sc === 8 || sc === 9 || sc === 10) continue; // sin dato, saturado, sombra de nube, nubes, cirros
          var rd = smp(cap.r, X, Y), ni = smp(cap.n, X, Y); if (!(rd > 0 && ni > 0)) continue;
          B.r[p] = rd - off; B.n[p] = ni - off; B.g[p] = smp(cap.g, X, Y) - off; B.s[p] = smp(cap.s, X, Y) - off;
        }
      });
    })).then(function () { return B; });
  }

  /* ---------- rasgos del año por píxel ---------- */
  function rasgos(stack, N) {
    var mx = new Float32Array(N).fill(-2), mn = new Float32Array(N).fill(2), sm = new Float32Array(N), nb = new Float32Array(N), nw = new Float32Array(N), cnt = new Uint8Array(N), cs = new Uint8Array(N);
    stack.forEach(function (B) {
      for (var p = 0; p < N; p++) {
        var r = B.r[p], n = B.n[p]; if (!(r === r && n === n) || r + n <= 0) continue;
        var v = (n - r) / (n + r); if (v > mx[p]) mx[p] = v; if (v < mn[p]) mn[p] = v; sm[p] += v; cnt[p]++;
        var s = B.s[p], g = B.g[p];
        if (s === s && s > 0) { nb[p] += (s - n) / (s + n); if (g === g) nw[p] += (g - s) / (g + s); cs[p]++; }
      }
    });
    for (var p = 0; p < N; p++) { if (cnt[p]) sm[p] /= cnt[p]; if (cs[p]) { nb[p] /= cs[p]; nw[p] /= cs[p]; } else { nb[p] = NaN; nw[p] = NaN; } }
    return { mx: mx, mn: mn, me: sm, nb: nb, nw: nw, cnt: cnt };
  }
  /* el techo se estima por celdas de unos 50 a 60 m: un píxel de 10 o 30 m mezcla casa, árbol y jardín,
     pero una manzana de pueblo tiene una firma estable (más gris en promedio y más heterogénea que el campo) */
  function lado(resM) { return Math.max(1, Math.round(55 / resM)); }
  function celdas(R, g, k, fr) {
    var cw = Math.ceil(g.w / k), ch = Math.ceil(g.h / k), M = cw * ch;
    var a = { w: cw, h: ch, k: k, me: new Float32Array(M), mn: new Float32Array(M), mx: new Float32Array(M), nb: new Float32Array(M), sd: new Float32Array(M), n: new Uint16Array(M), nbn: new Uint16Array(M), fr: fr ? new Float32Array(M) : null };
    var s2 = new Float32Array(M);
    for (var j = 0; j < g.h; j++) for (var i = 0; i < g.w; i++) {
      var p = j * g.w + i, c = Math.floor(j / k) * cw + Math.floor(i / k);
      if (fr) a.fr[c] += fr[p];
      if (!R.cnt[p]) continue;
      a.me[c] += R.me[p]; s2[c] += R.me[p] * R.me[p]; a.mn[c] += R.mn[p]; a.mx[c] += R.mx[p]; a.n[c]++;
      if (R.nb[p] === R.nb[p]) { a.nb[c] += R.nb[p]; a.nbn[c]++; }
    }
    for (var q = 0; q < M; q++) {
      if (fr) a.fr[q] /= k * k;
      var n = a.n[q]; if (!n) continue;
      a.me[q] /= n; a.mn[q] /= n; a.mx[q] /= n; a.sd[q] = Math.sqrt(Math.max(0, s2[q] / n - a.me[q] * a.me[q]));
      a.nb[q] = a.nbn[q] ? a.nb[q] / a.nbn[q] : NaN;
    }
    return a;
  }
  function vec(A, q, nbMedio) { var nb = A.nb[q] === A.nb[q] ? A.nb[q] : nbMedio; return [1, A.me[q], A.mn[q], A.mx[q], nb, A.me[q] * A.me[q], A.sd[q], A.mx[q] - A.mn[q], nb * A.me[q]]; }

  /* ---------- verdad de terreno: huellas de Google Open Buildings (≤ mayo 2023) ---------- */
  var EDIF = (function () {
    var H = D.hr && D.hr.edif; if (!H || !H.b || !H.b.length) return [];
    var o = H.o;
    return H.b.map(function (r) { var x = r[2], y = r[3], ring = [[o[0] + x / 1e6, o[1] + y / 1e6]]; for (var k = 4; k < r.length; k += 2) { x += r[k]; y += r[k + 1]; ring.push([o[0] + x / 1e6, o[1] + y / 1e6]); } ring.push(ring[0]); return { type: 'Feature', geometry: { type: 'Polygon', coordinates: [ring] } }; });
  })();
  function techoZona(z) {
    if (z.techo) return z.techo;
    var g = z.grid, N = g.w * g.h, k = N > 250000 ? 2 : 4, fg = { x0: g.x0, y0: g.y0, sx: g.sx / k, sy: g.sy / k, w: g.w * k, h: g.h * k };
    var lab = C.rasterizeFeatures(EDIF, fg, function () { return 1; }), fr = new Float32Array(N);
    for (var j = 0; j < fg.h; j++) for (var i = 0; i < fg.w; i++) if (lab[j * fg.w + i] >= 0) fr[Math.floor(j / k) * g.w + Math.floor(i / k)] += 1 / (k * k);
    z.techo = fr; return fr;
  }
  // mínimos cuadrados (ecuaciones normales con un pequeño término de regularización)
  function ajustar(X, y) {
    var m = X[0].length, A = [], b = new Array(m).fill(0), i, j, k;
    for (i = 0; i < m; i++) { A.push(new Array(m).fill(0)); A[i][i] = i ? 1e-3 : 0; }
    for (var n = 0; n < X.length; n++) { var x = X[n]; for (i = 0; i < m; i++) { b[i] += x[i] * y[n]; for (j = 0; j < m; j++) A[i][j] += x[i] * x[j]; } }
    for (i = 0; i < m; i++) { var piv = i; for (k = i + 1; k < m; k++) if (Math.abs(A[k][i]) > Math.abs(A[piv][i])) piv = k; var t = A[i]; A[i] = A[piv]; A[piv] = t; var tb = b[i]; b[i] = b[piv]; b[piv] = tb;
      for (k = i + 1; k < m; k++) { var f = A[k][i] / A[i][i]; for (j = i; j < m; j++) A[k][j] -= f * A[i][j]; b[k] -= f * b[i]; } }
    var c = new Array(m).fill(0); for (i = m - 1; i >= 0; i--) { var sum = b[i]; for (j = i + 1; j < m; j++) sum -= A[i][j] * c[j]; c[i] = sum / A[i][i]; }
    return c;
  }
  function predecir(c, x) { var v = 0; for (var i = 0; i < c.length; i++) v += c[i] * x[i]; return v < 0 ? 0 : v > 1 ? 1 : v; }

  /* ---------- clasificación: techo estimado por el modelo + trayectoria de la vegetación ---------- */
  function clasificar(R, N, w, h, prm, mod) {
    var cls = new Uint8Array(N), fr = new Float32Array(N), k = mod.k || 1, A = celdas(R, { w: w, h: h }, k, null), cu = new Uint8Array(A.n.length), cf = new Float32Array(A.n.length);
    for (var q = 0; q < A.n.length; q++) {
      if (A.n[q] < k * k * 0.4) continue;
      var f = predecir(mod.c, vec(A, q, mod.nbMedio)); cf[q] = f;
      cu[q] = f >= 0.20 ? 1 : f >= 0.10 ? 2 : f >= prm.urb ? 3 : 0;
    }
    // celda construida aislada (sin vecinas construidas): se descarta
    var cu2 = cu.slice();
    for (var cj = 0; cj < A.h; cj++) for (var ci = 0; ci < A.w; ci++) {
      var c0 = cj * A.w + ci; if (!cu[c0]) continue; var v = 0;
      for (var dj = -1; dj <= 1; dj++) for (var di = -1; di <= 1; di++) { if (!di && !dj) continue; var ii = ci + di, jj = cj + dj; if (ii < 0 || jj < 0 || ii >= A.w || jj >= A.h) continue; if (cu[jj * A.w + ii]) v++; }
      if (!v && cu[c0] === 3) cu2[c0] = 0;
    }
    for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) {
      var p = j * w + i, c = Math.floor(j / k) * A.w + Math.floor(i / k);
      if (!R.cnt[p]) { cls[p] = 0; continue; }
      fr[p] = cf[c];
      if (R.nw[p] === R.nw[p] && R.nw[p] > 0.05 && R.mx[p] < 0.3) cls[p] = 7;
      else if (cu2[c]) cls[p] = cu2[c];
      else if (R.cnt[p] >= 2 && R.mn[p] >= prm.perm) cls[p] = 4;
      else if (R.mx[p] >= 0.5) cls[p] = 5;
      else cls[p] = 6;
    }
    return { cls: cls, fr: fr };
  }

  /* ---------- estado y capa en el mapa ---------- */
  var S = { res: {}, orden: [], mod: {}, actual: null, cambio: null, op: store('op') || 0.8, corriendo: false, cancelar: false };
  var capa = null;
  function paneMulti() { var m = window.SIG_MAP; if (!m.getPane('pMulti')) { m.createPane('pMulti'); m.getPane('pMulti').style.zIndex = 470; } return 'pMulti'; }
  function pintarCapa(lista, paleta) {
    var m = window.SIG_MAP; if (capa) { m.removeLayer(capa); capa = null; }
    if (!lista) { repintar(); return; }
    capa = L.layerGroup();
    lista.forEach(function (it) {
      var g = it.z.grid, cv = document.createElement('canvas'); cv.width = g.w; cv.height = g.h;
      var ctx = cv.getContext('2d'), im = ctx.createImageData(g.w, g.h), cols = paleta.map(function (p) { var e = document.createElement('div'); e.style.color = p.c; document.body.appendChild(e); var c = getComputedStyle(e).color.match(/[\d.]+/g).map(Number); e.remove(); return c; });
      for (var p = 0; p < it.cls.length; p++) {
        var k = it.z.mask[p] ? it.cls[p] : 0, c = cols[k]; if (!k || (c.length > 3 && c[3] === 0)) continue;
        im.data[4 * p] = c[0]; im.data[4 * p + 1] = c[1]; im.data[4 * p + 2] = c[2]; im.data[4 * p + 3] = 255;
      }
      ctx.putImageData(im, 0, 0);
      var sw = C.unmerc(g.x0, g.y0 - g.h * g.sy), ne = C.unmerc(g.x0 + g.w * g.sx, g.y0);
      capa.addLayer(L.imageOverlay(cv.toDataURL('image/png'), [[sw[1], sw[0]], [ne[1], ne[0]]], { pane: paneMulti(), opacity: S.op, interactive: false }));
    });
    capa.addTo(m); repintar();
  }
  function repintar() { if (window.SIG_REPINTAR) window.SIG_REPINTAR(); leyendaMapa(); }
  function descripcion(r) {
    if (!r) return '';
    return (r.sensor === 's2' ? 'Sentinel-2 L2A' : 'Landsat') + ' ' + r.periodo + ' · ' + r.fechas.length + ' fecha' + (r.fechas.length > 1 ? 's' : '') + ' (' + r.fechas.map(function (f) { return dmy(f.fecha) + (f.estacion ? ' ' + f.estacion : ''); }).join(', ') + ') · ' + r.resM + ' m · ' + r.ambitoTxt;
  }
  window.SIG_EXTRA = function () {
    if (!capa) return '';
    if (S.cambio) return '<div class="qv-t">Detección multisensor (capa propia, arriba de las demás)</div><ol class="qv"><li><b>Ampliación entre ' + esc(S.cambio.a.periodo) + ' y ' + esc(S.cambio.b.periodo) + '</b><span>' + esc(descripcion(S.cambio.a)) + ' → ' + esc(descripcion(S.cambio.b)) + '</span></li></ol>';
    var r = S.res[S.actual];
    return '<div class="qv-t">Detección multisensor (capa propia, arriba de las demás)</div><ol class="qv"><li><b>Clasificación ' + esc(r.sensor === 's2' ? 'Sentinel-2' : 'Landsat') + ' ' + esc(r.periodo) + '</b><span>' + esc(descripcion(r)) + '. Escenas: ' + esc(r.escenas.join(' · ')) + '</span></li></ol>';
  };
  function leyendaMapa() {
    var el = $('leyenda'); if (!el) return;
    var lc = el.querySelector('.lc'), viejo = el.querySelector('.multi-ley'); if (viejo) viejo.remove();
    if (!capa || !lc) return;
    var r = S.cambio ? null : S.res[S.actual], pal = S.cambio ? CAMBIO : CLS;
    var tit = S.cambio ? 'Ampliación · ' + S.cambio.a.periodo + ' → ' + S.cambio.b.periodo + ' · ' + (S.cambio.a.sensor === 's2' ? 'Sentinel-2' : 'Landsat') : 'Clasificación ' + (r.sensor === 's2' ? 'Sentinel-2' : 'Landsat') + ' ' + r.periodo + ' · ' + r.fechas.map(function (f) { return dmy(f.fecha); }).join(', ');
    var d = document.createElement('div'); d.className = 'multi-ley';
    d.innerHTML = '<b>' + esc(tit) + '</b>' + pal.slice(1).map(function (p) { return '<div class="fila"><span class="sw" style="background:' + p.c + '"></span>' + esc(p.n) + '</div>'; }).join('');
    lc.insertBefore(d, lc.firstChild);
  }
  (function () { var el = $('leyenda'); if (el && window.MutationObserver) new MutationObserver(function () { if (capa && !el.querySelector('.multi-ley')) leyendaMapa(); }).observe(el, { childList: true, subtree: true }); })();

  /* ---------- correr un período ---------- */
  function estado(t, err) { var e = $('mlEst'); if (e) { e.hidden = !t; e.innerHTML = t || ''; e.classList.toggle('err', !!err); } }
  /* lee las imágenes de un período para un conjunto de zonas y devuelve los rasgos del año por zona */
  function fechasDe(sensor, per, zs, selector) {
    var sel = selector || function (it) { return elegirFechas(it, sensor === 's2' ? 0.35 : 0.6); };
    return sensor === 's2'
      ? catalogoS2(zs, per.anio).then(function (it) { if (!it.length) throw new Error('no hay escenas Sentinel-2 con menos de 40 % de nubes en ' + per.anio); return sel(it); })
      : Promise.resolve(sel(per.escenas));
  }
  // para calibrar un período de pocas fechas: las fechas de 2023 de los mismos meses
  function fechasComo(plantilla, nubeMax) {
    return function (escenas) {
      var porFecha = {};
      escenas.forEach(function (e) { (porFecha[e.fecha] = porFecha[e.fecha] || []).push(e); });
      var fs = Object.keys(porFecha).map(function (f) { var it = porFecha[f]; return { fecha: f, items: it, nube: it.reduce(function (a, e) { return a + (e.nube == null ? 0.5 : e.nube); }, 0) / it.length }; }).filter(function (x) { return x.nube <= nubeMax; });
      var usadas = {};
      return plantilla.map(function (pf) {
        var m = +pf.fecha.slice(5, 7), d = +pf.fecha.slice(8, 10);
        var best = fs.filter(function (x) { return !usadas[x.fecha]; }).map(function (x) { var dd = Math.abs((+x.fecha.slice(5, 7) - m) * 30 + (+x.fecha.slice(8, 10) - d)); dd = Math.min(dd, 360 - dd); return { x: x, s: dd + x.nube * 60 }; }).sort(function (a, b) { return a.s - b.s; })[0];
        if (!best) return null; usadas[best.x.fecha] = 1; return { fecha: best.x.fecha, items: best.x.items, estacion: 'como ' + dmy(pf.fecha).slice(0, 5) };
      }).filter(Boolean);
    };
  }
  function leerPeriodo(sensor, per, zs, t0, rotulo, fechasP) {
    fechasP = fechasP || fechasDe(sensor, per, zs);
    return Promise.all([cargarGeoTIFF(), fechasP]).then(function (v) {
      var fechas = v[1]; if (!fechas.length) throw new Error('no hay fechas con pocas nubes en ' + per.t);
      var paso = 0, total = fechas.length * zs.length, res = zs.map(function (z) { return { z: z, stack: [] }; });
      var tareas = []; fechas.forEach(function (f) { res.forEach(function (rz) { tareas.push([f, rz]); }); });
      var etiqueta = (sensor === 's2' ? 'Sentinel-2 ' : 'Landsat ') + per.t + (rotulo ? ' (' + rotulo + ')' : '');
      var pool = function () {
        var t = tareas.shift(); if (!t) return Promise.resolve();
        if (S.cancelar) return Promise.reject(new Error('cancelado'));
        var f = t[0], rz = t[1];
        return (sensor === 's2' ? leerS2(f, rz.z) : leerLandsat(f, rz.z)).then(function (B) {
          if (B) rz.stack.push(B); paso++;
          estado('Leyendo ' + etiqueta + ': ' + paso + ' de ' + total + ' imágenes por zona · última ' + dmy(f.fecha) + (f.estacion ? ' (' + f.estacion + ')' : '') + ', ' + esc(rz.z.nom) + ' · ' + Math.round((Date.now() - t0) / 1000) + ' s');
        }).then(pool);
      };
      estado('Leyendo ' + etiqueta + ': ' + fechas.length + ' fechas × ' + zs.length + ' zonas…');
      return Promise.all([pool(), pool(), pool(), pool()]).then(function () {
        var escenas = [];
        fechas.forEach(function (f) { f.items.forEach(function (e) { escenas.push((e.nombre || e.id) + ' (' + dmy(e.fecha) + (e.nube != null ? ', nubes ' + fmt(e.nube * 100) + ' %' : '') + ')'); }); });
        return { fechas: fechas, escenas: escenas, zonas: res.map(function (rz) { var g = rz.z.grid; return { z: rz.z, R: rasgos(rz.stack, g.w * g.h) }; }) };
      });
    });
  }

  /* calibración: el modelo de fracción de techo se ajusta con las huellas de Google sobre las imágenes de 2023 del mismo sensor */
  function modelo(sensor, resM, t0, plantilla) {
    var sig = plantilla ? plantilla.map(function (f) { return f.fecha.slice(5, 7); }).join('-') : '4est';
    var k = 'mod.' + sensor + '.' + resM + '.' + sig, m = S.mod[k] || store(k);
    if (m && m.v === 4) { S.mod[k] = m; return Promise.resolve(m); }
    if (!EDIF.length) return Promise.reject(new Error('esta página no tiene huellas de edificios para calibrar'));
    var per = (sensor === 's2' ? PER.s2 : PER.ls).filter(function (p) { return p.anio === 2023; })[0];
    if (!per) return Promise.reject(new Error('no hay período 2023 para calibrar'));
    var amb = D.pueblos && D.pueblos.features && D.pueblos.features.length ? 'pueblos' : 'ter';
    var zs = zonas(amb, resM);
    var fp = plantilla ? fechasDe(sensor, per, zs, fechasComo(plantilla, sensor === 's2' ? 0.35 : 0.6)) : null;
    return leerPeriodo(sensor, per, zs, t0, 'calibración con las huellas de Google' + (plantilla ? ', mismas fechas del año' : ''), fp).then(function (L2) {
      var X = [], y = [], nbs = [];
      var kc = lado(resM);
      L2.zonas.forEach(function (zz) { zz.A = celdas(zz.R, zz.z.grid, kc, techoZona(zz.z)); for (var q = 0; q < zz.A.n.length; q++) if (zz.A.n[q] && zz.A.nb[q] === zz.A.nb[q]) nbs.push(zz.A.nb[q]); });
      nbs.sort(function (a, b) { return a - b; }); var nbMedio = nbs.length ? nbs[Math.floor(nbs.length / 2)] : -0.15;
      L2.zonas.forEach(function (zz) {
        var A = zz.A; // todo el rectángulo: pueblo y campo que lo rodea
        for (var q = 0; q < A.n.length; q++) { if (A.n[q] < A.k * A.k * 0.6) continue; X.push(vec(A, q, nbMedio)); y.push(A.fr[q]); }
      });
      if (X.length < 60) throw new Error('muy pocas celdas para calibrar');
      var c = ajustar(X, y), se = 0, st = 0, my = y.reduce(function (a, b) { return a + b; }, 0) / y.length, tp = 0, fp = 0, fn = 0;
      for (var i = 0; i < X.length; i++) { var f = predecir(c, X[i]); se += (f - y[i]) * (f - y[i]); st += (y[i] - my) * (y[i] - my); var a = f >= 0.05, b = y[i] >= 0.05; if (a && b) tp++; else if (a) fp++; else if (b) fn++; }
      var m2 = { v: 4, k: kc, c: c, nbMedio: nbMedio, r2: 1 - se / st, ecm: Math.sqrt(se / X.length), n: X.length, nEdif: EDIF.length, periodo: per.t, fechas: L2.fechas.map(function (f) { return f.fecha; }),
        precision: tp / Math.max(1, tp + fp), sensibilidad: tp / Math.max(1, tp + fn), ambito: amb, sig: sig };
      S.mod[k] = m2; store(k, m2); return m2;
    });
  }

  function correr(sensor, per, ambito, resM, prm, pintar) {
    var zs = zonas(ambito, resM), npx = pixeles(zs);
    if (npx > 9e6) return Promise.reject(new Error('el ámbito tiene ' + fmt(npx) + ' píxeles a ' + resM + ' m; elegí una resolución más gruesa o un ámbito menor'));
    var t0 = Date.now();
    return fechasDe(sensor, per, zs).then(function (fechas) {
      if (!fechas.length) throw new Error('no hay fechas con pocas nubes en ' + per.t);
      // con menos de tres fechas el modelo se calibra con 2023 en los mismos meses, para que las trayectorias sean comparables
      return modelo(sensor, resM, t0, fechas.length < 3 && per.anio !== 2023 ? fechas : null).then(function (mod) { return { mod: mod, fechas: fechas }; });
    }).then(function (o) {
      var mod = o.mod;
      return leerPeriodo(sensor, per, zs, t0, null, Promise.resolve(o.fechas)).then(function (L2) {
        var conts = [0, 0, 0, 0, 0, 0, 0, 0], porZona = {};
        var items = L2.zonas.map(function (zz) {
          var g = zz.z.grid, N = g.w * g.h, k = clasificar(zz.R, N, g.w, g.h, prm, mod), cz = [0, 0, 0, 0, 0, 0, 0, 0], techo = 0;
          for (var p = 0; p < N; p++) if (zz.z.mask[p]) { cz[k.cls[p]]++; techo += k.fr[p]; }
          var ha = cz.map(function (c) { return c * resM * resM / 1e4; });
          for (var q = 0; q < 8; q++) conts[q] += ha[q];
          ha.techo = techo * resM * resM / 1e4;
          porZona[zz.z.nom] = { ha: ha, techo: ha.techo };
          return { z: zz.z, cls: k.cls };
        });
        var techoTot = Object.keys(porZona).reduce(function (a, n) { return a + porZona[n].techo; }, 0);
        var key = sensor + '|' + per.k + '|' + ambito + '|' + resM + '|' + prm.urb + '|' + prm.perm;
        var r = { key: key, sensor: sensor, periodo: per.t, anio: per.anio, ambito: ambito, ambitoTxt: ambito === 'pueblos' ? 'pueblos y parajes estudiados' : ambito === 'vista' ? 'vista del mapa' : 'todo ' + NOMBRE, resM: resM, prm: prm,
          fechas: L2.fechas.map(function (f) { return { fecha: f.fecha, estacion: f.estacion || '' }; }), escenas: L2.escenas, ha: conts, techo: techoTot, porZona: porZona, items: items, mod: mod,
          cuando: new Date().toISOString().slice(0, 16).replace('T', ' '), seg: Math.round((Date.now() - t0) / 1000) };
        if (!S.res[key]) S.orden.push(key);
        S.res[key] = r;
        guardarSerie(r);
        if (pintar) { S.actual = key; S.cambio = null; pintarCapa(items, CLS); }
        return r;
      });
    });
  }
  function guardarSerie(r) {
    var s = store('serie') || {}, c = {}; Object.keys(r).forEach(function (k) { if (k !== 'items') c[k] = r[k]; });
    s[r.key] = c; store('serie', s);
  }

  /* ---------- comparar dos períodos ---------- */
  function comparar(ka, kb) {
    var A = S.res[ka], B = S.res[kb]; if (!A || !B) return;
    var conts = [0, 0, 0, 0, 0, 0];
    var items = A.items.map(function (ia, i) {
      var ib = B.items[i], N = ia.cls.length, out = new Uint8Array(N);
      for (var p = 0; p < N; p++) {
        if (!ia.z.mask[p]) continue; var a = ia.cls[p], b = ib.cls[p]; if (!a || !b) continue;
        var ua = URB(a), ub = URB(b), k = ua && ub ? 1 : !ua && ub ? 2 : ua && !ub ? 3 : a !== 4 && b === 4 ? 4 : a === 4 && b !== 4 ? 5 : 0;
        out[p] = k; conts[k] += A.resM * A.resM / 1e4;
      }
      return { z: ia.z, cls: out };
    });
    S.cambio = { a: A, b: B, ha: conts }; pintarCapa(items, CAMBIO);
    var box = $('mlCmpRes');
    if (box) box.innerHTML = '<table class="ml-t"><caption>Cambios entre ' + esc(A.periodo) + ' y ' + esc(B.periodo) + ' · ' + esc(A.ambitoTxt) + '</caption><thead><tr><th scope="col">Cambio</th><th scope="col">ha</th></tr></thead><tbody>' +
      CAMBIO.slice(1).map(function (c, i) { return '<tr><th scope="row"><span class="sw" style="background:' + c.c + '"></span>' + esc(c.n) + '</th><td>' + fmt(conts[i + 1], 1) + '</td></tr>'; }).join('') + '</tbody></table>' +
      '<p class="nota">Lo construido nuevo es lo que en ' + esc(A.periodo) + ' tenía menos techo estimado que el umbral y en ' + esc(B.periodo) + ' lo supera. Para comparar, los dos períodos tienen que ser del mismo sensor, ámbito y resolución. A 30 m (Landsat) una casa sola no se ve; se ven barrios, loteos ocupados, galpones grandes y rutas.</p>';
  }

  /* ---------- interfaz ---------- */
  var PER = { ls: [], s2: [] };
  function selPeriodos() {
    var sen = $('mlSen').value, sp = $('mlPer');
    sp.innerHTML = PER[sen].map(function (p) { return '<option value="' + p.k + '">' + esc(p.t) + (p.escenas ? ' · ' + p.escenas.length + ' escena' + (p.escenas.length > 1 ? 's' : '') : '') + '</option>'; }).join('');
    sp.value = PER[sen].length ? PER[sen][PER[sen].length - 1].k : '';
    $('mlRes').innerHTML = sen === 's2' ? '<option value="10">10 m (pueblos o vista)</option><option value="20" selected>20 m (todo el Pago)</option><option value="30">30 m (comparable con Landsat)</option>' : '<option value="30" selected>30 m</option><option value="60">60 m (más rápido)</option>';
    pintarUmbral();
  }
  function pintarUmbral() { $('mlUrbV').textContent = fmt(+$('mlUrb').value * 100) + ' %'; $('mlPermV').textContent = fmt(+$('mlPerm').value, 2); }
  function prmUI() { return { urb: +$('mlUrb').value, perm: +$('mlPerm').value }; }
  function perUI() { var sen = $('mlSen').value; return PER[sen].filter(function (p) { return p.k === $('mlPer').value; })[0]; }
  function pintarResultado(r) {
    var box = $('mlRes1'); if (!box || !r) return;
    var tot = r.ha.slice(1).reduce(function (a, b) { return a + b; }, 0) + r.ha[0];
    box.innerHTML = '<div class="ml-que"><b>Qué se usó</b><div>' + esc(descripcion(r)) + '</div><div><span>Escenas</span> ' + esc(r.escenas.join(' · ')) + '</div><div><span>Modelo de techo</span> calibrado con ' + fmt(r.mod.nEdif) + ' huellas de Google sobre ' + (r.sensor === 's2' ? 'Sentinel-2 ' : 'Landsat ') + esc(r.mod.periodo) + ' (' + r.mod.fechas.map(dmy).join(', ') + '), ' + fmt(r.mod.n) + ' celdas: R² ' + fmt(r.mod.r2, 2) + ', error medio ' + fmt(r.mod.ecm * 100, 1) + ' puntos de techo, en celdas de ' + (r.mod.k * r.resM) + ' m; de las celdas con techo ≥ 5 % detecta ' + fmt(r.mod.sensibilidad * 100) + ' % y acierta en ' + fmt(r.mod.precision * 100) + ' % de los que marca</div><div><span>Umbrales</span> construido desde ' + fmt(r.prm.urb * 100) + ' % de techo estimado; verde todo el año si el NDVI mínimo es ' + fmt(r.prm.perm, 2) + ' o más</div><div><span>Calculado</span> ' + esc(r.cuando) + ' en ' + r.seg + ' s, en este navegador</div></div>' +
      '<table class="ml-t"><caption>Superficie por clase · ' + esc(r.ambitoTxt) + '</caption><thead><tr><th scope="col">Clase</th><th scope="col">ha</th><th scope="col">%</th></tr></thead><tbody>' +
      CLS.map(function (c, i) { return i ? '<tr><th scope="row"><span class="sw" style="background:' + c.c + '"></span>' + esc(c.n) + '</th><td>' + fmt(r.ha[i], 1) + '</td><td>' + fmt(r.ha[i] / tot * 100, 1) + '</td></tr>' : ''; }).join('') +
      '<tr class="nd"><th scope="row">Sin dato (nubes en todas las fechas o fuera de la escena)</th><td>' + fmt(r.ha[0], 1) + '</td><td>' + fmt(r.ha[0] / tot * 100, 1) + '</td></tr><tr><th scope="row">Techo estimado (suma de fracciones)</th><td>' + fmt(r.techo, 1) + '</td><td></td></tr></tbody></table>' +
      (Object.keys(r.porZona).length > 1 ? '<table class="ml-t"><caption>Por pueblo o paraje</caption><thead><tr><th scope="col">Pueblo o paraje</th><th scope="col">Área construida, ha</th><th scope="col">Techo estimado, ha</th><th scope="col">Verde todo el año, ha</th></tr></thead><tbody>' +
        Object.keys(r.porZona).map(function (n) { var h = r.porZona[n].ha; return '<tr><th scope="row">' + esc(n) + '</th><td>' + fmt(h[1] + h[2] + h[3], 1) + '</td><td>' + fmt(r.porZona[n].techo, 1) + '</td><td>' + fmt(h[4], 1) + '</td></tr>'; }).join('') + '</tbody></table>' : '') +
      (r.fechas.length < 2 ? '<p class="nota guard">Un solo día de imagen: un lote arado o un rastrojo seco se confunden con lo construido. Leé esta época sólo dentro de los pueblos.</p>' : '');
    pintarSerie();
  }
  function pintarSerie() {
    var box = $('mlSerie'); if (!box) return;
    var s = store('serie') || {}, sen = $('mlSen').value, amb = ambUI(), res = $('mlRes').value;
    var rs = Object.keys(s).map(function (k) { return s[k]; }).filter(function (r) { return r.ha && r.ha.length === 8 && r.sensor === sen && r.ambito === amb && String(r.resM) === String(res); }).sort(function (a, b) { return a.anio - b.anio; });
    var mem = S.orden.filter(function (k) { var r = S.res[k]; return r.sensor === sen && r.ambito === amb && String(r.resM) === String(res); });
    $('mlA').innerHTML = $('mlB').innerHTML = mem.map(function (k) { return '<option value="' + esc(k) + '">' + esc(S.res[k].periodo) + '</option>'; }).join('');
    if (mem.length > 1) { $('mlA').value = mem[0]; $('mlB').value = mem[mem.length - 1]; }
    $('mlCmp').disabled = mem.length < 2;
    if (!rs.length) { box.innerHTML = '<p class="nota">Todavía no hay períodos calculados con este sensor, ámbito y resolución.</p>'; return; }
    var W = 320, H = 150, P = 30, xs = rs.map(function (r) { return r.anio; }), x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs);
    var y1 = Math.max.apply(null, rs.map(function (r) { return Math.max(haUrb(r), r.ha[4]); })) || 1;
    var X = function (a) { return P + (x1 > x0 ? (a - x0) / (x1 - x0) : 0.5) * (W - P - 10); }, Y = function (v) { return H - 20 - v / y1 * (H - 34); };
    var val = function (r, k) { return k === 'u' ? haUrb(r) : r.ha[k]; };
    var linea = function (k, c) { return '<polyline fill="none" stroke="' + c + '" stroke-width="2" points="' + rs.map(function (r) { return X(r.anio).toFixed(1) + ',' + Y(val(r, k)).toFixed(1); }).join(' ') + '"/>' + rs.map(function (r) { return '<circle cx="' + X(r.anio).toFixed(1) + '" cy="' + Y(val(r, k)).toFixed(1) + '" r="2.6" fill="' + c + '"><title>' + r.periodo + ': ' + fmt(val(r, k), 1) + ' ha</title></circle>'; }).join(''); };
    box.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="ml-graf" role="img" aria-label="Serie de hectáreas construidas y de vegetación permanente"><line x1="' + P + '" y1="' + (H - 20) + '" x2="' + (W - 10) + '" y2="' + (H - 20) + '" stroke="currentColor" stroke-opacity=".3"/>' +
      '<text x="' + P + '" y="' + (H - 6) + '" font-size="9" fill="currentColor">' + x0 + '</text><text x="' + (W - 10) + '" y="' + (H - 6) + '" font-size="9" text-anchor="end" fill="currentColor">' + x1 + '</text><text x="2" y="12" font-size="9" fill="currentColor">' + fmt(y1) + ' ha</text>' +
      linea('u', CLS[2].c) + linea(4, CLS[4].c) + '</svg>' +
      '<table class="ml-t"><caption>Serie · ' + (sen === 's2' ? 'Sentinel-2' : 'Landsat') + ' · ' + esc(rs[0].ambitoTxt) + ' · ' + res + ' m</caption><thead><tr><th scope="col">Período</th><th scope="col">Área construida, ha</th><th scope="col">Techo estimado, ha</th><th scope="col">Verde todo el año, ha</th><th scope="col">Fechas</th></tr></thead><tbody>' +
      rs.map(function (r) { return '<tr><th scope="row">' + esc(r.periodo) + '</th><td>' + fmt(haUrb(r), 1) + '</td><td>' + fmt(r.techo, 1) + '</td><td>' + fmt(r.ha[4], 1) + '</td><td>' + r.fechas.length + '</td></tr>'; }).join('') + '</tbody></table>' +
      '<button type="button" class="btn sec2" id="mlCsv">Descargar la serie (CSV)</button>';
    $('mlCsv').onclick = function () {
      var L2 = ['sensor;periodo;ambito;resolucion_m;construido_denso_ha;construido_medio_ha;construido_disperso_ha;techo_estimado_ha;verde_todo_el_anio_ha;cultivos_pasturas_ha;suelo_poca_veg_ha;agua_ha;sin_dato_ha;fechas;escenas'];
      rs.forEach(function (r) { L2.push([r.sensor === 's2' ? 'Sentinel-2 L2A' : 'Landsat', r.periodo, r.ambitoTxt, r.resM, r.ha[1].toFixed(2), r.ha[2].toFixed(2), r.ha[3].toFixed(2), (r.techo || 0).toFixed(2), r.ha[4].toFixed(2), r.ha[5].toFixed(2), r.ha[6].toFixed(2), r.ha[7].toFixed(2), r.ha[0].toFixed(2), r.fechas.map(function (f) { return f.fecha; }).join(' '), r.escenas.join(' | ')].join(';')); });
      var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + L2.join('\n')], { type: 'text/csv' })); a.download = 'deteccion_multisensor_' + (TER.slug || 'ciudad') + '.csv'; a.click();
    };
  }
  function ambUI() { var r = document.querySelector('input[name="mlAmb"]:checked'); return r ? r.value : 'ter'; }

  function montar() {
    var v = $('v-arb'); if (!v || $('secMulti')) return;
    var hayP = D.pueblos && D.pueblos.features && D.pueblos.features.length;
    var sec = document.createElement('div'); sec.className = 'sec ml'; sec.id = 'secMulti';
    sec.innerHTML = '<div class="eyebrow">Detección multisensor · Landsat 1976–2026 · Sentinel-2 2017–2026</div>' +
      '<h2>Ampliación urbana y vegetación con todas las imágenes</h2>' +
      '<p>Lee las bandas reales (rojo, infrarrojo cercano, infrarrojo de onda corta y verde) de una escena por estación del período elegido y estima en cada píxel la <b>fracción de techo</b> (con un modelo calibrado con las huellas de edificios de Google) y lo que hace la vegetación en el año: <b>construido denso, medio o disperso</b>, <b>verde todo el año</b> si nunca deja de estarlo, <b>cultivos y pasturas</b> si verdea por temporada, <b>suelo con poca vegetación</b> o <b>agua</b>. La imagen Esri de alta resolución sigue siendo la del detalle (techos, árboles de la calle); ésta es la de la serie larga.</p>' +
      '<div class="ml-g"><label>Sensor<select id="mlSen"><option value="s2">Sentinel-2 L2A · 10–20 m · 2017–2026</option><option value="ls">Landsat 2 a 9 · 30 m · 1976–2026</option></select></label>' +
      '<label>Período<select id="mlPer"><option>cargando el catálogo…</option></select></label>' +
      '<label>Resolución<select id="mlRes"></select></label></div>' +
      '<fieldset class="amb"><legend>Ámbito</legend>' +
      (hayP ? '<label><input type="radio" name="mlAmb" value="pueblos" checked> Pueblos y parajes estudiados</label>' : '') +
      '<label><input type="radio" name="mlAmb" value="ter"' + (hayP ? '' : ' checked') + '> Todo ' + esc(NOMBRE) + '</label>' +
      '<label><input type="radio" name="mlAmb" value="vista"> Vista del mapa</label></fieldset>' +
      '<details class="ml-prm"><summary>Umbrales de la clasificación</summary>' +
      '<label>Construido disperso desde un techo estimado de <output id="mlUrbV"></output> de la celda<input type="range" id="mlUrb" min="0.02" max="0.10" step="0.005" value="0.05"></label>' +
      '<label>Verde todo el año si el NDVI mínimo es al menos <output id="mlPermV"></output><input type="range" id="mlPerm" min="0.40" max="0.75" step="0.01" value="0.55"></label>' +
      '<p class="nota">Cómo se estima lo construido: en los pueblos la casa queda entre árboles y jardines, y a 10 o 30 m casi ningún píxel es «todo techo». Por eso no se usa un corte de color: un modelo aprende, con las ' + fmt(EDIF.length) + ' huellas de edificios de Google (anteriores a mayo de 2023) y las imágenes de 2023 del mismo sensor, qué fracción de techo corresponde a cada combinación de NDVI medio, mínimo y máximo del año y de NDBI (onda corta). Ese modelo se aplica después a cada año. Agua: MNDWI medio mayor que 0,05. NDVI = (infrarrojo − rojo) / (infrarrojo + rojo). En Landsat 2 y 3 (1976–1980) no hay onda corta.</p></details>' +
      '<div class="botones"><button class="btn" id="mlGo">Detectar en el período</button><button class="btn sec2" id="mlSerieGo">Calcular toda la serie</button><button class="btn sec2" id="mlStop" hidden>Detener</button></div>' +
      '<div class="estado" id="mlEst" role="status" aria-live="polite" hidden></div>' +
      '<label class="ml-op">Opacidad en el mapa <input type="range" id="mlOp" min="0" max="1" step="0.05" value="' + S.op + '"></label> <button type="button" class="lnk" id="mlQuitar">Quitar del mapa</button>' +
      '<div id="mlRes1"></div>' +
      '<h3>Serie</h3><div id="mlSerie"></div>' +
      '<h3>Ampliación entre dos períodos</h3><div class="ml-g"><label>Desde<select id="mlA"></select></label><label>Hasta<select id="mlB"></select></label></div><button class="btn sec2" id="mlCmp" disabled>Ver la ampliación en el mapa</button><div id="mlCmpRes"></div>' +
      '<p class="nota">Fuentes: USGS/NASA Landsat, servicio Esri Landsat/MS (escenas de nivel 1, reflectancia escalada) · ESA Copernicus Sentinel-2 L2A, catálogo Element 84 Earth Search en AWS (COG, máscara de nubes SCL). Los resultados quedan guardados sólo en este navegador; la serie se descarga en CSV.</p>';
    v.insertBefore(sec, v.firstChild);

    $('mlSen').onchange = function () { selPeriodos(); pintarSerie(); };
    $('mlRes').onchange = pintarSerie;
    sec.querySelectorAll('input[name="mlAmb"]').forEach(function (r) { r.onchange = pintarSerie; });
    $('mlUrb').oninput = $('mlPerm').oninput = pintarUmbral;
    $('mlOp').oninput = function () { S.op = +this.value; store('op', S.op); if (capa) capa.eachLayer(function (l) { l.setOpacity(S.op); }); };
    $('mlQuitar').onclick = function () { S.cambio = null; pintarCapa(null); };
    $('mlStop').onclick = function () { S.cancelar = true; };
    var bloquear = function (si) { S.corriendo = si; $('mlGo').disabled = $('mlSerieGo').disabled = si; $('mlStop').hidden = !si; if (!si) S.cancelar = false; };
    $('mlGo').onclick = function () {
      var per = perUI(); if (!per || S.corriendo) return; bloquear(true);
      correr($('mlSen').value, per, ambUI(), +$('mlRes').value, prmUI(), true)
        .then(function (r) { estado('Listo: ' + esc(descripcion(r)) + '. La clasificación está en el mapa, arriba de las demás capas.'); pintarResultado(r); })
        .catch(function (e) { estado('No se pudo: ' + esc(e.message || e), true); }).then(function () { bloquear(false); });
    };
    $('mlSerieGo').onclick = function () {
      if (S.corriendo) return; var sen = $('mlSen').value, lista = PER[sen].slice(), amb = ambUI(), res = +$('mlRes').value, prm = prmUI(), i = 0, ult = null; bloquear(true);
      var sig = function () {
        if (i >= lista.length || S.cancelar) { bloquear(false); if (ult) { S.actual = ult.key; pintarCapa(ult.items, CLS); pintarResultado(ult); } estado(S.cancelar ? 'Serie detenida.' : 'Serie completa: ' + lista.length + ' períodos.'); return; }
        var per = lista[i++];
        correr(sen, per, amb, res, prm, false).then(function (r) { ult = r; pintarSerie(); }).catch(function (e) { if (S.cancelar) return; var s = store('fallas') || {}; s[per.t] = String(e.message || e); store('fallas', s); }).then(sig);
      };
      sig();
    };
    $('mlCmp').onclick = function () { comparar($('mlA').value, $('mlB').value); };

    // períodos disponibles: Landsat desde el catálogo; Sentinel-2 por año
    for (var y = 2017; y <= HOY; y++) PER.s2.push({ k: 'S' + y, t: String(y) + (y === HOY ? ' (en curso)' : ''), anio: y });
    selPeriodos(); pintarSerie();
    catalogoLandsat(zonas('ter', 60)).then(function (cat) { PER.ls = periodosLandsat(cat); if ($('mlSen').value === 'ls') selPeriodos(); })
      .catch(function (e) { estado('No se pudo leer el catálogo Landsat: ' + esc(e.message), true); });

    // acceso desde la pestaña Crecimiento
    var guia = $('secGuia');
    if (guia && !$('irMulti')) {
      var b = document.createElement('button'); b.className = 'btn'; b.id = 'irMulti'; b.type = 'button'; b.textContent = 'Detectar ampliación y vegetación con Landsat y Sentinel-2 →';
      b.onclick = function () { var t = $('tab-arb'); if (t) t.click(); setTimeout(function () { sec.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 80); };
      var bt = guia.querySelector('.botones'); if (bt) bt.insertBefore(b, bt.firstChild); else guia.appendChild(b);
    }
  }
  function esperar() { if (window.SIG_MAP && $('v-arb')) montar(); else setTimeout(esperar, 300); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', esperar); else esperar();
})();
