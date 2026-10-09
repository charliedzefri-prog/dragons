// Service worker мобильной версии: делает приложение устанавливаемым и даёт запуск без сети (оболочка + ассеты).
// Стратегия: network-first для same-origin GET, при отсутствии сети — последняя закэшированная копия.
// WebSocket-соединения сервис-воркер не перехватывает, поэтому мультиплеер работает как в браузере.
const CACHE = "dml-mobile-v1";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname === "/health") return;

  e.respondWith(
    fetch(req)
      .then(res => {
        // кэшируем только полные успешные ответы (206 для аудио-стриминга не кэшируем)
        if (res.ok && res.status === 200 && res.type === "basic") {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req).then(r => r || new Response("Нет сети", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } })))
  );
});
