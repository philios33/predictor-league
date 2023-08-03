
import React, { useEffect, useState } from 'react';
import objecthash from 'object-hash';
import { getLogin } from '../lib/util';
import axios from 'axios';
import { config } from '../config';

type PushStatus = "CHECKING" | "UNAVAILABLE" | "ENABLED_THIS" | "ENABLED_OTHER" | "DISABLED"

import './Notifications.scss';

export default function Notifications() {
    
    const [swSubscriptionHash, setSwSubscriptionHash] = useState("");
    const [predictorSubscriptionHash, setPredictorSubscriptionHash] = useState("");


    const [currentStatus, setCurrentStatus] = useState("CHECKING" as PushStatus);
    const [statusMessage, setStatusMessage] = useState("Checking...");

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
        if (!('Notification' in window)) {
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
            setCurrentStatus("UNAVAILABLE");
            setStatusMessage("Service worker is not installed yet, refresh the page and try again");
        }

        if (login === null) {
            setPredictorSubscriptionHash("Not logged in");
            setCurrentStatus("UNAVAILABLE");
            setStatusMessage("Not logged in");
        } else {
            refreshPredictorSub();
        }
    }

    const subRE = new RegExp("^SUB");
    useEffect(() => {
        if (swSubscriptionHash === "Loading..." || predictorSubscriptionHash === "Loading..." ) {
            return
        }
        if (swSubscriptionHash.match(subRE)) {
            if (predictorSubscriptionHash.match(subRE)) {
                // Both installed
                if (swSubscriptionHash === predictorSubscriptionHash) {
                    // Same
                    setCurrentStatus("ENABLED_THIS");
                } else {
                    // Other
                    setCurrentStatus("ENABLED_OTHER");
                }
            } else {
                // Strange scenario, not submitted back yet
                setCurrentStatus("DISABLED");
            }
        } else {
            if (predictorSubscriptionHash.match(subRE)) {
                setCurrentStatus("ENABLED_OTHER");
            } else {
                setCurrentStatus("DISABLED");
            }
        }

    }, [swSubscriptionHash, predictorSubscriptionHash])

    const refreshSWSub = async () => {
        if (navigator.serviceWorker && navigator.serviceWorker.controller) {
            setSwSubscriptionHash("Loading...");
            navigator.serviceWorker.controller.postMessage({
                action: "REQUEST_CURRENT_SUB"
            });
        } else {
            console.error("No service worker");
            // alert("No Service worker");
        }
    }

    const removeSubscription = async () => {
        if (navigator.serviceWorker && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
                action: "REMOVE_PUSH_SUB"
            });
        } else {
            console.error("No service worker");
            // alert("No Service worker");
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
            console.error("No login");
            // alert("No login");
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
            try {
                check();
            } catch(e) {
                setCurrentStatus("UNAVAILABLE");
                setStatusMessage(e.message);
                return;
            }

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

    const renderStatusText = () => {
        if (currentStatus === "CHECKING") {
            return "Checking...";
        } else if (currentStatus === "UNAVAILABLE") {
            return "Sorry this feature is unavailable on this device";
        } else if (currentStatus === "ENABLED_THIS") {
            return "Enabled on this device";
        } else if (currentStatus === "ENABLED_OTHER") {
            return "Enabled on another device";
        } else if (currentStatus === "DISABLED") {
            return "Disabled";
        }
    }

    if (login === null) {
        return null;
    }

    return (
        <div className="notifications">
            <h3>Push Notifications</h3>
            
            <p>
                Status: {renderStatusText()}
                { currentStatus === "UNAVAILABLE" && (
                    <>
                        <br />
                        <em>{statusMessage}</em>
                    </>
                )}
            </p>

            { currentStatus === "DISABLED" && (
                <p>
                    You may setup one device to receive reminder push notifications to.  Only the latest setup device will be used.
                    <button className="btn" onClick={() => setup()}>Register this device</button>
                </p>
            )}
            { currentStatus === "ENABLED_OTHER" && (
                <p>
                    You can setup this device instead.
                    <button className="btn" onClick={() => setup()}>Register this device</button>
                </p>
            )}
            
            {/*
            <p>
                Current service worker subscription ID: <strong>{ swSubscriptionHash }</strong>
                <button onClick={() => refreshSWSub()}>Refresh</button>
            </p>

            <p>
                Current saved subscription ID: <strong>{ predictorSubscriptionHash }</strong>
                <button onClick={() => refreshPredictorSub()}>Refresh</button>
            </p>
            */}

            { (currentStatus === "ENABLED_THIS" || currentStatus === "ENABLED_OTHER") && (
                <>
                    <p>    
                        <button className="btn" onClick={() => testNotification()}>Test Notification</button>
                    </p>
                    <p>    
                        <button className="btn" onClick={() => removeSubscription()}>Remove Push Subscription</button>
                    </p>
                </>
            )}
        </div>
    );
}