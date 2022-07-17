declare var self: ServiceWorkerGlobalScope;

import ServiceWorkerStorage from 'serviceworker-storage';

const logMessage = async (message: string) => {
    const req = new Request('https://predictor.30yardsniper.co.uk/serviceWorkerLog', {
        method: 'POST',
        body: JSON.stringify(
            {message}
        )
    });
    const response = await self.fetch(req);
    if (response.status !== 200) {
        alert("Non 200 when logging back: " + response.status);
        console.error(response.status);
        console.error(response.body);
    } else {
        console.log("Logged: " + message);
    }
}


const storage = new ServiceWorkerStorage('sw:storage', 1);

self.addEventListener('message', (event) => {
    if (event.data.action === 'LOGIN_TOKEN') {
        event.waitUntil(handleLoginToken(event.data.loginToken));
    } else {
        event.waitUntil(logMessage("Unknown data.action: " + event.data.action));
    }
});

const handleLoginToken = async (token: string) => {
    await storage.setItem('loginToken', token);
    await logMessage("Stored login token: " + token);

    const currentSubscription = await self.registration.pushManager.getSubscription();
    if (currentSubscription !== null) {
        await echoBackPushSubscription(currentSubscription);
    }
}

const echoBackPushSubscription = async (sub: PushSubscription) => {
    const token = await storage.getItem('loginToken');
    if (token === null) {
        throw new Error("The login token is unknown, the subscription cannot be echoed back");
    }
    const req = new Request('https://predictor.30yardsniper.co.uk/subscribe', {
        method: 'POST',
        body: JSON.stringify(
            sub
        ),
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token,
        }
    });
    const response = await self.fetch(req);
    if (response.status !== 200) {
        alert("Non 200 when subscribing back: " + response.status);
        console.error(response.status);
        console.error(response.body);
    }
}

// urlB64ToUint8Array is a magic function that will encode the base64 public key
// to Array buffer which is needed by the subscription option
const urlB64ToUint8Array = (base64String : string) => {
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
    event.waitUntil(
        logMessage("Install event")
    );
    
});

// const notificationSubBroadcast = new BroadcastChannel('notificationSub');

self.addEventListener('activate', async (event) => {
    event.waitUntil(subscribeToPush());
});

const subscribeToPush = async () => {
    // This will be called only once when the service worker is installed for first time.
    try {
        await logMessage("Activate event");
        const applicationServerKey = urlB64ToUint8Array(
            '%%VAPID%%'
        );
        const options = { applicationServerKey, userVisibleOnly: true }
        const subscription = await self.registration.pushManager.subscribe(options);

        // Broadcast the subscription so the page can ajax it back
        // notificationSubBroadcast.postMessage(JSON.stringify(subscription));
        // We cannot do this since the browser may not be available, we must post the subscription from here using the token
        await echoBackPushSubscription(subscription);

    } catch (err) {
        console.error('Error', err);
        // alert(err.message); // Cannot alert within service worker
    }
};

self.addEventListener('push', function(event) {
    if (event.data) {
        const eventData = JSON.parse(event.data.text());
        // console.log("PUSH EVENT", eventData);
        showLocalNotification(eventData, self.registration);
    } else {
        console.log('Push event but no data');
    }
});

const showLocalNotification = (data: any, swRegistration: ServiceWorkerRegistration) => {
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

const openNotificationURL = (e: NotificationEvent, url: string) => {
    // Close the notification popout
    e.notification.close();
    // Get all the Window clients
    e.waitUntil(self.clients.matchAll({ type: 'window' }).then(clientsArr => {
        // If a Window tab matching the targeted URL already exists, focus that;
        const hadWindowToFocus = clientsArr.some(windowClient => windowClient.url === url ? (windowClient.focus(), true) : false);
        // Otherwise, open a new tab to the applicable URL and focus it.
        if (!hadWindowToFocus) self.clients.openWindow(url).then(windowClient => windowClient ? windowClient.focus() : null);
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
