import { addPoints, calculatePoints, calculateResultType, getZeroPointsRow } from "../lib/util";
import GoogleAuth from "../lib/googleAuth";

import { getCachedMatchSchedule, getCachedMatchScores } from "../lib/predictor/cached";

import { BuiltResults, FinalScore, FixtureGroup, MergedPhase, Phase, Player, PointsRow, PredictionFixture, SimplePointsRow, StartOfWeekStanding, TeamMatchesAgainstPredictions, WeekResults } from "../lib/types";
import fs from 'fs';
import { getPlayerNames } from '../lib/players';
import { getAllUserPredictions } from "../lib/predictor/predictions";


const credentialsFile = __dirname + "/../../keys/credentials.json";
const gauth = new GoogleAuth(credentialsFile);

// Write the standings for each week that has had results for all players.
const players = getPlayerNames();

(async () => {
    console.log("Logging in...");
    await gauth.start();
    console.log("Logged in!");
    
    const weekResults = await getResults(gauth, players);
    fs.writeFileSync(__dirname + "/../compiled/results.json", JSON.stringify(weekResults, null, 4));

    console.log("Finished building data");
})();


export async function getResults(gauth: GoogleAuth, players: Array<string>): Promise<BuiltResults> {

    // Either we process by scheduled kick off, or by week id NOT BOTH
    // We NEVER EVER process by week id anymore
    // All fixtures with final scores are sorted by kick off time and processed in order
    // When the week id changes, a snapshot is made

    const schedule = getCachedMatchSchedule();
    const scores = getCachedMatchScores();

    const now = new Date();
    const weekResults: WeekResults = {
        playerNames: players,
        weekIds: [],
        weeks: {},
    };

    // We no longer use the schedule.weeksOrder
    // Just get all scheduled fixtures
    const allFixtures = [] as Array<PredictionFixture>;
    for (const homeTeam in schedule.matches) {
        for (const awayTeam in schedule.matches[homeTeam].against) {
            const fixture = schedule.matches[homeTeam].against[awayTeam];

            let finalScore: null | FinalScore = null;
            if (homeTeam in scores) {
                if (awayTeam in scores[homeTeam].against) {
                    finalScore = scores[homeTeam].against[awayTeam];
                }
            }
            
            allFixtures.push({
                homeTeam,
                awayTeam,
                kickOff: fixture.kickOff,
                weekId: fixture.weekId,
                finalScore,
                playerPredictions: {}
            })
        }
    }

    // Sort these fixtures by kick off time and weekId
    const sortedFixtures = allFixtures.sort((a,b) => {
        // This assumes that the weekId is an incrementing integer
        const aValue = (new Date(a.kickOff).getTime()) + parseInt(a.weekId);
        const bValue = (new Date(b.kickOff).getTime()) + parseInt(b.weekId);
        return aValue - bValue;
    });

    // Weeks can have many phases which may be out of order with other weeks
    

    let weekOrder: Array<string> = []; // Order of the process of week ids
    let weeksNextPhase: {[key: string]: number} = {}; // Mapping of weekId to week details
    let weekPhases: Array<Phase> = [];

    let currentPhase: null | Phase = null;
    let lastPhase: null | Phase = null;

    for (const fixture of sortedFixtures) {
        // We also want to only process up to the match results that we have
        // When the next fixture to process has no results, stop processing
        if (fixture.finalScore === null) {
            // Mark this as the last phase.  When this phase completes, we break!
            
            // console.log("Finished processing results, " + fixture.homeTeam + " vs " + fixture.awayTeam + " on " + fixture.kickOff + " has no final score yet");
            // break;
            lastPhase = currentPhase;
        } else {
            // console.log("YES", fixture.homeTeam + " vs " + fixture.awayTeam );
        }

        if (currentPhase === null) {
            // Initialise currentPhase with the first match
            currentPhase = {
                weekId: fixture.weekId,
                phaseId: 1,
                kickOff: fixture.kickOff,
                fixtures: [fixture],
            };
            weeksNextPhase[fixture.weekId] = 1;
            weekPhases.push(currentPhase);
            continue;
        }

        if (fixture.weekId === currentPhase.weekId) {
            if (fixture.kickOff === currentPhase.kickOff) {
                // Put this fixture in the same phase
                currentPhase.fixtures.push(fixture);
                continue;
            } else {
                // Kick off time different, but the week is the same
                // New phase in the same week but with the SAME phase id
                // console.log("Another KO time in the same week " + fixture.weekId);
            }
        } else {
            if (lastPhase) {
                break;
            }
            // It's a different week from the last match, increment the phase id
            // Another phase required
            if (fixture.weekId in weeksNextPhase) {
                // console.log("Different week, this is another phase of week " + fixture.weekId);
                weeksNextPhase[fixture.weekId]++;
            } else {
                // console.log("Starting phase 1 of new week " + fixture.weekId);
                weeksNextPhase[fixture.weekId] = 1;
                weekOrder.push(fixture.weekId);
            }
        }
        
        currentPhase = {
            weekId: fixture.weekId,
            phaseId: weeksNextPhase[fixture.weekId],
            kickOff: fixture.kickOff,
            fixtures: [fixture],
        };
        weekPhases.push(currentPhase);
    }

    // Merge the phases that happen next to each other with the same weekId and phaseId
    const mergedPhases: Array<MergedPhase> = [];

    let lastMergedPhase: MergedPhase | null = null;
    for (const phase of weekPhases) {

        if (lastMergedPhase !== null) {
            if (lastMergedPhase.weekId === phase.weekId) {
                if (lastMergedPhase.phaseId === phase.phaseId) {
                    // Same Merged Phase, append all fixtures to a new fixture group
                    const fg: FixtureGroup = {
                        kickOff: phase.kickOff,
                        fixtures: phase.fixtures,
                    }
                    lastMergedPhase.fixtureGroups.push(fg);
                    continue;
                }
            }
        }

        // New merged phase
        const mp: MergedPhase = {
            weekId: phase.weekId,
            phaseId: phase.phaseId,

            isFirstPhaseOfWeek: false,
            isLastPhaseOfWeek: false,
            isOngoing: false,

            fixtureGroups: [{
                kickOff: phase.kickOff,
                fixtures: phase.fixtures,
            }],
            cumRankings: [],
            phaseRankings: [],
            points: {},
        };
        mergedPhases.push(mp);
        lastMergedPhase = mp;
    }

    // Go through the mergedPhases and setup the booleans for isFirst isLast, etc
    const seenWeeks: Array<string> = [];
    for (const phase of mergedPhases) {
        if (seenWeeks.indexOf(phase.weekId) === -1) {
            seenWeeks.push(phase.weekId);
            phase.isFirstPhaseOfWeek = true;
        }
    }
    const seenWeeksRev: Array<string> = [];
    const reversedMergedPhases = mergedPhases.slice(0).reverse();
    for (const phase of reversedMergedPhases) {
        if (seenWeeksRev.indexOf(phase.weekId) === -1) {
            seenWeeksRev.push(phase.weekId);
            phase.isLastPhaseOfWeek = true;
        }
    }



    // console.log("Merged Week phases", JSON.stringify(mergedPhases, null, 4));
    // process.exit(1);

    
    // For each player, grab the predictions data
    const playerPredictions = {} as {
        [key: string]: {
            predictions: {[key: string] : TeamMatchesAgainstPredictions}
        }
    };
    for (const player of players) {
        // Grab the data
        const playerData = await getAllUserPredictions(gauth, player);
        playerPredictions[player] = {
            predictions: playerData.homeTeams,
        };
    }

    // Also kinda important for the fixtures themselves to have all of the predictions data if those fixtures have kicked off

    // If the match has kicked off or has a result, show the full prediction
    // Else show a hidden prediction

    // No points are calculated yet
    for (const fixture of sortedFixtures) {
        for (const player of players) {
            const playerData = playerPredictions[player];
            const prediction = playerData.predictions[fixture.homeTeam]?.against[fixture.awayTeam];
            if (prediction) {
                if (new Date(fixture.kickOff) > now || fixture.finalScore === null) {
                    // Absolutely no point in storing this fact
                    /*
                    fixture.playerPredictions[player] = {
                        prediction: {
                            type: "hidden"
                        },
                        points: null,
                    }
                    */
                } else {
                    fixture.playerPredictions[player] = {
                        prediction,
                        points: null,
                    }
                }
            }           
        }
    }

    // Points calculation is below

    const cumPoints: {[key:string]: PointsRow} = {};
    // const cumPhasePoints: {[key:string]: PointsRow} = {};
    const startOfWeekStandings: {[key: string]: StartOfWeekStanding} = {};

    for (const phase of mergedPhases) {
        // Process the matches by merged phase

        if (!(phase.weekId in startOfWeekStandings)) {
            // It's the start of a week, work out the standings and store it against this week id
            const rankings = generateRankings(cumPoints);
            startOfWeekStandings[phase.weekId] = {
                snapshotTime: phase.fixtureGroups[0].kickOff,
                rankings: rankings,
                bankerMultipliers: calculateBankerMultipliers(phase, rankings),
            }
        }

        for (const fixtureGroup of phase.fixtureGroups) {
            for (const fixture of fixtureGroup.fixtures) {
                if (fixture.finalScore !== null) {
                    for (const player of players) {

                        const bankerMultiplier = startOfWeekStandings[phase.weekId].bankerMultipliers[player];

                        if (!(player in fixture.playerPredictions)) {
                            fixture.playerPredictions[player] = {
                                prediction: null,
                                points: null
                            }
                        }
                        const prediction = fixture.playerPredictions[player].prediction;
                        
                        const points = calculatePoints(prediction, fixture.finalScore, bankerMultiplier); // Note: 3rd argument is banker multiplier which depends on previous weeks positions
                        phase.points[player] = addPoints(phase.points[player], points);

                        fixture.playerPredictions[player].points = {
                            type: calculateResultType(prediction, fixture.finalScore),
                            bankerPoints: points.bankerPoints,
                            regularPoints: points.regularPoints,
                            totalPoints: points.totalPoints,
                        }
                    }
                } else {
                    phase.isOngoing = true;
                }
            }
        }

        // All fixture groups have been processed for this merged phase
        // So add the phase.points to cumulative points
        for (const player of players) {
            cumPoints[player]  = addPoints(cumPoints[player], phase.points[player]);
        }

        // Now work out the rankings for this phase
        phase.phaseRankings = generateRankings(phase.points);
        phase.cumRankings = generateRankings(cumPoints);
        
    }

    return {
        mergedPhases,
        startOfWeekStandings,
    }


}

