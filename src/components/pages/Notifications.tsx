
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

 
    const startup = () => {
        console.log("Starting up notifications component");
    }

    const shutdown = () => {
        console.log("Shutting down notifications component");
        // notificationSubBroadcast.close();
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

    const setup = async () => {
        try {
            const login = getLogin();
            if (login === null) {
                throw new Error("Not logged in");
            }
            check();

            // Do this first so that the server worker is only installed and activated for the first time once permissions are accepted.
            console.log("Getting notifications permission");
            await requestNotificationPermission(); 
            console.log("Done");
            
            console.log("Registering service worker");
            const serviceWorkerRegistration = await registerServiceWorker();
            console.log("Done");

            navigator.serviceWorker.onmessage = (event: any) => {
                // console.log("MSG calledback from SW", event);
                if (event.data && event.data.action === "ALERT_MESSAGE") {
                    alert(event.data.message);
                }
            };

            // Post message to all service workers at all states since this is an idempotent issue
            serviceWorkerRegistration.installing?.postMessage({
                action: 'LOGIN_TOKEN',
                login: login,
            });
            serviceWorkerRegistration.waiting?.postMessage({
                action: 'LOGIN_TOKEN',
                login: login,
            });
            serviceWorkerRegistration.active?.postMessage({
                action: 'LOGIN_TOKEN',
                login: login,
            });
            

            // Also wait for the first one to become ready and post the token
            navigator.serviceWorker.ready.then( registration => {
                console.log("Posted the login token");
                registration.active?.postMessage({
                    action: 'LOGIN_TOKEN',
                    login: login,
                });
            });            
            
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