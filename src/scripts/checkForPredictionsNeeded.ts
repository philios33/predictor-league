// Designed to run periodically to detect and notify that a user needs to enter their predictions
// The Notifications system uses the Google Sheet as a backing DB
// We send a soft notifications between 24 hours and 2 hours before kickoff and then a hard notification when there is less than 2 hours before kickoff
// We make sure that the user has not already received a notification by checking the existing hashes

import moment from "moment-mini";
import GoogleAuth from "../lib/googleAuth";
import { getPlayerNames } from "../lib/players";
// import { getCachedMatchSchedule } from "../lib/predictor/cached";
import { getCachedResults } from "../lib/predictor/cachedResults";
import { getAllUserPredictions } from "../lib/predictor/predictions";
import { Prediction, PredictionFixture, UserPredictions } from "../lib/types";
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { sheets } from '@googleapis/sheets';
import { PredictionsNeededEventMeta } from "../lib/eventBus";
const SheetsApi = sheets('v4');
const objectHash = require('object-hash');

// This script uses the cached schedule, or does it?

// npm run buildData
// npm run buildResults
// npx ts-node ./src/scripts/checkForPredictionsNeeded

// const schedule = getCachedMatchSchedule();
const results = getCachedResults();

const now = moment();
const oneDay = moment().add(3, "days"); // Soft
const twoHours = moment().add(2, "hours"); // Hard

// You should get a notification 24 hours or 2 hours before a week phase starts where the player requires predictions
// BUT a player might legit be doing their predictions at the last minute, so we need to do this for each kick off time
const allPlayers = getPlayerNames();
const spreadsheetId = "1LH94Sk4LcDQe4DfiFNcmfZ-dNG9Wzuqh-4dWp69UEW8";

const getAllEventBusHashes = async (gauth: GoogleAuth) => {
    const range = "Event Bus!C3:C1000";
    const result = await SheetsApi.spreadsheets.values.get({
        auth: gauth.jwtClient,
        spreadsheetId,
        range,
    });
    if (result.status === 200) {
        const values = result.data.values as any[][];
        const hashes: Array<string> = [];
        if (values) {
            for (const row of values) {
                hashes.push(row[0]);
            }
        }
        return hashes;
    } else {
        console.error(result);
        throw new Error("Non 200 response: " + result.status);
    }
}

const createEventForBus = async (gauth: GoogleAuth, hash: string, eventType: string, eventMeta: any) => {
    // Write this to the google sheet in the Event Bus sheet
    // TODO Write a processor that checks for new data in the Event Bus sheet every minute, and creates Notifications from the existing subscriptions.
    // TODO Write a processor that checks for new Notifications data every minute and sends them out.
    // console.log(eventType, eventMeta);
    console.log("Pushing event to bus: " + eventType + " for " + eventMeta.player + " hash " + hash);
    const uuid = uuidv4();
    const occurredAt = new Date().toISOString();
    const range = "Event Bus!A3:D3";
    const result = await SheetsApi.spreadsheets.values.append({
        auth: gauth.jwtClient,
        spreadsheetId,
        range: range,
        insertDataOption: "INSERT_ROWS",
        valueInputOption: 'RAW',
        requestBody: {
            values: [[uuid, occurredAt, hash, eventType, JSON.stringify(eventMeta)]]
        }
    });
    return result;
}

