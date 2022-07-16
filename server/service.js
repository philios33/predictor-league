
// urlB64ToUint8Array is a magic function that will encode the base64 public key
// to Array buffer which is needed by the subscription option
const urlB64ToUint8Array = base64String => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

self.addEventListener('install', function(event) {
    self.skipWaiting();
});

const notificationSubBroadcast = new BroadcastChannel('notificationSub');

self.addEventListener('activate', async () => {
    // This will be called only once when the service worker is installed for first time.
    try {
        const applicationServerKey = urlB64ToUint8Array(
            '%%VAPID%%'
        );
        const options = { applicationServerKey, userVisibleOnly: true }
        const subscription = await self.registration.pushManager.subscribe(options);

        // Broadcast the subscription so the page can ajax it back
        notificationSubBroadcast.postMessage(JSON.stringify(subscription));

    } catch (err) {
        console.error('Error', err);
        // alert(err.message); // Cannot alert within service worker
    }
});

self.addEventListener('push', function(event) {
    if (event.data) {
        const eventData = JSON.parse(event.data.text());
        // console.log("PUSH EVENT", eventData);
        showLocalNotification(eventData, self.registration);
    } else {
        console.log('Push event but no data');
    }
});

const showLocalNotification = (data, swRegistration) => {
    const options = {
        body: data.body,
        icon: data.icon,
        image: data.image,
        data: {
            url: data.url,
        },
        requireInteraction: true,
        actions: data.actions,
    };
    swRegistration.showNotification(data.title, options);
}

const openNotificationURL = (e, url) => {
    // Close the notification popout
    e.notification.close();
    // Get all the Window clients
    e.waitUntil(clients.matchAll({ type: 'window' }).then(clientsArr => {
        // If a Window tab matching the targeted URL already exists, focus that;
        const hadWindowToFocus = clientsArr.some(windowClient => windowClient.url === url ? (windowClient.focus(), true) : false);
        // Otherwise, open a new tab to the applicable URL and focus it.
        if (!hadWindowToFocus) clients.openWindow(url).then(windowClient => windowClient ? windowClient.focus() : null);
    }));
}

self.addEventListener('notificationclick', function(event) {
    switch (event.action) {
        case 'open_url':
            openNotificationURL(event, event.notification.data.url);
            break;
        // case 'any_other_action':
        //    clients.openWindow("https://www.example.com");
        //    break;
    }
}, false);
