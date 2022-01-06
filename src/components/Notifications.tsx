import React, { useEffect, useState } from 'react';
import './Notifications.scss';

type Props = {
}

function Notifications(props: Props) {    

    const makeANotification = () => {
        console.log("Trying to makeANotification...");

        Notification.requestPermission().then((result) => {
            if (result === 'granted') {
                const notifTitle = "Title";
                const notifBody = "This is the body";
                // const notifImg = `data/img/${games[randomItem].slug}.jpg`;
                const options = {
                    body: notifBody,
                    // icon: notifImg,
                };
                new Notification(notifTitle, options);
            } else {
                console.log("Failed, result is", result);
            }
        });
        
    }

    return (
        <div className="notifications">
            <button onClick={() => makeANotification()}>Do a push notification</button>
        </div>
    );
}

export default Notifications;