const sendNotificationsForFixtures = async (eventBusHashes: Array<string>, gauth: GoogleAuth, notificationType: string, weekId: string, phaseId: number, fgId: number, kickOff: Date, fixtures: Array<PredictionFixture>, playerPredictions: Record<string, UserPredictions>, player: string) => {
    console.log("Checking " + fixtures.length + " matches in week " + weekId + " phase " + phaseId + " fg " + fgId);

    let missingPredictions: Record<string, Array<{homeTeam: string, awayTeam: string}>> = {}
    for(const fixture of fixtures) {
        const homeTeam = fixture.homeTeam;
        const awayTeam = fixture.awayTeam;
        console.log(homeTeam + " vs " + awayTeam);

        // for(const player in of allPlayers) {
            
            let prediction: null | Prediction = null;
            if (homeTeam in playerPredictions[player].homeTeams) {
                if (awayTeam in playerPredictions[player].homeTeams[homeTeam].against) {
                    prediction = playerPredictions[player].homeTeams[homeTeam].against[awayTeam];
                }
            }
            if (prediction !== null) {
                console.log(player + " has predicted " + prediction.homeTeam + "-" + prediction.awayTeam);
            } else {
                if (!(player in missingPredictions)) {
                    missingPredictions[player] = [];
                }
                missingPredictions[player].push({
                    homeTeam,
                    awayTeam
                });
                console.warn(player + " has not predicted this match yet");
            }
        // }
    }

    let numOfEvents = 0;
    for (const player in missingPredictions) {
        const alertDay = moment(kickOff).format("YYYY-MM-DD");
        const meta: PredictionsNeededEventMeta = {
            player,
            weekId,
            phaseId,
            fgId,
            alertDay,
            kickOff,
            missingPredictions: missingPredictions[player]
        }
        const eventType = "PREDICTIONS_NEEDED_" + notificationType;
        const hash = objectHash([eventType, meta.player, meta.weekId, meta.phaseId, meta.fgId]);
        if (eventBusHashes.includes(hash)) {
            // This event is already reported, don't push to bus
            // BUT, we must increase the num of events returned so that alert events for this player stop
            numOfEvents++;
        } else {
            eventBusHashes.push(hash);
            const response = await createEventForBus(gauth, hash, "PREDICTIONS_NEEDED_" + notificationType, meta);
            numOfEvents++;
        }
    }
    return numOfEvents;
}

const writeBusLastUpdated = async (gauth: GoogleAuth, timestampValue: string) => {
    const range = "Event Bus!A1";
    const result = await SheetsApi.spreadsheets.values.update({
        auth: gauth.jwtClient,
        spreadsheetId,
        range: range,
        valueInputOption: 'RAW',
        requestBody: {
            values: [[timestampValue]]
        }
    });
    return result;
}

const credentialsFile1 = __dirname + "/../../keys/credentials.json";
const credentialsFile2 = __dirname + "/../keys/credentials.json";
let gauth: null | GoogleAuth = null;
if (fs.existsSync(credentialsFile1)) {
    gauth = new GoogleAuth(credentialsFile1);
    console.log("Using credentials at ", credentialsFile1);
} else if (fs.existsSync(credentialsFile2)) {
    gauth = new GoogleAuth(credentialsFile2);
    console.log("Using credentials at ", credentialsFile2);
} else {
    throw new Error("Couldnt find the credentials file in any of the valid locations");
}


(async () => {

    try {
        
        console.log("Logging in...");
        await gauth.start();
        console.log("Logged in!");

        const playerPredictions: Record<string, UserPredictions> = {};
        for(const player of allPlayers) {
            const playerData = await getAllUserPredictions(gauth, player);
            playerPredictions[player] = playerData;
        }
        
        const eventBusHashes = await getAllEventBusHashes(gauth);

        let numOfEvents = 0;
        for (const phase of results.mergedPhases) {

            for(const player of allPlayers) {

                for (const [i, fg] of phase.fixtureGroups.entries()) {
                    const kickOff = new Date(fg.kickOff);
                    console.log("Considering " + player + " predictions of Week " + phase.weekId + " phase " + phase.phaseId + " fg " + (i+1) + " with " + fg.fixtures.length + " matches kicking off at " + kickOff);
                
                    if (now.isBefore(kickOff)) {
                        if (twoHours.isAfter(kickOff)) {
                            // This now returns 1 or 0 since we look at each player individually now
                            const newHardEvents = await sendNotificationsForFixtures(eventBusHashes, gauth, "HARD", phase.weekId, phase.phaseId, i+1, kickOff, fg.fixtures, playerPredictions, player);
                            numOfEvents += newHardEvents;
                            if (newHardEvents > 0) {
                                break; // Break from the FG loop and move to the next player
                            }
                        } else if (oneDay.isAfter(kickOff)) {
                            // This now returns 1 or 0 since we look at each player individually now
                            const newSoftEvents = await sendNotificationsForFixtures(eventBusHashes, gauth, "SOFT", phase.weekId, phase.phaseId, i+1, kickOff, fg.fixtures, playerPredictions, player);
                            numOfEvents += newSoftEvents;
                            if (newSoftEvents > 0) {
                                break; // Break from the FG loop and move to the next player
                            }
                        }
                    }
                }
            }
            
        }
        console.log("Produced " + numOfEvents + " events");
        if (numOfEvents > 0) {
            const now = new Date().toISOString();
            await writeBusLastUpdated(gauth, now);
        }
        console.log("Finished");

    } catch(e) {
        console.error("Error", e);
    }

})();