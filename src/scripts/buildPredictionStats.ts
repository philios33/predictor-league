// For any fixture that was in the past and had a prediction on, we store some counters on it so that we track

import fs from 'fs';
import GoogleAuth from "../lib/googleAuth";
import { getPlayerNames } from "../lib/players";
import { getCachedMatchSchedule } from "../lib/predictor/cached";
import { getCachedResults } from '../lib/predictor/cachedResults';
import { getAllUserPredictions } from "../lib/predictor/predictions";
import { BuiltPredictionStats, PredictionStats, TeamsPredictionStats } from '../lib/types';

if ("HOME" in process.env) {
    if (process.env["HOME"] === "/home/phil") {
        process.env["LOCALDEV"] = "yes";
    }
}

const schedule = getCachedMatchSchedule();
const results = getCachedResults();

// Get all matches that have kicked off in the past
const matches: Array<{homeTeam: string, awayTeam: string, weekId: string, homeTeamRank: number, awayTeamRank: number}> = [];
const now = new Date();
for (const homeTeam in schedule.matches) {
    for (const awayTeam in schedule.matches[homeTeam].against) {
        const match = schedule.matches[homeTeam].against[awayTeam];
        const kickOff = new Date(match.kickOff);
        const weekId = match.weekId;
        if (kickOff < now) {
            if (["1"].includes(weekId)) {
                // Ignore week 1 fixture
            } else {
                // Figure out the positions of these teams at this point
                if (weekId in results.startOfWeekStandings) {
                    const table = results.startOfWeekStandings[weekId].leagueTables.all;
                    const homeTeamRow = table.find(t => t.name === homeTeam);
                    const awayTeamRow = table.find(t => t.name === awayTeam);

                    if (homeTeamRow && awayTeamRow && homeTeamRow.rank !== null && awayTeamRow.rank !== null) {
                        matches.push({
                            homeTeam, 
                            awayTeam, 
                            weekId,
                            homeTeamRank: homeTeamRow.rank,
                            awayTeamRank: awayTeamRow.rank,
                        });
                    } else {
                        throw new Error("Could not find the rank for teams " + homeTeam + " and " + awayTeam + " at the start of week " + weekId);
                    }
                } else {
                    console.warn("We dont know the start of week standings for week " + weekId + " yet, so ignoring this match");
                }
            }
        }
    }
}

const credentialsFile = __dirname + "/../../keys/credentials.json";
const gauth = new GoogleAuth(credentialsFile);

// Write the standings for each week that has had results for all players.
const players = getPlayerNames();

(async () => {
    console.log("Logging in... buildPredictionStats.ts");
    await gauth.start();
    console.log("Logged in!");
    
    const predictionStats = await getPredictionStats(gauth, players);
    fs.writeFileSync(__dirname + "/../compiled/predictionStats.json", JSON.stringify(predictionStats, null, 4));

    console.log("Finished building prediction stats");
})();

function getZeroStatsRow() : PredictionStats {
    return {
        predictions: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        wins: 0,
        draws: 0,
        losses: 0,
    };
}

function findSegmentFromRank(rank: number) {
    if (rank <= 6) {
        return "top6";
    } else if (rank >= 15) {
        return "bottom6";
    } else {
        return "middle8";
    }
}


async function sleep(secs: number) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve(null);
        }, secs * 1000);
    })
}

async function getPredictionStats(gauth: GoogleAuth, players: string[]) : Promise<BuiltPredictionStats> {
    // For each player, grab the predictions data
    
    const playerPredictionStats: BuiltPredictionStats = {};
    
    for (const player of players) {
        // Stats
        const predictionStats: TeamsPredictionStats = {};

        // Grab the data
        if (!("LOCALDEV" in process.env)) {
            // console.log(process.env);
            await sleep(6); // Ensures we only get 10 players data per minute, it should be enough throttle.  20 is too long
        } else {
            console.log("Local dev detected, only 1 second throttle");
            await sleep(1);
        }
        const playerData = await getAllUserPredictions(gauth, player);

        for (const match of matches) {
            const homeTeamSegment = findSegmentFromRank(match.homeTeamRank);
            const awayTeamSegment = findSegmentFromRank(match.awayTeamRank);
            const prediction = playerData.homeTeams[match.homeTeam]?.against[match.awayTeam];
            if (prediction) {
                if (!(match.homeTeam in predictionStats)) {
                    predictionStats[match.homeTeam] = {
                        home: {
                            top6: getZeroStatsRow(),
                            middle8: getZeroStatsRow(),
                            bottom6: getZeroStatsRow(),
                        },
                        away: {
                            top6: getZeroStatsRow(),
                            middle8: getZeroStatsRow(),
                            bottom6: getZeroStatsRow(),
                        },
                    };
                }
                if (!(match.awayTeam in predictionStats)) {
                    predictionStats[match.awayTeam] = {
                        home: {
                            top6: getZeroStatsRow(),
                            middle8: getZeroStatsRow(),
                            bottom6: getZeroStatsRow(),
                        },
                        away: {
                            top6: getZeroStatsRow(),
                            middle8: getZeroStatsRow(),
                            bottom6: getZeroStatsRow(),
                        },
                    };
                }

                predictionStats[match.homeTeam].home[awayTeamSegment].predictions++;
                predictionStats[match.homeTeam].home[awayTeamSegment].goalsFor += prediction.homeTeam;
                predictionStats[match.homeTeam].home[awayTeamSegment].goalsAgainst += prediction.awayTeam;

                predictionStats[match.awayTeam].away[homeTeamSegment].predictions++;
                predictionStats[match.awayTeam].away[homeTeamSegment].goalsFor += prediction.awayTeam;
                predictionStats[match.awayTeam].away[homeTeamSegment].goalsAgainst += prediction.homeTeam;

                if (prediction.homeTeam > prediction.awayTeam) {
                    // Home win
                    predictionStats[match.homeTeam].home[awayTeamSegment].wins++;
                    predictionStats[match.awayTeam].away[homeTeamSegment].losses++;
                } else if (prediction.homeTeam < prediction.awayTeam) {
                    // Away win
                    predictionStats[match.homeTeam].home[awayTeamSegment].losses++;
                    predictionStats[match.awayTeam].away[homeTeamSegment].wins++;
                } else {
                    // Draw
                    predictionStats[match.homeTeam].home[awayTeamSegment].draws++;
                    predictionStats[match.awayTeam].away[homeTeamSegment].draws++;
                }
            } else {
                // throw new Error("Not found " + player + " s prediction for " + match.homeTeam + " vs " + match.awayTeam);
            }
        }

        playerPredictionStats[player] = predictionStats;
    }

    return playerPredictionStats;
}

