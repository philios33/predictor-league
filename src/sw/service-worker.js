self.addEventListener('install', function() {
    console.log('SW Install!');
});
self.addEventListener("activate", event => {
    console.log('SW Activate!');
});
self.addEventListener('fetch', function(event) {
    console.log('SW Fetch!', event.request);
});
self.addEventListener('push', function(event) {
    console.log('SW Push', event);
    alert("Push message");
    /*
    const payload = event.data ? event.data.text() : 'no payload';
    event.waitUntil(
      self.registration.showNotification('ServiceWorker Cookbook', {
          body: payload,
      })
    );
    */
  });
