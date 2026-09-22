// CAIGE - registro PWA
(() => {
  if (!('serviceWorker' in navigator)) return;

  const hostnameLocal = ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);
  if (!window.isSecureContext && !hostnameLocal) {
    console.warn('CAIGE PWA: Service Worker requer HTTPS fora do ambiente local.');
    return;
  }

  window.addEventListener('load', async () => {
    try {
      const registro = await navigator.serviceWorker.register('/service-worker.js', {
        scope: '/',
        updateViaCache: 'none'
      });

      // Procura uma versão nova do Service Worker sem reutilizar cache HTTP antigo.
      registro.update().catch(() => {});
    } catch (erro) {
      console.warn('CAIGE PWA: falha ao registrar Service Worker.', erro);
    }
  });
})();
