/* Observatorio del presupuesto de San Andrés de Giles — tableros */
const C = { ink: '#3A3027', ocre: '#7B5A8E', ocreD: '#5E4370', gris: '#A69C8F', arena: '#C4AE84', verde: '#A2934A', rojo: '#9B3B2F', pizarra: '#7A4E33', claro: '#E4DED3', marron: '#5E4A3A' }; // paleta Horizonte
const PAL = [C.ink, C.ocre, C.pizarra, C.arena, C.verde, C.marron, C.gris, C.rojo, '#8FA2AC', '#B79CC8'];
const nf = (v, d = 0) => v == null || isNaN(v) ? '–' : Number(v).toLocaleString('es-AR', { minimumFractionDigits: d, maximumFractionDigits: d });
let D = null, TB = null; const charts = {}; const drawn = {};
Chart.defaults.font.family = "'Plus Jakarta Sans', system-ui, sans-serif"; Chart.defaults.font.size = 12; Chart.defaults.color = '#4A4138';
Chart.defaults.plugins.legend.labels.boxWidth = 12; Chart.defaults.maintainAspectRatio = false;

function mk(id, cfg) { if (charts[id]) charts[id].destroy(); const el = document.getElementById(id); if (!el) return; charts[id] = new Chart(el, cfg); }
function esc(s) { return String(s ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }
function cell(v, h) {
  if (v == null || v === '') return '<td></td>';
  if (typeof v === 'number') {
    h = h || '';
    if (/^(Año|Código)$/.test(h)) return `<td class="n">${v}</td>`;
    const x = Math.abs(v); const d = Number.isInteger(v) || x >= 1000 ? 0 : x >= 100 ? 1 : 2;
    return `<td class="n">${nf(v, d)}</td>`;
  }
  const s = String(v); return /^[–\-\d.,% ]+$/.test(s) && s.length < 18 ? `<td class="n">${esc(s)}</td>` : `<td>${esc(s)}</td>`;
}
function table(el, header, rows, opts = {}) {
  const box = typeof el === 'string' ? document.getElementById(el) : el; if (!box) return;
  let sortI = -1, asc = true, data = rows.slice();
  const render = () => {
    let r = data;
    if (opts.filter) { const q = opts.filter().toLowerCase(); if (q) r = r.filter(x => x.join(' ').toLowerCase().includes(q)); }
    box.innerHTML = `<table class="dt"><thead><tr>${header.map((h, i) => `<th data-i="${i}">${esc(h)}${sortI === i ? (asc ? ' ▲' : ' ▼') : ''}</th>`).join('')}</tr></thead><tbody>${r.map(x => `<tr>${header.map((h, i) => cell(x[i], h)).join('')}</tr>`).join('')}</tbody></table>`;
    box.querySelectorAll('th').forEach(th => th.onclick = () => { const i = +th.dataset.i; asc = sortI === i ? !asc : true; sortI = i;
      data.sort((a, b) => { const x = a[i], y = b[i]; const nx = typeof x === 'number' ? x : parseFloat(String(x).replace(/\./g, '').replace(',', '.')), ny = typeof y === 'number' ? y : parseFloat(String(y).replace(/\./g, '').replace(',', '.'));
        const c = (!isNaN(nx) && !isNaN(ny)) ? nx - ny : String(x ?? '').localeCompare(String(y ?? ''), 'es'); return asc ? c : -c; }); render(); });
    box._rows = r;
  };
  render(); return render;
}
const yrs = () => D.serie.map(d => d.year);

/* ---------- SERIE ---------- */
function drawSerie() {
  const s = D.serie; const u = document.getElementById('s-unit').value;
  const f = { real: d => d.GT_real / 1e6, nom: d => d.GT / 1e6, usd: d => d.GT_usd / 1e6, pc: d => d.GT_pc_real / 1e3, usdpc: d => d.GT_usd_pc }[u];
  const lab = { real: 'M$ de 2025', nom: 'M$ corrientes', usd: 'millones de USD', pc: 'miles de $ 2025 por habitante', usdpc: 'USD por habitante' }[u];
  mk('c-serie', { type: 'bar', data: { labels: yrs(), datasets: [{ label: 'Gasto total (' + lab + ')', data: s.map(f), backgroundColor: s.map(d => d.year === 2011 || d.year === 2025 ? C.ocre : C.ink) }] },
    options: { plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => nf(c.raw, u === 'usd' ? 2 : 0) + ' ' + lab } } }, scales: { y: { title: { display: true, text: lab } } } } });
  if (drawn.serie) return; drawn.serie = true;
  mk('c-ingeg', { type: 'line', data: { labels: yrs(), datasets: [
    { label: 'Ingresos totales', data: s.map(d => d.IT_real / 1e6), borderColor: C.ink, backgroundColor: C.ink, tension: .2 },
    { label: 'Gastos totales', data: s.map(d => d.GT_real / 1e6), borderColor: C.ocre, backgroundColor: C.ocre, tension: .2 }] },
    options: { plugins: { tooltip: { callbacks: { label: c => c.dataset.label + ': ' + nf(c.raw) + ' M$' } } } } });
  const e = s.filter(d => d.ejec_sobre_original);
  mk('c-ejec', { type: 'bar', data: { labels: e.map(d => d.year), datasets: [{ label: 'Ejecutado / original', data: e.map(d => d.ejec_sobre_original), backgroundColor: e.map(d => d.ejec_sobre_original > 2 ? C.ocre : C.pizarra) }] },
    options: { plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => '×' + nf(c.raw, 2) } } }, scales: { y: { beginAtZero: true, title: { display: true, text: 'veces' } } } } });
}

