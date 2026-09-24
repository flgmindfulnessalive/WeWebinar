// ACTIVA TU VIDA · /X39 — interacción del cliente (sin dependencias).
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  // Analítica opcional: solo si la página cargó Plausible o GA4.
  function track(name) {
    try {
      if (typeof window.plausible === "function") window.plausible(name);
      if (typeof window.gtag === "function") window.gtag("event", name);
    } catch (_) { /* sin analítica */ }
  }
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-track]");
    if (el) track(el.getAttribute("data-track"));
  });

  // --- Cabecera y menú móvil ------------------------------------------
  const header = $("[data-header]");
  const toggle = $("[data-menu-toggle]");
  const menu = $("[data-menu]");
  const menuLabel = $("[data-menu-label]");
  const main = $("main");

  const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 24);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  function setMenu(open, { restoreFocus = true } = {}) {
    toggle.setAttribute("aria-expanded", String(open));
    menuLabel.textContent = open ? "Cerrar menú" : "Abrir menú";
    menu.hidden = !open;
    header.classList.toggle("is-open", open);
    document.body.style.overflow = open ? "hidden" : "";
    for (const el of [main, $(".site-footer")]) if (el) el.inert = open;
    if (open) $("a", menu).focus();
    else if (restoreFocus) toggle.focus();
  }
  toggle.addEventListener("click", () => setMenu(toggle.getAttribute("aria-expanded") !== "true"));
  menu.addEventListener("click", (e) => {
    if (e.target.closest("a")) setMenu(false, { restoreFocus: false });
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") setMenu(false);
  });
  // Al pasar a escritorio el menú desaparece: liberar el estado.
  window.matchMedia("(min-width: 1024px)").addEventListener("change", (mq) => {
    if (mq.matches && toggle.getAttribute("aria-expanded") === "true") setMenu(false, { restoreFocus: false });
  });

  // Sección activa en la navegación de escritorio.
  const navLinks = $$(".nav__link");
  const sections = navLinks.map((a) => $(a.getAttribute("href"))).filter(Boolean);
  if ("IntersectionObserver" in window && sections.length) {
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        navLinks.forEach((a) => {
          if (a.getAttribute("href") === `#${entry.target.id}`) a.setAttribute("aria-current", "true");
          else a.removeAttribute("aria-current");
        });
      }
    }, { rootMargin: "-45% 0px -50% 0px" });
    sections.forEach((s) => io.observe(s));
  }

  // --- Videos (Vimeo) a demanda -----------------------------------------
  function vimeoSrc(id) {
    const p = new URLSearchParams({ autoplay: "1", dnt: "1", title: "0", byline: "0", portrait: "0", playsinline: "1" });
    return `https://player.vimeo.com/video/${encodeURIComponent(id)}?${p}`;
  }
  function makeIframe(id, title) {
    const f = document.createElement("iframe");
    f.src = vimeoSrc(id);
    f.title = title;
    f.allow = "autoplay; fullscreen; picture-in-picture";
    f.referrerPolicy = "strict-origin-when-cross-origin";
    return f;
  }
  $$("[data-player]").forEach((player) => {
    const btn = $(".player__poster", player);
    btn.addEventListener("click", () => {
      const iframe = makeIframe(player.dataset.vimeo, player.dataset.title);
      player.insertBefore(iframe, btn);
      player.classList.add("is-playing");
      iframe.focus();
      track("video_play");
    });
  });

  // --- Diálogos -----------------------------------------------------------
  const supportsDialog = typeof HTMLDialogElement === "function";
  let lastTrigger = null;
  function openDialog(dlg, trigger) {
    lastTrigger = trigger || document.activeElement;
    if (supportsDialog && dlg.showModal) dlg.showModal();
    else dlg.setAttribute("open", "");
    document.body.style.overflow = "hidden";
  }
  function closeDialog(dlg) {
    if (dlg.close) dlg.close();
    else dlg.removeAttribute("open");
  }
  $$("dialog").forEach((dlg) => {
    dlg.addEventListener("close", () => {
      document.body.style.overflow = "";
      const frame = $("[data-video-dialog-frame]", dlg);
      if (frame) frame.replaceChildren(); // detener el video
      if (lastTrigger && document.contains(lastTrigger)) lastTrigger.focus();
    });
    // Clic fuera del panel = cerrar.
    dlg.addEventListener("click", (e) => { if (e.target === dlg) closeDialog(dlg); });
    $$("[data-dialog-close]", dlg).forEach((b) => b.addEventListener("click", () => closeDialog(dlg)));
  });
  $$("[data-dialog-open]").forEach((btn) => {
    btn.addEventListener("click", () => {
      openDialog($(`#${btn.dataset.dialogOpen}`), btn);
      track("packages_dialog");
    });
  });

  const videoDlg = $("#dlg-video");
  $$("[data-video-dialog]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.videoDialog;
      const title = btn.dataset.videoTitle;
      $("[data-video-dialog-title]", videoDlg).textContent = title;
      $("[data-video-dialog-link]", videoDlg).href = `https://vimeo.com/${id}`;
      const frame = $("[data-video-dialog-frame]", videoDlg);
      frame.replaceChildren(makeIframe(id, `Experiencia: ${title}`));
      openDialog(videoDlg, btn);
      track("testimonial_play");
    });
  });

  // --- Carrusel manual (sin reproducción automática) ---------------------
  $$("[data-carousel]").forEach((carousel) => {
    const track = $(".carousel__track", carousel);
    const items = $$("[data-carousel-item]", carousel);
    const controls = carousel.previousElementSibling && $("[data-carousel-controls]", carousel.previousElementSibling);
    if (!controls || !items.length) return;
    const prev = $("[data-carousel-prev]", controls);
    const next = $("[data-carousel-next]", controls);
    const status = $("[data-carousel-status]", controls);

    const current = () => {
      const left = track.getBoundingClientRect().left + parseFloat(getComputedStyle(track).scrollPaddingInlineStart || 0);
      let best = 0;
      let dist = Infinity;
      items.forEach((it, i) => {
        const d = Math.abs(it.getBoundingClientRect().left - left);
        if (d < dist) { dist = d; best = i; }
      });
      return best;
    };
    const update = () => {
      const i = current();
      status.textContent = `${i + 1} / ${items.length}`;
      prev.disabled = track.scrollLeft <= 2;
      next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
    };
    const go = (dir) => {
      const i = Math.max(0, Math.min(items.length - 1, current() + dir));
      items[i].scrollIntoView({ behavior: reducedMotion.matches ? "auto" : "smooth", block: "nearest", inline: "start" });
    };
    prev.addEventListener("click", () => go(-1));
    next.addEventListener("click", () => go(1));
    track.addEventListener("keydown", (e) => {
      if (e.target !== track) return;
      if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
    });
    let t;
    track.addEventListener("scroll", () => { clearTimeout(t); t = setTimeout(update, 60); }, { passive: true });
    window.addEventListener("resize", update);
    update();
  });

  // --- Aparición suave al hacer scroll -------------------------------------
  const revealEls = $$("[data-reveal]");
  if (!reducedMotion.matches && "IntersectionObserver" in window) {
    const ro = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          ro.unobserve(entry.target);
        }
      }
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
    revealEls.forEach((el) => ro.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("is-in"));
  }

  // --- Aviso de vista previa ----------------------------------------------
  const pill = $("[data-preview-pill]");
  if (pill) $("[data-preview-dismiss]", pill).addEventListener("click", () => { pill.hidden = true; });
})();

