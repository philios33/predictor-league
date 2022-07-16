
import React, { useEffect } from 'react';
import { getLogin } from '../../lib/util';

export default function Notifications() {
    
    useEffect(() => {
        startup();
        return () => {
            shutdown();
        }
    }, []);

    const check = () => {
        if (!('serviceWorker' in navigator)) {
          throw new Error('No Service Worker support!')
        }
        if (!('PushManager' in window)) {
          throw new Error('No Push API Support!')
        }
    }

    const notificationSubBroadcast = new BroadcastChannel('notificationSub');

    const startup = () => {
        console.log("Starting up notifications component");
        
        notificationSubBroadcast.onmessage = async (event) => {
            console.log("Received notification sub broadcast message");
            try {
                const sub = JSON.parse(event.data);
                await subscribeRegistration(sub);
                alert("This device will now receive your predictor notifications");
            } catch(e) {
                console.error(e);
                alert(e.message);
            }
        }
    }

    const shutdown = () => {
        console.log("Shutting down notifications component");
        notificationSubBroadcast.close();
    }

    const unregisterServiceWorker = async () => {
        const swRegistration = await navigator.serviceWorker.register('/service.js');
        await swRegistration.unregister();
        alert("Unregistered");
    }

    const registerServiceWorker = async () => {
        const swRegistration = await navigator.serviceWorker.register('/service.js');
        return swRegistration;
    }
    const requestNotificationPermission = async () => {
        const permission = await window.Notification.requestPermission();
        // value of permission can be 'granted', 'default', 'denied'
        // granted: user has accepted the request
        // default: user has dismissed the notification permission popup by clicking on x
        // denied: user has denied the request.
        if (permission !== 'granted') {
            throw new Error('Permission not granted for Notification');
        }
    }

    const subscribeRegistration = async (subscription: any) => {
        console.log("Subscriping sub reg", subscription);
        const SERVER_URL = '/subscribe';
        const login = getLogin();
        if (login === null) {
            throw new Error("Not logged in");
        }
        const response = await fetch(SERVER_URL, {
            method: 'post',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': login.token,
            },
            body: JSON.stringify(subscription),
        });
        if (response.status !== 200) {
            throw new Error("Non 200 status when trying to subscribe: " + response.status);
        }
        
    }

    const setup = async () => {
        try {
            check();
            await registerServiceWorker();
            await requestNotificationPermission();
        } catch(e) {
            alert(e.message);
        }
    }

    const reset = async () => {
        try {
            check();
            await unregisterServiceWorker();
        } catch(e) {
            alert(e.message);
        }
    }

    return (
        <div className="notifications">
            <h2>Notifications</h2>
            <button id="permission-btn" onClick={() => setup()}>Setup on this device</button>
            <br/>
            <br/>
            { /*<button onClick={() => reset()}>Reset SW</button>*/ }
        </div>
    );
}