/* ---------- RECURSOS ---------- */
function drawRecursos() {
  const t = D.transf.filter(r => r.pc);
  mk('c-transf', { data: { labels: t.map(r => r.year), datasets: [
    { type: 'bar', label: 'Transferencias por habitante (miles $ 2025)', data: t.map(r => r.pc), backgroundColor: C.ink, yAxisID: 'y' },
    { type: 'line', label: 'CUD (%)', data: D.transf.filter(r => r.pc).map(r => r.cud), borderColor: C.ocre, backgroundColor: C.ocre, yAxisID: 'y2', spanGaps: true }] },
    options: { scales: { y: { position: 'left' }, y2: { position: 'right', grid: { drawOnChartArea: false }, min: 0.34, max: 0.44, ticks: { callback: v => nf(v, 3) } } } } });
  const est = [['Coparticipación', 69.4], ['Otras transferencias provinciales', 11.4], ['Aranceles hospital, geriátrico y jardín', 8.6], ['Tasa servicios urbanos', 2.9], ['Tasa servicios rurales', 1.3], ['Derechos de construcción', 1.1], ['Multas e infracciones', 0.7], ['Tasa servicios sanitarios', 0.5], ['Otros', 4.1]];
  mk('c-recest', { type: 'doughnut', data: { labels: est.map(x => x[0]), datasets: [{ data: est.map(x => x[1]), backgroundColor: PAL }] },
    options: { plugins: { legend: { position: 'right' }, tooltip: { callbacks: { label: c => c.label + ': ' + nf(c.raw, 1) + ' %' } } } } });
  const rv = D.rec.filter(r => r.var != null && !/TOTAL/.test(r.r));
  mk('c-recvar', { type: 'bar', data: { labels: rv.map(r => r.r.replace(/\(.*\)/, '')), datasets: [{ data: rv.map(r => r.var), backgroundColor: rv.map(r => r.var < 0 ? C.ocre : C.ink) }] },
    options: { indexAxis: 'y', plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => nf(c.raw) + ' %' } } }, scales: { x: { title: { display: true, text: '% real 2021–2024' } } } } });
  const ru = D.transf.filter(r => r.rural_real);
  mk('c-rural', { type: 'line', data: { labels: ru.map(r => r.year), datasets: [{ label: 'Inmobiliario Rural (M$ 2025)', data: ru.map(r => r.rural_real), borderColor: C.verde, backgroundColor: C.verde, fill: false, tension: .2 }] },
    options: { plugins: { legend: { display: false } } } });
  const t6 = TB.find(x => x.id === 'pres_6_Rubros'); table('tb-rec', t6.header, t6.rows);
}

