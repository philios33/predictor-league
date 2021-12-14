
import GoogleAuth from "./googleAuth";
import { getPlayerNames } from "./players";
import { getCachedMatchSchedule, getCachedMatchScores } from "./predictor/cached";
import { getCachedResults } from "./predictor/cachedResults";
import { writePrediction } from "./predictor/matches";
import { getAllUserPredictions } from "./predictor/predictions";
import { CompiledSchedule, CupMatchFixture, HiddenPrediction, LeagueTables, MatchPredictionStats, PointsRow, Prediction, PredictionFixture, PredictionStats, TeamMatchesAgainstPredictions, TeamMatchesAgainstScores, WeekFixtures } from "./types";
import { addPoints, calculatePoints, calculateResultType, getBankerMultiplier } from "./util";
import fs from 'fs';
import { getCachedCups } from "./predictor/cachedCups";
import { getCachedStats } from "./predictor/cachedStats";
import { sortAndDeduplicateDiagnostics } from "typescript";


export async function getThisWeek(gauth: GoogleAuth, weekId: string, playerName: string) : Promise<WeekFixtures> {

    const playerNames = getPlayerNames();
    if (playerNames.indexOf(playerName) === -1) {
        throw new Error("Unknown player: " + playerName);
    }

    const result = await getWeekFixtures(gauth, weekId, true, [playerName]);

    // Remove sensitive meta data
    // result.players[playerName].userMeta = {};
    result.loggedInAs = playerName;

    return result;
}

const stats = getCachedStats();

function findSegmentFromTeamName(teamName: string, leagueTables: LeagueTables) {
    const tableRow = leagueTables.all.find(t => t.name === teamName);
    if (tableRow) {
        const rank = tableRow.rank;
        if (rank) {
            if (rank <= 6) {
                return "top6";
            } else if (rank >= 15) {
                return "bottom6";
            } else {
                return "middle8";
            }
        }
    }
    throw new Error("Couldn't find rank for team: " + teamName);
}

function getScoresList() : Array<{home: number, away: number}> {
    return [
        {home: 0, away: 0},
        {home: 1, away: 1},
        {home: 2, away: 2},
        {home: 3, away: 3},
        {home: 4, away: 4},
        {home: 5, away: 5},

        // Home wins
        {home: 1, away: 0},

        {home: 2, away: 0},
        {home: 2, away: 1},

        {home: 3, away: 0},
        {home: 3, away: 1},
        {home: 3, away: 2},

        {home: 4, away: 0},
        {home: 4, away: 1},
        {home: 4, away: 2},
        {home: 4, away: 3},

        {home: 5, away: 0},
        {home: 5, away: 1},
        {home: 5, away: 2},
        {home: 5, away: 3},
        {home: 5, away: 4},

        // Away wins

        {home: 0, away: 1},

        {home: 0, away: 2},
        {home: 1, away: 2},

        {home: 0, away: 3},
        {home: 1, away: 3},
        {home: 2, away: 3},

        {home: 0, away: 4},
        {home: 1, away: 4},
        {home: 2, away: 4},
        {home: 3, away: 4},

        {home: 0, away: 5},
        {home: 1, away: 5},
        {home: 2, away: 5},
        {home: 3, away: 5},
        {home: 4, away: 5},
    ]
}

