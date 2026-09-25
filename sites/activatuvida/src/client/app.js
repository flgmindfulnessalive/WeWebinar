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

  // --- Pantallas de carga «Activación» ----------------------------------
  // A: si la página tardó más de 0,3 s, el parche lanza su onda y se funde.
  const boot = $("[data-loader-boot]");
  if (boot) {
    const hideBoot = () => {
      if (!boot.isConnected) return;
      if (performance.now() < 300) { boot.remove(); return; }
      const ld = $(".ld", boot);
      ld.classList.add("is-done");
      setTimeout(() => ld.classList.add("is-hidden"), 450);
      setTimeout(() => boot.remove(), 950);
    };
    if (document.readyState === "complete") hideBoot();
    else { window.addEventListener("load", hideBoot, { once: true }); setTimeout(hideBoot, 6000); }
  }
  // B: al pulsar Comprar o Únete se muestra la transición mientras abre la tienda.
  const go = $("[data-loader-go]");
  if (go) {
    document.addEventListener("click", (e) => {
      const a = e.target.closest("a[data-store-link]");
      if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      go.hidden = false;
      const ld = $(".ld", go);
      ld.classList.remove("is-done", "is-hidden");
      setTimeout(() => { window.location.href = a.href; }, 60);
    });
    // Al volver con «atrás» (caché del navegador), se oculta.
    window.addEventListener("pageshow", (e) => { if (e.persisted) go.hidden = true; });
  }

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
  function vimeoSrc(id, extra) {
    const p = new URLSearchParams({ autoplay: "1", dnt: "1", title: "0", byline: "0", portrait: "0", playsinline: "1", ...extra });
    return `https://player.vimeo.com/video/${encodeURIComponent(id)}?${p}`;
  }
  function makeIframe(id, title, extra) {
    const f = document.createElement("iframe");
    f.src = vimeoSrc(id, extra);
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

  // Clips marcados con data-autoplay-inview: al entrar en pantalla se
  // reproducen silenciados y en bucle (los navegadores solo permiten el
  // autoplay sin sonido); se pausan al salir. Con «reducir movimiento» o
  // ahorro de datos se quedan con el botón de play.
  const saveData = navigator.connection && navigator.connection.saveData;
  if ("IntersectionObserver" in window && !reducedMotion.matches && !saveData) {
    const vimeoCmd = (iframe, method) => {
      if (iframe.contentWindow) iframe.contentWindow.postMessage(JSON.stringify({ method }), "https://player.vimeo.com");
    };
    const auto = new IntersectionObserver((entries) => {
      for (const { target: player, isIntersecting } of entries) {
        const iframe = $("iframe", player);
        if (isIntersecting) {
          if (!iframe) {
            player.insertBefore(makeIframe(player.dataset.vimeo, player.dataset.title, { muted: "1", loop: "1" }), $(".player__poster", player));
            player.classList.add("is-playing");
            track("video_autoplay");
          } else vimeoCmd(iframe, "play");
        } else if (iframe) vimeoCmd(iframe, "pause");
      }
    }, { threshold: 0.6 });
    $$("[data-player][data-autoplay-inview]").forEach((p) => auto.observe(p));
  }

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

  // Cielo de estrellas: pocos puntos, con halo y destellos suaves
  const canvas = document.querySelector("[data-lightfield]");
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext("2d");
  let stars = [];
  let w = 0;
  let h = 0;
  let visible = true;

  // Pseudoaleatorio con semilla: el cielo es el mismo en cada visita.
  let seed = 39;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  // Sprite de halo precalculado (más barato que shadowBlur por estrella).
  const sprite = document.createElement("canvas");
  sprite.width = sprite.height = 64;
  const sg = sprite.getContext("2d");
  const grad = sg.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.12, "rgba(236,246,255,0.85)");
  grad.addColorStop(0.35, "rgba(170,215,255,0.22)");
  grad.addColorStop(1, "rgba(170,215,255,0)");
  sg.fillStyle = grad;
  sg.fillRect(0, 0, 64, 64);

  function layout() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seed = 39;
    const n = w >= 900 ? 70 : 42;
    stars = [];
    for (let i = 0; i < n; i++) {
      const bright = rand() < 0.14; // unas pocas estrellas protagonistas
      stars.push({
        x: rand() * w,
        y: rand() * h * 0.92,
        r: bright ? 7 + rand() * 5 : 2.5 + rand() * 3.5, // radio del halo
        base: bright ? 0.55 : 0.18 + rand() * 0.25,
        speed: 0.25 + rand() * 0.55,
        phase: rand() * Math.PI * 2,
        flare: bright,
      });
    }
  }

  function draw(time) {
    ctx.clearRect(0, 0, w, h);
    const t = time / 1000;
    ctx.globalCompositeOperation = "lighter";
    for (const s of stars) {
      // Titileo suave: pasa casi todo el tiempo tenue y a veces se enciende.
      const wave = reduced ? 0.6 : Math.pow(0.5 + 0.5 * Math.sin(t * s.speed + s.phase), 3);
      const a = s.base * (0.35 + 0.65 * wave);
      ctx.globalAlpha = a;
      const d = s.r * 2 * (0.85 + 0.3 * wave);
      ctx.drawImage(sprite, s.x - d / 2, s.y - d / 2, d, d);
      if (s.flare && wave > 0.25) {
        // Destello en cruz, como una estrella vista a través de una lente.
        const len = s.r * (1.1 + 1.5 * wave);
        ctx.globalAlpha = a * 0.4 * wave;
        ctx.strokeStyle = "rgba(225,242,255,1)";
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(s.x - len, s.y); ctx.lineTo(s.x + len, s.y);
        ctx.moveTo(s.x, s.y - len); ctx.lineTo(s.x, s.y + len);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
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
