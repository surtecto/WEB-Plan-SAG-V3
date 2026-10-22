/* ===================================================================
   PLAN SAG 2020–2035 | Lógica Interactiva
   San Andrés de Giles, Buenos Aires
   =================================================================== */

document.documentElement.classList.add("js");

document.addEventListener("DOMContentLoaded", () => {
  initMobileNav();
  initScrollSpy();
  initRevelado();
  initSendas();
  initPueblos();
  initLineas();
  initGlosarioSearch();
  initAccordion();
  initFormFeedback();
  initTomos();
  initMapaOcasiones();
});

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* 1. Navegación Móvil */
function initMobileNav() {
  const toggleBtn = document.getElementById("mobileToggle");
  const mainNav = document.getElementById("mainNav");
  if (!toggleBtn || !mainNav) return;

  const setOpen = (open) => {
    mainNav.classList.toggle("show", open);
    toggleBtn.setAttribute("aria-expanded", String(open));
    toggleBtn.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
  };

  toggleBtn.addEventListener("click", () => setOpen(!mainNav.classList.contains("show")));

  // Cerrar al hacer clic en un enlace, con Escape o tocando fuera
  mainNav.querySelectorAll("a").forEach(link => link.addEventListener("click", () => setOpen(false)));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && mainNav.classList.contains("show")) { setOpen(false); toggleBtn.focus(); }
  });
  document.addEventListener("click", (e) => {
    if (mainNav.classList.contains("show") && !mainNav.contains(e.target) && !toggleBtn.contains(e.target)) setOpen(false);
  });
  window.addEventListener("resize", () => { if (window.innerWidth > 980) setOpen(false); });
}

/* 2. Sección activa en el menú */
function initScrollSpy() {
  const links = [...document.querySelectorAll('.main-nav .nav-link[href^="#"]')];
  const sections = links.map(l => document.querySelector(l.getAttribute("href"))).filter(Boolean);
  if (!("IntersectionObserver" in window) || !sections.length) return;

  const marcar = (id) => links.forEach(l => {
    const on = l.getAttribute("href") === "#" + id;
    l.classList.toggle("active", on);
    if (on) l.setAttribute("aria-current", "location"); else l.removeAttribute("aria-current");
  });

  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => { if (en.isIntersecting) marcar(en.target.id); });
  }, { rootMargin: "-45% 0px -50% 0px" });
  sections.forEach(s => io.observe(s));
}

/* 3. Revelado de láminas (de oeste a este, como se dibuja un plano) */
function initRevelado() {
  const items = document.querySelectorAll(".revela, .section-title-group");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    items.forEach(el => el.classList.add("visto"));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add("visto"); io.unobserve(en.target); }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
  items.forEach((el, i) => {
    io.observe(el);
  });
}

/* 4. Las Sendas: caminos del pasado al horizonte, con Ocasiones como nodos */
const ICONO = (id, cls) => `<svg${cls ? ` class="${cls}"` : ""} aria-hidden="true"><use href="#${id}"/></svg>`;
const NS = "http://www.w3.org/2000/svg";

