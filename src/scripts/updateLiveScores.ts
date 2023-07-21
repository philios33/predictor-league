// Schedule a weeks matches based on dates

import axios from "axios";
import moment from "moment-timezone";

import { sheets } from '@googleapis/sheets';
import GoogleAuth from "../lib/googleAuth";

import { getCachedResults } from '../lib/predictor/cachedResults';
import { enqueueNotificationWithoutUniquenessCheck } from "../lib/notificationEnqueue";
const cachedResults = getCachedResults();

const SheetsApi = sheets('v4');

export {}

const awaitingScoresFor = cachedResults.awaitingScoresFor;

const credentialsFile = __dirname + "/../keys/credentials.json";
const gauth = new GoogleAuth(credentialsFile);
// const spreadsheetId2021 = "1LH94Sk4LcDQe4DfiFNcmfZ-dNG9Wzuqh-4dWp69UEW8";
// const spreadsheetId2022 = "1Tilu5utIZBXXBL2t_cikdO_NsrfbMAQ1zBx5zws9JQA";
const spreadsheetId = "13z-8qvEYNwKUMC8nMVXN4wanSzcZT-e5oKQ3FjB8PSA";


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

const writeResult = async (gauth: GoogleAuth, homeTeam: string, awayTeam: string, score: string) => {
    const cellRef = getCellRefByMatch(homeTeam, awayTeam);
    const range = 'Scores!' + cellRef;

    console.log("Writing: " + score + " at cell " + range);
    
    await writeCell(gauth, range, score);
}

const triggerRebuild = async (message: string) => {
    const range = 'Schedule!B25';
    await writeCell(gauth, range, message);
}

function getCellRefByMatch (homeTeam: string, awayTeam: string) : string {
    const teamsList = [
        "Arsenal",
        "Aston Villa",
        "AFC Bournemouth",
        "Brentford",
        "Brighton & Hove Albion",
        "Burnley",
        "Chelsea",
        "Crystal Palace",
        "Everton",
        "Fulham",
        "Liverpool",
        "Luton Town",
        "Manchester City",
        "Manchester United",
        "Newcastle United",
        "Nottingham Forest",
        "Sheffield United",
        "Tottenham Hotspur",
        "West Ham United",
        "Wolverhampton Wanderers",
    ];

    const homeTeamIndex = teamsList.indexOf(homeTeam);
    if (homeTeamIndex === -1) {
        throw new Error("Unknown home team: " + homeTeam);
    }

    const awayTeamIndex = teamsList.indexOf(awayTeam);
    if (awayTeamIndex === -1) {
        throw new Error("Unknown away team: " + awayTeam);
    }

    const awayCol = String.fromCharCode(awayTeamIndex + 66); // Starts at col B (Arsenal) and B = ASCII 66
    const homeRow = homeTeamIndex + 3; // Starts at row 3 (Arsenal)
    return awayCol + homeRow.toString();
}

const getFinalScores = async () => {
    const tournamentType = "premier-league";
    // const tournamentType = "full-priority-order";
    const todaysDate = moment().tz("Europe/London").format("YYYY-MM-DD");

    // const url = "https://push.api.bbci.co.uk/batch?t=%2Fdata%2Fbbc-morph-football-scores-match-list-data%2FendDate%2F2021-09-21%2FstartDate%2F2021-09-21%2FtodayDate%2F2021-09-21%2Ftournament%2Ffull-priority-order%2Fversion%2F2.4.6?timeout=5"
    const url = "https://push.api.bbci.co.uk/batch?t=%2Fdata%2Fbbc-morph-football-scores-match-list-data%2FendDate%2F" + todaysDate + "%2FstartDate%2F" + todaysDate + "%2Ftournament%2F" + tournamentType + "%2Fversion%2F2.4.6?timeout=5";

    const result = await axios({
        url,
        timeout: 5 * 1000,
        validateStatus: () => true,
    });

    if (result.status === 200) {

        const finalScores = [];
        if ("payload" in result.data && result.data.payload !== null && result.data.payload instanceof Array && result.data.payload.length > 0) {
            const firstPayload = result.data.payload[0];
            for (const tournament of firstPayload.body.matchData) {
                const tournamentName = tournament.tournamentMeta.tournamentName.full;
                for (const tourDate in tournament.tournamentDatesWithEvents) {
                    const tourDateItem = tournament.tournamentDatesWithEvents[tourDate];
                    for (const tourRound of tourDateItem) {
                        for (const event of tourRound.events) {
                            const homeTeam = event.homeTeam.name.full;
                            const homeScore = event.homeTeam.scores.score;
                            const awayTeam = event.awayTeam.name.full;
                            const awayScore = event.awayTeam.scores.score;

                            if (event.eventProgress.period === "FULLTIME" && event.eventProgress.status === "RESULT") {
                                console.log("Final score in " + tournamentName + " - " + homeTeam + " " + homeScore + "-" + awayScore + " " + awayTeam);

                                finalScores.push({
                                    homeTeam,
                                    homeScore,
                                    awayTeam,
                                    awayScore,
                                });
                            } else {
                                console.log("Not Full Time yet in " + tournamentName + " - " + homeTeam + " " + homeScore + "-" + awayScore + " " + awayTeam);
                            }
                        }
                    }
                }
            }
        }

        // console.log("SCORES", JSON.stringify(finalScores, null, 4));
        return finalScores;
    } else {
        throw new Error("Non 200 response: " + result.status + " for url: " + url);
    }
}

(async () => {
    try {

        if (awaitingScoresFor.length > 0) {

            const scores = await getFinalScores();

            // console.log("CURRENT FINAL SCORES", scores);

            // Make sure all scores exist that we are looking for
            const foundResults = [];
            for (const waitingFor of awaitingScoresFor) {
                const found = scores.find(result => ((result.homeTeam + " vs " + result.awayTeam) === waitingFor));
                if (found) {
                    foundResults.push({
                        homeTeam: found.homeTeam,
                        awayTeam: found.awayTeam,
                        score: found.homeScore + "-" + found.awayScore,
                    })
                } else {
                    // throw new Error("Could not find a final score for: " + waitingFor);
                }
            }

            if (foundResults.length > 0) {
                console.log("Writing " + foundResults.length + " final scores");
                console.log("Logging in...");
                await gauth.start();
                console.log("Logged in!");
                for (const result of foundResults) {
                    await writeResult(gauth, result.homeTeam, result.awayTeam, result.score);
                }
                await triggerRebuild("Rebuild after " + foundResults.length + " scores imported at " + moment().toISOString());
            } else {
                console.log("Finished, no applicable results");
            }
        } else {
            console.log("Finished, not waiting for any results");
        }


    } catch(e: any) {
        console.error(e);

        // Something went wrong
        // Add email notification to Phil
        const uniqueId = new Date().toISOString();
        const meta = {
            type: "WEBSITE-ERROR",
            title: "Predictor Website Error: Live scores script",
            message: e.message,
        }
        try {
            await gauth.start();
            await enqueueNotificationWithoutUniquenessCheck(gauth, spreadsheetId, uniqueId, meta);
        } catch(e) {
            console.error("Failed to write new notification");
            console.error(e);
        }
    }
})();
