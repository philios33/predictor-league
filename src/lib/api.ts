
import GoogleAuth from "./googleAuth";
import { getPlayerNames } from "./players";
import { getCachedMatchSchedule, getCachedMatchScores } from "./predictor/cached";
import { getCachedResults } from "./predictor/cachedResults";
import { writePrediction } from "./predictor/matches";
import { getAllUserPredictions } from "./predictor/predictions";
import { CompiledSchedule, HiddenPrediction, PointsRow, Prediction, PredictionFixture, TeamMatchesAgainstPredictions, TeamMatchesAgainstScores, UserMeta, WeekFixtures } from "./types";
import { addPoints, calculatePoints, calculateResultType, getBankerMultiplier } from "./util";



export async function getThisWeek(gauth: GoogleAuth, weekId: string, playerName: string) : Promise<WeekFixtures> {

    const playerNames = getPlayerNames();
    if (playerNames.indexOf(playerName) === -1) {
        throw new Error("Unknown player: " + playerName);
    }

    const result = await getWeekFixtures(gauth, weekId, true, [playerName]);

    // Remove sensitive meta data
    result.players[playerName].userMeta = {};
    result.loggedInAs = playerName;

    return result;
}

export async function getWeekFixtures(gauth: GoogleAuth, weekId: string, withScores: boolean, withPredictions: Array<string>) : Promise<WeekFixtures> {
    
    const results = getCachedResults();

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
            userMeta: UserMeta
        }
    };
    const players: {
        [key: string]: {
            points: PointsRow | null;
            userMeta: UserMeta;
        };
    } = {};
    for(const player of withPredictions) {
        const playerData = await getAllUserPredictions(gauth, player);
        playerPredictions[player] = {
            predictions: playerData.homeTeams,
            cumPoints: null,
            userMeta: playerData.meta,
        };
    }

    const foundFixtures: Array<PredictionFixture> = [];
    for (const homeTeam in fixtures.matches) {
        const thisTeam = fixtures.matches[homeTeam];

        for(const awayTeam in thisTeam.against) {
            const fixture = thisTeam.against[awayTeam];
            
            const fixtureKickOff = new Date(fixture.kickOff);
            if (fixture.weekId === weekId) {
                // This fixture is relevant
                foundFixtures.push({
                    homeTeam,
                    awayTeam,
                    kickOff: fixture.kickOff,
                    weekId,
                    finalScore: null,
                    playerPredictions: {},
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
            const predictions = playerPredictions[playerName].predictions;
            // Try to find this match in their predictions
            if (predictions) {
                if (fixture.homeTeam in predictions) {
                    if (fixture.awayTeam in predictions[fixture.homeTeam].against) {
                        fixture.playerPredictions[playerName] = {
                            prediction: predictions[fixture.homeTeam].against[fixture.awayTeam],
                            points: null,
                        }
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
            userMeta: playerPredictions[player].userMeta,
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

export async function validatePlayerSecret(gauth: GoogleAuth, userName: string, userSecret: string) {
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

    const playerNames = getPlayerNames();

    const current = await getWeekFixtures(gauth, weekId, true, [userName]);

    if (!current.players[userName].userMeta) {
        throw new Error("Missing expected user meta");
    }
    if (!("email" in current.players[userName].userMeta)) {
        throw new Error("Missing user meta: email");
    }

    const fixture = current.fixtures.find((fixture) => {
        return fixture.homeTeam === homeTeam && fixture.awayTeam === awayTeam;
    });
    if (!fixture) {
        throw new Error("Could not find the fixture: " + homeTeam + " vs " + awayTeam + " during week: " + weekId);
    }

    if (fixture.finalScore !== null) {
        throw new Error("Sorry, this match already has a final score: " + fixture.finalScore.homeTeam + " - " + fixture.finalScore.awayTeam);
    }

    const now = new Date();
    const fixtureKickoff = new Date(fixture.kickOff);
    if (fixtureKickoff < now) {
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

