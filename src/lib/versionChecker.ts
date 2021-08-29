
let interval: null | number;

export function startVersionChecking(refreshRequiredCallback: Function) {
    interval = window.setInterval(() => {
        doVersionCheck(refreshRequiredCallback);
    }, 60 * 1000);
}

export function stopVersionChecking() {
    if (interval !== null) {
        window.clearInterval(interval);
        interval = null;
    }
}

import axios from 'axios';
import buildDetails from '../compiled/build.json';

async function doVersionCheck(refreshRequiredCallback: Function) : Promise<void> {
    // Call ajax service /version and check if different from buildDetails  
    try {
        // console.log("Making version request...");
        const result = await axios({
            url: "/version",
            timeout: 5 * 1000,
            validateStatus: () => true,
        });
        if (result.status === 200) {
            // Make the callback if the data is different
            if (buildDetails.buildTime === result.data.buildTime) {
                // console.log("Same build time");
            } else {
                // console.log("Different build time");
                refreshRequiredCallback();
            }
        } else {
            // console.warn("Bad status response: " + result.status);
        }
    } catch(e) {
        // Don't really need to know about this warning.  It will try again later anyway.
        // console.warn(e);
    }
}
