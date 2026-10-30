/* ===================================================================
   PLAN SAG | Lector en voz alta (accesibilidad sonora)
   Usa la síntesis de voz del propio navegador (Web Speech API):
   no descarga audios, no usa servicios externos ni guarda datos.
   - Botón «Escuchar esta sección» en cada sección del sitio.
   - Botón «Escuchar el tomo» en cada tomo del Plan (texto completo).
   - Barra de reproducción con pausa, párrafo y apartado anterior o
     siguiente, velocidad e índice de apartados.
   =================================================================== */
(function () {
  "use strict";
  const SINTESIS = "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
  const SVG = {
    secAnt: '<path d="M5 5h2.5v14H5zM19 5 9 12l10 7V5Z"/>', ant: '<path d="M12 6 4 12l8 6V6Zm9 0-8 6 8 6V6Z"/>',
    play: '<path d="M7 4.5v15L19.5 12 7 4.5Z"/>', pausa: '<path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/>',
    sig: '<path d="M3 6v12l8-6-8-6Zm9 0v12l8-6-8-6Z"/>', secSig: '<path d="M16.5 5H19v14h-2.5zM5 5l10 7-10 7V5Z"/>',
    cerrar: '<path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>'
  };
  const G = (k) => `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">${SVG[k]}</svg>`;
  const ICO = (id) => `<svg class="ico-inline" aria-hidden="true"><use href="#${id}"/></svg>`;
  const guardar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } };
  const leer = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };

  const L = {
    cola: [],        // [{t: texto, s: índice de apartado, el: elemento a resaltar}]
    secciones: [],   // [{h: título, i: primer índice de la cola}]
    i: 0, sonando: false, titulo: "", clave: null, voz: null,
    vel: leer("lector-vel") || 1, origen: null
  };
  window.LECTOR = { soportado: SINTESIS };

  /* ---------- voz en castellano, preferentemente rioplatense ---------- */
  function elegirVoz() {
    const voces = speechSynthesis.getVoices().filter(v => /^es\b/i.test(v.lang));
    const orden = [/es[-_]AR/i, /es[-_](419|US|MX|UY|CL|CO)/i, /es[-_]ES/i, /^es/i];
    for (const re of orden) {
      const cand = voces.filter(v => re.test(v.lang));
      if (cand.length) return cand.find(v => /natural|google|online|neural/i.test(v.name)) || cand[0];
    }
    return null;
  }

  /* ---------- texto en fragmentos breves (evita cortes del navegador) ---------- */
  function trocear(texto) {
    const t = texto.replace(/\s+/g, " ").trim();
    if (!t) return [];
    if (t.length <= 220) return [t];
    const oraciones = t.match(/[^.!?;:]+[.!?;:»”)]*\s*/g) || [t];
    const out = []; let buf = "";
    for (const o of oraciones) {
      if ((buf + o).length > 220 && buf) { out.push(buf.trim()); buf = ""; }
      if (o.length > 260) { // oración muy larga: cortar en comas
        o.split(/(?<=,)\s+/).forEach(p => { if ((buf + p).length > 220 && buf) { out.push(buf.trim()); buf = ""; } buf += p + " "; });
      } else buf += o;
    }
    if (buf.trim()) out.push(buf.trim());
    return out;
  }
  const pronunciable = (t) => t
    .replace(/\bOrd\.\s*/g, "Ordenanza ").replace(/\bArt\.\s*/gi, "artículo ").replace(/\bart\.\s*/g, "artículo ")
    .replace(/\bN\.?\s?°\s*/g, "número ").replace(/\bha\b/g, "hectáreas").replace(/\bkm\b/g, "kilómetros")
    .replace(/\bm²/g, "metros cuadrados").replace(/\bCMDOT\b/g, "Consejo Municipal para el Desarrollo y el Ordenamiento Territorial")
    .replace(/\bCOUyT\b/g, "Código de Ordenamiento Urbano y Territorial").replace(/\bSAG\b/g, "San Andrés de Giles")
    .replace(/[«»“”]/g, "").replace(/\s·\s/g, ". ").replace(/[–—]/g, ", ");

  /* ---------- barra de reproducción ---------- */
  let barra;
  function crearBarra() {
    if (barra) return barra;
    barra = document.createElement("div");
    barra.className = "lector-barra";
    barra.setAttribute("role", "region");
    barra.setAttribute("aria-label", "Lectura en voz alta");
    barra.hidden = true;
    barra.innerHTML = `
      <div class="lb-info">
        <span class="lb-kicker">${ICO("i-audio")} Leyendo</span>
        <strong class="lb-titulo"></strong>
        <span class="lb-apartado"></span>
        <p class="lb-frase" aria-hidden="true"></p>
      </div>
      <div class="lb-controles">
        <button type="button" data-a="secAnt" aria-label="Apartado anterior">${G("secAnt")}</button>
        <button type="button" data-a="ant" aria-label="Párrafo anterior">${G("ant")}</button>
        <button type="button" data-a="play" class="lb-play" aria-label="Pausar">${G("pausa")}</button>
        <button type="button" data-a="sig" aria-label="Párrafo siguiente">${G("sig")}</button>
        <button type="button" data-a="secSig" aria-label="Apartado siguiente">${G("secSig")}</button>
        <label class="lb-vel">Velocidad
          <select data-a="vel">
            <option value="0.8">0,8×</option><option value="1">1×</option><option value="1.2">1,2×</option><option value="1.4">1,4×</option><option value="1.7">1,7×</option>
          </select></label>
        <label class="lb-indice">Ir a
          <select data-a="ir"></select></label>
        <button type="button" data-a="cerrar" class="lb-cerrar" aria-label="Detener y cerrar la lectura">${G("cerrar")}</button>
      </div>
      <div class="lb-progreso" aria-hidden="true"><span></span></div>
      <p class="lb-estado visually-hidden" aria-live="polite"></p>`;
    document.body.appendChild(barra);
    barra.querySelector('[data-a="vel"]').value = String(L.vel);
    barra.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-a]"); if (!b) return;
      ({ play: alternar, ant: () => saltar(L.i - 1), sig: () => saltar(L.i + 1),
         secAnt: () => saltarSeccion(-1), secSig: () => saltarSeccion(1), cerrar: detener })[b.dataset.a]();
    });
    barra.addEventListener("change", (e) => {
      if (e.target.dataset.a === "vel") { L.vel = +e.target.value; guardar("lector-vel", L.vel); if (L.sonando) saltar(L.i); }
      if (e.target.dataset.a === "ir") saltar(+e.target.value);
    });
    barra.addEventListener("keydown", (e) => { if (e.key === "Escape") detener(); });
    return barra;
  }
  const estado = (msg) => { const p = barra && barra.querySelector(".lb-estado"); if (p) { p.textContent = ""; setTimeout(() => p.textContent = msg, 50); } };

  function pintarBarra() {
    const it = L.cola[L.i]; if (!it) return;
    const sec = L.secciones[it.s];
    barra.querySelector(".lb-titulo").textContent = L.titulo;
    barra.querySelector(".lb-apartado").textContent = sec ? sec.h : "";
    barra.querySelector(".lb-frase").textContent = it.t;
    barra.querySelector(".lb-progreso span").style.width = (100 * (L.i + 1) / L.cola.length).toFixed(1) + "%";
    const play = barra.querySelector(".lb-play");
    play.innerHTML = G(L.sonando ? "pausa" : "play");
    play.setAttribute("aria-label", L.sonando ? "Pausar" : "Seguir leyendo");
    const ir = barra.querySelector('[data-a="ir"]');
    ir.value = String(sec ? sec.i : 0);
    document.querySelectorAll(".lector-actual").forEach(x => x.classList.remove("lector-actual"));
    if (it.el) {
      it.el.classList.add("lector-actual");
      const r = it.el.getBoundingClientRect();
      if (r.top < 90 || r.bottom > window.innerHeight - barra.offsetHeight - 10)
        it.el.scrollIntoView({ block: "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    }
    document.querySelectorAll("[data-lector-tomo],[data-lector-seccion]").forEach(b => {
      const activo = b === L.origen;
      b.setAttribute("aria-pressed", activo && L.sonando ? "true" : "false");
      b.classList.toggle("sonando", activo && L.sonando);
    });
  }

  /* ---------- motor ---------- */
  let turno = 0;
  function hablar() {
    const it = L.cola[L.i];
    if (!it) { fin(); return; }
    const mio = ++turno;
    const u = new SpeechSynthesisUtterance(pronunciable(it.t));
    u.lang = (L.voz && L.voz.lang) || "es-AR";
    if (L.voz) u.voice = L.voz;
    u.rate = L.vel;
    u.onend = () => { if (mio !== turno || !L.sonando) return; L.i++; recordar(); if (L.i < L.cola.length) { pintarBarra(); hablar(); } else fin(); };
    u.onerror = (e) => { if (mio !== turno || e.error === "interrupted" || e.error === "canceled") return; L.sonando = false; pintarBarra(); estado("La lectura se interrumpió."); };
    speechSynthesis.speak(u);
    pintarBarra();
  }
  function iniciar() { speechSynthesis.cancel(); L.sonando = true; barra.hidden = false; document.body.classList.add("con-lector"); hablar(); }
  function alternar() {
    if (L.sonando) { L.sonando = false; turno++; speechSynthesis.cancel(); pintarBarra(); estado("Lectura en pausa."); }
    else { iniciar(); estado("Lectura reanudada."); }
  }
  function saltar(n) { L.i = Math.max(0, Math.min(L.cola.length - 1, n)); recordar(); turno++; speechSynthesis.cancel(); if (L.sonando) hablar(); else pintarBarra(); }
  function saltarSeccion(d) {
    const s = L.cola[L.i] ? L.cola[L.i].s : 0;
    const dest = L.secciones[Math.max(0, Math.min(L.secciones.length - 1, s + d))];
    if (dest) saltar(dest.i);
  }
  function recordar() { if (L.clave) guardar(L.clave, L.i); }
  function fin() { L.sonando = false; if (L.clave) guardar(L.clave, 0); pintarBarra(); estado("Fin de la lectura."); }
  function detener() {
    turno++; speechSynthesis.cancel(); L.sonando = false;
    document.querySelectorAll(".lector-actual").forEach(x => x.classList.remove("lector-actual"));
    if (barra) barra.hidden = true; document.body.classList.remove("con-lector");
    const o = L.origen; L.origen = null; pintarBotones(); if (o && document.contains(o)) o.focus();
  }
  function pintarBotones() { document.querySelectorAll("[data-lector-tomo],[data-lector-seccion]").forEach(b => { b.setAttribute("aria-pressed", "false"); b.classList.remove("sonando"); }); }

  function cargar(titulo, secciones, clave, origen) {
    crearBarra();
    L.cola = []; L.secciones = []; L.titulo = titulo; L.clave = clave; L.origen = origen;
    secciones.forEach((sec, s) => {
      L.secciones.push({ h: sec.h, i: L.cola.length });
      if (sec.decir !== false) L.cola.push({ t: sec.h + ".", s, el: sec.elH || null });
      sec.p.forEach(p => trocear(typeof p === "string" ? p : p.t).forEach(t => L.cola.push({ t, s, el: p.el || null })));
    });
    barra.querySelector('[data-a="ir"]').innerHTML = L.secciones.map(s => `<option value="${s.i}">${s.h.replace(/</g, "&lt;")}</option>`).join("");
    barra.querySelector(".lb-indice").hidden = L.secciones.length < 2;
    const prev = clave ? leer(clave) : 0;
    L.i = prev && prev < L.cola.length - 1 ? prev : 0;
    if (L.i) estado(`Retomando donde dejaste: ${L.secciones[L.cola[L.i].s].h}.`);
    iniciar();
  }

  /* ---------- fuentes de texto ---------- */
  const cacheTomos = {};
  async function leerTomo(id, origen) {
    const P = window.PLAN_SAG; const t = P && P.tomos.find(x => x.id === id);
    if (!t) return;
    if (L.origen === origen && barra && !barra.hidden) { alternar(); return; }
    try {
      origen && origen.classList.add("cargando");
      const d = cacheTomos[id] || (cacheTomos[id] = await fetch(`docs/plan/lectura/${id}.json`).then(r => { if (!r.ok) throw r; return r.json(); }));
      cargar(`Tomo ${t.n} · ${t.titulo}`, d.secciones, "lector-tomo-" + id, origen);
    } catch (e) {
      alert("No se pudo cargar el texto del tomo. Probá de nuevo o descargá el PDF.");
    } finally { origen && origen.classList.remove("cargando"); }
  }

  const BLOQUES = "h1,h2,h3,h4,h5,p,li,blockquote,figcaption,dt,dd,td,th,summary,.lector-texto";
  const EXCLUIR = ".lector-btn,.tomo-slot,.tomo-btn,nav,script,style,noscript,svg,form,select,button,input,textarea,.leaflet-container,[aria-hidden='true'],.visually-hidden,.lector-barra";
  function visible(el) { return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length) && getComputedStyle(el).visibility !== "hidden"; }
  function textoDe(el) {
    const c = el.cloneNode(true);
    c.querySelectorAll(EXCLUIR).forEach(x => x.remove());
    return c.textContent.replace(/\s+/g, " ").trim();
  }
  function leerSeccion(sec, origen) {
    if (L.origen === origen && barra && !barra.hidden) { alternar(); return; }
    const titulo = (sec.querySelector("h2,h3") || {}).textContent || "Sección";
    const partes = [{ h: titulo.trim(), p: [], decir: false }];
    sec.querySelectorAll(BLOQUES).forEach(el => {
      if (el.closest(EXCLUIR) || !visible(el)) return;
      if (el.parentElement.closest(BLOQUES)) return; // ya incluido en su bloque padre
      const t = textoDe(el); if (!t || t.length < 2) return;
      if (/^H[2-5]$/.test(el.tagName)) partes.push({ h: t, p: [], elH: el });
      else partes[partes.length - 1].p.push({ t, el });
    });
    const limpias = partes.filter(x => x.p.length || x.elH);
    if (!limpias.length) return;
    cargar(titulo.trim(), limpias, null, origen);
  }

  /* ---------- botones ---------- */
  function boton(attr, valor, rotulo, extra) {
    return `<button type="button" class="lector-btn${extra ? " " + extra : ""}" ${attr}="${valor}" aria-pressed="false">${ICO("i-audio")}<span>${rotulo}</span></button>`;
  }
  window.LECTOR.botonTomo = (id, rotulo) => SINTESIS ? boton("data-lector-tomo", id, rotulo || "Escuchar el tomo") : "";

  function sembrarSecciones() {
    document.querySelectorAll("section.main-section[id]").forEach(sec => {
      const g = sec.querySelector(".section-title-group");
      if (!g || g.querySelector(".lector-btn")) return;
      const p = document.createElement("p");
      p.className = "lector-seccion";
      p.innerHTML = boton("data-lector-seccion", sec.id, "Escuchar esta sección");
      g.appendChild(p);
    });
  }

  async function pintarEscucha() {
    const lista = document.getElementById("lista-escucha");
    const P = window.PLAN_SAG; if (!lista || !P) return;
    if (!SINTESIS) {
      lista.outerHTML = `<p class="lector-aviso">Este navegador no permite la lectura en voz alta. Podés usar el lector de pantalla de tu teléfono o computadora (TalkBack, VoiceOver, Narrador o NVDA) sobre los tomos en PDF, que tienen texto seleccionable.</p>`;
      return;
    }
    let min = {};
    try { min = await fetch("docs/plan/lectura/indice.json").then(r => r.json()); } catch (e) { /* sin duraciones */ }
    lista.innerHTML = P.tomos.map(t => `
      <li class="escucha-item">
        <span class="tomo-n">${t.n}</span>
        <span class="tomo-tit"><em>${t.rotulo}</em><strong>${t.titulo}</strong>${min[t.id] ? `<small>Texto completo · cerca de ${min[t.id] >= 90 ? (Math.round(min[t.id] / 6) / 10).toString().replace(".", ",") + " horas" : min[t.id] + " minutos"} a velocidad normal</small>` : ""}</span>
        ${boton("data-lector-tomo", t.id, "Escuchar")}
      </li>`).join("");
  }

  function init() {
    if (SINTESIS) {
      L.voz = elegirVoz();
      speechSynthesis.addEventListener ? speechSynthesis.addEventListener("voiceschanged", () => { L.voz = elegirVoz(); })
                                       : (speechSynthesis.onvoiceschanged = () => { L.voz = elegirVoz(); });
      sembrarSecciones();
      document.addEventListener("click", (e) => {
        const bt = e.target.closest("[data-lector-tomo]");
        if (bt) { e.preventDefault(); leerTomo(bt.dataset.lectorTomo, bt); return; }
        const bs = e.target.closest("[data-lector-seccion]");
        if (bs) { e.preventDefault(); const s = document.getElementById(bs.dataset.lectorSeccion); if (s) leerSeccion(s, bs); }
      });
      window.addEventListener("pagehide", () => speechSynthesis.cancel());
    }
    pintarEscucha();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
