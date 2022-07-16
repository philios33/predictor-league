// Test reading the users notification subscription

import getGoogleAuth from "../lib/googleAuthFactory";
import { fetchUserNotificationSubscription } from "../lib/subscription";

const gauth = getGoogleAuth();

setTimeout(async () => {
    await gauth.start();
    const sub = await fetchUserNotificationSubscription(gauth, "Phil");
    console.log("Subscription is", sub);
}, 1);
