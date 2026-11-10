/* Fechado de cada edificación con las tomas de alta resolución de Esri Wayback (2010–2025) y NDVI Landsat por escena de la Ciudad.
   Corre en el navegador (los servidores de Esri no son accesibles desde el entorno de trabajo). No envía nada a ningún lado:
   arma un .zip en memoria y lo ofrece para descargar. Plan SAG · Poblamiento y Vegetación · CMDOT. */
window.FW = { fase: 'inicio', log: [], prog: {}, t0: Date.now(), err: 0 };
(async () => {
  const J = window.FW, log = m => J.log.push(((Date.now() - J.t0) / 1000).toFixed(0) + 's ' + m);
  const BASE = 'https://surtecto.github.io/WEB-Plan-SAG-V3/crecimiento-urbano/huella/_trabajo/';
  const fx = async (u, ms, tipo) => { const c = new AbortController(), t = setTimeout(() => c.abort(), ms || 20000); try { const r = await fetch(u, { signal: c.signal }); if (!r.ok) throw new Error('http ' + r.status); return tipo === 'buf' ? await r.arrayBuffer() : await r.json(); } finally { clearTimeout(t); } };
  const reint = async (f, n) => { for (let i = 0; i < (n || 3); i++) { try { return await f(); } catch (e) { if (i === (n || 3) - 1) throw e; } } };
  async function pool(items, n, fn, tag) { let k = 0, done = 0; J.prog[tag] = [0, items.length]; const w = async () => { while (k < items.length) { const i = k++; try { await fn(items[i], i); } catch (e) { J.err++; if (J.err < 40) log(tag + ' ' + i + ' ' + e.message); } done++; J.prog[tag] = [done, items.length]; } }; await Promise.all(Array.from({ length: n }, w)); }
  try {
    const fflate = await import('https://cdn.jsdelivr.net/npm/fflate@0.8.2/+esm');
    const GT = await import('https://cdn.jsdelivr.net/npm/geotiff@2.1.3/+esm');
    const IN = await fx(BASE + 'entrada.json', 60000);
    const cfg = await fx('https://s3-us-west-2.amazonaws.com/config.maptiles.arcgis.com/waybackconfig.json');
    const REL = Object.keys(cfg).map(k => ({ n: +k, f: (/(\d{4}-\d{2}-\d{2})/.exec(cfg[k].itemTitle) || [])[1], meta: cfg[k].metadataLayerUrl })).filter(r => r.f).sort((a, b) => a.f < b.f ? 1 : -1);
    const RI = {}; REL.forEach((r, i) => RI[r.n] = i);
    log('versiones Wayback: ' + REL.length + ', última ' + REL[0].f);
    const Z = 17, N2 = 2 ** Z * 256;
    const gx = lon => (lon + 180) / 360 * N2, gy = lat => (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * N2;
    /* edificaciones y testigos en píxeles globales z17 */
    const NB = IN.b.length, P = [];
    IN.b.forEach((r, i) => {
      let lon = r[1] / 1e6, lat = r[2] / 1e6; const pts = [[lon, lat]];
      for (let k = 5; k < r.length; k += 2) { lon += r[k] / 1e6; lat += r[k + 1] / 1e6; pts.push([lon, lat]); }
      const c = pts.reduce((a, p) => [a[0] + p[0] / pts.length, a[1] + p[1] / pts.length], [0, 0]);
      P[i] = pts.map(p => [gx(p[0]), gy(p[1])]);
      const ng = IN.neg[i];
      if (ng) { const dlon = ng[0] / (111320 * Math.cos(c[1] * Math.PI / 180)), dlat = ng[1] / 110574; P[NB + i] = pts.map(p => [gx(p[0] + dlon), gy(p[1] + dlat)]); }
    });
    const TT = new Map();
    P.forEach((pl, i) => { if (!pl) return; const cx = pl.reduce((a, p) => a + p[0], 0) / pl.length, cy = pl.reduce((a, p) => a + p[1], 0) / pl.length; const k = Math.floor(cx / 256) + '_' + Math.floor(cy / 256); if (!TT.has(k)) TT.set(k, []); TT.get(k).push(i); });
    const TILES = [...TT.keys()]; log('teselas z17: ' + TILES.length + ', edificaciones ' + NB);
    /* rasterizado de cada huella en su tesela (máscaras interior erosionado, borde y anillo 2–5 px) */
    function mascara(pl, ox, oy) {
      const xs = pl.map(p => p[0] - ox), ys = pl.map(p => p[1] - oy), M = 7;
      const x0 = Math.floor(Math.min(...xs)) - M, x1 = Math.ceil(Math.max(...xs)) + M, y0 = Math.floor(Math.min(...ys)) - M, y1 = Math.ceil(Math.max(...ys)) + M;
      const w = x1 - x0 + 1, h = y1 - y0 + 1, ins = new Uint8Array(w * h);
      for (let y = 0; y < h; y++) { const py = y0 + y + 0.5; for (let x = 0; x < w; x++) { const px = x0 + x + 0.5; let c = false; for (let i = 0, j = xs.length - 1; i < xs.length; j = i++) { if (((ys[i] > py) !== (ys[j] > py)) && (px < (xs[j] - xs[i]) * (py - ys[i]) / (ys[j] - ys[i]) + xs[i])) c = !c; } ins[y * w + x] = c ? 1 : 0; } }
      const D = new Float32Array(w * h).fill(1e9); for (let k = 0; k < w * h; k++) if (ins[k]) D[k] = 0;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const k = y * w + x; if (x) D[k] = Math.min(D[k], D[k - 1] + 1); if (y) D[k] = Math.min(D[k], D[k - w] + 1); if (x && y) D[k] = Math.min(D[k], D[k - w - 1] + 1.41); if (y && x < w - 1) D[k] = Math.min(D[k], D[k - w + 1] + 1.41); }
      for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) { const k = y * w + x; if (x < w - 1) D[k] = Math.min(D[k], D[k + 1] + 1); if (y < h - 1) D[k] = Math.min(D[k], D[k + w] + 1); if (x < w - 1 && y < h - 1) D[k] = Math.min(D[k], D[k + w + 1] + 1.41); if (y < h - 1 && x) D[k] = Math.min(D[k], D[k + w - 1] + 1.41); }
      const inn = [], bor = [], ring = [];
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const k = y * w + x, gxl = x0 + x, gyl = y0 + y;
        if (ins[k]) { const e = (x > 0 && ins[k - 1]) && (x < w - 1 && ins[k + 1]) && (y > 0 && ins[k - w]) && (y < h - 1 && ins[k + w]); (e ? inn : bor).push(gxl, gyl); }
        else if (D[k] >= 2 && D[k] <= 5) ring.push(gxl, gyl); }
      if (inn.length < 8) { for (let i = 0; i < bor.length; i++) inn.push(bor[i]); }
      return { inn, bor, ring };
    }
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 256; const cx = cv.getContext('2d', { willReadFrequently: true });
    const loadImg = src => new Promise((res, rej) => { const i = new Image(); i.crossOrigin = 'anonymous'; const t = setTimeout(() => rej(new Error('timeout img')), 25000); i.onload = () => { clearTimeout(t); res(i); }; i.onerror = () => { clearTimeout(t); rej(new Error('img')); }; i.src = src; });
    const TURL = (n, x, y) => 'https://wayback.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/WMTS/1.0.0/default028mm/MapServer/tile/' + n + '/' + Z + '/' + y + '/' + x;
    const TMAP = (n, x, y) => 'https://wayback.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tilemap/' + n + '/' + Z + '/' + y + '/' + x;
    function pixeles(img) { cx.clearRect(0, 0, 256, 256); cx.drawImage(img, 0, 0); const d = cx.getImageData(0, 0, 256, 256).data, L = new Float32Array(65536), G = new Float32Array(65536);
      for (let k = 0; k < 65536; k++) L[k] = (d[k * 4] + d[k * 4 + 1] + d[k * 4 + 2]) / 3;
      for (let y = 1; y < 255; y++) for (let x = 1; x < 255; x++) { const k = y * 256 + x; G[k] = Math.abs(L[k + 1] - L[k - 1]) + Math.abs(L[k + 256] - L[k - 256]); }
      return { d, L, G }; }
    function corrimiento(Gr, Gv) { let best = -1e18, bx = 0, by = 0; const R = 8;
      for (let sy = -R; sy <= R; sy++) for (let sx = -R; sx <= R; sx++) { let s = 0; for (let y = 24; y < 232; y += 2) for (let x = 24; x < 232; x += 2) s += Gr[y * 256 + x] * Gv[(y + sy) * 256 + x + sx]; if (s > best) { best = s; bx = sx; by = sy; } }
      return [bx, by]; }
    const VERS = {}, ROWS = [], USED = new Set();
    const px = (d, x, y) => { if (x < 0 || y < 0 || x > 255 || y > 255) return -1; return (y * 256 + x) * 4; };
    function rasgos(d, G, m, ox, oy) {
      let n = 0, R = 0, Gg = 0, B = 0, v = 0, s1 = 0, s2 = 0; const inn = m.inn;
      for (let i = 0; i < inn.length; i += 2) { const k = px(d, inn[i] + ox, inn[i + 1] + oy); if (k < 0) continue; const r = d[k], g = d[k + 1], b = d[k + 2], l = (r + g + b) / 3; n++; R += r; Gg += g; B += b; s1 += l; s2 += l * l; if (2 * g - r - b >= 14 && g >= r + 6) v++; }
      let nr = 0, Rr = 0, Gr = 0, Br = 0, vr = 0; const ring = m.ring;
      for (let i = 0; i < ring.length; i += 2) { const k = px(d, ring[i] + ox, ring[i + 1] + oy); if (k < 0) continue; const r = d[k], g = d[k + 1], b = d[k + 2]; nr++; Rr += r; Gr += g; Br += b; if (2 * g - r - b >= 14 && g >= r + 6) vr++; }
      let eb = 0, nb = 0, er = 0; for (let i = 0; i < m.bor.length; i += 2) { const x = m.bor[i] + ox, y = m.bor[i + 1] + oy; if (x < 1 || y < 1 || x > 254 || y > 254) continue; eb += G[y * 256 + x]; nb++; }
      let nrg = 0; for (let i = 0; i < ring.length; i += 2) { const x = ring[i] + ox, y = ring[i + 1] + oy; if (x < 1 || y < 1 || x > 254 || y > 254) continue; er += G[y * 256 + x]; nrg++; }
      if (n < 3 || nr < 3) return null;
      const mL = s1 / n;
      return [n, Math.round(R / n), Math.round(Gg / n), Math.round(B / n), Math.round(100 * v / n), Math.round(Math.sqrt(Math.max(0, s2 / n - mL * mL))), Math.round(Rr / nr), Math.round(Gr / nr), Math.round(Br / nr), Math.round(100 * vr / nr), nb ? Math.round(eb / nb) : -1, nrg ? Math.round(er / nrg) : -1];
    }
    function contraste(d, ms, ox, oy) { let s = 0; for (const m of ms) { let a = 0, na = 0, b = 0, nb = 0; for (let i = 0; i < m.inn.length; i += 2) { const k = px(d, m.inn[i] + ox, m.inn[i + 1] + oy); if (k >= 0) { a += d[k] + d[k + 1] + d[k + 2]; na++; } } for (let i = 0; i < m.ring.length; i += 6) { const k = px(d, m.ring[i] + ox, m.ring[i + 1] + oy); if (k >= 0) { b += d[k] + d[k + 1] + d[k + 2]; nb++; } } if (na && nb) s += Math.abs(a / na - b / nb); } return s; }

    /* 1 · cadena de versiones distintas por tesela y rasgos por edificación */
    J.fase = 'teselas';
    await pool(TILES, 8, async (key) => {
      const [tx, ty] = key.split('_').map(Number), ids = TT.get(key), ox = tx * 256, oy = ty * 256;
      const chain = []; let i = 0;
      while (i < REL.length) {
        const j = await reint(() => fx(TMAP(REL[i].n, tx, ty), 15000)); if (!j.data || !j.data[0]) break;
        const sel = j.select && j.select[0] ? j.select[0] : REL[i].n; if (RI[sel] === undefined) break; chain.push(sel); USED.add(sel); i = RI[sel] + 1;
      }
      if (!chain.length) return;
      const ms = ids.map(b => mascara(P[b], ox, oy)), reales = ms.filter((m, k) => ids[k] < NB);
      let ref = null, oL = [0, 0]; const vt = [];
      for (let v = 0; v < chain.length; v++) {
        let img; try { img = await reint(() => loadImg(TURL(chain[v], tx, ty)), 2); } catch (e) { vt.push([chain[v], null]); continue; }
        const p = pixeles(img);
        let off;
        if (!ref) { let best = reales.length ? -1 : 1e18, b = [0, 0]; for (let sy = -5; sy <= 5; sy++) for (let sx = -5; sx <= 5; sx++) { const c = contraste(p.d, reales, sx, sy); if (c > best) { best = c; b = [sx, sy]; } } oL = b; ref = p; off = b; }
        else { const s = corrimiento(ref.G, p.G); off = [oL[0] + s[0], oL[1] + s[1]]; }
        vt.push([chain[v], off]);
        ids.forEach((b, k) => { const f = rasgos(p.d, p.G, ms[k], off[0], off[1]); if (f) ROWS.push([b, chain[v]].concat(f)); });
      }
      VERS[key] = vt;
    }, 'teselas');
    log('filas ' + ROWS.length + ', versiones usadas ' + USED.size);

    /* 2 · fecha de toma de cada versión usada (metadatos de Esri, nivel 1,2 m), por zona */
    J.fase = 'metadatos';
    const ZB = {}; IN.b.forEach((r, i) => { const z = IN.zonas[IN.zona[i]], lon = r[1] / 1e6, lat = r[2] / 1e6; const b = ZB[z] || (ZB[z] = [1e9, 1e9, -1e9, -1e9]); b[0] = Math.min(b[0], lon); b[1] = Math.min(b[1], lat); b[2] = Math.max(b[2], lon); b[3] = Math.max(b[3], lat); });
    const META = {}, jobsM = []; [...USED].forEach(n => Object.entries(ZB).forEach(([z, b]) => jobsM.push([n, z, b])));
    await pool(jobsM, 4, async ([n, z, b]) => {
      const it = REL[RI[n]]; let fc = null;
      for (const capa of [6, 5, 7]) {
        const u = it.meta + '/' + capa + '/query?geometry=' + [b[0] - .002, b[1] - .002, b[2] + .002, b[3] + .002].map(v => v.toFixed(5)).join(',') + '&geometryType=esriGeometryEnvelope&inSR=4326&outSR=4326&spatialRel=esriSpatialRelIntersects&outFields=SRC_DATE,SRC_DATE2,SRC_RES,SRC_ACC,SRC_DESC,NICE_DESC,NICE_NAME&returnGeometry=true&maxAllowableOffset=0.00002&f=geojson';
        try { const q = await reint(() => fx(u, 40000), 2); if (q.features && q.features.length) { fc = q; fc.capa = capa; break; } } catch (e) { }
      }
      META[n + '|' + z] = fc;
    }, 'metadatos');

    /* 3 · Landsat: NDVI por escena en la grilla de la Ciudad (la misma de la clasificación 1976–2026) */
    J.fase = 'landsat';
    const LSU = { gls: 'https://landsat2.arcgis.com/arcgis/rest/services/LandsatGLS/MS/ImageServer', ms: 'https://landsat2.arcgis.com/arcgis/rest/services/Landsat/MS/ImageServer' };
    const g = IN.ls.grid, LSF = {}, esc = []; IN.ls.ep.forEach(e => e.f.forEach(f => esc.push([e.svc, f])));
    await pool(esc, 4, async ([svc, f]) => {
      const ms = Date.parse(f + 'T00:00:00Z'), mr = svc === 'ms' ? { mosaicMethod: 'esriMosaicAttribute', sortField: 'CloudCover', sortValue: '0', ascending: true, where: 'Category = 1' } : { where: 'Category = 1' };
      const u = LSU[svc] + '/exportImage?' + ['bbox=' + [g.x0, g.y1 - g.h * g.sx, g.x0 + g.w * g.sx, g.y1].join(','), 'bboxSR=3857', 'imageSR=3857', 'size=' + g.w + ',' + g.h, 'time=' + ms + ',' + (ms + 86399000), 'mosaicRule=' + encodeURIComponent(JSON.stringify(mr)), 'renderingRule=' + encodeURIComponent(JSON.stringify({ rasterFunction: 'NDVI Raw' })), 'format=tiff', 'pixelType=F32', 'noData=-9999', 'f=image'].join('&');
      const buf = await reint(() => fx(u, 60000, 'buf'), 3); const t2 = await GT.fromArrayBuffer(buf); const ras = await (await t2.getImage()).readRasters({ interleave: true });
      const o = new Int8Array(g.w * g.h); for (let k = 0; k < o.length; k++) { const v = ras[k]; o[k] = (v > -1.5 && v < 1.5) ? Math.round(v * 100) : -128; }
      LSF['ls_' + f + '.i8'] = new Uint8Array(o.buffer);
    }, 'landsat');

    /* 4 · paquete */
    J.fase = 'empaquetando';
    const W = 14, A = new Int32Array(ROWS.length * W); ROWS.forEach((r, i) => { for (let k = 0; k < W; k++) A[i * W + k] = r[k] == null ? -1 : r[k]; });
    const enc = new TextEncoder(), F = Object.assign({}, LSF);
    F['rasgos.i32'] = new Uint8Array(A.buffer);
    F['versiones.json'] = enc.encode(JSON.stringify(VERS));
    F['metadatos.json'] = enc.encode(JSON.stringify(META));
    F['info.json'] = enc.encode(JSON.stringify({ fecha: new Date().toISOString(), nivel: Z, edificaciones: NB, filas: ROWS.length, columnas: ['id (≥ N = testigo de id-N)', 'versión Wayback', 'n px interior', 'R', 'G', 'B', '% verde interior', 'desvío L interior', 'R anillo', 'G anillo', 'B anillo', '% verde anillo', 'gradiente en el borde', 'gradiente en el anillo'], versiones: REL.filter(r => USED.has(r.n)).map(r => [r.n, r.f, r.meta]), log: J.log, errores: J.err }));
    const zip = fflate.zipSync(F, { level: 6 }); J.zip = new Blob([zip], { type: 'application/zip' }); J.mb = (zip.length / 1e6).toFixed(1);
    J.fase = 'listo'; log('zip ' + J.mb + ' MB');
  } catch (e) { J.fase = 'error'; log('ERROR ' + e.message + ' ' + (e.stack || '').slice(0, 300)); }
})();
window.FW_BAJAR = function () { const a = document.createElement('a'); a.href = URL.createObjectURL(window.FW.zip); a.download = 'huella_wayback_SAG.zip'; document.body.appendChild(a); a.click(); return 'descarga iniciada'; };
'lanzado';
