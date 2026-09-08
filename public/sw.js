const CACHE = "saluva-pos-v1";
const BASICOS = [
  "/",
  "/caja",
  "/manifest.webmanifest",
  "/favicon.ico",
  "/icon-192.png",
  "/icon-512.png",
];

async function guardarShell() {
  const cache = await caches.open(CACHE);
  const resultados = await Promise.allSettled(
    BASICOS.map(async (url) => {
      const respuesta = await fetch(url, { cache: "reload" });
      if (respuesta.ok) await cache.put(url, respuesta.clone());
      return respuesta;
    }),
  );

  const inicio = resultados[0];
  if (inicio.status !== "fulfilled" || !inicio.value.ok) return;
  const html = await inicio.value.text();
  const recursos = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
    .map((coincidencia) => coincidencia[1])
    .filter((url) => url.startsWith("/") && !url.startsWith("//"));

  await Promise.allSettled(
    [...new Set(recursos)].map(async (url) => {
      const respuesta = await fetch(url, { cache: "reload" });
      if (respuesta.ok) await cache.put(url, respuesta);
    }),
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(guardarShell().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((nombres) =>
        Promise.all(
          nombres.filter((nombre) => nombre !== CACHE).map((nombre) => caches.delete(nombre)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const peticion = event.request;
  const url = new URL(peticion.url);
  if (
    peticion.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/__server")
  ) {
    return;
  }

  if (peticion.mode === "navigate") {
    event.respondWith(
      fetch(peticion)
        .then(async (respuesta) => {
          if (respuesta.ok) (await caches.open(CACHE)).put(peticion, respuesta.clone());
          return respuesta;
        })
        .catch(
          async () =>
            (await caches.match(peticion)) ?? (await caches.match("/caja")) ?? caches.match("/"),
        ),
    );
    return;
  }

  event.respondWith(
    caches.match(peticion).then(
      (guardada) =>
        guardada ??
        fetch(peticion).then(async (respuesta) => {
          if (respuesta.ok) (await caches.open(CACHE)).put(peticion, respuesta.clone());
          return respuesta;
        }),
    ),
  );
});