function initSendas() {
  const P = window.PLAN_SAG;
  const svg = document.getElementById("sendasSvg");
  const nav = document.getElementById("sendasNav");
  const panel = document.getElementById("sendaPanel");
  if (!P || !svg || !nav || !panel) return;

  // Caminos curvos (nunca rectos): cada senda es una línea con idas y vueltas.
  // Se redibujan con otro ancho en pantallas angostas para no deformar los nodos.
  const filas = [62, 126, 190, 254];
  const camino = (y, k, f) => {
    const a = 22 + k * 4, b = 18 - k * 3, X = (x) => Math.round(x * f);
    return `M ${X(10)} ${y} C ${X(180)} ${y - a}, ${X(300)} ${y + b}, ${X(470)} ${y - 6} S ${X(760)} ${y + a}, ${X(920)} ${y - b} S ${X(1120)} ${y + 10}, ${X(1190)} ${y - 4}`;
  };
  const angosto = window.matchMedia("(max-width: 760px)");

  function dibujar() {
    const W = angosto.matches ? 600 : 1200, f = W / 1200;
    svg.setAttribute("viewBox", `0 0 ${W} 300`);
    svg.style.aspectRatio = `${W} / 300`;
    svg.innerHTML = "";
    P.sendas.forEach((s, k) => {
      const g = document.createElementNS(NS, "g");
      g.setAttribute("class", "s-grupo");
      g.dataset.senda = s.id;
      g.style.setProperty("--c", s.color);
      const path = document.createElementNS(NS, "path");
      path.setAttribute("d", camino(filas[k], k, f));
      path.setAttribute("class", "s-camino");
      path.style.transitionDelay = (k * 0.25) + "s";
      g.appendChild(path);
      svg.appendChild(g);

      const L = path.getTotalLength();
      const n = s.ocasiones.length;
      s.ocasiones.forEach((o, i) => {
        const pt = path.getPointAtLength(L * (0.12 + 0.8 * (i / Math.max(1, n - 1))));
        const nodo = document.createElementNS(NS, "g");
        nodo.setAttribute("class", "s-nodo");
        const c = document.createElementNS(NS, "circle");
        c.setAttribute("cx", pt.x); c.setAttribute("cy", pt.y); c.setAttribute("r", angosto.matches ? 11 : 9);
        const t = document.createElementNS(NS, "title"); t.textContent = o.t;
        nodo.append(c, t);
        nodo.addEventListener("click", () => { activar(s.id); resaltarOcasion(i); });
        g.appendChild(nodo);
      });
      const nombre = document.createElementNS(NS, "text");
      nombre.setAttribute("class", "s-nombre");
      nombre.setAttribute("x", 16); nombre.setAttribute("y", filas[k] - 16);
      nombre.textContent = s.corto;
      g.appendChild(nombre);
    });
    if (panel.dataset.actual) marcarCaminos(panel.dataset.actual);
  }

  P.sendas.forEach((s) => {
    const b = document.createElement("button");
    b.className = "senda-tab"; b.type = "button";
    b.setAttribute("role", "tab"); b.id = "senda-tab-" + s.id;
    b.setAttribute("aria-controls", "sendaPanel");
    b.dataset.senda = s.id;
    b.style.setProperty("--c", s.color);
    b.innerHTML = `<i aria-hidden="true"></i>${s.corto}`;
    b.addEventListener("click", () => activar(s.id));
    nav.appendChild(b);
  });

  function marcarCaminos(id) {
    svg.querySelectorAll(".s-grupo").forEach(g => {
      g.classList.toggle("activo", g.dataset.senda === id);
      g.classList.toggle("atenuado", g.dataset.senda !== id);
    });
  }

  dibujar();
  angosto.addEventListener("change", dibujar);

  const tabs = [...nav.querySelectorAll(".senda-tab")];
  tabs.forEach((b, i) => b.addEventListener("keydown", (e) => {
    let j = null;
    if (e.key === "ArrowRight") j = (i + 1) % tabs.length;
    if (e.key === "ArrowLeft") j = (i - 1 + tabs.length) % tabs.length;
    if (j !== null) { e.preventDefault(); activar(tabs[j].dataset.senda); tabs[j].focus(); }
  }));

  function render(s) {
    panel.style.setProperty("--c", s.color);
    panel.setAttribute("aria-labelledby", "senda-tab-" + s.id);
    const pagos = s.pagos ? `
      <div class="senda-pagos">
        <h5>Los nueve Pagos</h5>
        <ul>${s.pagos.map(p => `<li><b>${p.n}</b><span>${p.d}</span></li>`).join("")}</ul>
      </div>` : "";
    const pueblos = s.id === "habitar"
      ? `<p class="senda-pie">Los pueblos rurales son Ocasiones territoriales con tomo propio. <a href="#pueblos">Ver los ocho pueblos y los parajes →</a></p>` : "";
    panel.innerHTML = `
      <div class="senda-cabecera">
        <div>
          <span class="senda-cap">${s.capitulo}</span>
          <h4>${s.nombre}</h4>
          <p class="senda-rumbo">${s.rumbo}</p>
          <p class="senda-texto">${s.texto}</p>
          ${s.cita ? `<p class="senda-cita">${s.cita}</p>` : ""}
        </div>
        <div class="senda-dato"><b>${s.dato.num}</b><span>${s.dato.label}</span></div>
      </div>
      <ol class="ocasiones" aria-label="Ocasiones de ${s.nombre}">
        ${s.ocasiones.map((o, i) => `<li class="ocasion" id="oc-${s.id}-${i}"><h5>${o.t}</h5><p>${o.d}</p></li>`).join("")}
      </ol>
      ${pagos}
      ${s.pregunta ? `<p class="senda-pregunta"><span>Pregunta abierta</span>${s.pregunta}</p>` : ""}
      ${pueblos}
      <p class="senda-mapa"><a href="#mapa">${ICONO("i-mapa", "ico-inline")} Ver dónde ocurren estas Ocasiones en el mapa</a></p>
      <p class="tomo-slot senda-tomo" data-tomo="${s.id}"></p>
    `;
    if (typeof pintarTomos === "function") pintarTomos(panel);
  }

  function activar(id) {
    const s = P.sendas.find(x => x.id === id);
    if (!s) return;
    tabs.forEach(b => {
      const on = b.dataset.senda === id;
      b.classList.toggle("active", on);
      b.setAttribute("aria-selected", String(on));
      b.tabIndex = on ? 0 : -1;
    });
    marcarCaminos(id);
    if (panel.dataset.actual !== id) { render(s); panel.dataset.actual = id; }
  }

  function resaltarOcasion(i) {
    const li = panel.querySelectorAll(".ocasion")[i];
    if (!li) return;
    panel.querySelectorAll(".ocasion.resaltada").forEach(x => x.classList.remove("resaltada"));
    li.classList.add("resaltada");
    li.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
  }

  window.irAOcasion = (id, titulo) => {
    activar(id);
    const s = P.sendas.find(x => x.id === id);
    const i = s ? s.ocasiones.findIndex(o => o.t === titulo) : -1;
    if (i >= 0) resaltarOcasion(i); else panel.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
  };

  activar(P.sendas[0].id);
}