// --- Capa de «vida»: campo de luz, progreso, líneas y títulos --------------
(() => {
  "use strict";
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Barra de progreso de lectura
  const bar = document.querySelector("[data-progress]");
  if (bar) {
    let ticking = false;
    const paint = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.setProperty("--p", max > 0 ? (window.scrollY / max).toFixed(4) : 0);
      ticking = false;
    };
    window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(paint); } }, { passive: true });
    paint();
  }

  // Títulos que aparecen palabra a palabra
  const titles = document.querySelectorAll(".h-section, .h-statement");
  titles.forEach((h) => {
    let i = 0;
    h.querySelectorAll("span").forEach((line) => {
      const words = line.textContent.split(/(\s+)/);
      line.textContent = "";
      for (const w of words) {
        if (/^\s+$/.test(w) || !w) { line.append(w); continue; }
        const s = document.createElement("span");
        s.className = "w";
        s.style.setProperty("--wi", i++);
        s.textContent = w;
        line.append(s);
      }
    });
  });

  // Líneas de luz por sección y títulos al entrar en pantalla
  if ("IntersectionObserver" in window && !reduced) {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add(e.target.matches(".section") ? "is-lit" : "is-words");
        io.unobserve(e.target);
      }
    }, { rootMargin: "0px 0px -12% 0px" });
    document.querySelectorAll(".section").forEach((s) => io.observe(s));
    titles.forEach((t) => io.observe(t));
  } else {
    document.querySelectorAll(".section").forEach((s) => s.classList.add("is-lit"));
    titles.forEach((t) => t.classList.add("is-words"));
  }

  // Campo de luz: espiral de Fibonacci (filotaxis) de puntos que titilan
  const canvas = document.querySelector("[data-lightfield]");
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext("2d");
  let dots = [];
  let w = 0;
  let h = 0;
  let dpr = 1;
  let visible = true;
  const GOLDEN = Math.PI * (3 - Math.sqrt(5));

  function layout() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const desktop = w >= 900;
    const cx = desktop ? w * 0.74 : w * 0.5;
    const cy = desktop ? h * 0.46 : h * 0.24;
    const R = Math.min(desktop ? w * 0.42 : w * 0.9, 620);
    const n = desktop ? 520 : 300;
    dots = [];
    for (let i = 0; i < n; i++) {
      const r = R * Math.sqrt(i / n);
      const a = i * GOLDEN;
      const t = i / n;
      dots.push({
        x: cx + r * Math.cos(a),
        y: cy + r * Math.sin(a) * 0.82,
        size: 0.6 + (1 - t) * 1.5,
        base: 0.1 + (1 - t) * 0.4,
        phase: (i * 0.618) % (Math.PI * 2),
        speed: 0.6 + ((i * 7) % 10) / 12,
        mint: i % 7 === 0,
      });
    }
  }

  function draw(time) {
    ctx.clearRect(0, 0, w, h);
    const t = time / 1000;
    for (const d of dots) {
      const tw = reduced ? 0.7 : 0.45 + 0.55 * Math.sin(t * d.speed + d.phase);
      ctx.globalAlpha = Math.max(0, d.base * tw);
      ctx.fillStyle = d.mint ? "#9fe8d9" : "#e6f4ff";
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function loop(time) {
    if (visible) draw(time);
    requestAnimationFrame(loop);
  }

  layout();
  if (reduced) {
    draw(0);
  } else {
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(canvas);
    requestAnimationFrame(loop);
  }
  let rt;
  window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { layout(); draw(performance.now()); }, 150); });
})();
