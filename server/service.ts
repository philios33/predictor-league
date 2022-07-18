declare var self: ServiceWorkerGlobalScope;

import ServiceWorkerStorage from 'serviceworker-storage';

const logMessage = async (message: string) => {
    const username = await getLoginUsername();
    const req = new Request('/serviceWorkerLog', {
        method: 'POST',
        body: JSON.stringify(
            {
                message,
                username,
                buildAt: "%%BUILDTIME%%"
            }
        ),
        headers: {
            'Content-Type': 'application/json'
        }
    });
    const response = await self.fetch(req);
    if (response.status !== 200) {
        // alert("Non 200 when logging back: " + response.status);
        console.error(response.status);
        console.error(response.body);
    } else {
        console.log("Logged: " + message);
    }
}


const storage = new ServiceWorkerStorage('sw:storage', 1);

self.addEventListener('message', (event) => {
    console.log("SW received action: " + event.data.action);

    if (event.data.action === 'LOGIN_TOKEN') {
        event.waitUntil(handleLogin(event.data.login));

    } else if (event.data.action === 'CREATE_PUSH_SUB') {
        event.waitUntil(subscribeToPush());

    } else if (event.data.action === 'REQUEST_CURRENT_SUB') {
        event.waitUntil(handleRequestCurrentSub(event));

    } else if (event.data.action === 'REMOVE_PUSH_SUB') {
        event.waitUntil(handleRemovePushSub());
        
    } else {
        event.waitUntil(logMessage("Unknown data.action: " + event.data.action));
    }
});

const handleRequestCurrentSub = async (event: ExtendableMessageEvent) => {
    if (event.source) {
        const currentSubscription = await self.registration.pushManager.getSubscription();
        const msg = {
            action: "CURRENT_SUB",
            subscription: JSON.parse(JSON.stringify(currentSubscription)),
        };
        event.source.postMessage(msg, []);
    }
}

const alertMessageToActive = async (message: string) => {
    self.clients.matchAll({
        includeUncontrolled: false,
        type: 'window',
    }).then((clients) => {
        for (const client of clients) {
            client.postMessage({
                action: "ALERT_MESSAGE",
                message: message,
            });
        }
    });
}

const handleLogin = async (login: any) => {
    try {
        await storage.setItem('login', JSON.stringify(login));
        await logMessage("Stored login: " + login.username);

        /*
        const currentSubscription = await self.registration.pushManager.getSubscription();
        if (currentSubscription !== null) {
            await echoBackPushSubscription(currentSubscription);
            
        } else {
            throw new Error("Could not fetch the push subscription from pushManager");
        }
        */
    } catch(e) {
        console.error(e);
        alertMessageToActive("Service worker error. Check the console.");
    }
}

const getLoginToken = async () => {
    const login = await storage.getItem('login');
    if (typeof login === "undefined" || login === null) {
        throw new Error("The login is unknown");
    }
    try {
        const data = JSON.parse(login);
        return data.token;
    } catch(e) {
        return null;
    }
}

const getLoginUsername = async () => {
    const login = await storage.getItem('login');
    if (typeof login === "undefined" || login === null) {
        return null;
    }
    try {
        const data = JSON.parse(login);
        return data.username;
    } catch(e) {
        return null;
    }
}

const echoBackPushSubscription = async (sub: PushSubscription | null) => {
    const token = await getLoginToken();
    const req = new Request('/subscribe', {
        method: 'POST',
        body: JSON.stringify({
            subscription: sub
        }),
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token,
        }
    });
    const response = await self.fetch(req);
    if (response.status !== 200) {
        // alert("Non 200 when subscribing back: " + response.status);
        console.error(response.status);
        console.error(response.body);
        throw new Error("Non 200 response when posting back");
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
    event.waitUntil(
        logMessage("Activate event")
    );
});

const subscribeToPush = async () => {
    // This will be called only once when the service worker is installed for first time.
    try {
        await logMessage("Subscribing...");
        const applicationServerKey = urlB64ToUint8Array(
            '%%VAPID%%'
        );
        const options = { applicationServerKey, userVisibleOnly: true }
        const subscription = await self.registration.pushManager.subscribe(options);

        // This will only run once a login token exists anyway, so we should always be able to store the subscription
        await echoBackPushSubscription(subscription);
        alertMessageToActive("Success: You will now receive push notifications on this device.")

    } catch (err) {
        console.error('Error', err);
        // alert(err.message); // Cannot alert within service worker
        alertMessageToActive("Failed: " + err.message);
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


const handleRemovePushSub = async () => {
    const currentSubscription = await self.registration.pushManager.getSubscription();
    if (currentSubscription !== null) {
        await currentSubscription.unsubscribe();
    }
    await echoBackPushSubscription(null);

    // And also tell the origin of the successful removal
    alertMessageToActive("OK: You will no longer receive push notifications.")
}

// This is apparently important to get it to update the subscription



const handlePushSubChange = async () => {
    await logMessage("Handling push sub change event...");
    const currentSubscription = await self.registration.pushManager.getSubscription();
    if (currentSubscription !== null) {
        await echoBackPushSubscription(currentSubscription);
    }
}

self.addEventListener('pushsubscriptionchange', (event: any) => {
    event.waitUntil(handlePushSubChange());
});