/* 5. Pueblos rurales: dos miradas en pestañas (Tomo 6 y estudio del CMDOT 2026) */
const fmtN = n => Number(n).toLocaleString("es-AR");
const escH = t => String(t ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/* Pestañas accesibles reutilizables (flechas, Inicio, Fin) */
function crearPestanas(nav, container, items, prefijo, render) {
  items.forEach((p, i) => {
    const b = document.createElement("button");
    b.className = "loc-tab-btn"; b.type = "button";
    b.setAttribute("role", "tab"); b.id = prefijo + p.id;
    b.setAttribute("aria-controls", container.id);
    b.dataset.loc = p.id;
    b.tabIndex = i === 0 ? 0 : -1;
    b.innerHTML = `<span class="nodo" aria-hidden="true"></span><span class="loc-nombre">${p.nombre}</span>`;
    nav.appendChild(b);
  });
  const buttons = [...nav.querySelectorAll(".loc-tab-btn")];
  function activar(btn, foco) {
    buttons.forEach(b => {
      const on = b === btn;
      b.classList.toggle("active", on);
      b.setAttribute("aria-selected", String(on));
      b.tabIndex = on ? 0 : -1;
    });
    container.setAttribute("aria-labelledby", btn.id);
    render(btn.dataset.loc);
    if (foco) btn.focus();
    if (nav.scrollWidth > nav.clientWidth) {
      nav.scrollTo({ left: btn.offsetLeft - nav.clientWidth / 2 + btn.offsetWidth / 2, behavior: reduceMotion ? "auto" : "smooth" });
    }
  }
  buttons.forEach((btn, i) => {
    btn.addEventListener("click", () => activar(btn, false));
    btn.addEventListener("keydown", (e) => {
      let j = null;
      if (e.key === "ArrowRight") j = (i + 1) % buttons.length;
      if (e.key === "ArrowLeft") j = (i - 1 + buttons.length) % buttons.length;
      if (e.key === "Home") j = 0;
      if (e.key === "End") j = buttons.length - 1;
      if (j !== null) { e.preventDefault(); activar(buttons[j], true); }
    });
  });
  activar(buttons[0], false);
  return (id) => { const b = buttons.find(x => x.dataset.loc === id); if (b) activar(b, false); };
}

function initPueblos() {
  const P = window.PLAN_SAG;
  const nav = document.getElementById("pueblosNav");
  const container = document.getElementById("pueblosContent");
  if (!P || !nav || !container) return;
  const intro = document.getElementById("pueblosIntro");
  if (intro) intro.textContent = P.pueblosIntro;
  const enc = document.getElementById("pueblosEncuentros");
  if (enc) enc.textContent = P.pueblosEncuentros;

  // Mirada 1: el texto del Tomo 6
  window.activarPueblo = crearPestanas(nav, container, P.pueblos, "tab-", (key) => {
    const p = P.pueblos.find(x => x.id === key);
    if (!p) return;
    const esParaje = p.id === "parajes";
    container.innerHTML = `
      <div class="loc-panel">
        <div class="loc-ficha">
          <span class="loc-cuartel">${esParaje ? "Tomo 6 · Agregado 2026" : "Ocasión territorial · Tomo 6"}</span>
          <h4>${p.nombre}</h4>
          <ul class="loc-meta">
            <li>${ICONO("i-pueblo")}<span>${p.origen}</span></li>
            <li>${ICONO("i-pin")}<span>${esParaje ? "Heavy, Km 108 y Espora" : p.nombre + " y su territorio"}</span></li>
          </ul>
          ${esParaje ? "" : `<span class="loc-comun-t">Compartido con todos los pueblos</span>
          <ul class="pueblo-comun">${P.pueblosComun.map(c => `<li>${c}</li>`).join("")}</ul>`}
        </div>
        <div class="pueblo-cuerpo">
          <div class="loc-box lineamientos">
            <h5>${esParaje ? "Lo que propone el Plan" : "Lo propio de " + p.nombre}</h5>
            <ol>${p.ocasiones.map(o => `<li>${o}</li>`).join("")}</ol>
          </div>
          <p class="pueblo-rasgos"><span>Rasgos propios</span>${p.rasgos}</p>
          ${esParaje ? "" : `<p class="pueblo-ver"><button type="button" class="enlace-boton" data-ver-estudio="${p.id}">Ver datos, historia y líneas propuestas en el estudio de ${p.nombre} →</button></p>`}
        </div>
      </div>`;
  });

  container.addEventListener("click", (e) => {
    const b = e.target.closest("[data-ver-estudio]");
    if (b) { mostrarVista("estudio"); if (window.activarEstudio) window.activarEstudio(b.dataset.verEstudio); }
  });

  // Pestañas de las dos miradas
  const vistas = [...document.querySelectorAll("#pueblosVistas .vista-btn")];
  function mostrarVista(cual, foco) {
    vistas.forEach(b => {
      const on = b.id === "vista-" + cual;
      b.setAttribute("aria-selected", String(on));
      b.tabIndex = on ? 0 : -1;
      document.getElementById(b.getAttribute("aria-controls")).hidden = !on;
      if (on && foco) b.focus();
    });
    if (cual === "estudio") initEstudioPueblos();
  }
  window.mostrarVistaPueblos = mostrarVista;
  vistas.forEach((b, i) => {
    b.addEventListener("click", () => mostrarVista(b.id.replace("vista-", "")));
    b.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        const j = (i + (e.key === "ArrowRight" ? 1 : -1) + vistas.length) % vistas.length;
        mostrarVista(vistas[j].id.replace("vista-", ""), true);
      }
    });
  });
  if (location.hash === "#estudio-pueblos") mostrarVista("estudio");
}

/* 5b. Mirada 2: estudio de los pueblos (CMDOT, octubre 2026) — se arma al abrir la pestaña */
function initEstudioPueblos() {
  if (initEstudioPueblos.hecho) { if (window.PUEBLOS_MAPA) window.PUEBLOS_MAPA.refrescar(); return; }
  initEstudioPueblos.hecho = true;
  const P = window.PLAN_SAG;
  const nav = document.getElementById("estudioNav");
  const container = document.getElementById("estudioContent");
  if (!P || !P.estudioPueblos || !nav || !container) return;

  function datosHTML(d) {
    if (!d) return `<p class="pueblo-sindatos">No es localidad censal: su población se cuenta dentro de los radios rurales y no hay cifra oficial propia. No tiene red de agua ni de cloaca.</p>`;
    const varViv = Math.round(100 * (d.viv[1] / d.viv[0] - 1));
    return `<dl class="pueblo-datos">
        <div><dt>Habitantes 2001 · 2010 · 2022</dt><dd>${d.pob.map(fmtN).join(" · ")}</dd></div>
        <div><dt>Viviendas 2010 → 2022</dt><dd>${fmtN(d.viv[0])} → ${fmtN(d.viv[1])} <small>(${varViv >= 0 ? "+" : ""}${varViv} %)</small></dd></div>
        <div><dt>Viviendas de uso temporal</dt><dd>${d.temporal} %</dd></div>
        <div><dt>Agua corriente</dt><dd class="pueblo-red">${d.agua}</dd></div>
        <div><dt>Cloaca</dt><dd class="pueblo-red">${d.cloaca}</dd></div>
      </dl>
      <p class="pueblo-fuente">Población y viviendas: INDEC, Censos 2001, 2010 y 2022 (Redatam por radio). Redes: Dirección de Planeamiento, Municipio; hogares conectados, Censo 2022.</p>`;
  }
  let movio = false;
  window.activarEstudio = crearPestanas(nav, container, P.estudioPueblos, "est-", (key) => {
    const p = P.estudioPueblos.find(x => x.id === key);
    if (!p) return;
    container.innerHTML = `
      <div class="loc-panel pueblo-panel">
        <div class="loc-ficha">
          <span class="loc-cuartel">Estudio CMDOT · octubre 2026</span>
          <h4>${p.nombre}</h4>
          <ul class="loc-meta"><li>${ICONO("i-pueblo")}<span>${p.origen}</span></li></ul>
          ${datosHTML(p.datos)}
          <span class="loc-comun-t">Sobre qué tierra nació</span>
          <p class="pueblo-suelo">${p.suelo}</p>
        </div>
        <div class="pueblo-cuerpo">
          <p class="pueblo-historia">${p.historia}</p>
          <div class="loc-box pueblo-decenio">
            <h5>Los últimos diez años</h5>
            <ul>${p.decenio.map(o => `<li>${o}</li>`).join("")}</ul>
          </div>
          <div class="loc-box pueblo-lineas">
            <h5>Líneas propuestas <span>borrador CMDOT · octubre 2026</span></h5>
            <ul>${p.lineas.map(l => `<li><b class="codigo">${l[0]}</b><span><strong>${l[1]}.</strong> ${l[2]}</span></li>`).join("")}</ul>
          </div>
          <p class="pueblo-pregunta"><span>Pregunta abierta</span>${p.pregunta}</p>
        </div>
      </div>`;
    if (window.PUEBLOS_MAPA && movio) window.PUEBLOS_MAPA.ir(p.mapa, p.id === "parajes" ? 11.2 : 13.6);
    movio = true;
  });
  initPueblosMapa();
}

