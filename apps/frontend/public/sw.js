self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) =>
  event.waitUntil(self.clients.claim())
);

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: "Fila Digital", body: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(data.title ?? "Fila Digital", {
      body: data.body ?? "É a sua vez!",
      icon: "/icon.png",
      tag: "queue-call",
      requireInteraction: true,
      data: { url: data.url ?? "/minhas-filas" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/minhas-filas";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) return client.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});
