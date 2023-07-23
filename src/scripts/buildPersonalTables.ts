// For any fixture that was in the past we generate personal tables for each player
import fs from "fs";
import GoogleAuth from "../lib/googleAuth";
import { getPlayerNames } from '../lib/players';
import { getCachedResults } from '../lib/predictor/cachedResults';
import { getAllUserPredictions } from "../lib/predictor/predictions";
import { rankLeagueTable } from "../lib/predictor/table";
import { CumulativeTeamPoints, LeagueTable, PredictedLeagueTable, UserPredictions } from '../lib/types';
import { applyTeamStats, getLeagueTableFromCumPoints } from "./buildResults";

if ("HOME" in process.env) {
    if (process.env["HOME"] === "/home/phil") {
        process.env["LOCALDEV"] = "yes";
    } else if (process.env["HOME"] === "/Users/philipnicholls") {
        process.env["LOCALDEV"] = "yes";
    }
}




const results = getCachedResults();

const convertToPredictedTable = (table: LeagueTable, real: LeagueTable) : PredictedLeagueTable => {

    return table.map(row => {
        // Find the real position
        const team = real.find(i => i.name === row.name);
        if (!team) {
            throw new Error("Not possible");
        }
        const realPosition = team.rank as number;
        return {
            name: row.name,
            rank: row.rank,
            stats: {
                played: row.stats.played,
                wins: row.stats.wins,
                draws: row.stats.draws,
                losses: row.stats.losses,
                goalsFor: row.stats.goalsFor,
                goalsAgainst: row.stats.goalsAgainst,
                points: row.stats.points,
                positionDifference: realPosition - (row.rank as number)
            }
        }
    });

}

const credentialsFile = __dirname + "/../../keys/credentials.json";
const gauth = new GoogleAuth(credentialsFile);

const players = getPlayerNames();


async function sleep(secs: number) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve(null);
        }, secs * 1000);
    })
}

(async () => {
    console.log("Logging in... buildPersonalTables.ts");
    await gauth.start();
    console.log("Logged in!");

    const predictions: Record<string, UserPredictions> = {};
    const tables: Record<string, CumulativeTeamPoints> = {};
    const realTable: CumulativeTeamPoints = {};
    for (const playerName of players) {
        // Grab the predictions data
        if (!("LOCALDEV" in process.env) || process.env.LOCALDEV !== "yes") {
            await sleep(6); // Ensures we only get 10 players data per minute, it should be enough throttle.  20 is too long
        } else {
            console.log("Local dev detected, only 1 second throttle");
            await sleep(1);
        }
        console.log("Getting predictions for: " + playerName);
        const playerData = await getAllUserPredictions(gauth, playerName);
        console.log("Done");
        predictions[playerName] = playerData;
        tables[playerName] = {};
    }

    for (const phase of results.mergedPhases) {
        for (const fg of phase.fixtureGroups) {
            const kickOff = fg.kickOff;
            for (const fix of fg.fixtures) {
                const score = fix.finalScore;
                if (score) {
                    console.log("Week " + fix.weekId + ": " + fix.homeTeam + " vs " + fix.awayTeam + " was " + kickOff + " and score: " + score.homeTeam + " - " + score.awayTeam);
                    applyTeamStats(realTable, fix.homeTeam, fix.awayTeam, score.homeTeam, score.awayTeam);
                    // Go through each prediction and apply it to the tables
                    for (const playerName of players) {
                        const prediction = predictions[playerName].homeTeams[fix.homeTeam].against[fix.awayTeam];
                        if (prediction) {
                            applyTeamStats(tables[playerName], fix.homeTeam, fix.awayTeam, prediction.homeTeam, prediction.awayTeam);
                        }
                    }
                }
            }
        }
    }

    const realPLTable = getLeagueTableFromCumPoints(realTable, "all");
    rankLeagueTable(realPLTable);

    // Now dump tables
    const finalTables : Record<string, PredictedLeagueTable> = {};
    for (const playerName of players) {
        const playerTable = getLeagueTableFromCumPoints(tables[playerName], "all");
        rankLeagueTable(playerTable);
        const predictedTable = convertToPredictedTable(playerTable, realPLTable);
        finalTables[playerName] = predictedTable;

        // console.log("Dumping " + playerName + " League Table");
        // console.log(playerTable);
    }

    // Write to a json file
    fs.writeFileSync(__dirname + "/../compiled/personalTables.json", JSON.stringify(finalTables, null, 4));

    console.log("Finished building personal tables based on predictions");


})();


