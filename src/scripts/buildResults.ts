import { addPoints, calculatePoints, calculateResultType, getBankerMultiplier, getZeroPointsRow } from "../lib/util";
import GoogleAuth from "../lib/googleAuth";

import { getCachedMatchSchedule, getCachedMatchScores } from "../lib/predictor/cached";

import { BuiltResults, ConcisePointsRow, CumulativeTeamPoints, FinalScore, FixtureGroup, HomeAwayPoints, LeagueTable, LeagueTables, MergedPhase, Penalty, Phase, Player, PointsRow, PredictionFixture, SimplePointsRow, StartOfWeekStanding, TeamMatchesAgainstPredictions, TeamPointsRow, Top4LeagueTables, WeekResults } from "../lib/types";
import fs from 'fs';
import { getPlayerNames } from '../lib/players';
import { getAllUserPredictions } from "../lib/predictor/predictions";
import moment from "moment-mini";


const credentialsFile = __dirname + "/../../keys/credentials.json";
const gauth = new GoogleAuth(credentialsFile);

// Write the standings for each week that has had results for all players.
const players = getPlayerNames();

(async () => {
    console.log("Logging in... buildResults.ts");
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
    // let lastPhase: null | Phase = null;
    let lastWeekId: null | string = null;

    for (const fixture of sortedFixtures) {

        if (lastWeekId !== null && fixture.weekId !== lastWeekId) {
            // Break if next match is a new week after the final week
            break;
        }

        // We also want to only process up to the match results that we have
        // When the next fixture to process has no results, stop processing
        if (fixture.finalScore === null) {
            // Mark this as the last phase.  When this phase completes, we break!
            /*
            console.log("Finishing off processing results, " + fixture.homeTeam + " vs " + fixture.awayTeam + " at " + fixture.kickOff + " has no final score yet");
            console.log("The last phase will be", currentPhase);
            */

            // break;
            // lastPhase = currentPhase;
            lastWeekId = fixture.weekId;
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
            isStarted: false,

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
    // Else show a hidden prediction (NO: see below)

    // No points are calculated yet
    for (const fixture of sortedFixtures) {
        for (const player of players) {
            const playerData = playerPredictions[player];
            const prediction = playerData.predictions[fixture.homeTeam]?.against[fixture.awayTeam];
            if (prediction) {
                if (new Date(fixture.kickOff) > now) {
                    // If the kick off is in the future, the prediction might change
                    
                } else {
                    // Prediction is now fixed and so it gets cached here and shown
                    fixture.playerPredictions[player] = {
                        prediction,
                        points: null,
                    }
                }
            }           
        }
    }

    // Points calculation is below

    // We ALSO need to calculate the PL table too
    const cumTeamPoints: CumulativeTeamPoints = {};

    const cumPoints: {[key:string]: PointsRow} = {};
    // const cumPhasePoints: {[key:string]: PointsRow} = {};
    const startOfWeekStandings: {[key: string]: StartOfWeekStanding} = {};

    for (const phase of mergedPhases) {
        // Process the matches by merged phase

        // Initialise the phase points map
        for (const player of players) {
            phase.points[player] = getZeroPointsRow();
        }

        if (!(phase.weekId in startOfWeekStandings)) {
            // It's the start of a week, work out the standings and store it against this week id
            const rankings = generateRankings(cumPoints);
            startOfWeekStandings[phase.weekId] = {
                snapshotTime: phase.fixtureGroups[0].kickOff,
                rankings: rankings,
                // bankerMultipliers: calculateBankerMultipliers(phase, rankings),
                leagueTables: calculateLeagueTables(cumTeamPoints),
            }
        }

        let matchesKickedOff = 0;
        let matchResults = 0;
        let totalMatches = 0;

        for (const fixtureGroup of phase.fixtureGroups) {
            let manualWeeksTriggered: Array<string> = [];
            for (const fixture of fixtureGroup.fixtures) {
                totalMatches++;
                if (new Date(fixture.kickOff) < now) {
                    matchesKickedOff++;
                }
                fixture.bankerMultiplier = getBankerMultiplier(fixture.weekId, fixture.homeTeam, fixture.awayTeam, startOfWeekStandings[fixture.weekId].leagueTables);

                if (fixture.finalScore !== null) {
                    matchResults++;
                    applyTeamStats(cumTeamPoints, fixture.homeTeam, fixture.awayTeam, fixture.finalScore.homeTeam, fixture.finalScore.awayTeam);

                    

                    for (const player of players) {   

                        if (!(player in fixture.playerPredictions)) {
                            fixture.playerPredictions[player] = {
                                prediction: null,
                                points: null
                            }
                        }
                        const prediction = fixture.playerPredictions[player].prediction;
                        
                        const points = calculatePoints(prediction, fixture.finalScore, fixture.bankerMultiplier);
                        phase.points[player] = addPoints(phase.points[player], points);
                        cumPoints[player]  = addPoints(cumPoints[player], points);

                        fixture.playerPredictions[player].points = {
                            type: calculateResultType(prediction, fixture.finalScore),
                            bankerPoints: points.bankerPoints,
                            regularPoints: points.regularPoints,
                            totalPoints: points.totalPoints,
                        }
                    }

                    // Insert hardcoded checks for manually triggered week start times after these specific matches
                    // NOTE: Make sure the matches are the last matches of the phase
                    const hardcodedWeekStartsAfter: {[key: string]: Array<string>} = {
                        // E.g. Trigger week 4 start immediately after Liverpool vs Chelsea FT
                        // "Liverpool vs Chelsea": ["4"]
                    }
                    const matchKey = fixture.homeTeam + " vs " + fixture.awayTeam;

                    if (matchKey in hardcodedWeekStartsAfter) {
                        for (const weekId of hardcodedWeekStartsAfter[matchKey]) {
                            console.log("Week " + weekId + " triggered manually after " + matchKey);
                        }
                        manualWeeksTriggered.push(...hardcodedWeekStartsAfter[matchKey]);
                    }

                }
            }

            for (const weekId of manualWeeksTriggered) {
                const timeNow = moment(fixtureGroup.kickOff).add(2, "hours").toISOString();
                if (!(weekId in startOfWeekStandings)) {
                    // It's the start of a week (triggered manually after this game), work out the standings and store it against this week id
                    const rankings = generateRankings(cumPoints);
                    startOfWeekStandings[weekId] = {
                        snapshotTime: timeNow,
                        rankings: rankings,
                        leagueTables: calculateLeagueTables(cumTeamPoints),
                    }
                }
            }

        }

        if (matchesKickedOff > 0) {
            phase.isStarted = true;
            if (matchResults < totalMatches) {
                phase.isOngoing = true;
            }
        }

        // All fixture groups have been processed for this merged phase

        // Now work out the rankings for this phase
        // phase.phaseRankings = generateRankings(phase.points);
        phase.cumRankings = generateRankings(cumPoints);
        
    }

    let nextKickoff: null | Date = null;
    for (const fixture of sortedFixtures) {
        const kickOff = new Date(fixture.kickOff);
        if (kickOff > now) {
            if (nextKickoff === null || kickOff < nextKickoff) {
                nextKickoff = kickOff;
            }
        }
    }

    return {
        mergedPhases,
        startOfWeekStandings,
        nextRedeploy: nextKickoff ? nextKickoff.toISOString() : null, // This is the date of when the website should next auto redeploy.  Schedule at the next kick off time since this could release some predictions.
    }


}



const getZeroHomeAwayPoints = () : HomeAwayPoints => {
    return {
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        points: 0,
    }
}

const getZeroTeamPointsRow = (name: string): TeamPointsRow => {
    return {
        name: name,
        home: getZeroHomeAwayPoints(),
        away: getZeroHomeAwayPoints(),
        penalties: [],
        rank: null
    }
}

const applyTeamStats = (cumTeamPoints: CumulativeTeamPoints, homeTeam: string, awayTeam: string, homeGoals: number, awayGoals: number) => {
    
    if (!(homeTeam in cumTeamPoints)) {
        cumTeamPoints[homeTeam] = getZeroTeamPointsRow(homeTeam);
    }
    if (!(awayTeam in cumTeamPoints)) {
        cumTeamPoints[awayTeam] = getZeroTeamPointsRow(awayTeam);
    }
    
    const teamHome = cumTeamPoints[homeTeam];
    const teamAway = cumTeamPoints[awayTeam];
    
    teamHome.home.played++;
    teamHome.home.goalsFor += homeGoals;
    teamHome.home.goalsAgainst += awayGoals;

    teamAway.away.played++;
    teamAway.away.goalsFor += awayGoals;
    teamAway.away.goalsAgainst += homeGoals;

    if (homeGoals > awayGoals) {
        // Home win
        teamHome.home.wins++;
        teamHome.home.points += 3;
        teamAway.away.losses++;
    } else if (homeGoals < awayGoals) {
        // Away win
        teamHome.home.losses++;
        teamAway.away.wins++;
        teamAway.away.points += 3;
    } else {
        // Draw
        teamHome.home.draws++;
        teamHome.home.points += 1;
        teamAway.away.draws++;
        teamAway.away.points += 1;
    }
    
}

const mergeStats = (home: HomeAwayPoints, away: HomeAwayPoints, penalties: Array<Penalty>, type: "homeOnly" | "awayOnly" | "all"): HomeAwayPoints => {
    const result: HomeAwayPoints = {
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        points: 0,
    }

    if (type === "all" || type === "homeOnly") {
        result.played += home.played;
        result.wins += home.wins;
        result.draws += home.draws;
        result.losses += home.losses;
        result.goalsFor += home.goalsFor;
        result.goalsAgainst += home.goalsAgainst;
        result.points += home.points;
    }

    if (type === "all" || type === "awayOnly") {
        result.played += away.played;
        result.wins += away.wins;
        result.draws += away.draws;
        result.losses += away.losses;
        result.goalsFor += away.goalsFor;
        result.goalsAgainst += away.goalsAgainst;
        result.points += away.points;
    }

    if (type === "all") {
        // Only the joint table includes penalties
        for (const pen of penalties) {
            result.points -= pen.deduction;
        }
    }

    return result;
}

const calculateLeagueTables = (cumTeamPoints: {[key:string]: TeamPointsRow}): LeagueTables => {
    // Just rank all the teams based on their current team points variable
    return {
        homeOnly: calculateLeagueTable(cumTeamPoints, "homeOnly"),
        awayOnly: calculateLeagueTable(cumTeamPoints, "awayOnly"),
        all: calculateLeagueTable(cumTeamPoints, "all"),
    }
}

const calculateLeagueTable = (cumTeamPoints: {[key:string]: TeamPointsRow}, type: "homeOnly" | "awayOnly" | "all"): LeagueTable => {
    const rankings: LeagueTable = Object.values(cumTeamPoints).map(team => {
        // Merge the home, away & any deductions in to a single row
        return {
            name: team.name,
            rank: null,
            stats: mergeStats(team.home, team.away, team.penalties, type),
        }
    }).sort((a,b) => {
        // Compare two teams stats first by points, then Goal Difference, then Goals Scored
        // TODO Probably need to do head to head too, but I'm not doing that here
        if (a.stats.points < b.stats.points) {
            return 1;
        } else if (a.stats.points > b.stats.points) {
            return -1;
        } else {
            // Equals points
            const gdA = a.stats.goalsFor - a.stats.goalsAgainst;
            const gdB = b.stats.goalsFor - b.stats.goalsAgainst;
            if (gdA < gdB) {
                return 1;
            } else if (gdA > gdB) {
                return -1;
            } else {
                // Equal GD
                if (a.stats.goalsFor < b.stats.goalsFor) {
                    return 1;
                } else if (a.stats.goalsFor > b.stats.goalsFor) {
                    return -1;
                } else {
                    // Equal everything
                    return 0;
                }
            }
        }
    });

    // Populate rankings here by starting at rank 1 and giving the next rank if the next team is different
    let nextRank = 1;
    let lastRank = 0;
    let lastTeam: HomeAwayPoints = {
        points: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        draws: 0,
        losses: 0,
        played: 0,
        wins: 0,
    };
    for (const team of rankings) {
        if (nextRank === 1) {
            team.rank = 1;
            lastRank = 1;
            lastTeam = team.stats;
            nextRank++;
        } else {
            if (arePointsDifferent(team.stats, lastTeam)) {
                // Use next rank
                team.rank = nextRank;
                lastRank = nextRank;
                lastTeam = team.stats;
            } else {
                // Use the same rank
                team.rank = lastRank;
            }
            nextRank++;
        }
    }

    return rankings;
}

const arePointsDifferent = (a: HomeAwayPoints, b: HomeAwayPoints): boolean => {
    return (a.played !== b.played)
        || (a.wins !== b.wins)
        || (a.draws !== b.draws)
        || (a.losses !== b.losses)
        || (a.goalsFor !== b.goalsFor)
        || (a.goalsAgainst !== b.goalsAgainst)
        || (a.points !== b.points)
}

const convertToConcisePointsRow = (pointsRow: PointsRow) : ConcisePointsRow => {
    return {
        predicted: pointsRow.predicted,
        missed: pointsRow.missed,

        correctScoresTotal: pointsRow.correctScoresTotal,
        correctGDTotal: pointsRow.correctGDTotal,
        correctOutcomeTotal: pointsRow.correctOutcomeTotal,
        incorrectTotal: pointsRow.incorrectTotal,
        regularPoints: pointsRow.regularPoints,
        bankerPoints: pointsRow.bankerPoints,
        totalPoints: pointsRow.totalPoints,
    }
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
            points: convertToConcisePointsRow(points),
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