function calculateWeighting(home: PredictionStats, away: PredictionStats, homeGoals: number, awayGoals: number): number {
    // Weighting score is based on percentage points of the other two results, plus weighted goals for, plus weighted GD difference
    const homeForGoalsWeight = 10;
    const homeGDWeight = 16;
    const awayForGoalsWeight = 8;
    const awayGDWeight = 14;

    let score = 0;
    if (home.predictions > 0) {

        if (homeGoals > awayGoals) {
            // Home win, use perc points for draws and losses
            score += 100 * ((home.draws + home.losses) / home.predictions);
        } else if (homeGoals < awayGoals) {
            // Away win, use perc points for draws and wins
            score += 100 * ((home.draws + home.wins) / home.predictions);
        } else {
            // Draw, use perc points for wins and losses
            score += 100 * ((home.draws + home.losses) / home.predictions);
        }

        const homeAvrGoalsFor = home.goalsFor / home.predictions;
        const homeAvrGD = (home.goalsFor - home.goalsAgainst) / home.predictions;
        score += Math.abs(homeAvrGoalsFor - homeGoals) * homeForGoalsWeight;
        score += Math.abs(homeAvrGD - (homeGoals - awayGoals)) * homeGDWeight;
    }
    if (away.predictions > 0) {

        if (homeGoals > awayGoals) {
            // Home win, Away loss, use perc points for draws and wins
            score += 100 * ((away.draws + away.wins) / away.predictions);

        } else if (homeGoals < awayGoals) {
            // Away win, use perc points for draws and losses
            score += 100 * ((away.draws + away.losses) / away.predictions);

        } else {
            // Draw, use perc points for wins and losses
            score += 100 * ((away.draws + away.losses) / away.predictions);

        }

        const awayAvrGoalsFor = away.goalsFor / away.predictions;
        const awayAvrGD = (away.goalsFor - away.goalsAgainst) / away.predictions;
        score += Math.abs(awayAvrGoalsFor - awayGoals) * awayForGoalsWeight;
        score += Math.abs(awayAvrGD - (awayGoals - homeGoals)) * awayGDWeight;
    }

    return score;
}

function calculateMostLikelyPrediction(home: PredictionStats, away: PredictionStats): {homeGoals: number, awayGoals: number} {
    const scoresList = getScoresList();
    const scoreWeights: Array<{
        homeGoals: number
        awayGoals: number
        text: string
        weight: number
    }> = [];
    for (const score of scoresList) {
        const weighting = calculateWeighting(home, away, score.home, score.away);
        const scoreKey = score.home + "-" + score.away;
        scoreWeights.push({
            homeGoals: score.home,
            awayGoals: score.away,
            text: scoreKey,
            weight: weighting,
        });
    }

    scoreWeights.sort((a, b) => {
        return a.weight - b.weight;
    });

    // console.log("Weights", JSON.stringify(scoreWeights, null, 4));
    return {
        homeGoals: scoreWeights[0].homeGoals,
        awayGoals: scoreWeights[0].awayGoals,
    }
}

function findPlayersPredictionStats(playerName: string, homeTeam: string, awayTeam: string, leagueTables: LeagueTables) : null | MatchPredictionStats {

    const homeTeamSegment: "top6" | "middle8" | "bottom6" = findSegmentFromTeamName(homeTeam, leagueTables);
    const awayTeamSegment: "top6" | "middle8" | "bottom6" = findSegmentFromTeamName(awayTeam, leagueTables);

    let home: null | PredictionStats = null;
    let away: null | PredictionStats = null;

    if (playerName in stats) {
        if (homeTeam in stats[playerName]) {
            if (homeTeamSegment in stats[playerName][homeTeam].home) {
                home = stats[playerName][homeTeam].home[awayTeamSegment];
            }
        }
        if (awayTeam in stats[playerName]) {
            if (awayTeamSegment in stats[playerName][awayTeam].away) {
                away = stats[playerName][awayTeam].away[homeTeamSegment];
            }
        }
    }

    if (home !== null && away !== null) {

        const mostLikelyPrediction = calculateMostLikelyPrediction(home, away);
        return {
            homeTeam: home,
            homeTeamSegment,
            awayTeam: away,
            awayTeamSegment,
            mostLikelyPrediction,
        }
    } else {
        return null;
    }
}

