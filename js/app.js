/* ===================================================================
   PLAN SAG 2020-2030 | Lógica Interactiva
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
  const links = [...document.querySelectorAll(".main-nav .nav-link")];
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
    if (el.classList.contains("eje-card")) el.style.transitionDelay = (i % 2) * 0.15 + "s";
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
    const pueblos = s.id === "habitar"
      ? `<p class="senda-pie">Dentro de esta Senda, <strong>cada pueblo es una Ocasión</strong>. <a href="#pueblos">Ver las Ocasiones de los Pueblos →</a></p>` : "";
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
      ${pueblos}
    `;
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

  activar(P.sendas[0].id);
}

/* 5. Pueblos: cada uno una Ocasión del Habitar */
function initPueblos() {
  const P = window.PLAN_SAG;
  const nav = document.getElementById("pueblosNav");
  const container = document.getElementById("pueblosContent");
  if (!P || !nav || !container) return;

  P.pueblos.forEach((p, i) => {
    const b = document.createElement("button");
    b.className = "loc-tab-btn"; b.type = "button";
    b.setAttribute("role", "tab"); b.id = "tab-" + p.id;
    b.setAttribute("aria-controls", "pueblosContent");
    b.dataset.loc = p.id;
    b.tabIndex = i === 0 ? 0 : -1;
    b.innerHTML = `<span class="nodo" aria-hidden="true"></span><span class="loc-nombre">${p.nombre}</span>`;
    nav.appendChild(b);
  });
  const buttons = [...nav.querySelectorAll(".loc-tab-btn")];

  function render(key) {
    const p = P.pueblos.find(x => x.id === key);
    if (!p) return;
    container.innerHTML = `
      <div class="loc-panel">
        <div class="loc-ficha">
          <span class="loc-cuartel">Ocasión · Sendas del Habitar</span>
          <h4>${p.nombre}</h4>
          <ul class="loc-meta">
            <li>${ICONO("i-pueblo")}<span>${p.origen}</span></li>
            <li>${ICONO("i-pin")}<span>${p.nombre} y su territorio</span></li>
          </ul>
          <span class="loc-comun-t">Compartido con todos los pueblos</span>
          <ul class="pueblo-comun">${P.pueblosComun.map(c => `<li>${c}</li>`).join("")}</ul>
        </div>
        <div class="loc-box lineamientos">
          <h5>Lo propio de ${p.nombre}</h5>
          <ol>${p.ocasiones.map(o => `<li>${o}</li>`).join("")}</ol>
        </div>
      </div>
    `;
  }

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

  buttons.forEach((b, i) => { b.classList.toggle("active", i === 0); b.setAttribute("aria-selected", String(i === 0)); });
  container.setAttribute("aria-labelledby", buttons[0].id);
  render(buttons[0].dataset.loc);
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
    texto.textContent = f ? `Líneas de ${f.nombre}: ${f.texto}` : "Las 46 líneas, en 12 familias. Elegí una familia para leerlas juntas.";
    const lista = fam === "*" ? P.lineas : P.lineas.filter(l => famDe(l[0]) === fam);
    grid.innerHTML = lista.map((l, i) => `
      <article class="linea-card" style="animation-delay:${Math.min(i, 12) * 0.03}s">
        <span class="linea-cod">${l[0]}</span><span class="linea-fam">${nombreFam[famDe(l[0])]}</span>
        <h5>${l[1]}</h5>
        <p>${l[2]}</p>
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