/* Control de opacidad de las capas temáticas de un mapa (la imagen satelital queda debajo) */
function controlOpacidad(map, inputId, salidaId) {
  const r = document.getElementById(inputId), o = document.getElementById(salidaId);
  if (!r) return;
  const aplicar = () => {
    const v = r.value / 100;
    ["overlayPane", "markerPane", "shadowPane"].forEach(n => { const p = map.getPane(n); if (p) p.style.opacity = v; });
    if (o) o.textContent = r.value + " %";
  };
  r.addEventListener("input", aplicar);
  aplicar();
}
const ESRI_SAT = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const ESRI_ROT = "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}";

function initPueblosMapa() {
  const el = document.getElementById("pueblosMapa");
  if (!el || typeof L === "undefined") { if (el) el.innerHTML = '<p class="pm-error">El mapa necesita conexión a internet para cargar.</p>'; return; }
  const COL = { patrimonio: "#8B2020", institucion: "#2A5C7E", trabajo: "#355C2D", gastronomia: "#C8973A", alojamiento: "#B5651D",
    fiesta: "#8E3F7A", obra: "#5E5E58", ambiental: "#2E8C8C", otro: "#8E6620" };
  const LAB = { patrimonio: "Patrimonio", institucion: "Escuelas y servicios", trabajo: "Trabajo", gastronomia: "Gastronomía",
    alojamiento: "Alojamiento", fiesta: "Fiestas", obra: "Obras 2016–2026", ambiental: "Agua y ambiente", otro: "Loteos y barrios" };
  const PREC = { google: "ubicación verificada en Google Maps (20-10-2026)", exacta: "ubicación de capa propia", estimada: "ubicación estimada", pueblo: "ubicación esquemática (sin dirección publicada)" };
  const PUEBLO_ID = { "Azcuénaga": "azcuenaga", "Cucullú": "cucullu", "Villa Ruiz": "ruiz", "Franklin": "franklin", "Tuyutí": "tuyuti",
    "Solís": "solis", "Villa Espil": "espil", "San Alberto": "alberto", "Espora": "parajes", "Heavy": "parajes", "Km 108": "parajes", "La Valerosa": "parajes" };
  const map = L.map(el, { scrollWheelZoom: false, zoomSnap: 0.2, minZoom: 9 });
  map.attributionControl.setPrefix("");
  L.tileLayer(ESRI_SAT, { maxZoom: 18, attribution: "Imagen: Esri · Cartografía: CMDOT, Atlas de Mensuras (AHG), INDEC 2022" }).addTo(map);
  map.setView([-34.45, -59.45], 10.4);
  L.control.scale({ imperial: false }).addTo(map);
  controlOpacidad(map, "pueblosOpacidad", "pueblosOpacidadValor");
  const marcas = [];
  window.PUEBLOS_MAPA = {
    ir: (nombre, z) => { const c = window.__pueblosCentros && window.__pueblosCentros[nombre]; if (c) map.flyTo(c, z || 13.4, { duration: reduceMotion ? 0 : 0.8 }); },
    refrescar: () => setTimeout(() => map.invalidateSize(), 60)
  };
  fetch("data/pueblos-mapa.json").then(r => r.json()).then(D => {
    window.__pueblosCentros = D.centros;
    const lim = L.geoJSON(D.partido, { interactive: false, style: { color: "#F4F0E6", weight: 2.2, fill: false } }).addTo(map);
    map.fitBounds(lim.getBounds(), { padding: [12, 12] });
    L.geoJSON({ type: "FeatureCollection", features: D.mensuras }, {
      style: f => ({ color: "#F4F0E6", weight: 0.8, opacity: 0.7, fillColor: (f.properties.y || 0) < 1860 ? "#C8973A" : ((f.properties.y || 0) < 1880 ? "#7BAF5E" : "#9DB7CC"), fillOpacity: 0.12 }),
      onEachFeature: (f, l) => { const p = f.properties; l.bindTooltip(`<b>Mensura ${p.y || "s/f"}</b><br>${escH(p.tit) || "Sin titular"}<br>${fmtN(p.ha)} ha${p.ag ? " · agrim. " + escH(p.ag) : ""}`, { sticky: true }); }
    }).addTo(map);
    D.ramales.forEach(r => L.polyline(r.c.map(([x, y]) => [y, x]), { color: "#1C1A14", weight: 4, opacity: .85, interactive: false }).addTo(map));
    D.ramales.forEach(r => L.polyline(r.c.map(([x, y]) => [y, x]), { color: "#F4F0E6", weight: 1.6, dashArray: "6 6", interactive: false }).addTo(map));
    L.geoJSON({ type: "FeatureCollection", features: D.radios }, { style: { color: "#F4F0E6", weight: 1, fillColor: "#C8973A", fillOpacity: .45 },
      onEachFeature: (f, l) => l.bindTooltip(`<b>${escH(f.properties.loc)}</b><br>${fmtN(f.properties.pob)} habitantes (radio censal 2022)`, { sticky: true }) }).addTo(map);
    Object.entries(D.centros).forEach(([n, c]) => {
      L.marker(c, { icon: L.divIcon({ className: "pm-etiqueta", html: `<span>${escH(n)}</span>`, iconSize: null }), keyboard: false })
        .on("click", () => { const id = PUEBLO_ID[n]; if (id && window.activarEstudio) window.activarEstudio(id); }).addTo(map);
    });
    D.registros.forEach(r => {
      const m = L.circleMarker([r.la, r.lo], { radius: r.pr === "pueblo" ? 5.5 : 6.5, color: r.pr === "estimada" ? "#1C1A14" : "#F4F0E6", weight: r.pr === "estimada" ? 1.6 : 1.2,
        fillColor: COL[r.t] || "#555", fillOpacity: .95 });
      m.bindPopup(`<span class="pm-tipo" style="color:${COL[r.t]}">${LAB[r.t]} · ${escH(r.p)}</span><b>${escH(r.n)}</b>${r.d ? `<p>${escH(r.d)}</p>` : ""}${r.a ? `<p class="pm-dir">${escH(r.a)}</p>` : ""}<small>${escH(r.f)} · ${PREC[r.pr]}</small>`);
      m.tipo = r.t; m.addTo(map); marcas.push(m);
    });
    const leyenda = document.getElementById("pueblosMapaLeyenda");
    if (leyenda) {
      leyenda.innerHTML = Object.keys(LAB).map(t => `<button type="button" class="pm-filtro activo" data-t="${t}" aria-pressed="true"><i style="background:${COL[t]}"></i>${LAB[t]}</button>`).join("") +
        `<span class="pm-nota"><i class="pm-mens"></i>Mensuras del siglo XIX (Archivo Histórico de Geodesia) · <i class="pm-radio"></i>Radios censales urbanos 2022 · <i class="pm-ramal"></i>Ramales ferroviarios</span>`;
      leyenda.addEventListener("click", e => {
        const b = e.target.closest(".pm-filtro"); if (!b) return;
        const on = !b.classList.contains("activo"); b.classList.toggle("activo", on); b.setAttribute("aria-pressed", String(on));
        marcas.filter(m => m.tipo === b.dataset.t).forEach(m => on ? m.addTo(map) : map.removeLayer(m));
      });
    }
  }).catch(() => { el.insertAdjacentHTML("beforeend", '<p class="pm-error">No se pudieron cargar los datos del mapa.</p>'); });
  window.PUEBLOS_MAPA.refrescar();
}

