import { registerSW } from 'virtual:pwa-register';

export const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('New version available. Reload?')) {
      updateSW(true);
    }
  },
});

export async function syncOfflineQueue() {
  const { getOfflineQueue, clearOfflineQueue } = await import('@/lib/idb');
  const queue = await getOfflineQueue();
  if (!queue.length) return;
  await clearOfflineQueue();
}

if ('serviceWorker' in navigator) {
  window.addEventListener('online', () => {
    void syncOfflineQueue();
  });
}