/* ---------- GASTO ---------- */
function drawGasto() {
  const o = D.obj; const K = [['personal', 'Personal'], ['consumo', 'Bienes de consumo'], ['servicios', 'Servicios no personales'], ['bienes_uso', 'Bienes de uso (obra y equipos)'], ['transferencias', 'Transferencias'], ['deuda', 'Deuda y flotante']];
  mk('c-obj', { type: 'bar', data: { labels: o.map(r => r.year), datasets: K.map((k, i) => ({ label: k[1], data: o.map(r => r[k[0]]), backgroundColor: PAL[i] })) },
    options: { scales: { x: { stacked: true }, y: { stacked: true, max: 100, title: { display: true, text: '% del gasto' } } }, plugins: { tooltip: { callbacks: { label: c => c.dataset.label + ': ' + nf(c.raw, 1) + ' %' } } } } });
  const f = D.fin.filter(r => !/TOTAL/.test(r.f)).sort((a, b) => b.p25 - a.p25);
  mk('c-fin', { type: 'bar', data: { labels: f.map(r => r.f), datasets: [{ label: '% del devengado 2025', data: f.map(r => r.p25), backgroundColor: f.map(r => /Planeamiento/.test(r.f) ? C.ocre : C.ink) }] },
    options: { indexAxis: 'y', plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => nf(c.raw, 1) + ' % · var. real 23–25: ' + nf(f[c.dataIndex].var) + ' %' } } } } });
  const fv = f.filter(r => r.var != null && Math.abs(r.var) < 300).sort((a, b) => a.var - b.var);
  mk('c-finvar', { type: 'bar', data: { labels: fv.map(r => r.f), datasets: [{ data: fv.map(r => r.var), backgroundColor: fv.map(r => r.var < 0 ? C.ocre : C.pizarra) }] },
    options: { indexAxis: 'y', plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => nf(c.raw) + ' %' } } } } });
  const ctl = document.getElementById('prog-ctl'); const N = D.prog_names; const def = ['p70', 'p50', 'p63', 'p53'];
  ctl.innerHTML = Object.entries(N).map(([k, v]) => `<label><input type="checkbox" value="${k}" ${def.includes(k) ? 'checked' : ''}> ${v}</label>`).join('');
  const dp = () => { const sel = [...ctl.querySelectorAll('input:checked')].map(i => i.value);
    mk('c-prog', { type: 'line', data: { labels: D.prog.map(r => r.year), datasets: sel.map((k, i) => ({ label: N[k], data: D.prog.map(r => r[k] ?? null), borderColor: PAL[Object.keys(N).indexOf(k) % PAL.length], backgroundColor: PAL[Object.keys(N).indexOf(k) % PAL.length], spanGaps: true, tension: .2 })) },
      options: { plugins: { tooltip: { callbacks: { label: c => c.dataset.label + ': ' + nf(c.raw) + ' M$ 2025' } } }, scales: { y: { title: { display: true, text: 'M$ de 2025' } } } } }); };
  ctl.onchange = dp; dp();
  table('tb-fin', ['Finalidad / función', 'Devengado 2025 (M$)', '% 2023', '% 2024', '% 2025', 'Dev./sanc. 2025', 'Var. real 2023–25 (%)', '% 1.er sem. 2026'], D.fin.map(r => [r.f, r.dev25, r.p23, r.p24, r.p25, r.ejec, r.var, r.p26]));
}

/* ---------- RESULTADO ---------- */
function drawResultado() {
  const s = D.serie;
  mk('c-rf', { type: 'bar', data: { labels: yrs(), datasets: [{ label: 'Resultado / ingresos (%)', data: s.map(d => d.RF_pct), backgroundColor: s.map(d => d.RF_pct < 0 ? C.ocre : C.pizarra) }] },
    options: { plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => nf(c.raw, 1) + ' % · ' + nf(s[c.dataIndex].RF / 1e6, 1) + ' M$' } } } } });
  mk('c-ahorro', { type: 'line', data: { labels: yrs(), datasets: [
    { label: 'Ahorro corriente (%)', data: s.map(d => d.ahorro_pct), borderColor: C.ink, backgroundColor: C.ink, tension: .2 },
    { label: 'Gasto de capital (% del total)', data: s.map(d => d.GK_pct), borderColor: C.ocre, backgroundColor: C.ocre, tension: .2 }] },
    options: { plugins: { tooltip: { callbacks: { label: c => c.dataset.label + ': ' + nf(c.raw, 1) + ' %' } } } } });
  const t7 = TB.find(x => x.id === 'pres_7_Deuda_Tesoreria'); const r = t7.rows.filter(x => typeof x[0] === 'number' && (x[1] != null || x[2] != null));
  mk('c-deuda', { type: 'bar', data: { labels: r.map(x => x[0]), datasets: [
    { label: 'Deuda flotante generada', data: r.map(x => x[1] != null ? x[1] / 1e6 : null), backgroundColor: C.ocre },
    { label: 'Saldo de tesorería al 31/12', data: r.map(x => x[2] != null ? x[2] / 1e6 : null), backgroundColor: C.ink }] },
    options: { plugins: { tooltip: { callbacks: { label: c => c.dataset.label + ': ' + nf(c.raw, 1) + ' M$' } } } } });
}