/* 6. Las 46 Líneas propositivas, filtrables por familia */
function initLineas() {
  const P = window.PLAN_SAG;
  const filtros = document.getElementById("lineasFiltros");
  const grid = document.getElementById("lineasGrid");
  const texto = document.getElementById("lineasFamiliaTexto");
  if (!P || !filtros || !grid) return;

  const famDe = (cod) => cod.replace(/\d+$/, "");
  const nombreFam = Object.fromEntries(P.familias.map(f => [f.id, f.nombre]));

  const crear = (id, label, n) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "filtro"; b.dataset.fam = id;
    b.setAttribute("aria-pressed", "false");
    b.innerHTML = id === "*" ? `${label} <small>${n}</small>` : `<code>${id}</code>${label} <small>${n}</small>`;
    b.addEventListener("click", () => mostrar(id));
    filtros.appendChild(b);
  };
  crear("*", "Todas", P.lineas.length);
  P.familias.forEach(f => crear(f.id, f.nombre, P.lineas.filter(l => famDe(l[0]) === f.id).length));

  function mostrar(fam) {
    filtros.querySelectorAll(".filtro").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.fam === fam)));
    const f = P.familias.find(x => x.id === fam);
    texto.innerHTML = f
      ? `<strong>Líneas de ${f.nombre}.</strong> ${f.texto}${f.pregunta ? `<span class="familia-pregunta"><em>Pregunta abierta de la familia</em>${f.pregunta}</span>` : ""}`
      : "Las 46 líneas, en 12 familias. Elegí una familia para leerlas juntas; abrí cada línea para ver con cuáles se anuda y la pregunta que deja abierta.";
    const lista = fam === "*" ? P.lineas : P.lineas.filter(l => famDe(l[0]) === fam);
    grid.innerHTML = lista.map((l, i) => `
      <article class="linea-card" style="animation-delay:${Math.min(i, 12) * 0.03}s">
        <span class="linea-cod">${l[0]}</span><span class="linea-fam">${nombreFam[famDe(l[0])]}</span>
        <h5>${l[1]}${l[2] ? ` <small>${l[2]}</small>` : ""}</h5>
        <p>${l[3]}</p>
        ${l[4] || l[5] ? `<details class="linea-mas"><summary>Nudos y pregunta abierta</summary>
          ${l[4] ? `<p class="linea-nudos"><b>Se anuda con</b> ${l[4]}</p>` : ""}
          ${l[5] ? `<p class="linea-pregunta"><span>Pregunta abierta</span>${l[5]}</p>` : ""}
        </details>` : ""}
      </article>`).join("");
  }
  mostrar("*");
}

