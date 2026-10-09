/* Мобильная оболочка «Легенды Дракономании».
   Загружается ПОСЛЕ game.js: не меняет игровую логику, только добавляет то, что нужно телефону —
   корректную высоту экрана (адресная строка браузера), пересчёт острова при повороте,
   регистрацию сервис-воркера (офлайн-запуск, установка на главный экран) и подсказку по установке. */
(function () {
  "use strict";

  // ---------- высота видимой области (учитывает адресную строку мобильного браузера) ----------
  function setVH() {
    const h = (window.visualViewport && window.visualViewport.height) || window.innerHeight;
    document.documentElement.style.setProperty("--mvh", h + "px");
  }
  setVH();
  window.addEventListener("resize", setVH);
  if (window.visualViewport) window.visualViewport.addEventListener("resize", setVH);

  // ---------- масштаб острова под узкий экран ----------
  // В веб-версии масштаб не опускается ниже 0.6 — на телефоне остров тогда вылезает за экран.
  // Переопределяем глобальный fitIsland (game.js обращается к нему по имени, поэтому подмена работает везде).
  window.fitIsland = function () {
    const fit = document.getElementById("isofit");
    const iso = fit && fit.querySelector(".iso");
    if (!fit || !iso) return;
    const W = iso.offsetWidth, H = iso.offsetHeight - 40;
    if (!W || !H) return;
    const availW = document.getElementById("scr-map").clientWidth - 16;
    const nav = document.getElementById("navbar");
    const vh = (window.visualViewport && window.visualViewport.height) || window.innerHeight;
    const availH = Math.max(200, vh - fit.getBoundingClientRect().top - (nav ? nav.offsetHeight : 60) - 10);
    const s = Math.max(0.3, Math.min(availW / (W + 64), availH / H, 1.6));
    // origin слева + явный сдвиг: иначе блок шире контейнера масштабируется от своего центра и уезжает вправо
    const tx = Math.max(0, (availW - W * s) / 2);
    iso.style.transformOrigin = "0 0";
    iso.style.transform = `translateX(${tx}px) scale(${s})`;
    fit.style.width = Math.min(availW, W * s) + "px";
    fit.style.height = H * s + "px";
    fit.style.margin = "0 auto";
  };
  window.addEventListener("load", () => setTimeout(() => window.fitIsland(), 300));

  // ---------- поворот экрана: пересчитать масштаб острова ----------
  window.addEventListener("orientationchange", () => {
    setTimeout(() => { setVH(); window.fitIsland(); }, 350);
  });

  // ---------- двойной тап не должен зумить страницу ----------
  let lastTouch = 0;
  document.addEventListener("touchend", e => {
    const now = Date.now();
    if (now - lastTouch < 300) e.preventDefault();
    lastTouch = now;
  }, { passive: false });

  // ---------- сервис-воркер: установка на главный экран и запуск без сети ----------
  const standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("mobile/sw.js", { scope: "mobile/" }).catch(() => {});
    });
  }

  // ---------- кнопка «Установить» (Android/Chrome — через системный запрос) ----------
  let deferredPrompt = null;
  function addInstallButton() {
    const bar = document.getElementById("topbar");
    if (!bar || document.getElementById("installbtn") || standalone) return;
    const b = document.createElement("button");
    b.id = "installbtn";
    b.className = "btn sm";
    b.textContent = "📲";
    b.title = "Установить на экран";
    b.onclick = async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        try { await deferredPrompt.userChoice; } catch (e) {}
        deferredPrompt = null;
        b.remove();
      } else if (typeof window.toast === "function") {
        window.toast("📲 iPhone: «Поделиться» → «На экран «Домой»»");
      }
    };
    bar.append(b);
  }
  window.addEventListener("beforeinstallprompt", e => {
    e.preventDefault();
    deferredPrompt = e;
    addInstallButton();
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    const b = document.getElementById("installbtn");
    if (b) b.remove();
  });

  // ---------- iOS Safari не поддерживает beforeinstallprompt: показываем подсказку один раз ----------
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);
  if (isIOS && !standalone && !localStorage.getItem("dml_m_ios_hint")) {
    addInstallButton();
    setTimeout(() => {
      localStorage.setItem("dml_m_ios_hint", "1");
      if (typeof window.toast === "function") window.toast("📲 Чтобы играть как приложение: «Поделиться» → «На экран «Домой»»");
    }, 6000);
  }
})();