/* ---------- SUELO ---------- */
function drawSuelo() {
  const t = TB.find(x => x.id === 'pres_10_Plusvalias'); table('tb-plus', t.header, t.rows);
  mk('c-plus', { type: 'bar', data: { labels: ['Hectáreas involucradas', 'Recibidas por el Municipio', 'Destinadas a reserva y parque'], datasets: [{ data: [126, 47.4, 32], backgroundColor: [C.gris, C.ocre, C.verde] }] },
    options: { plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => nf(c.raw, 1) + ' ha' } } }, scales: { y: { title: { display: true, text: 'hectáreas' } } } } });
}

/* ---------- PRENSA ---------- */
function drawPrensa() {
  const P = D.peso_agenda;
  mk('c-peso', { type: 'bar', data: { labels: P.map(r => r[0].replace(/\s*\(.*\)/, '')), datasets: [{ label: 'Peso en el presupuesto (%)', data: P.map(r => r[2]), backgroundColor: C.ink }, { label: 'Peso en la agenda (%)', data: P.map(r => r[3]), backgroundColor: C.ocre }] },
    options: { indexAxis: 'y', plugins: { tooltip: { callbacks: { footer: it => P[it[0].dataIndex][4] } } } } });
  const A = D.fiscal; const ys = Object.keys(A.yn);
  mk('c-fisano', { data: { labels: ys, datasets: [{ type: 'bar', label: 'Notas sobre finanzas', data: ys.map(y => A.yn[y]), backgroundColor: C.ink, yAxisID: 'y' },
    { type: 'line', label: 'Por cada mil notas', data: ys.map(y => A.yn[y] / A.ytot[y] * 1000), borderColor: C.ocre, backgroundColor: C.ocre, yAxisID: 'y2' }] },
    options: { scales: { y2: { position: 'right', grid: { drawOnChartArea: false } } }, plugins: { tooltip: { callbacks: { label: c => c.dataset.label + ': ' + nf(c.raw, c.datasetIndex ? 1 : 0) } } } } });
  const T = Object.keys(A.LAB).sort((a, b) => A.tot[b] - A.tot[a]);
  mk('c-fistema', { type: 'bar', data: { labels: T.map(t => A.LAB[t]), datasets: [{ label: 'Notas', data: T.map(t => A.tot[t]), backgroundColor: C.gris }, { label: 'Con encuadre de conflicto', data: T.map(t => A.neg[t]), backgroundColor: C.rojo }] },
    options: { indexAxis: 'y', scales: { x: { stacked: false } } } });
  const G = D.agenda; const sel = document.getElementById('s-agyear');
  sel.innerHTML = '<option value="all">2016–2026</option>' + G.Y.map(y => `<option>${y}</option>`).join('');
  const da = () => { const y = sel.value; const keys = G.order.filter(k => k !== 'OTR' && k !== 'IMP');
    const v = keys.map(k => y === 'all' ? G.tT[k] / G.G * 100 : G.tot[y][k] / G.yT[y] * 100);
    const o = keys.map((k, i) => [k, v[i]]).sort((a, b) => b[1] - a[1]);
    mk('c-agenda', { type: 'bar', data: { labels: o.map(x => G.LAB[x[0]]), datasets: [{ data: o.map(x => x[1]), backgroundColor: o.map(x => ['VIV', 'CAM', 'MUN'].includes(x[0]) ? C.ocre : C.ink) }] },
      options: { indexAxis: 'y', plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => nf(c.raw, 1) + ' % de las notas' } } } } }); };
  sel.onchange = da; da();
  const t = TB.find(x => x.id === 'prensa_Contraste'); table('tb-contraste', t.header, t.rows);
}