/* 7. Buscador en vivo del Glosario Didáctico (ignora tildes y mayúsculas) */
function initGlosarioSearch() {
  const searchInput = document.getElementById("glosarioInput");
  const cards = [...document.querySelectorAll(".glosario-card")];
  const noResults = document.getElementById("glosarioNoResults");
  const count = document.getElementById("glosarioCount");
  if (!searchInput) return;

  const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\./g, "");
  const originales = cards.map(c => ({ h: c.querySelector("h5").innerHTML, p: c.querySelector("p").innerHTML }));

  function resaltar(html, term) {
    if (!term) return html;
    // resalta respetando tildes: recorre el texto original y compara normalizado
    const plano = html;
    const n = norm(plano);
    const idx = n.indexOf(term);
    if (idx < 0 || plano.includes("<")) return html;
    // mapear índice normalizado a índice original
    let oi = 0, ni = 0;
    const mapa = [];
    while (oi < plano.length) {
      const nc = norm(plano[oi]);
      for (let k = 0; k < nc.length; k++) mapa[ni++] = oi;
      oi++;
    }
    const ini = mapa[idx], fin = (mapa[idx + term.length - 1] ?? plano.length - 1) + 1;
    return plano.slice(0, ini) + "<mark>" + plano.slice(ini, fin) + "</mark>" + plano.slice(fin);
  }

  searchInput.addEventListener("input", (e) => {
    const term = norm(e.target.value.trim());
    let matches = 0;

    cards.forEach((card, i) => {
      const keywords = norm(card.getAttribute("data-keywords") || "");
      const text = norm(card.textContent);
      const ok = !term || text.includes(term) || keywords.includes(term);
      card.hidden = !ok;
      card.querySelector("h5").innerHTML = ok ? resaltar(originales[i].h, term) : originales[i].h;
      card.querySelector("p").innerHTML = ok ? resaltar(originales[i].p, term) : originales[i].p;
      if (ok) matches++;
    });

    if (noResults) noResults.hidden = matches !== 0;
    if (count) count.textContent = term ? `${matches} de ${cards.length} fichas` : "";
  });
}

/* 8. Acordeón para Documentos Legales */
function initAccordion() {
  const headers = document.querySelectorAll(".accordion-header");

  headers.forEach(header => {
    header.addEventListener("click", () => {
      const item = header.closest(".accordion-item");
      const isActive = item.classList.contains("active");

      // Cerrar los demás
      document.querySelectorAll(".accordion-item").forEach(i => {
        i.classList.remove("active");
        i.querySelector(".accordion-header").setAttribute("aria-expanded", "false");
      });

      if (!isActive) {
        item.classList.add("active");
        header.setAttribute("aria-expanded", "true");
      }
    });
  });
}

/* 9. Formulario de Participación */
function initFormFeedback() {
  const form = document.getElementById("participacionForm");
  const feedback = document.getElementById("formFeedback");
  if (!form || !feedback) return;

  const btn = document.getElementById("btnEnviar");
  const msg = document.getElementById("inputMensaje");
  const contador = document.getElementById("msg-contador");
  const campos = [
    { el: document.getElementById("inputLocalidad"), err: document.getElementById("err-localidad"), ok: (v) => v !== "" },
    { el: document.getElementById("inputPerfil"), err: document.getElementById("err-perfil"), ok: (v) => v !== "" },
    { el: msg, err: document.getElementById("err-mensaje"), ok: (v) => v.trim().length >= 10 }
  ];

  const validar = (c) => {
    const valido = c.ok(c.el.value);
    c.el.setAttribute("aria-invalid", String(!valido));
    c.err.hidden = valido;
    return valido;
  };

  campos.forEach(c => {
    c.el.addEventListener("change", () => { if (c.el.getAttribute("aria-invalid")) validar(c); });
    c.el.addEventListener("blur", () => { if (c.el.getAttribute("aria-invalid")) validar(c); });
  });
  msg.addEventListener("input", () => {
    contador.textContent = `${msg.value.length} / 2000`;
    if (msg.getAttribute("aria-invalid") === "true") validar(campos[2]);
  });

  const escapar = (s) => s.replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));

  function mostrar(html, tipo) {
    feedback.className = "form-feedback" + (tipo === "aviso" ? " aviso" : "");
    feedback.innerHTML = html;
    feedback.hidden = false;
    setTimeout(() => {
      feedback.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
      feedback.focus({ preventScroll: true });
    }, 60);
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const resultados = campos.map(validar);
    const primero = campos.find((c, i) => !resultados[i]);
    if (primero) { primero.el.focus(); return; }

    const datos = {
      nombre: document.getElementById("inputNombre").value.trim(),
      localidad: campos[0].el.value,
      perfil: campos[1].el.value,
      senda: (document.getElementById("inputSenda") || {}).value || "",
      mensaje: msg.value.trim(),
      web: (form.querySelector('[name="web"]') || {}).value || ""
    };
    const quien = escapar(datos.nombre || "vecino/a");
    const donde = escapar(datos.localidad);
    const url = (window.PLAN_SAG_CONFIG && window.PLAN_SAG_CONFIG.OPINIONES_URL) || "";

    if (!url) {
      // Sin receptor configurado: no simular un envío que no ocurre.
      const texto = `Localidad: ${datos.localidad}\nRol: ${datos.perfil}${datos.senda ? "\nSenda: " + datos.senda : ""}\n\n${datos.mensaje}`;
      mostrar(`
        <span class="sello" aria-hidden="true">Buzón<br>en<br>preparación</span>
        <p><strong>Gracias, ${quien} de ${donde}.</strong> El envío en línea del Buzón todavía no está habilitado, así que tu aporte <strong>no fue enviado</strong>.</p>
        <p>Podés copiarlo y acercarlo a la Dirección de Planeamiento y Obras Particulares del Municipio.</p>
        <button type="button" class="btn btn-tierra btn-sm" id="btnCopiar">Copiar mi aporte</button>
      `, "aviso");
      const copiar = document.getElementById("btnCopiar");
      copiar.addEventListener("click", async () => {
        try { await navigator.clipboard.writeText(texto); copiar.textContent = "Copiado ✓"; }
        catch { copiar.textContent = "No se pudo copiar: seleccioná el texto del formulario"; }
      });
      return;
    }

    btn.disabled = true;
    const etiqueta = btn.innerHTML;
    btn.textContent = "Enviando…";
    try {
      await fetch(url, { method: "POST", mode: "no-cors", body: new URLSearchParams(datos) });
      mostrar(`
        <span class="sello" aria-hidden="true">Recibido<br>·<br>CMDOT</span>
        <p><strong>¡Gracias ${quien} de ${donde}!</strong> Tu mensaje fue registrado como aporte ciudadano para el Consejo Municipal (CMDOT).</p>
      `);
      form.reset();
      contador.textContent = "0 / 2000";
      campos.forEach(c => c.el.removeAttribute("aria-invalid"));
    } catch (err) {
      mostrar(`
        <span class="sello" aria-hidden="true">Sin<br>conexión</span>
        <p><strong>No pudimos enviar tu aporte.</strong> Revisá tu conexión e intentá de nuevo; lo que escribiste sigue en el formulario.</p>
      `, "aviso");
    } finally {
      btn.disabled = false;
      btn.innerHTML = etiqueta;
    }
  });
}