const calculateBankerMultipliers = (phase: MergedPhase, players: Array<Player>) : {[key: string]: number} => {
    const bankerMultipliers: {[key: string]: number} = {};

    // Now check the rankings of previous week
    for (const player of players) {
        if (player.rank <= 4) {
            bankerMultipliers[player.name] = 2;
        } else {
            bankerMultipliers[player.name] = 3;
        }
    }

    return bankerMultipliers;
}

const generateRankings = (cumPoints: {[key: string]: PointsRow}) : Array<Player> => {

    // Work out the rankings for these points
    const playersRank: Array<Player> = [];

    const players = getPlayerNames();
    for (const player of players) {

        let points = cumPoints[player];
        if (points) {
            // Found points
        } else {
            // Use zero points
            points = getZeroPointsRow();
        }
        playersRank.push({
            name: player,
            rank: 1,
            points: points,
        });
    }

    const sortedPlayersRank = playersRank.sort((a,b) => {
        if (a.points.totalPoints === b.points.totalPoints) {
            return a.name.localeCompare(b.name);
        } else {
            return b.points.totalPoints - a.points.totalPoints;
        }
    });

    let nextRank = 1;
    let lastRank = 0;
    let lastPoints = 0;
    for (const playerRank of sortedPlayersRank) {
        if (nextRank === 1) {
            playerRank.rank = 1;
            lastRank = 1;
            lastPoints = playerRank.points.totalPoints;
            nextRank++;
        } else {
            if (playerRank.points.totalPoints < lastPoints) {
                // Use next rank
                playerRank.rank = nextRank;
                lastRank = nextRank;
                lastPoints = playerRank.points.totalPoints;
            } else {
                // Use the same rank
                playerRank.rank = lastRank;
            }
            nextRank++;
        }
    }
    return sortedPlayersRank;
}