/* ---------- REDES ---------- */
function drawRedes() {
  const A = [['#sag – humor y noticias (IG)', 52000], ['Grupo Ventas, Trueques SAG (FB)', 45000], ['Grupo compra y venta SAG (FB)', 34000], ['Noticias de San Andrés de Giles (FB)', 32000], ['Infociudad (FB)', 28000], ['Grupo Mercado Giles (FB)', 28000], ['Municipalidad (IG)', 18000], ['Grupo Autos y Motos SAG (FB)', 17000], ['Municipalidad (FB)', 16000], ['Infociudad (IG)', 14000], ['Somos SAG (FB, cerrado)', 13000], ['Grupo Vecinos en Alerta (FB, privado)', 9900], ['Turismo SAG (IG)', 6760], ['Empleos en SAG (FB)', 4900], ['Noticias Gilenses (IG)', 4100], ['Municipalidad (TikTok)', 3390], ['Canal 2 GOL Cable (YouTube)', 1730], ['Grupo Convecinos de Azcuénaga (FB)', 1200], ['Concejo Deliberante (FB)', 1100], ['Grupo San Andrés de Giles rural (FB)', 364]];
  mk('c-aud', { type: 'bar', data: { labels: A.map(a => a[0]), datasets: [{ data: A.map(a => a[1]), backgroundColor: A.map(a => /Grupo/.test(a[0]) ? C.gris : /Municipalidad|Concejo|Turismo/.test(a[0]) ? C.verde : /#sag/.test(a[0]) ? C.ocre : C.ink) }] },
    options: { indexAxis: 'y', plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => nf(c.raw) + ' seguidores o miembros' } } } } });
  const R = D.redes; const fb = R.fb.filter(p => ['NoticiasdeSag1', 'infociudadok', 'MunicipioSAG', 'HCD'].includes(p.cuenta) && p.th !== 'OTR');
  const n = {}, it = {}; fb.forEach(p => { n[p.th] = (n[p.th] || 0) + 1; it[p.th] = (it[p.th] || 0) + p.int; });
  const N = Object.values(n).reduce((a, b) => a + b, 0), I = Object.values(it).reduce((a, b) => a + b, 0); const ks = Object.keys(n).sort((a, b) => it[b] - it[a]);
  mk('c-fbtem', { type: 'bar', data: { labels: ks.map(k => R.lab[k]), datasets: [{ label: '% de las publicaciones', data: ks.map(k => n[k] / N * 100), backgroundColor: C.gris }, { label: '% de las interacciones', data: ks.map(k => it[k] / I * 100), backgroundColor: C.ocre }] },
    options: { indexAxis: 'y', plugins: { tooltip: { callbacks: { label: c => c.dataset.label + ': ' + nf(c.raw, 1) + ' %' } } } } });
  const YL = { DEP: 'Deporte', CUL: 'Cultura y música', PRG: 'Programas de radio y TV', NOT: 'Noticieros y transmisiones', CAM: 'Campo', ENT: 'Humor y entretenimiento', MUN: 'Municipio y obras', ELE: 'Política', INM: 'Avisos inmobiliarios', EDU: 'Educación', SOC: 'Comunidad', SAL: 'Salud', POL: 'Policiales', ECO: 'Economía', INF: 'Servicios', EME: 'Clima' };
  const ag = R.yt.agg; const yk = Object.keys(ag).filter(k => ag[k].n12 > 0 && YL[k]).sort((a, b) => ag[b].v12 - ag[a].v12);
  mk('c-yt', { type: 'bar', data: { labels: yk.map(k => YL[k]), datasets: [{ label: 'Vistas', data: yk.map(k => ag[k].v12), backgroundColor: yk.map(k => ['DEP', 'CUL', 'CAM'].includes(k) ? C.ocre : C.ink) }] },
    options: { indexAxis: 'y', plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => nf(c.raw) + ' vistas · ' + ag[yk[c.dataIndex]].n12 + ' videos' } } } } });
  const q = document.getElementById('q-posts'), sr = document.getElementById('s-red');
  const tp = () => { const fbm = sr.value === 'fb';
    const rows = fbm ? R.fb.map(p => [p.cuenta, p.fecha, R.lab[p.th], +p.reacciones, +p.comentarios, +p.compartidos, p.int, p.texto]) : R.ig.map(p => [p.cuenta, p.fecha, R.lab[p.th], +p.likes, +p.comentarios, p.ambito, p.int, p.texto]);
    const hdr = fbm ? ['Cuenta', 'Antigüedad', 'Tema', 'Reacciones', 'Comentarios', 'Compartidos', 'Interacciones', 'Publicación'] : ['Cuenta', 'Fecha', 'Tema', 'Me gusta', 'Comentarios', 'Ámbito', 'Interacciones', 'Publicación'];
    table('tb-posts', hdr, rows, { filter: () => q.value }); };
  q.oninput = tp; sr.onchange = tp; tp();
}

