// Schedule a weeks matches based on dates

import axios from "axios";
import moment from "moment-timezone";

import { sheets } from '@googleapis/sheets';
import GoogleAuth from "../lib/googleAuth";

const SheetsApi = sheets('v4');

export {}

const spreadsheetId = "1LH94Sk4LcDQe4DfiFNcmfZ-dNG9Wzuqh-4dWp69UEW8";

// Week 26 not imported yet, all KO at 3pm still
// Week 27 Arsenal vs Liverpool will be blank if either team reach the FA Cup 5th round

const weekId: string = "26";
const dates: Array<string> = ["2022-02-19"];
const dryRun: boolean = true;

// Run: npx ts-node ./src/scripts/scheduleMatches.ts

// TODO Check that all teams have played 1 match in this week before writing the fixtures.

const credentialsFile = __dirname + "/../../keys/credentials.json";
const gauth = new GoogleAuth(credentialsFile);

type Match = {
    homeTeam: string
    awayTeam: string
    startTime: string
}

function getCellRefByMatch (homeTeam: string, awayTeam: string) : string {
    const teamsList = [
        "Arsenal",
        "Aston Villa",
        "Brentford",
        "Brighton & Hove Albion",
        "Burnley",
        "Chelsea",
        "Crystal Palace",
        "Everton",
        "Leeds United",
        "Leicester City",
        "Liverpool",
        "Manchester City",
        "Manchester United",
        "Newcastle United",
        "Norwich City",
        "Southampton",
        "Tottenham Hotspur",
        "Watford",
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

const fetchPLMatches = async (dayText: string) : Promise<Array<any>> => {
    const url = "https://push.api.bbci.co.uk/batch?t=%2Fdata%2Fbbc-morph-football-scores-match-list-data%2FendDate%2F" + dayText + "%2FstartDate%2F" + dayText + "%2Ftournament%2Fpremier-league%2Fversion%2F2.4.6?timeout=5";

    const result = await axios({
        url,
        timeout: 5 * 1000,
        validateStatus: () => true,
    });

    const matches: Array<Match> = [];
    if (result.status === 200) {
        const matchData = result.data.payload[0].body.matchData;
        if (matchData.length > 0) {
            const eventDays = matchData[0].tournamentDatesWithEvents;
            for (const eventDayKey in eventDays) {
                const eventDay = eventDays[eventDayKey][0];
                for (const event of eventDay.events) {
                    const homeTeam = event.homeTeam.name.full;
                    const awayTeam = event.awayTeam.name.full;
                    const startTime = moment(event.startTime).tz("Europe/London").format("D/M@HH:mm");
                    matches.push({
                        homeTeam,
                        awayTeam,
                        startTime,
                    })
                }
            }
        }
    } else {
        throw new Error("Non 200 status: " + result.status);
    }

    /*
    console.log("RESULT", JSON.stringify(matches, null, 4));
    process.exit(1);
    */

    return matches;
}

const grabPLMatches = async (dates: Array<string>) : Promise<Array<any>> => {
    const matches: Array<any> = [];

    for(const thisDate of dates) {
        matches.push(...await fetchPLMatches(thisDate));
    }

    return matches;
}

export const writeFixture = async (gauth: GoogleAuth, cellRef: string, fixtureValue: string) : Promise<void> => {
    const range = 'Schedule!' + cellRef;

    console.log("Writing: " + fixtureValue + " at cell " + range);
    if (dryRun) {
        return;
    }
    const auth = gauth.jwtClient;
    // console.log("Writing data at ", cellRef, scoreValue);
    const result = await SheetsApi.spreadsheets.values.update({
        auth: auth,
        spreadsheetId,
        range: range,
        valueInputOption: 'RAW',
        requestBody: {
            values: [[fixtureValue]]
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

(async () => {
    try {
        console.log("Logging in...");
        await gauth.start();
        console.log("Logged in!");

        const matches = await grabPLMatches(dates);

        if (matches.length === 10) {
            console.log("SUCCESS, found 10 matches for week: " + weekId);

            console.log("MATCHES", matches);

            // Now write these to the fixtures spreadsheet if they look correct
            for (const match of matches) {
                const cellRef = getCellRefByMatch(match.homeTeam, match.awayTeam);

                await writeFixture(gauth, cellRef, weekId + "|" + match.startTime);
            }

            console.log("Script completed");

        } else {
            throw new Error("Found " + matches.length + " matches");
        }

    } catch(e) {
        console.error(e);
        process.exit(1);
    }
})();



