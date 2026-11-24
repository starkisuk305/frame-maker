// 운영국 회계 서비스 워커
// 하는 일은 하나: 안드로이드에서 '공유'로 보낸 영수증 사진과 PDF를 받아 영수증 추가 화면에 넘긴다.
// 화면 파일은 저장(캐시)하지 않는다. 그래서 GitHub에 새 index.html을 올리면 바로 새 판이 열린다.
const DB = 'unyeong-share';
const STORE = 'files';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function keep(files) {
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const st = tx.objectStore(STORE);
    st.clear();
    files.forEach((f, i) => st.put({ id: i, name: f.name || `shared-${i}`, type: f.type || '', blob: f }));
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'POST' || !new URL(req.url).pathname.endsWith('/share-target')) return;
  event.respondWith((async () => {
    let n = 0;
    try {
      const form = await req.formData();
      const files = form.getAll('files').filter((f) => f && typeof f !== 'string');
      n = files.length;
      await keep(files);
    } catch (e) { n = 0; }
    return Response.redirect(new URL(`./#/receipt/new?shared=${n}`, self.registration.scope).href, 303);
  })());
});
