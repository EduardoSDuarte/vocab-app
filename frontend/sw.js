// Aumente esse número (v2, v3...) toda vez que atualizar arquivos do app -
// isso força o navegador a descartar o cache antigo e buscar a versão nova.
const CACHE_NOME = "fichario-v4";
const ARQUIVOS = ["./index.html", "./style.css", "./app.js", "./manifest.json"];

self.addEventListener("install", (e) => {
  self.skipWaiting(); // não espera as abas antigas fecharem pra assumir
  e.waitUntil(caches.open(CACHE_NOME).then((cache) => cache.addAll(ARQUIVOS)));
});

self.addEventListener("activate", (e) => {
  // apaga qualquer cache de versões antigas (fichario-v1, etc)
  e.waitUntil(
    caches.keys().then((nomes) =>
      Promise.all(nomes.filter((n) => n !== CACHE_NOME).map((n) => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  // Chamadas à API sempre vão direto pra rede (nunca do cache)
  if (e.request.url.includes("/palavras") || e.request.url.includes("/login") || e.request.url.includes("/cadastro") || e.request.url.includes("/verificar") || e.request.url.includes("/me")) {
    return;
  }
  e.respondWith(
    caches.match(e.request).then((resposta) => resposta || fetch(e.request))
  );
});
