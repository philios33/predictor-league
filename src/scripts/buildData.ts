
import fs from 'fs';
import GoogleAuth from '../lib/googleAuth';
import { getPlayerNames } from '../lib/players';
import { getMatchSchedule, getMatchScores } from '../lib/predictor/matches';

// Writes a build.json file containing the time of the last build
const buildTime = new Date();
fs.writeFileSync(__dirname + "/../compiled/build.json", JSON.stringify({
    buildTime: buildTime.toISOString(),
}));

const credentialsFile = __dirname + "/../../keys/credentials.json";
const gauth = new GoogleAuth(credentialsFile);

// Write the standings for each week that has had results for all players.
const players = getPlayerNames();


(async () => {
    console.log("Logging in... buildData.ts");
    await gauth.start();
    console.log("Logged in!");

    const schedule = await getMatchSchedule(gauth);
    fs.writeFileSync(__dirname + "/../compiled/schedule.json", JSON.stringify(schedule, null, 4));

    const scores = await getMatchScores(gauth);
    fs.writeFileSync(__dirname + "/../compiled/scores.json", JSON.stringify(scores, null, 4));

    console.log("Finished building data");
})();

