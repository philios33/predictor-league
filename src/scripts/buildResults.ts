import { addPoints, calculatePoints, calculateResultType, getBankerMultiplier, getZeroPointsRow } from "../lib/util";
import GoogleAuth from "../lib/googleAuth";

import { getCachedMatchSchedule, getCachedMatchScores } from "../lib/predictor/cached";

import { BuiltResults, ConcisePointsRow, CumulativeTeamPoints, FinalScore, FixtureGroup, HomeAwayPoints, LeagueTable, LeagueTables, MergedPhase, Penalty, Phase, Player, PointsRow, PredictionFixture, SimplePointsRow, StartOfWeekStanding, TeamMatchesAgainstPredictions, TeamPointsRow, Top4LeagueTables, WeekResults } from "../lib/types";
import fs from 'fs';
import { getPlayerNames } from '../lib/players';
import { getAllUserPredictions } from "../lib/predictor/predictions";
import moment from "moment-mini";
import { rankLeagueTable } from "../lib/predictor/table";


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

    // Trim down the data so we only show recent data
    const recentPhaseAmount = 30;
    if (weekResults.mergedPhases.length > recentPhaseAmount) {
        // Only take the last X phases?
        weekResults.mergedPhases = weekResults.mergedPhases.slice(-recentPhaseAmount);
        // Get week ids of these phases and remove all other tables
        const weekIds = new Set(weekResults.mergedPhases.map(phase => phase.weekId));
        const weekIdList = Object.keys(weekResults.startOfWeekStandings);
        for (const weekId of weekIdList) {
            if (weekIds.has(weekId)) {
                // Don't remove
            } else {
                delete weekResults.startOfWeekStandings[weekId];
            }
        }
    }
    // The Results page uses the resultsRecent.json file, so we always need this file
    fs.writeFileSync(__dirname + "/../compiled/resultsRecent.json", JSON.stringify(weekResults, null, 4));

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

    // Pretend (temporarily for debugging purposes) that we are 1 month in the future
    // now.setMonth(now.getMonth() + 1);

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
                playerPredictions: {},
                cupMatches: [],
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
    // let lastWeekId: null | string = null;

    for (const fixture of sortedFixtures) {

        /*
        if (lastWeekId !== null && fixture.weekId !== lastWeekId) {
            // Break if next match is a new week after the final week
            break;
        }
        */

        // We also want to only process up to the match results that we have
        // When the next fixture to process has no results, stop processing
        // Update: This is now disabled as it breaks the week phase logic.  We need to consider all weeks now that we have all fixtures.
        let isIncomplePhase = false;
        if (fixture.finalScore === null) {
            // Mark this as the last phase.  When this phase completes, we break!
            /*
            console.log("Finishing off processing results, " + fixture.homeTeam + " vs " + fixture.awayTeam + " at " + fixture.kickOff + " has no final score yet");
            console.log("The last phase will be", currentPhase);
            */

            // break;
            // lastPhase = currentPhase;
            // lastWeekId = fixture.weekId;
            isIncomplePhase = true;
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
                isIncomplePhase: isIncomplePhase,
            };
            weeksNextPhase[fixture.weekId] = 1;
            weekPhases.push(currentPhase);
            continue;
        }

        if (fixture.weekId === currentPhase.weekId) {
            if (fixture.kickOff === currentPhase.kickOff) {
                // Put this fixture in the same phase
                currentPhase.fixtures.push(fixture);
                currentPhase.isIncomplePhase ||= isIncomplePhase;
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
            isIncomplePhase,
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

            isIncomplete: phase.isIncomplePhase,

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
                        stats: null,
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

    let foundIncompleteWeekPhase = false;

    for (const phase of mergedPhases) {
        // Process the matches by merged phase

        // Initialise the phase points map
        for (const player of players) {
            phase.points[player] = getZeroPointsRow();
        }

        console.log("Week " + phase.weekId + " Phase " + phase.phaseId);
        
        // We need to stop processing at the first incomplete week phase
        if (foundIncompleteWeekPhase) {
            // Ignore this one
            console.log("Ignoring Week " + phase.weekId + " Phase " + phase.phaseId);
            continue;
        } else {
            if (phase.isIncomplete) {
                console.log("Stopping at week " + phase.weekId + " phase " + phase.phaseId + " since it is incomplete");
                // TODO: This causes a bug when many matches in different game weeks start at exactly the same time and you want to show all of them at once.
                // But the website only shows 1 active game week at a time, so we can't easily fix this.

                // This should then mark that the week is incomplete so we should stop adding startOfWeekStandings items after this one.
                foundIncompleteWeekPhase = true;
            }
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
                                points: null,
                                stats: null,
                            }
                        }
                        const prediction = fixture.playerPredictions[player].prediction;
                        
                        const points = calculatePoints(prediction, fixture.finalScore, fixture.bankerMultiplier, fixture.homeTeam, fixture.awayTeam, player);
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

    const awaitingScoresFor: Array<string> = [];

    let nextKickoff: null | Date = null;
    for (const fixture of sortedFixtures) {
        const kickOff = new Date(fixture.kickOff);
        if (kickOff > now) {
            if (nextKickoff === null || kickOff < nextKickoff) {
                nextKickoff = kickOff;
            }
        }

        if (kickOff < now) {
            if (fixture.finalScore === null) {
                // This has kicked off in the past, yet we have no final score for it
                awaitingScoresFor.push(fixture.homeTeam + " vs " + fixture.awayTeam);
            }
        }
    }

    // Strip the mergedPhases of weeks/phases that have not started
    let earliestPhaseNotStarted: null | number = null;
    for (let phaseIndex = mergedPhases.length - 1; phaseIndex >= 0; phaseIndex--) {
        const thisPhase = mergedPhases[phaseIndex];
        if (thisPhase.isStarted || thisPhase.isOngoing) {
            // console.log("This one has started: " + thisPhase.weekId);
            break;
        } else {
            // console.log("Yes, this phase is not started yet: " + thisPhase.weekId + "-" + thisPhase.phaseId);
            earliestPhaseNotStarted = phaseIndex;
        }
    }

    let finalMergedPhases = mergedPhases;
    if (earliestPhaseNotStarted !== null) {
        // console.log("Taking things from 0 - " + earliestPhaseNotStarted);
        finalMergedPhases = mergedPhases.slice(0, earliestPhaseNotStarted);
    }

    return {
        mergedPhases: finalMergedPhases,
        startOfWeekStandings,
        nextRedeploy: nextKickoff ? nextKickoff.toISOString() : null, // This is the date of when the website should next auto redeploy.  Schedule at the next kick off time since this could release some predictions.
        awaitingScoresFor,
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

        pointsAgainst: {},
        awayGoalsAgainst: {},
    }
}

const getZeroTeamPointsRow = (name: string): TeamPointsRow => {
    return {
        name: name,
        home: getZeroHomeAwayPoints(),
        away: getZeroHomeAwayPoints(),
        penalties: [],
        rank: null,
    }
}

export const applyTeamStats = (cumTeamPoints: CumulativeTeamPoints, homeTeam: string, awayTeam: string, homeGoals: number, awayGoals: number) => {
    
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

        teamHome.home.pointsAgainst[awayTeam] = 3;        
        teamAway.away.pointsAgainst[homeTeam] = 0;
        teamAway.away.awayGoalsAgainst[homeTeam] = awayGoals;

        teamAway.away.losses++;

    } else if (homeGoals < awayGoals) {
        // Away win
        teamHome.home.losses++;
        teamAway.away.wins++;
        teamAway.away.points += 3;

        teamHome.home.pointsAgainst[awayTeam] = 0;        
        teamAway.away.pointsAgainst[homeTeam] = 3;
        teamAway.away.awayGoalsAgainst[homeTeam] = awayGoals;

    } else {
        // Draw
        teamHome.home.draws++;
        teamHome.home.points += 1;
        teamAway.away.draws++;
        teamAway.away.points += 1;

        teamHome.home.pointsAgainst[awayTeam] = 1;        
        teamAway.away.pointsAgainst[homeTeam] = 1;
        teamAway.away.awayGoalsAgainst[homeTeam] = awayGoals;

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

        pointsAgainst: {},
        awayGoalsAgainst: {},
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

    // It doesnt make sense to include the head to head in the home/away only tables.
    // So only add these together when we view the "all" table
    if (type === "all") {
        result.pointsAgainst = sumMaps(home.pointsAgainst, away.pointsAgainst);
        result.awayGoalsAgainst = sumMaps(home.awayGoalsAgainst, away.awayGoalsAgainst);
    }

    return result;
}

type NumericMap = {
    [key: string]: number
}
const sumMaps = (map1: NumericMap, map2: NumericMap) : NumericMap => {
    const result: NumericMap = {};
    for (const key1 in map1) {
        if (!(key1 in result)) {
            result[key1] = 0;
        }
        result[key1] += map1[key1];
    }
    for (const key2 in map2) {
        if (!(key2 in result)) {
            result[key2] = 0;
        }
        result[key2] += map2[key2];
    }
    return result;
}

const calculateLeagueTables = (cumTeamPoints: {[key:string]: TeamPointsRow}): LeagueTables => {
    // Just rank all the teams based on their current team points variable
    const homeOnly = getLeagueTableFromCumPoints(cumTeamPoints, "homeOnly");
    const awayOnly = getLeagueTableFromCumPoints(cumTeamPoints, "awayOnly");
    const all = getLeagueTableFromCumPoints(cumTeamPoints, "all");

    rankLeagueTable(homeOnly);
    rankLeagueTable(awayOnly);
    rankLeagueTable(all);

    return {
        homeOnly,
        awayOnly,
        all,
    }
}

export const getLeagueTableFromCumPoints = (cumTeamPoints: {[key:string]: TeamPointsRow}, type: "homeOnly" | "awayOnly" | "all"): LeagueTable => {
    return Object.values(cumTeamPoints).map(team => {
        // Merge the home, away & any deductions in to a single row
        return {
            name: team.name,
            rank: null,
            stats: mergeStats(team.home, team.away, team.penalties, type),
        }
    })
}

const convertToConcisePointsRow = (pointsRow: PointsRow) : ConcisePointsRow => {
    return {
        predicted: pointsRow.predicted,
        missed: pointsRow.missed,

        correctScoresTotal: pointsRow.correctScoresTotal,
        correctGDTotal: pointsRow.correctGDTotal,
        correctOutcomeTotal: pointsRow.correctOutcomeTotal,
        correctTotal: pointsRow.correctTotal,
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