/* Хоёулаа Болзий — Service Worker */
const CACHE = 'bolzii-v165';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;

  if (req.method !== 'GET') return;

  // Хуудас руу шилжихэд: сүлжээ эхэлж, амжихгүй бол кэш
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).catch(() =>
        caches.match('./index.html').then(r => r || caches.match('./'))
      )
    );
    return;
  }

  // Бусад: кэш эхэлж, байхгүй бол сүлжээ
  e.respondWith(
    caches.match(req).then(cached =>
      cached || fetch(req).then(resp => {
        try {
          if (
            resp &&
            resp.ok &&
            new URL(req.url).origin === location.origin
          ) {
            const copy = resp.clone();
            caches.open(CACHE).then(c => c.put(req, copy));
          }
        } catch (_) {}

        return resp;
      }).catch(() => cached)
    )
  );
});

/* Мэдэгдэл дээр дарвал аппыг нээх/идэвхжүүлэх */
self.addEventListener('notificationclick', e => {
  e.notification.close();

  e.waitUntil(
    self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(list => {
      for (const c of list) {
        if ('focus' in c) return c.focus();
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow('./');
      }
    })
  );
});

/* Web Push */
self.addEventListener('push', e => {
  let data = {
    title: 'Хоёулаа Болзий',
    body: 'Шинэ мэдэгдэл'
  };

  try {
    if (e.data) {
      data = Object.assign(data, e.data.json());
    }
  } catch (_) {}

  // CHAT notification дээр мессежийн агуулгыг нуух
  const isChat =
    data.type === 'chat' ||
    data.kind === 'chat' ||
    data.notification_type === 'chat' ||
    /чат|зурвас|message/i.test(String(data.title || ''));

  const title = isChat
    ? '💬 Шинэ чат'
    : data.title;

  const body = isChat
    ? 'Танд 1 шинэ чат ирлээ'
    : data.body;

  e.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: './icon-192.png',
      badge: './icon-192.png',
      tag: isChat
        ? 'bolzii-chat'
        : (data.tag || 'bolzii'),
      renotify: true,
      vibrate: [90, 40, 90],
      data: {
        ...data,
        type: isChat
          ? 'chat'
          : (data.type || 'general')
      }
    })
  );
});
