// This is the file that launches a redeploy check process

// AUTO DEPLOY: If the nextDeploy timestamp is in the past, write the redeploy value in the spreadsheet
// TRIGGERED DEPLOY: If the value in the spreadsheet is different from the value in signals/redeploy.txt, update the file and return exit code 5

import { getCachedResults } from '../src/lib/predictor/cachedResults';
import GoogleAuth from '../src/lib/googleAuth';
import { getRedeployValue, setRedeployValue } from '../src/lib/predictor/redeploy';
import fs from 'fs';

const credentialsFile = __dirname + "/../keys/credentials.json";
const gauth = new GoogleAuth(credentialsFile);

(async () => {

    console.log("Logging in...");
    await gauth.start();
    console.log("Logged in!");

    // Auto redeploy?
    const cachedResults = getCachedResults();
    const nextRedeploy = new Date(cachedResults.nextRedeploy);
    const now = new Date();
    if (nextRedeploy < now) {
        // Trigger it now
        await setRedeployValue(gauth, "Auto redeploy due to kickoff at " + nextRedeploy.toISOString());
    }

    // Triggered redeploy?
    // Also check whether the signal file value is different
    const signalFile = __dirname + "/../signals/redeploy.txt";
    const signalFileValue = fs.readFileSync(signalFile).toString();
    const spreadsheetValue = await getRedeployValue(gauth);

    console.log("Signal file value: " + signalFileValue);
    console.log("Spreadsheet value: " + spreadsheetValue);
    
    if (signalFileValue !== spreadsheetValue) {
        // Write the file
        fs.writeFileSync(signalFile, spreadsheetValue);
        console.log("Triggering redeploy with exit code 5...");
        process.exit(5);
    } else {
        console.log("No redeploy is necessary");
    }

})();

