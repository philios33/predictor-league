
import React, { useEffect, useState } from 'react';
import objecthash from 'object-hash';
import { getLogin } from '../../lib/util';
import axios from 'axios';
import { config } from '../../config';

export default function Notifications() {
    
    const [swSubscriptionHash, setSwSubscriptionHash] = useState("");
    const [predictorSubscriptionHash, setPredictorSubscriptionHash] = useState("");

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

 
    const startup = async () => {
        console.log("Starting up notifications component");

        // Request the subscription from SW
        if (navigator.serviceWorker && navigator.serviceWorker.controller) {

            navigator.serviceWorker.onmessage = (event: any) => {
                if (event.data && event.data.action === "CURRENT_SUB") {
                    if (event.data.subscription === null) {
                        setSwSubscriptionHash("No push subscription");
                    } else {
                        setSwSubscriptionHash("SUB-" + objecthash(event.data.subscription));
                    }
                } else if (event.data && event.data.action === "ALERT_MESSAGE") {
                    alert(event.data.message);
                }
            };

            await refreshSWSub();
            
        } else {
            setSwSubscriptionHash("Service worker is not installed yet, refresh the page and try again");
        }


        // Fetch the current known predictor subscription
        const login = getLogin();
        if (login === null) {
            setPredictorSubscriptionHash("Not logged in");
        } else {
            refreshPredictorSub(login);
        }
    }

    const refreshSWSub = async () => {
        if (navigator.serviceWorker && navigator.serviceWorker.controller) {
            setSwSubscriptionHash("Loading...");
            navigator.serviceWorker.controller.postMessage({
                action: "REQUEST_CURRENT_SUB"
            });
        } else {
            alert("No Service worker");
        }
    }

    const removeSubscription = async () => {
        if (navigator.serviceWorker && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
                action: "REMOVE_PUSH_SUB"
            });
        } else {
            alert("No Service worker");
        }
    }

    const refreshPredictorSub = async (login: any) => {
        if (login !== null) {
            setPredictorSubscriptionHash("Loading...");
            const result = await axios({
                headers: {
                    authorization: login.token,
                },
                url: config.serviceEndpoint + 'subscription',
                timeout: 5000,
                validateStatus: () => true,
            });
            if (result.status === 200) {
                const sub = result.data.subscription;
                if (sub === null) {
                    setPredictorSubscriptionHash("No push subscription");
                } else {
                    setPredictorSubscriptionHash("SUB-" + objecthash(sub));
                }
            } else {
                setPredictorSubscriptionHash("Non 200 from service: " + result.status + ", " + result.data.error);
            }
        } else {
            alert("No login");
        }
    }

    const shutdown = () => {
        console.log("Shutting down notifications component");
        // notificationSubBroadcast.close();
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

    const login = getLogin();

    const setup = async () => {
        try {        
            if (login === null) {
                throw new Error("Not logged in");
            }
            check();

            await requestNotificationPermission(); 
            
            if (navigator.serviceWorker && navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({
                    action: 'CREATE_PUSH_SUB',
                });
            } else {
                throw new Error("No service worker installed, please refresh and try again");
            }
        } catch(e) {
            alert(e.message);
        }
    }

    

    return (
        <div className="notifications">
            <h2>Push Notifications</h2>
            
            <h3>Current SW subscription</h3>
            <p>
                { swSubscriptionHash }
            </p>
            <button onClick={() => refreshSWSub()}>Refresh</button>
            <br /><br />

            <h3>Current saved subscription</h3>
            <p>
                { predictorSubscriptionHash }
            </p>
            <button onClick={() => refreshPredictorSub(login)}>Refresh</button>
            <br /><br />

            <button id="permission-btn" onClick={() => setup()}>Create Push Subscription (on this device)</button>
            <br/>
            <br/>
            <button onClick={() => removeSubscription()}>Remove Push Subscription</button>
        </div>
    );
}