export async function getWeekFixtures(gauth: GoogleAuth, weekId: string, withScores: boolean, withPredictions: Array<string>) : Promise<WeekFixtures> {
    
    const results = getCachedResults();

    const cups = getCachedCups();

    const fixtures = getCachedMatchSchedule() as CompiledSchedule;
    let scores = null as null | {
        [key: string]: TeamMatchesAgainstScores
    }
    if (withScores) {
        scores = getCachedMatchScores();
    }
    let playerPredictions = {} as {
        [key: string]: {
            predictions: {[key: string] : TeamMatchesAgainstPredictions}
            cumPoints: null | PointsRow,
            // userMeta: UserMeta
        }
    };
    const players: {
        [key: string]: {
            points: PointsRow | null;
            // userMeta: UserMeta;
        };
    } = {};
    for(const player of withPredictions) {
        const playerData = await getAllUserPredictions(gauth, player);
        playerPredictions[player] = {
            predictions: playerData.homeTeams,
            cumPoints: null,
            // userMeta: playerData.meta,
        };
    }

    // console.log("PLAYER PREDICTIONS", JSON.stringify(playerPredictions, null, 4));

    const foundFixtures: Array<PredictionFixture> = [];
    for (const homeTeam in fixtures.matches) {
        const thisTeam = fixtures.matches[homeTeam];

        for(const awayTeam in thisTeam.against) {
            const fixture = thisTeam.against[awayTeam];
            
            // const fixtureKickOff = new Date(fixture.kickOff);
            if (fixture.weekId === weekId) {
                // This fixture is relevant

                const cupMatches: Array<CupMatchFixture> = [];

                // Loop through every cup to work out which games are relevant for this real life match
                for (const cupId in cups) {
                    const thisCup = cups[cupId];
                    for (const phaseWeek of thisCup.groupPhaseWeeks) {
                        if (phaseWeek.homeTeam === homeTeam && phaseWeek.awayTeam === awayTeam) {
                            for (const thisMatch of phaseWeek.matches) {
                                // If the match is relevant to this person
                                if (withPredictions.includes(thisMatch.away.name) || withPredictions.includes(thisMatch.home.name)) {
                                    // Yes
                                    cupMatches.push({
                                        cupName: thisCup.name,
                                        weekDescription: phaseWeek.description,
                                        fixture: thisMatch
                                    });
                                }
                            }
                        }
                    }
                    for (const phaseWeek of thisCup.koPhaseWeeks) {
                        if (phaseWeek.homeTeam === homeTeam && phaseWeek.awayTeam === awayTeam) {
                            for (const thisMatch of phaseWeek.matches) {
                                // If the match is relevant to this person
                                if (withPredictions.includes(thisMatch.away.name) || withPredictions.includes(thisMatch.home.name)) {
                                    // Yes
                                    cupMatches.push({
                                        cupName: thisCup.name,
                                        weekDescription: phaseWeek.description,
                                        fixture: thisMatch
                                    });
                                }
                            }
                        }
                    }
                }

                foundFixtures.push({
                    homeTeam,
                    awayTeam,
                    kickOff: fixture.kickOff,
                    weekId,
                    finalScore: null,
                    playerPredictions: {},
                    cupMatches: cupMatches,
                })
            }
        }
    }

    for (const fixture of foundFixtures) {

        // Try to find this in the scores
        if (scores !== null) {
            if (fixture.homeTeam in scores) {
                if (fixture.awayTeam in scores[fixture.homeTeam].against) {
                    fixture.finalScore = scores[fixture.homeTeam].against[fixture.awayTeam];
                }
            }
        }

        // For every playersPredictions
        for (const playerName in playerPredictions) {

            let stats: MatchPredictionStats | null = null;
            if (fixture.weekId in results.startOfWeekStandings) {
                stats = findPlayersPredictionStats(playerName, fixture.homeTeam, fixture.awayTeam, results.startOfWeekStandings[fixture.weekId].leagueTables);
            }

            fixture.playerPredictions[playerName] = {
                prediction: null,
                points: null,
                stats,
            }

            const predictions = playerPredictions[playerName].predictions;
            // Try to find this match in their predictions
            if (predictions) {
                if (fixture.homeTeam in predictions) {
                    if (fixture.awayTeam in predictions[fixture.homeTeam].against) {
                        fixture.playerPredictions[playerName].prediction = predictions[fixture.homeTeam].against[fixture.awayTeam];
                    }
                }
            }
        }

        // If theres a prediction and a score, calculate the points
        if (fixture.finalScore) {
            for (const playerName of withPredictions) {

                let prediction : null | Prediction | HiddenPrediction = null;
                if (playerName in fixture.playerPredictions) {
                    prediction = fixture.playerPredictions[playerName].prediction;
                }

                // Check the computed results to find out our banker power here (default to 2)
                // const bankerMultiplier = results.startOfWeekStandings[weekId]?.bankerMultipliers[playerName] || 2;
                const bankerMultiplier = getBankerMultiplier(fixture.weekId, fixture.homeTeam, fixture.awayTeam, results.startOfWeekStandings[fixture.weekId].leagueTables);
                
                const points = calculatePoints(prediction, fixture.finalScore, bankerMultiplier);
                if (playerName in fixture.playerPredictions) {
                    fixture.playerPredictions[playerName].points = {
                        type: calculateResultType(prediction, fixture.finalScore),
                        bankerPoints: points.bankerPoints,
                        regularPoints: points.regularPoints,
                        totalPoints: points.totalPoints,
                    }
                }
                // Add these up
                playerPredictions[playerName].cumPoints = addPoints(playerPredictions[playerName].cumPoints, points);
            }
        }
    }

    const sortedFixtures = foundFixtures.sort((a,b) => {
        // Sort by kickoff
        const aDate = new Date(a.kickOff);
        const bDate = new Date(b.kickOff);

        return aDate.getTime() - bDate.getTime()
    });

    for(const player of withPredictions) {
        players[player] = {
            points: playerPredictions[player].cumPoints,
            // userMeta: playerPredictions[player].userMeta,
        }
    }
    return {
        week: fixtures.weeksMap[weekId],
        fixtures: sortedFixtures,
        players,
    };

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


const playerCredentials: {[key: string]: string} = JSON.parse(fs.readFileSync(__dirname + "/../keys/players.json").toString("utf8"));

export async function validatePlayerSecret(gauth: GoogleAuth, userName: string, userSecret: string) {
    /*
    const current = await getWeekFixtures(gauth, "1", false, [userName]);

    if (!current.players[userName].userMeta) {
        throw new Error("Missing expected user meta");
    }
    if (!("email" in current.players[userName].userMeta)) {
        throw new Error("Missing user meta: email");
    }
    if (!("secret" in current.players[userName].userMeta)) {
        throw new Error("Missing user meta: secret");
    }

    if (userSecret.length < 6) {
        throw new Error("Given secret is too short");
    }
    if (current.players[userName].userMeta.secret.length < 6) {
        throw new Error("User secret is set too short");
    }
    if (userSecret !== current.players[userName].userMeta.secret) {
        throw new Error("The secret is wrong");
    }
    */
    
    if (userSecret.length < 6) {
        throw new Error("Given secret is too short");
    }

    if (userName in playerCredentials) {
        const expected = playerCredentials[userName];
        if (expected !== userSecret) {
            console.warn("Incorrect secret for ", userName, "expecting", expected, "but received", userSecret);
            throw new Error("Incorrect secret");
        } else {
            // GOOD
        }
    } else {
        throw new Error("Unknown user: " + userName);
    }

}

export async function savePrediction(gauth: GoogleAuth, weekId: string, userName: string, homeTeam: string, awayTeam: string, homeScore: number, awayScore: number, isBanker: boolean) : Promise<Array<PredictionFixture>> {
    /*
        1. Read the current fixture week with scores and predictions for this user
        3. Make sure the Match exists within this week
        4. Make sure the Match doesn't have a final score
        5. Make sure the Match hasn't kicked off yet
        6. Then overwrite the current prediction with the given score
        7. If we are setting a banker score, remove all other banker predictions for this week
            Note: This means that we could be potentially updating all the scores if we are setting a banker score 
            so we need to lock ALL scores in the UI until a response is received.
        8. The complete state for the week is sent back after every save.  This is taken from the initial read with the data overwritten, rather than a pointless 2nd read.
    */

    // Set this to true when you want to override any timing errors
    const circumventErrors = false;

    const playerNames = getPlayerNames();

    const current = await getWeekFixtures(gauth, weekId, true, [userName]);

    /*
    if (!current.players[userName].userMeta) {
        throw new Error("Missing expected user meta");
    }
    if (!("email" in current.players[userName].userMeta)) {
        throw new Error("Missing user meta: email");
    }
    */

    const fixture = current.fixtures.find((fixture) => {
        return fixture.homeTeam === homeTeam && fixture.awayTeam === awayTeam;
    });
    if (!fixture) {
        throw new Error("Could not find the fixture: " + homeTeam + " vs " + awayTeam + " during week: " + weekId);
    }

    if (!circumventErrors && fixture.finalScore !== null) {
        throw new Error("Sorry, this match already has a final score: " + fixture.finalScore.homeTeam + " - " + fixture.finalScore.awayTeam);
    }

    const now = new Date();
    const fixtureKickoff = new Date(fixture.kickOff);
    if (!circumventErrors && fixtureKickoff < now) {
        throw new Error("Sorry, this match has already kicked off");
    }

    let removingPrediction = false;
    if (homeScore === -1 && awayScore === -1) {
        // Delete this score by writing "" in the cell
        removingPrediction = true;
    } else {
        if (homeScore < 0 || homeScore > 20) {
            throw new Error("Home score out of range (0-20)");
        }
        if (awayScore < 0 || awayScore > 20) {
            throw new Error("Away score out of range (0-20)");
        }
    }

    // There is an edge case where a user cannot move their banker if it is already in use by another match that is locked because it kicked off
    // In this case, we silently change it to a non banker prediction
    let bankerAlreadyUsed = false;
    for(const fixture of current.fixtures) {
        const fixtureKickoff = new Date(fixture.kickOff);
        if (fixture.finalScore !== null || fixtureKickoff < now) {
            // Prediction is locked
            if (fixture.playerPredictions[userName]) {
                const prediction = fixture.playerPredictions[userName].prediction;
                if (prediction) {
                    if (prediction.type === "prediction") {
                        if (prediction.isBanker) {
                            bankerAlreadyUsed = true;
                        }
                    }
                }
            }
        }
    };
    if (bankerAlreadyUsed && isBanker) {
        console.warn("The banker has already been used in some other locked match");
        isBanker = false;
    }
    

    const cellRef = getCellRefByMatch(homeTeam, awayTeam);

    const scoreText = (removingPrediction ? "" : homeScore + "-" + awayScore) + (isBanker ? "B" : "");

    await writePrediction(gauth, userName, cellRef, scoreText);

    // Now we simply update the prediction in the read model we have
    const newPrediction: Prediction = {
        type: "prediction",
        homeTeam: homeScore,
        awayTeam: awayScore,
        isBanker: isBanker,
    }
    if (!(userName in fixture.playerPredictions)) {
        fixture.playerPredictions[userName] = {
            prediction: newPrediction,
            points: null,
            stats: null,
        }
    } else {
        fixture.playerPredictions[userName].prediction = newPrediction;
    }

    if (isBanker) {
        // Unbankerify the other results since you can only have 1 banker
        for (const otherFixture of current.fixtures) {
            if (otherFixture !== fixture) {
                if (otherFixture.playerPredictions[userName]) {
                    const otherFixturePrediction = otherFixture.playerPredictions[userName].prediction;
                    if (otherFixturePrediction && otherFixturePrediction.type === "prediction") {
                        if (otherFixturePrediction.isBanker) {
                            if (fixture.finalScore !== null || fixtureKickoff < now) {
                                // Prediction is locked, Shit we already set the banker in another fixture
                                throw new Error("Double banker detected, please fix it in the spreadsheet");
                            } else {
                                const cellRef = getCellRefByMatch(otherFixture.homeTeam, otherFixture.awayTeam);
                                const scoreText = otherFixturePrediction.homeTeam + "-" + otherFixturePrediction.awayTeam;
                                await writePrediction(gauth, userName, cellRef, scoreText);
                                // Now it is not a banker prediction
                                otherFixturePrediction.isBanker = false;
                            }
                        }
                    }
                }
            }
        }
    }

    return current.fixtures;
}