/* 10. Tomos del Plan: cada tema enlaza su tomo de la edición digital 2026 */
const TOMOS = { estado: {} }; // id -> "ok" | "falta" | "?"

function tomoEnlace(id, compacto) {
  const P = window.PLAN_SAG;
  const t = P && P.tomos.find(x => x.id === id);
  if (!t) return "";
  const est = TOMOS.estado[id] || "?";
  const nombre = t.archivo.split("/").pop();
  const rotulo = `Tomo ${t.n} · ${t.titulo}`;
  if (est === "falta") {
    return `<span class="tomo-btn tomo-falta" aria-disabled="true">${ICONO("i-libro", "ico-inline")} ${rotulo} <em>no disponible</em></span>`;
  }
  return `<a class="tomo-btn" href="${t.archivo}" download="${nombre}" type="application/pdf" aria-label="Descargar ${rotulo} (PDF, ${t.caps.split(" · ").pop()})">
      ${ICONO("i-descarga", "ico-inline")} <span>Descargar ${compacto ? "" : rotulo}</span>${compacto ? "" : ` <small>PDF · ${t.caps}</small>`}</a>`;
}

function pintarTomos(raiz) {
  const P = window.PLAN_SAG;
  if (!P) return;
  (raiz || document).querySelectorAll(".tomo-slot[data-tomo]").forEach(el => {
    const t = P.tomos.find(x => x.id === el.dataset.tomo);
    if (!t) return;
    el.innerHTML = `<span class="tomo-pre">El texto completo está en el tomo:</span> ${tomoEnlace(t.id)}`;
  });
  const bib = document.getElementById("biblioteca");
  if (bib && !raiz) {
    bib.innerHTML = P.tomos.map(t => `
      <li class="tomo-item${TOMOS.estado[t.id] === "falta" ? " es-falta" : ""}">
        <span class="tomo-n">${t.n}</span>
        <span class="tomo-tit"><em>${t.rotulo}</em><strong>${t.titulo}</strong><span>${t.bajada}</span><small>${t.caps}</small></span>
        ${tomoEnlace(t.id, true)}
      </li>`).join("");
  }
}

async function initTomos() {
  const P = window.PLAN_SAG;
  if (!P || !P.tomos) return;
  pintarTomos();
  if (location.protocol === "file:") return; // sin servidor no se puede comprobar
  await Promise.all(P.tomos.map(async t => {
    try {
      const r = await fetch(t.archivo, { method: "HEAD", cache: "no-store" });
      const tipo = r.headers.get("content-type") || "";
      TOMOS.estado[t.id] = r.ok && !tipo.includes("text/html") ? "ok" : "falta";
    } catch { TOMOS.estado[t.id] = "?"; }
  }));
  const faltan = P.tomos.filter(t => TOMOS.estado[t.id] === "falta").map(t => t.archivo);
  if (faltan.length) console.info("[Plan SAG] Tomos no encontrados en el servidor:", faltan.join(", "));
  pintarTomos();
}

