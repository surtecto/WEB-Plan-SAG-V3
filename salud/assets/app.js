/* La salud que cuenta · Plan SAG — tableros, tablas y mapa */
const nf = (v, d = 0) => v == null || v === '' || isNaN(v) ? '–' : Number(v).toLocaleString('es-AR', { minimumFractionDigits: d, maximumFractionDigits: d });
const INK = '#3A3027', OC = '#7B5A8E', GR = '#A69C8F', VE = '#A2934A', RO = '#9B3B2F', AZ = '#2A5C7E'; // paleta Horizonte
Chart.defaults.font.family = "'Plus Jakarta Sans', system-ui, sans-serif"; Chart.defaults.color = '#4A4138';
const charts = {}; let D, E, LOADED = false;
function mk(id, cfg) { if (charts[id]) charts[id].destroy(); const el = document.getElementById(id); if (el) charts[id] = new Chart(el, cfg); }
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const yfmt = { ticks: { callback: v => nf(v) } };

/* ---------- tablas accesibles ---------- */
function table(el, cap, header, rows, opt = {}) {
  if (typeof el === 'string') el = document.getElementById(el); if (!el) return;
  let data = rows.slice(), sortI = -1, asc = true;
  const num = opt.num || header.map((_, j) => rows.some(r => typeof r[j] === 'number'));
  const render = () => {
    el.innerHTML = `<table class="dt"><caption>${esc(cap)}</caption><thead><tr>${header.map((h, j) =>
      `<th scope="col" aria-sort="${sortI === j ? (asc ? 'ascending' : 'descending') : 'none'}"><button type="button" data-j="${j}" style="all:unset;cursor:pointer">${esc(h)}${sortI === j ? (asc ? ' ▲' : ' ▼') : ''}</button></th>`).join('')}</tr></thead><tbody>${
      data.map(r => `<tr>${r.map((c, j) => j === 0 ? `<th scope="row" style="background:inherit;color:inherit;position:static;font-weight:600">${esc(c)}</th>` :
        `<td class="${num[j] ? 'n' : ''}">${typeof c === 'number' ? nf(c, opt.dec?.[j] ?? (Math.abs(c) < 10 && c % 1 ? 1 : 0)) : esc(c ?? '–')}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    el.querySelectorAll('th button').forEach(b => b.onclick = () => { const j = +b.dataset.j; asc = sortI === j ? !asc : true; sortI = j;
      data.sort((x, y) => { const a = x[j], c = y[j]; const r = (typeof a === 'number' && typeof c === 'number') ? a - c : String(a ?? '').localeCompare(String(c ?? ''), 'es'); return asc ? r : -r; }); render(); });
  };
  render(); el._csv = () => [header, ...data];
}
function csv(name, rows) {
  const t = rows.map(r => r.map(c => { const s = c == null ? '' : String(c); return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }).join(';')).join('\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + t], { type: 'text/csv' })); a.download = name + '.csv'; a.click();
}

/* ---------- datos derivados ---------- */
const TAB = {};
function prep() {
  const U = D.U;
  TAB.unit = ['Valor anual de cada unidad registrada (pesos de 2025)', ['Unidad registrada', 'Peso en el régimen', 'Valor anual ($)'], [
    ['Consulta médica', '25 %', U.cons * 1e6], ['Egreso', '10 %', U.egr * 1e6], ['Paciente-día (sólo componente d)', '20 %', U.pd * 1e6],
    ['Paciente-día en el Hospital (perfil 6)', '20 % + 35 %', (U.pd + U.val * 6 / 365) * 1e6], ['Paciente-día en el Hogar (perfil 1)', '20 % + 35 %', (U.pd + U.val / 365) * 1e6],
    ['Establecimiento sin internación', '10 %', U.sin * 1e6]]];
  TAB.serie = ['Indicadores de Giles y peso en el total provincial, 2012–2024', ['Año', 'Consultas médicas', 'Egresos', 'Pacientes-día', '% consultas', '% egresos', '% pacientes-día', 'Componente salud (perfil 6)'],
    D.serie.map(s => [String(s.y), s.cons, s.egr, s.pd, +s.sh_cons.toFixed(3), +s.sh_egr.toFixed(3), +s.sh_pd.toFixed(3), +s.c6.toFixed(4)]), { dec: [0, 0, 0, 0, 3, 3, 3, 4] }];
  TAB.esc = ['Escenarios: coparticipación adicional por año', ['Palanca', 'Millones de $ de 2025', 'Nota'], D.esc.map(e => [e.esc, Math.round(e.mpesos), e.nota])];
  TAB.pares = ['Red municipal por habitante, partidos de la región (2024)', ['Partido', 'Población 2022', 'Consultas por hab.', 'Egresos por 1.000 hab.', 'Pacientes-día por 1.000 hab.', 'Estab. sin internación', 'Hab. por establecimiento'],
    D.pares.map(p => [p.mun, p.pop, +p.cons_hab.toFixed(1), +p.egr_1000.toFixed(1), Math.round(p.pd_1000), p.sin, Math.round(p.hab_por_sin)]), { dec: [0, 0, 1, 1, 0, 0, 0] }];
  TAB.reg = ['Establecimientos públicos por partido (todas las dependencias, 2024)', ['Partido', 'Población 2022', 'Establecimientos', 'Provinciales o nacionales', 'Con camas', 'Camas', 'Camas críticas', 'Consultas médicas', 'Consultas por hab.', 'Camas por 1.000 hab.', 'Egresos', 'Partos'],
    D.region.map(r => [r.partido, r.pop, r.est, r.prov, r.con_int, r.camas, r.crit, r.med, r.cons_hab, r.camas_1000, r.egr, r.partos]), { dec: [0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 0, 0] }];
  TAB.camas = ['Camas del Hospital Municipal por servicio (2018)', ['Servicio', 'Camas', 'Tipo'], D.camas];
  TAB.partos = ['Nacimientos en el Hospital y cesáreas', ['Año', 'Nacimientos', 'Cesáreas', '% cesáreas'], D.partos.y.map((y, i) => [String(y), D.partos.tot[i], D.partos.ces[i], +(D.partos.ces[i] / D.partos.tot[i] * 100).toFixed(1)]), { dec: [0, 0, 0, 1] }];
  TAB.mort = ['Mortalidad infantil de residentes, 2011–2018', ['Año', 'Nacidos vivos (aprox.)', 'Defunciones < 1 año', 'Neonatales (< 28 días)', 'Tasa (‰)'], D.mort.y.map((y, i) => [String(y), D.mort.nv[i], D.mort.def[i], D.mort.neo[i], D.mort.tasa[i]]), { dec: [0, 0, 0, 0, 1] }];
  TAB.hosp = ['Hospital Municipal: consultas médicas y no médicas', ['Año', 'Médicas', 'No médicas (paramédicas)', 'No médicas cada 100 médicas'], D.hosp.y.map((y, i) => [String(y), D.hosp.med[i], D.hosp.par[i], Math.round(D.hosp.par[i] / D.hosp.med[i] * 100)])];
  TAB.p70 = ['Hospital Municipal (programa 70) en el presupuesto', ['Año', 'Gasto real (M$ 2025)', '% del gasto total'], D.presu.p70.map(r => [String(r.y), r.m, r.sh]), { dec: [0, 0, 1] }];
  TAB.fin = ['Gasto por finalidad 2025 (M$ 2025) y participación', ['Finalidad', 'Devengado 2025', '% 2023', '% 2024', '% 2025'], D.presu.fin.map(r => [r.f, r.dev25, r.p23, r.p24, r.p25]), { dec: [0, 0, 1, 1, 1] }];
  TAB.rec = ['Recursos de libre disponibilidad (M$ 2025)', ['Recurso', '2021', '2022', '2023', '2024', '% 2024'], D.presu.rec.map(r => [r.r, r.e21, r.e22, r.e23, r.e24, r.p24]), { dec: [0, 0, 0, 0, 0, 1] }];
  const g = E.filter(e => e.cde === '728');
  TAB.red = ['Establecimientos de San Andrés de Giles (2024)', ['Establecimiento', 'Localidad', 'Dependencia', 'Tipo', 'Consultas médicas', 'No médicas', 'Egresos', 'Camas', 'Pacientes-día', 'Ocupación %', 'Km al Hospital', 'Área (km²)', 'Población urbana del área'],
    g.map(e => [e.nombre, e.localidad, e.dep, e.tipo, e.med, e.para, e.egr || null, e.camas || null, e.pd || null, e.ocup || null, e.km_hosp, e.area_km2 ?? null, e.area_pob ?? null]), { dec: [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0] }];
  TAB.est = ['Establecimientos públicos de Giles y la región (2024)', ['Establecimiento', 'Partido', 'Localidad', 'Dependencia', 'Tipo', 'Internación', 'Domicilio', 'Consultas médicas', 'No médicas', 'Egresos', 'Camas', 'Pacientes-día', 'Ocupación %', 'Camas críticas', 'Partos', 'Latitud', 'Longitud'],
    E.map(e => [e.nombre, e.partido, e.localidad, e.dep, e.tipo, e.mod, e.dom, e.med, e.para, e.egr || null, e.camas || null, e.pd || null, e.ocup || null, e.crit || '', e.partos ? e.partos[0] : null, e.lat, e.lon]), { dec: { 15: 5, 16: 5, 12: 1 } }];
  TAB.ruta = ['Hoja de ruta propuesta', ['Acción', 'Responsable', 'Plazo', 'Efecto'], [
    ['Auditoría de la carga 2024–2026 (consultas no médicas, caída de 2024) y rectificación en plazo', 'Salud + estadística', '31/03/2027', 'Consultas mal clasificadas o no cargadas'],
    ['Cargar la producción del CAPS San Bernardo', 'Atención primaria', '1 mes', '$ 100 M por año'],
    ['Pedir a Economía PBA el anexo de salud del coeficiente de Giles', 'Hacienda', '1 mes', 'Cerrar la cuenta'],
    ['Consultorio de demanda espontánea separado de la guardia', 'Dirección del Hospital', '3 meses', '+10.000 a +20.000 consultas'],
    ['Agenda programada y horario publicado en cada sala', 'Atención primaria', '3 meses', 'Duplicar la producción de las salas'],
    ['Oficina de recupero: HPGD, convenio PAMI, circuito IOMA', 'Hacienda + Hospital', '6 meses', 'Aranceles'],
    ['Parcela para CAPS en convenios de las áreas de expansión; ampliar la sala de Cucullú', 'Salud + Planeamiento', '6 meses', '$ 100 M por sala y año'],
    ['Reducción de derivaciones e internación de cuidados intermedios', 'Hospital + Región Sanitaria IV', '12 meses', 'Hasta $ 1.080 M por año'],
    ['Plan perinatal: control del embarazo en salas, revisión de indicaciones de cesárea', 'Hospital + atención primaria', '12 meses', 'Mortalidad neonatal y cesáreas']]];
}

/* ---------- tableros ---------- */
function drawCopa() {
  mk('c-pond', { type: 'doughnut', data: { labels: ['Camas × complejidad × ocupación', 'Consultas médicas', 'Pacientes-día', 'Egresos', 'Establecimientos sin internación'], datasets: [{ data: [35, 25, 20, 10, 10], backgroundColor: [INK, RO, '#556873', OC, GR] }] }, options: { maintainAspectRatio: false, plugins: { legend: { position: 'right' }, tooltip: { callbacks: { label: c => ` ${c.label}: ${c.raw} %` } } } } });
  table('tb-unit', ...TAB.unit);
  const ys = D.serie.map(s => s.y), b = D.serie[0];
  mk('c-ind', { type: 'line', data: { labels: ys, datasets: [['sh_cons', 'Consultas', RO], ['sh_egr', 'Egresos', OC], ['sh_pd', 'Pacientes-día', INK], ['sh_sin', 'Establecimientos sin internación', GR]].map(([k, l, c]) => ({ label: l, data: D.serie.map(s => s[k] / b[k] * 100), borderColor: c, backgroundColor: c, tension: .2 })) },
    options: { maintainAspectRatio: false, scales: { y: { title: { display: true, text: 'Índice 2012 = 100' } } }, plugins: { tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${nf(c.raw, 0)}` } } } } });
  mk('c-coef', { type: 'line', data: { labels: ys, datasets: [
    { label: 'Perfil 8', data: D.serie.map(s => s.c8), borderColor: 'transparent', backgroundColor: 'rgba(181,118,43,.22)', fill: '+1', pointRadius: 0 },
    { label: 'Perfil 5', data: D.serie.map(s => s.c5), borderColor: 'transparent', pointRadius: 0 },
    { label: 'Hipótesis central (perfil 6)', data: D.serie.map(s => s.c6), borderColor: INK, backgroundColor: INK }] },
    options: { maintainAspectRatio: false, scales: { y: { title: { display: true, text: 'Puntos del CUD (%)' }, ticks: { callback: v => nf(v, 2) } } }, plugins: { legend: { labels: { filter: i => i.text.startsWith('Hip') } }, tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${nf(c.raw, 3)}` } } } } });
  const lab = { pd: 'Pacientes-día', val: 'Camas × complejidad × ocupación', sin: 'Establecimientos sin internación', egr: 'Egresos', cons: 'Consultas' };
  const ks = Object.keys(D.comp).sort((a, c) => D.comp[c] - D.comp[a]);
  mk('c-comp', { type: 'bar', data: { labels: ks.map(k => lab[k]), datasets: [{ label: 'M$ de 2025', data: ks.map(k => D.comp[k]), backgroundColor: ks.map(k => k === 'cons' ? RO : (k === 'pd' || k === 'val') ? INK : GR) }] }, options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: yfmt } } });
  const es = D.esc.slice().sort((a, c) => c.mpesos - a.mpesos);
  mk('c-esc', { type: 'bar', data: { labels: es.map(e => e.esc), datasets: [{ label: 'M$ de 2025 por año', data: es.map(e => Math.round(e.mpesos)), backgroundColor: OC }] }, options: { indexAxis: 'y', maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: yfmt, y: { ticks: { font: { size: 11 } } } } } });
}
function drawPresu() {
  const p = D.presu.p70;
  mk('c-p70', { data: { labels: p.map(r => r.y), datasets: [{ type: 'bar', label: 'Gasto real (M$ 2025)', data: p.map(r => r.m), backgroundColor: INK, yAxisID: 'y' }, { type: 'line', label: '% del gasto total', data: p.map(r => r.sh), borderColor: OC, backgroundColor: OC, yAxisID: 'y1' }] },
    options: { maintainAspectRatio: false, scales: { y: yfmt, y1: { position: 'right', grid: { drawOnChartArea: false }, ticks: { callback: v => v + ' %' }, min: 0, max: 45 } } } });
  const sal = D.presu.fin.find(r => r.f === 'Salud');
  mk('c-balance', { type: 'bar', data: { labels: ['Gasto en salud 2025', 'Coparticipación de salud (mínimo)', 'Coparticipación de salud (control con el total)', 'Aranceles salud + Jardín 2024'], datasets: [{ data: [sal.dev25, D.tot.mpesos, 0.265 / 0.3638 * 16013, 1972], backgroundColor: [INK, OC, '#E2C79F', GR] }] },
    options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: yfmt, x: { ticks: { font: { size: 11 } } } } } });
  mk('c-pers', { type: 'line', data: { labels: D.presu.pers.map(r => r.y), datasets: [{ label: 'Personal / gasto total (%)', data: D.presu.pers.map(r => r.p), borderColor: INK, backgroundColor: INK, tension: .2 }] }, options: { maintainAspectRatio: false, scales: { y: { min: 50, max: 70, ticks: { callback: v => v + ' %' } } } } });
  const rc = D.presu.rec, ar = rc.find(r => r.r.startsWith('Aranceles')), co = rc.find(r => r.r.startsWith('Copart'));
  mk('c-aranc', { data: { labels: ['2021', '2022', '2023', '2024'], datasets: [{ type: 'bar', label: 'Aranceles Hospital + Hogar + Jardín', data: [ar.e21, ar.e22, ar.e23, ar.e24], backgroundColor: OC, yAxisID: 'y' }, { type: 'line', label: 'Coparticipación total', data: [co.e21, co.e22, co.e23, co.e24], borderColor: INK, backgroundColor: INK, yAxisID: 'y1' }] },
    options: { maintainAspectRatio: false, scales: { y: { ...yfmt, title: { display: true, text: 'Aranceles (M$)' } }, y1: { position: 'right', grid: { drawOnChartArea: false }, ...yfmt, title: { display: true, text: 'Coparticipación (M$)' } } } } });
}
function drawRed() {
  const h = D.hosp;
  mk('c-param', { type: 'line', data: { labels: h.y, datasets: [{ label: 'Médicas (cuentan)', data: h.med, borderColor: INK, backgroundColor: INK }, { label: 'No médicas (no cuentan)', data: h.par, borderColor: OC, backgroundColor: OC }] }, options: { maintainAspectRatio: false, scales: { y: yfmt } } });
  mk('c-camas', { type: 'bar', data: { labels: D.camas.map(c => c[0]), datasets: [{ data: D.camas.map(c => c[1]), backgroundColor: D.camas.map(c => c[2] === 'Crítica' ? RO : INK) }] }, options: { indexAxis: 'y', maintainAspectRatio: false, plugins: { legend: { display: false } } } });
  const p = D.partos;
  mk('c-partos', { data: { labels: p.y, datasets: [{ type: 'bar', label: 'Partos vaginales', data: p.tot.map((t, i) => t - p.ces[i]), backgroundColor: GR, stack: 's', yAxisID: 'y' }, { type: 'bar', label: 'Cesáreas', data: p.ces, backgroundColor: INK, stack: 's', yAxisID: 'y' }, { type: 'line', label: '% cesáreas', data: p.ces.map((c, i) => +(c / p.tot[i] * 100).toFixed(1)), borderColor: RO, backgroundColor: RO, yAxisID: 'y1' }] },
    options: { maintainAspectRatio: false, scales: { y: { stacked: true }, y1: { position: 'right', min: 0, max: 80, grid: { drawOnChartArea: false }, ticks: { callback: v => v + ' %' } } } } });
  const m = D.mort;
  mk('c-mort', { data: { labels: m.y, datasets: [{ type: 'bar', label: 'Neonatales', data: m.neo, backgroundColor: RO, stack: 'd', yAxisID: 'y' }, { type: 'bar', label: 'Posneonatales', data: m.def.map((d, i) => d - m.neo[i]), backgroundColor: GR, stack: 'd', yAxisID: 'y' }, { type: 'line', label: 'Tasa por mil', data: m.tasa, borderColor: INK, backgroundColor: INK, yAxisID: 'y1' }] },
    options: { maintainAspectRatio: false, scales: { y: { stacked: true, title: { display: true, text: 'Defunciones' } }, y1: { position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: '‰' } } } } });
  table('tb-red', ...TAB.red);
}
function drawRegion() {
  const r = D.region.slice().sort((a, c) => c.cons_hab - a.cons_hab);
  const col = x => x.partido === 'San Andrés de Giles' ? RO : GR;
  mk('c-reg-cons', { type: 'bar', data: { labels: r.map(x => x.partido), datasets: [{ data: r.map(x => x.cons_hab), backgroundColor: r.map(col) }] }, options: { indexAxis: 'y', maintainAspectRatio: false, plugins: { legend: { display: false } } } });
  const r2 = D.region.slice().sort((a, c) => c.camas_1000 - a.camas_1000);
  mk('c-reg-camas', { type: 'bar', data: { labels: r2.map(x => x.partido), datasets: [{ data: r2.map(x => x.camas_1000), backgroundColor: r2.map(col) }] }, options: { indexAxis: 'y', maintainAspectRatio: false, plugins: { legend: { display: false } } } });
  table('tb-reg', ...TAB.reg);
  const fp = document.getElementById('f-part'), ft = document.getElementById('f-tipo');
  if (!fp.options.length) {
    fp.innerHTML = '<option value="">Todos</option>' + [...new Set(E.map(e => e.partido))].sort().map(p => `<option>${esc(p)}</option>`).join('');
    ft.innerHTML = '<option value="">Todos</option>' + [...new Set(E.map(e => e.tipo))].sort().map(p => `<option>${esc(p)}</option>`).join('');
  }
  const f = () => { const [cap, h, rows, o] = TAB.est; table('tb-est', cap, h, rows.filter(x => (!fp.value || x[1] === fp.value) && (!ft.value || x[4] === ft.value)), o); };
  fp.onchange = ft.onchange = f; f();
  document.getElementById('csv-est').onclick = () => csv('establecimientos_region', document.getElementById('tb-est')._csv());
}
function drawTablas() {
  const s = document.getElementById('sel-tabla');
  const L = [['red', 'Establecimientos de Giles'], ['est', 'Establecimientos de la región'], ['reg', 'Comparación por partido'], ['pares', 'Red municipal por habitante'], ['unit', 'Valores unitarios'], ['serie', 'Indicadores 2012–2024'], ['esc', 'Escenarios'], ['hosp', 'Consultas médicas y no médicas'], ['camas', 'Camas por servicio'], ['partos', 'Partos y cesáreas'], ['mort', 'Mortalidad infantil'], ['p70', 'Hospital en el presupuesto'], ['fin', 'Gasto por finalidad'], ['rec', 'Recursos'], ['ruta', 'Hoja de ruta']];
  if (!s.options.length) s.innerHTML = L.map(([k, l]) => `<option value="${k}">${esc(l)}</option>`).join('');
  const show = () => { table('tb-gen', ...TAB[s.value]); document.getElementById('nota-tabla').textContent = TAB[s.value][0]; };
  s.onchange = show; show();
  document.getElementById('csv-tabla').onclick = () => csv(s.value, document.getElementById('tb-gen')._csv());
}

/* ---------- mapa ---------- */
let MAP;
const COL = { 'Hospital': RO, 'C.A.P.S': '#2E8B57', 'C.I.C.': '#2E8B57', 'Geriátrico': '#7B5EA7', 'Unidad Móvil': '#C9A227', 'Salud Mental - Adicciones': AZ };
const colorDe = e => COL[e.tipo] || '#555';
function popup(e) {
  const fila = (k, v) => v == null || v === '' ? '' : `<tr><td>${k}</td><td>${typeof v === 'number' ? nf(v, v % 1 ? 1 : 0) : esc(v)}</td></tr>`;
  return `<h4>${esc(e.nombre)}</h4><span class="tag">${esc(e.tipo)}</span><span class="tag">${esc(e.dep)}</span><span class="tag">${esc(e.mod)}</span>
  <div>${esc(e.localidad)} · ${esc(e.partido)}<br>${esc(e.dom)}</div><table>
  ${fila('Consultas médicas 2024', e.med)}${fila('Consultas no médicas', e.para)}${fila('Consultas odontológicas', e.odo || null)}${fila('Egresos', e.egr || null)}${fila('Camas', e.camas || null)}
  ${fila('Pacientes-día', e.pd || null)}${fila('Ocupación %', e.ocup || null)}${fila('Camas críticas', e.crit ? e.crit.replace(/;/g, ' · ') : null)}${fila('Partos 2024', e.partos ? e.partos[0] + ' (' + e.partos[1] + ' cesáreas)' : null)}
  ${fila('Distancia al Hospital (km)', e.km_hosp)}${fila('Área de referencia (km²)', e.area_km2)}${fila('Población urbana del área', e.area_pob)}${fila('Consultas por habitante del área', e.cons_hab)}
  ${e.med == null && e.dep === 'Municipal' ? '<tr><td colspan="2"><b>Sin producción cargada en 2024</b></td></tr>' : ''}</table>`;
}
async function drawMapa() {
  if (MAP) { setTimeout(() => MAP.invalidateSize(), 50); return; }
  MAP = L.map('mapa', { zoomControl: true, preferCanvas: false }).setView([-34.45, -59.45], 10);
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, attribution: 'Imagen: Esri World Imagery (Maxar, Earthstar Geographics)' }).addTo(MAP);
  const gj = n => fetch('data/' + n).then(r => r.json());
  const [areas, cob, anillos, partidos, pagos] = await Promise.all(['areas.geojson', 'cobertura.geojson', 'anillos.geojson', 'partidos.geojson', 'pagos.geojson'].map(gj));
  const paleta = ['#E07A5F', '#81B29A', '#F2CC8F', '#3D85C6', '#B565A7', '#F4A261', '#2A9D8F', '#E9C46A', '#8AB17D', '#E76F51', '#6D597A'];
  const capas = [];
  const add = (nombre, desc, color, layer, op, on, setOp) => { capas.push({ nombre, desc, color, layer, op, on, setOp }); if (on) layer.addTo(MAP); };
  const fillOp = (lyr, base) => v => lyr.setStyle({ fillOpacity: base * v, opacity: v });
  const lAreas = L.geoJSON(areas, { style: (f) => ({ color: '#fff', weight: 1.5, fillColor: paleta[areas.features.indexOf(f) % paleta.length], fillOpacity: .35 }),
    onEachFeature: (f, l) => l.bindPopup(`<h4>Área de referencia</h4>${esc(f.properties.nombre)}<table><tr><td>Superficie</td><td>${nf(f.properties.km2, 1)} km²</td></tr><tr><td>Población urbana (Censo 2022)</td><td>${f.properties.pob ? nf(f.properties.pob) : 'pueblos y campo: s/d por localidad'}</td></tr><tr><td>Consultas médicas 2024</td><td>${nf(f.properties.cons)}</td></tr></table>`) });
  add('Áreas de referencia', 'Centro de atención más cercano (Thiessen)', '#81B29A', lAreas, 1, true, fillOp(lAreas, .35));
  const lCob = L.geoJSON(cob, { style: f => ({ color: '#2E8B57', weight: 1, dashArray: '4 4', fillColor: '#2E8B57', fillOpacity: .12 }) });
  add('Cobertura de las salas', '1 km en la ciudad · 5 km en los pueblos', '#2E8B57', lCob, 1, false, fillOp(lCob, .12));
  const lAn = L.geoJSON(anillos, { style: f => ({ color: '#fff', weight: 1, fillColor: ['#FDE0C5', '#FACBA6', '#F8B58B', '#F59E72', '#F2855D'][[5, 10, 20, 30, 40].indexOf(f.properties.km)], fillOpacity: .3 }),
    onEachFeature: (f, l) => l.bindTooltip(`Hasta ${f.properties.km} km del Hospital`) });
  add('Distancia al Hospital', 'Anillos de 5, 10, 20, 30 y 40 km', '#F59E72', lAn, 1, false, fillOp(lAn, .3));
  const lPag = L.geoJSON(pagos, { style: { color: '#E2C79F', weight: 1.5, fillOpacity: 0 }, onEachFeature: (f, l) => l.bindTooltip(f.properties.nombre) });
  add('Pagos del Plan', 'Diez territorios del Partido', '#E2C79F', lPag, 1, false, v => lPag.setStyle({ opacity: v }));
  const lPar = L.geoJSON(partidos, { style: f => ({ color: f.properties.id === '6728' ? '#FFD166' : '#fff', weight: f.properties.id === '6728' ? 3 : 1.5, fillOpacity: 0 }), onEachFeature: (f, l) => l.bindTooltip(f.properties.nombre, { sticky: true }) });
  add('Límites de partidos', 'Giles y sus vecinos', '#FFD166', lPar, 1, true, v => lPar.setStyle({ opacity: v }));
  const mkM = e => L.circleMarker([e.lat, e.lon], { radius: e.tipo === 'Hospital' ? 9 : 6, color: '#fff', weight: 1.5, fillColor: colorDe(e), fillOpacity: e.med == null && e.dep === 'Municipal' ? .35 : 1 }).bindPopup(popup(e)).bindTooltip(e.nombre);
  const lG = L.layerGroup(E.filter(e => e.cde === '728').map(mkM));
  add('Establecimientos de Giles', 'Hospital, Hogar, salas y CAPS', RO, lG, 1, true, v => lG.eachLayer(m => m.setStyle({ opacity: v, fillOpacity: v })));
  const lV = L.layerGroup(E.filter(e => e.cde !== '728').map(mkM));
  add('Establecimientos de los partidos vecinos', 'Municipales, provinciales y nacionales', '#2E8B57', lV, 1, true, v => lV.eachLayer(m => m.setStyle({ opacity: v, fillOpacity: v })));
  const box = document.getElementById('capas');
  box.innerHTML = capas.map((c, i) => `<div class="capa"><label><input type="checkbox" data-i="${i}" ${c.on ? 'checked' : ''}><span class="sw" style="background:${c.color}"></span>${esc(c.nombre)}</label><small>${esc(c.desc)}</small>
    <label class="sr" for="op${i}">Opacidad de ${esc(c.nombre)}</label><input type="range" id="op${i}" min="0" max="1" step="0.05" value="1" data-o="${i}" aria-label="Opacidad de ${esc(c.nombre)}"></div>`).join('');
  box.querySelectorAll('input[type=checkbox]').forEach(cb => cb.onchange = () => { const c = capas[+cb.dataset.i]; cb.checked ? c.layer.addTo(MAP) : MAP.removeLayer(c.layer); });
  box.querySelectorAll('input[type=range]').forEach(r => r.oninput = () => capas[+r.dataset.o].setOp(+r.value));
  document.getElementById('leyenda').innerHTML = '<b>Tipo de establecimiento</b>' + Object.entries({ Hospital: COL.Hospital, 'Sala / CAPS': COL['C.A.P.S'], Geriátrico: COL['Geriátrico'], 'Unidad móvil': COL['Unidad Móvil'], 'Salud mental (provincial)': COL['Salud Mental - Adicciones'] })
    .map(([k, c]) => `<div><span class="pin" style="background:${c}"></span>${k}</div>`).join('') + '<div><span class="pin" style="background:#2E8B57;opacity:.35"></span>Sin producción cargada</div>';
  MAP.fitBounds(lPar.getBounds(), { padding: [10, 10] });
  const g = E.filter(e => e.cde === '728' && e.dep === 'Municipal');
  document.getElementById('fichas').innerHTML = g.map(e => `<div class="card"><h3>${esc(e.nombre)}</h3><p><span class="tag">${esc(e.tipo)}</span>${esc(e.localidad)} · ${esc(e.dom)}</p>
    <p>${e.med != null ? `<b>${nf(e.med)}</b> consultas médicas 2024` : '<b>Sin producción cargada</b>'}${e.camas ? ` · <b>${nf(e.camas)}</b> camas al ${nf(e.ocup, 1)} %` : ''}${e.crit ? ` · cuidados críticos: ${esc(e.crit.replace(/;/g, ', '))}` : ''}</p>
    <p>${e.km_hosp ? nf(e.km_hosp, 1) + ' km al Hospital' : ''}${e.area_km2 ? ` · área de referencia ${nf(e.area_km2, 1)} km²` : ''}${e.area_pob ? ` · ${nf(e.area_pob)} habitantes urbanos` : ''}</p>
    <p><button type="button" class="alt" data-ver="${e.id}" style="font:inherit;padding:6px 10px;border:1px solid var(--line);border-radius:4px;background:#fff;cursor:pointer">Ver en el mapa</button></p></div>`).join('');
  document.querySelectorAll('[data-ver]').forEach(b => b.onclick = () => { const e = E.find(x => x.id === b.dataset.ver); MAP.setView([e.lat, e.lon], 15); lG.eachLayer(m => { const ll = m.getLatLng(); if (ll.lat === e.lat && ll.lng === e.lon) m.openPopup(); }); document.getElementById('mapa').scrollIntoView({ behavior: 'smooth', block: 'center' }); });
}

/* ---------- navegación ---------- */
const DRAW = { inicio: () => { }, copa: drawCopa, presupuesto: drawPresu, red: drawRed, 'mapa-tab': drawMapa, region: drawRegion, tablas: drawTablas, informe: () => table('tb-ruta', ...TAB.ruta), metodo: () => { } };
function go() {
  let h = (location.hash || '#inicio').slice(1); if (!DRAW[h]) h = 'inicio';
  document.querySelectorAll('section.tab').forEach(s => s.classList.toggle('on', s.id === 't-' + h));
  document.querySelectorAll('#tabs a').forEach(a => { const on = a.getAttribute('href') === '#' + h; a.classList.toggle('on', on); on ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'); });
  if (LOADED) DRAW[h]();
}
window.addEventListener('hashchange', () => { go(); window.scrollTo({ top: document.querySelector('main').offsetTop - 10 }); });
Promise.all([fetch('data/datos.json').then(r => r.json()), fetch('data/establecimientos.json').then(r => r.json())]).then(([d, e]) => { D = d; E = e; prep(); LOADED = true; go(); });
go();