/* ---------- CONSULTAS ---------- */
function drawConsultas() {
  const s = document.getElementById('s-tabla'), q = document.getElementById('q-tabla');
  const groups = [...new Set(TB.map(t => t.group))];
  s.innerHTML = groups.map(g => `<optgroup label="${g}">${TB.filter(t => t.group === g).map(t => `<option value="${t.id}">${esc(t.title.slice(0, 95))}</option>`).join('')}</optgroup>`).join('');
  let rend = null;
  const show = () => { const t = TB.find(x => x.id === s.value); document.getElementById('tabla-titulo').textContent = t.title; document.getElementById('tabla-nota').textContent = t.note || '';
    rend = table('tb-consulta', t.header, t.rows, { filter: () => q.value }); };
  s.onchange = () => { q.value = ''; show(); history.replaceState(null, '', '#consultas/' + s.value); }; q.oninput = () => rend && rend();
  document.getElementById('b-csv').onclick = () => { const t = TB.find(x => x.id === s.value); const rows = document.getElementById('tb-consulta')._rows || t.rows;
    const csv = [t.header, ...rows].map(r => r.map(v => { const x = v == null ? '' : String(v); return /[;"\n]/.test(x) ? '"' + x.replace(/"/g, '""') + '"' : x; }).join(';')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })); a.download = t.id + '.csv'; a.click(); };
  const want = location.hash.split('/')[1]; if (want && TB.find(t => t.id === want)) s.value = want; show();
}

/* ---------- INFORMES ---------- */
const docCache = {};
async function showDoc(n) {
  document.querySelectorAll('#doc-tabs button').forEach(b => b.classList.toggle('on', b.dataset.doc === n));
  const el = document.getElementById('doc'); el.innerHTML = '<p>Cargando…</p>';
  if (!docCache[n]) docCache[n] = await (await fetch('data/' + n + '.html')).text();
  el.innerHTML = docCache[n];
}
function drawInformes() { document.querySelectorAll('#doc-tabs button').forEach(b => b.onclick = () => showDoc(b.dataset.doc)); showDoc('informe_presupuesto'); }

/* ---------- navegación ---------- */
const DRAW = { serie: drawSerie, recursos: drawRecursos, gasto: drawGasto, resultado: drawResultado, suelo: drawSuelo, prensa: drawPrensa, redes: drawRedes, consultas: drawConsultas, informes: drawInformes };
function go() {
  const h = (location.hash || '#inicio').slice(1).split('/')[0] || 'inicio';
  document.querySelectorAll('section.tab').forEach(s => s.classList.toggle('on', s.id === 't-' + h));
  document.querySelectorAll('#tabs a').forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + h));
  if (D && DRAW[h] && !drawn['tab_' + h]) { drawn['tab_' + h] = true; DRAW[h](); }
  window.scrollTo({ top: 0 });
}
window.addEventListener('hashchange', go);
Promise.all([fetch('data/datos.json').then(r => r.json()), fetch('data/tablas.json').then(r => r.json())]).then(([d, t]) => {
  D = d; TB = t; document.getElementById('s-unit').onchange = drawSerie; go();
});
go();
