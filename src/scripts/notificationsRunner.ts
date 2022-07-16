/**
 This is the script that creates unique notifications, updates the notifications tab in the spreadsheet and processes the notifications.
*/

// Please run the compiled script
// Run: npm run buildServer
// node ./serverDist/notificationsRunner

import getGoogleAuth from "../lib/googleAuthFactory";
import Notifications from "../lib/notifications";

// const spreadsheetId2021 = "1LH94Sk4LcDQe4DfiFNcmfZ-dNG9Wzuqh-4dWp69UEW8";
const spreadsheetId = "1Tilu5utIZBXXBL2t_cikdO_NsrfbMAQ1zBx5zws9JQA";

const gauth = getGoogleAuth();

const n = new Notifications(gauth, spreadsheetId);
n.startup();

