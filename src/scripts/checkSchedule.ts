// Designed to run every 3 hours on a cron
// We grab all of the fixtures in the next X days from the BBC
// We get all of the upcoming fixtures due in the next X days from the current cached schedule and compare
// Any matches that we don't have scheduled, we alert Phil since we don't know what week they are in.  This probably requires running scheduleMatches script.
// Any matches that we DO have the game week num for but incorrect time, we should be able to safely update the kickoff time and redeploy.
// Any matches that we have scheduled, but are now postponed or disappeared, we should auto postpone and redeploy.
// Basically it syncs our schedule so it is correct, according to the BBC data.

import { grabPLMatches } from "../lib/bbc";
import { getCachedMatchSchedule } from "../lib/predictor/cached";
import GoogleAuth from "../lib/googleAuth";
import moment from "moment-timezone";
import { writeFixture } from "../lib/writer";
import { sheets } from '@googleapis/sheets';
import fs from 'fs';
import { enqueueNotificationWithoutUniquenessCheck } from "../lib/notificationEnqueue";
import getFixturesResults from "./bbcApi";

const SheetsApi = sheets('v4');

// Note: This script uses the cached match schedule, so make sure the cache is built with...
// Run: npm run buildData
// Run: npx ts-node ./src/scripts/checkSchedule.ts

const schedule = getCachedMatchSchedule();

const inToTheFuture = 10;
const dryRun = false;

const now = new Date();

let datesInFuture = [];
for (let currentDayOffset = 1; currentDayOffset <= inToTheFuture; currentDayOffset++) {
    const thisDay = moment(now).add(currentDayOffset, "days");
    datesInFuture.push(thisDay.format("YYYY-MM-DD"));
}
datesInFuture.sort();
datesInFuture = [...new Set(datesInFuture)];

// console.log("Future dates", datesInFuture);

const credentialsFile1 = __dirname + "/../../keys/credentials.json";
const credentialsFile2 = __dirname + "/../keys/credentials.json";
let gauth: null | GoogleAuth = null;
if (fs.existsSync(credentialsFile1)) {
    gauth = new GoogleAuth(credentialsFile1);
} else if (fs.existsSync(credentialsFile2)) {
    gauth = new GoogleAuth(credentialsFile2);
} else {
    throw new Error("Couldnt find the credentials file in any of the valid locations");
}

// const spreadsheetId2021 = "1LH94Sk4LcDQe4DfiFNcmfZ-dNG9Wzuqh-4dWp69UEW8";
// const spreadsheetId2022 = "1Tilu5utIZBXXBL2t_cikdO_NsrfbMAQ1zBx5zws9JQA";
// const spreadsheetId2023 = "13z-8qvEYNwKUMC8nMVXN4wanSzcZT-e5oKQ3FjB8PSA";
const spreadsheetId = "1qInfh-sCxBbSMjBAxVdUZqkQ_Iz3DnsNe0IEo4Nhq74";

let updatesMade = 0;
let errorsFound = 0;

const writeCell = async (gauth: GoogleAuth, range: string, value: string) => {
    const auth = gauth.jwtClient;
    const result = await SheetsApi.spreadsheets.values.update({
        auth: auth,
        spreadsheetId,
        range: range,
        valueInputOption: 'RAW',
        requestBody: {
            values: [[value]]
        }
    });
    if (result.status === 200) {
        if (result.data.updatedCells !== 1) {
            console.error("Result data dump", result.data);
            throw new Error("Did not update 1 cell: " + result.data.updatedCells);
        }
        // OK
    } else {
        console.error(result);
        throw new Error("Result status was not 200");
    }
}

const triggerRebuild = async (message: string) => {
    const range = 'Schedule!B25';
    if (gauth !== null) {
        await writeCell(gauth, range, message);
    } else {
        throw new Error("GAuth is null");
    }
}