/* 11. Mapa de Ocasiones: ubicación aproximada sobre imagen satelital */
function initMapaOcasiones() {
  const el = document.getElementById("mapaOcasiones");
  const P = window.PLAN_SAG, G = window.GEO || {};
  if (!el || !P) return;
  if (typeof L === "undefined") { el.innerHTML = '<p class="pm-error">El mapa necesita conexión a internet para cargar.</p>'; return; }

  const AZUL = "#2A5C7E";
  const grupos = P.sendas.map(s => ({ id: s.id, nombre: s.corto, color: s.color }));
  grupos.push({ id: "pueblos", nombre: "Pueblos rurales", color: AZUL });
  const colorDe = Object.fromEntries(grupos.map(g => [g.id, g.color]));
  const PUEBLO = { "Franklin": "franklin", "Villa Ruiz": "ruiz", "Cucullú": "cucullu", "Azcuénaga": "azcuenaga", "Solís": "solis", "Villa Espil": "espil", "San Alberto": "alberto", "Tuyutí": "tuyuti" };

  const map = L.map(el, { scrollWheelZoom: false, zoomSnap: 0.25, minZoom: 9 });
  map.attributionControl.setPrefix("");
  const sat = L.tileLayer(ESRI_SAT, { maxZoom: 19, attribution: "Imagen: Esri, Maxar, Earthstar Geographics · Cartografía: CMDOT" }).addTo(map);
  const rot = L.tileLayer(ESRI_ROT, { maxZoom: 19, opacity: .9 });
  const calles = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" });

  if (G.partido) L.polygon(G.partido, { color: "#F4F0E6", weight: 2.5, fill: false, dashArray: "2 6", interactive: false }).addTo(map);
  const arroyos = L.layerGroup((G.arroyos || []).map(l => L.polyline(l, { color: "#6FB3DA", weight: 1.6, opacity: .9, interactive: false }))).addTo(map);
  const caminos = L.layerGroup((G.caminos || []).map(l => L.polyline(l, { color: "#E8C25A", weight: 1.2, opacity: .8, interactive: false })));
  const escuelas = L.layerGroup((G.escuelas || []).map(p => L.circleMarker(p.ll, { radius: 4.5, color: "#F4F0E6", weight: 1.2, fillColor: AZUL, fillOpacity: 1 })
    .bindPopup(`<span class="pm-tipo" style="color:${AZUL}">Escuela rural</span><b>${escH(p.n)}</b><p>Las escuelas rurales pueden ser nodo de los nuevos Puestos.</p>`)));

  const capas = {};
  grupos.forEach(g => { capas[g.id] = L.layerGroup().addTo(map); });

  const senda = id => P.sendas.find(s => s.id === id);
  function popupOcasion(pt) {
    const c = colorDe[pt.s];
    if (pt.s === "pueblos") {
      const id = PUEBLO[pt.n], p = P.pueblos.find(x => x.id === id);
      return `<span class="pm-tipo" style="color:${c}">Pueblos rurales · Tomo 6</span><b>${escH(pt.n)}</b>${p ? `<p>${escH(p.origen)}. ${escH(p.ocasiones.slice(0, 2).join("; "))}…</p>` : ""}
        <button type="button" class="pm-ir" data-pueblo="${id}">Ver la ficha del pueblo →</button>`;
    }
    const s = senda(pt.s), o = s && s.ocasiones.find(x => x.t === pt.o);
    const d = o ? (o.d.length > 190 ? o.d.slice(0, 188) + "…" : o.d) : "";
    return `<span class="pm-tipo" style="color:${c}">${escH(s ? s.nombre : "")} · Ocasión</span><b>${escH(pt.n)}</b>${pt.n !== pt.o ? `<p><strong>${escH(pt.o)}</strong></p>` : ""}<p>${escH(d)}</p>
      ${pt.a ? '<p class="pm-dir">Ubicación aproximada.</p>' : ""}<button type="button" class="pm-ir" data-senda="${pt.s}" data-oca="${escH(pt.o)}">Leer la Ocasión →</button>`;
  }
  const pin = (c, txt) => L.divIcon({ className: "oc-pin-wrap", html: `<span class="oc-pin" style="--c:${c}">${txt}</span>`, iconSize: [26, 26], iconAnchor: [13, 13], popupAnchor: [0, -12] });
  P.mapa.forEach(pt => {
    const txt = pt.s === "pueblos" ? "" : (pt.n.match(/^([a-f]) · /) || [0, ""])[1];
    L.marker(pt.ll, { icon: pin(colorDe[pt.s], txt), title: pt.n, keyboard: true }).bindPopup(popupOcasion(pt)).addTo(capas[pt.s]);
  });
  // Plazas rurales propuestas y senderos: Ocasión «Plazas rurales y preservación ambiental» (Sendas del Ambiente)
  const amb = senda("ambiente"), ocPR = amb && amb.ocasiones.find(o => /^Plazas rurales/.test(o.t));
  (G.plazas || []).forEach(p => {
    L.marker(p.ll, { icon: L.divIcon({ className: "oc-pin-wrap", html: `<span class="oc-plaza">${escH(p.n)}</span>`, iconSize: [30, 20], iconAnchor: [15, 10] }), title: "Plaza rural " + p.n })
      .bindPopup(popupOcasion({ s: "ambiente", o: ocPR ? ocPR.t : "", n: "Plaza rural propuesta " + p.n, a: 1 })).addTo(capas.ambiente);
  });
  (G.senderos || []).forEach(sd => {
    L.polyline(sd.l, { color: "#FFFFFF", weight: 3, dashArray: "6 6" }).bindPopup(popupOcasion({ s: "ambiente", o: ocPR ? ocPR.t : "", n: "Sendero rural · " + sd.n, a: 1 })).addTo(capas.ambiente);
  });

  L.control.layers({ "Satélite": sat, "Calles": calles }, { "Nombres de lugares": rot, "Arroyos y cañadas": arroyos, "Caminos rurales": caminos, "Escuelas rurales": escuelas }, { collapsed: true }).addTo(map);
  L.control.scale({ imperial: false }).addTo(map);
  if (G.partido) map.fitBounds(G.partido, { padding: [4, 4] }); else map.setView([-34.4422, -59.4475], 11);
  controlOpacidad(map, "mapaOpacidad", "mapaOpacidadValor");

  // Filtros por Senda y leyenda
  const barra = document.getElementById("mapaFiltros");
  if (barra) {
    barra.innerHTML = grupos.map(g => `<button type="button" class="mapa-filtro" data-capa="${g.id}" aria-pressed="true" style="--c:${g.color}"><i aria-hidden="true"></i>${g.nombre} <small>${P.mapa.filter(p => p.s === g.id).length + (g.id === "ambiente" ? (G.plazas || []).length : 0)}</small></button>`).join("");
    barra.addEventListener("click", e => {
      const b = e.target.closest(".mapa-filtro"); if (!b) return;
      const on = b.getAttribute("aria-pressed") !== "true";
      b.setAttribute("aria-pressed", String(on));
      on ? capas[b.dataset.capa].addTo(map) : map.removeLayer(capas[b.dataset.capa]);
    });
  }
  const ley = document.getElementById("mapaLeyenda");
  if (ley) ley.innerHTML = `
    <span><i class="ly-pin" style="--c:#7A7A72"></i>Ocasión (color de su Senda)</span>
    <span><i class="ly-plaza"></i>Plaza rural propuesta (P1 a P13)</span>
    <span><i class="ly-linea" style="--c:#FFFFFF;--d:dashed"></i>Sendero rural</span>
    <span><i class="ly-linea" style="--c:#6FB3DA"></i>Arroyos y cañadas</span>
    <span><i class="ly-linea" style="--c:#E8C25A"></i>Caminos rurales (en capas)</span>
    <span><i class="ly-linea" style="--c:#F4F0E6;--d:dotted"></i>Límite del Partido</span>
    <span><i class="ly-pin" style="--c:${AZUL};--t:.6"></i>Escuela rural (en capas)</span>`;

  // Desde un globo: ir a la Ocasión o a la ficha del pueblo
  el.addEventListener("click", e => {
    const b = e.target.closest(".pm-ir"); if (!b) return;
    map.closePopup();
    if (b.dataset.pueblo) {
      if (window.mostrarVistaPueblos) window.mostrarVistaPueblos("plan");
      if (window.activarPueblo) window.activarPueblo(b.dataset.pueblo);
      document.getElementById("pueblos").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
    } else if (window.irAOcasion) window.irAOcasion(b.dataset.senda, b.dataset.oca);
  });
  const obs = new IntersectionObserver(es => { if (es[0].isIntersecting) map.invalidateSize(); });
  obs.observe(el);
}
