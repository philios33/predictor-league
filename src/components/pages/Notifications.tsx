
import React, { useEffect, useState } from 'react';
import objecthash from 'object-hash';
import { getLogin } from '../../lib/util';
import axios from 'axios';
import { config } from '../../config';

export default function Notifications() {
    
    const [swSubscriptionHash, setSwSubscriptionHash] = useState("");
    const [predictorSubscriptionHash, setPredictorSubscriptionHash] = useState("");

    const login = getLogin();

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
                    refreshSWSub();
                    refreshPredictorSub();
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
            refreshPredictorSub();
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

    const refreshPredictorSub = async () => {
        if (login !== null) {
            setPredictorSubscriptionHash("Loading...");
            const result = await axios({
                headers: {
                    authorization: login.token,
                },
                url: config.serviceEndpoint + 'service/subscription',
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

    const testNotification = async () => {
        try {
            if (login === null) {
                throw new Error("Not logged in");
            }
            const result = await axios({
                method: "POST",
                headers: {
                    authorization: login.token,
                },
                url: config.serviceEndpoint + 'service/sendTestNofication',
                timeout: 5000,
                validateStatus: () => true,
            });
            if (result.status === 200) {
                alert("Test notification sent");
            } else {
                console.error(result.data);
                throw new Error("Non 200 response from service, see console");
            }
        } catch(e) {            
            alert("Error: " + e.message);
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
            
            <p>
                You may setup one device to receive reminder push notifications to.  Only the latest subscription device will be used.
                <button onClick={() => setup()}>Register this device</button>
            </p>
            
            <p>
                Current service worker subscription ID: <strong>{ swSubscriptionHash }</strong>
                <button onClick={() => refreshSWSub()}>Refresh</button>
            </p>

            <p>
                Current saved subscription ID: <strong>{ predictorSubscriptionHash }</strong>
                <button onClick={() => refreshPredictorSub()}>Refresh</button>
            </p>

            <p>    
                <button onClick={() => testNotification()}>Test Notification</button>
            </p>
            
            <p>    
                <button onClick={() => removeSubscription()}>Remove Push Subscription</button>
            </p>
            
        </div>
    );
}