(async () => {

    try {
        console.log("Running at " + new Date());
        console.log("Logging in...");
        await gauth.start();
        console.log("Logged in!");
        
        

        for(const todaysDate of datesInFuture) {
            const startTime = moment(todaysDate).startOf("day");
            const endTime = moment(todaysDate).endOf("day");
            
            console.log("Doing todaysDate", todaysDate, startTime, endTime);

            const matchesToday = [];
            for (const homeTeam in schedule.matches) {
                for (const awayTeam in schedule.matches[homeTeam].against) {
                    const match = schedule.matches[homeTeam].against[awayTeam];
                    const kickOff = new Date(match.kickOff);
                    if (startTime.isBefore(kickOff) && endTime.isAfter(kickOff)) {
                        // Kick off is on this day
                        matchesToday.push({homeTeam, awayTeam, match});
                    }
                }
            }
            console.log("Matches we have today", todaysDate, matchesToday);

            // const bbcMatches = await grabPLMatches([todaysDate]);

            const fixtures = await getFixturesResults(moment(new Date(todaysDate)), 'PreEvent');

            console.log("Found fixtures today", fixtures);

            console.log("Now looping BBC matches for today: " + todaysDate);

            for (const bbcMatch of fixtures) {
                // Make sure this bbc match appears in our schedule
                console.log("BBC on " + todaysDate + " : " + bbcMatch.homeTeam + " vs " + bbcMatch.awayTeam);
                
                if (bbcMatch.homeTeam in schedule.matches) {
                    if (bbcMatch.awayTeam in schedule.matches[bbcMatch.homeTeam].against) {
                        const foundMatch = schedule.matches[bbcMatch.homeTeam].against[bbcMatch.awayTeam];
                        if (bbcMatch.statusComment.toLowerCase() === "postponed") {
                            // The kickoff time must be a special value if the match is postponed
                            if (foundMatch.kickOff === "2025-06-06T14:55:00.000Z") {
                                // Yes this match is still postponed
                                console.log("This match is still postponed");
                            } else {
                                console.log("Problem: The match is postponed, but we have it scheduled, postponing...");
                                await writeFixture(dryRun, gauth, bbcMatch.homeTeam, bbcMatch.awayTeam, foundMatch.weekId, "6/6@15:55");
                                updatesMade++;
                            }
                        } else {
                            console.log("The event status is: " + bbcMatch.statusComment.toLowerCase());
                            const ukKickOff = moment(foundMatch.kickOff).tz("Europe/London").format("D/M@HH:mm");
                            const foundKickOff = moment(bbcMatch.dateIso).tz("Europe/London").format("D/M@HH:mm");
                            if (ukKickOff === foundKickOff) {
                                // Scheduled match has exactly the correct kick off time!
                                console.log("Correct KO time");
                            } else {
                                // Incorrect kickoff
                                // The match was probably rescheduled from postponed or to a different day
                                console.log("Problem: We have " + foundMatch.weekId + "|" + ukKickOff + " but the correct UK KO from BBC is apparently " + foundKickOff + " updating...");
                                await writeFixture(dryRun, gauth, bbcMatch.homeTeam, bbcMatch.awayTeam, foundMatch.weekId, foundKickOff);
                                updatesMade++;
                            }
                        }
                    } else {
                        console.log("Error: We don't have this match scheduled yet, please run the scheduleMatches script since we dont know the week id for it");
                        errorsFound++;
                    }
                } else {
                    console.log("Error: We don't have this match scheduled yet, please run the scheduleMatches script since we dont know the week id for it");
                    errorsFound++;
                }
            }

            console.log("Now looping scheduled matches for today: " + todaysDate);

            for (const match of matchesToday) {
                console.log("Scheduled on " + todaysDate + " : " + match.homeTeam + " vs " + match.awayTeam);
                // Make sure the match of today exists in the BBC list
                const foundMatch = fixtures.find(i => i.homeTeam === match.homeTeam && i.awayTeam === match.awayTeam);

                if (foundMatch) {
                    // The kickoff time must still match up
                    const ukKickOff = moment(match.match.kickOff).tz("Europe/London").format("D/M@HH:mm");
                    const foundKickOff = moment(foundMatch.dateIso).tz("Europe/London").format("D/M@HH:mm");
                    if (ukKickOff === foundKickOff) {
                        // Scheduled match has exactly the correct kick off time!
                        console.log("Correct KO time");
                    } else {
                        // Incorrect kickoff
                        console.log("Problem: We have " + match.match.weekId + "|" + ukKickOff + " but the correct UK KO from BBC is apparently " + foundKickOff + " updating...");
                        // This could be a rescheduled kick off at a different time on the same day
                        // Since we know the week id, we can just update it
                        await writeFixture(dryRun, gauth, match.homeTeam, match.awayTeam, match.match.weekId, foundKickOff);
                        updatesMade++;
                    }
                } else {
                    /*
                    console.log("Error: Not found this match in the BBC schedule for today: " + todaysDate);
                    errorsFound++;
                    // This could be an incorrectly scheduled match, or just one that has been rescheduled to another date already
                    */
                    // Yes we need to assume the match is postponed if it doesnt exist
                    await writeFixture(dryRun, gauth, match.homeTeam, match.awayTeam, match.match.weekId, "6/6@15:55");
                    updatesMade++;
                }
            }
        }

        if (!dryRun && updatesMade > 0) {
            triggerRebuild("Made " + updatesMade + " updates to the schedule at " + new Date());
            console.log("Triggering rebuild...");
        }
        console.log("Finished, made " + updatesMade + " updates, found " + errorsFound + " errors that we couldn't fix automatically!");
        if (errorsFound > 0) {
            throw new Error("Script completed with " + errorsFound + " errors, please check logs");
        }
    } catch(e: any) {
        // Something went wrong
        // Add email notification to Phil
        const uniqueId = new Date().toISOString();
        const meta = {
            type: "WEBSITE-ERROR",
            title: "Predictor Website Error: Check schedule script",
            message: e.message,
        }
        console.error(e);
        try {
            await enqueueNotificationWithoutUniquenessCheck(gauth, spreadsheetId, uniqueId, meta);
        } catch(e) {
            console.error("Failed to write new notification");
        }
    }
})();

export {}

