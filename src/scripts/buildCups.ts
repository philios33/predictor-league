import { BuiltCups, CupGroup, CupMatchGame, CupWeek, FinalScore, HomeAwayPoints, MatchPointsRow, MatchStatusType, Prediction, ProgressType } from "../lib/types"
import fs from 'fs';
import { getCachedMatchSchedule, getCachedMatchScores } from "../lib/predictor/cached";
import { getCachedResults } from "../lib/predictor/cachedResults";
import { rankLeagueTable } from "../lib/predictor/table";

export {}

const getCupMatch = (player1Name: string, player1Progress: ProgressType, player2Name: string, player2Progress: ProgressType, matchText: string): CupMatchGame => {
    return {
        home: {
            name: player1Name,
            prediction: null,
            cupGoals: null,
            progress: player1Progress,
        },
        away: {
            name: player2Name,
            prediction: null,
            cupGoals: null,
            progress: player2Progress,
        },
        text: matchText,
        status: "upcoming",
    }
}

const groups: Array<CupGroup> = [{
    name: "Group A",
    players: ['Damo','Rob','Mike'],
    table: null,
    playersProgressed: [],
    playersKnockedOut: [],
},{
    name: "Group B",
    players: ['Rod','Jez','Ian'],
    table: null,
    playersProgressed: [],
    playersKnockedOut: [],
},{
    name: "Group C",
    players: ['Lawro','Dave','Phil'],
    table: null,
    playersProgressed: [],
    playersKnockedOut: [],
}];

const koPhase: Array<CupWeek> = [];
const leaguePhase: Array<CupWeek> = [];

/*
koPhase.push({
    week: "7",
    description: "Final",
    homeTeam: "Leeds United",
    awayTeam: "Watford",
    score: null,
    matches: [
        getCupMatch("Jez", "out", "Rob", "winner", ""),
    ]
});
koPhase.push({
    week: "6",
    description: "Semi Finals",
    homeTeam: "Crystal Palace",
    awayTeam: "Brighton & Hove Albion",
    score: null,
    matches: [
        getCupMatch("Jez", "through", "Phil", "out", ""),
        getCupMatch("Ian", "out", "Rob", "through", ""),
    ]
});
*/

/*
leaguePhase.push({
    week: "5",
    description: "Group match day 3",
    homeTeam: "Newcastle United",
    awayTeam: "Leeds United",
    score: null,
    matches: [
        getCupMatch("Dave", null, "Ian", null, ""),
        getCupMatch("Rob", null, "Mike", null, ""),
        getCupMatch("Lawro", null, "Jez", null, ""),
    ]
});

leaguePhase.push({
    week: "4",
    description: "Group match day 2",
    homeTeam: "Arsenal",
    awayTeam: "Norwich City",
    score: null,
    matches: [
        getCupMatch("Phil", null, "Ian", null, ""),
        getCupMatch("Rod", null, "Mike", null, ""),
        getCupMatch("Damo", null, "Jez", null, ""),
    ]
});

*/

leaguePhase.push({
    week: "8",
    description: "Group match day 1",
    homeTeam: "Everton",
    awayTeam: "West Ham United",
    score: null,
    matches: [
        getCupMatch("Damo", null, "Rob", null, ""),
        getCupMatch("Rod", null, "Jez", null, ""),
        getCupMatch("Lawro", null, "Dave", null, ""),
    ]
});


const cupData: BuiltCups = {};

cupData["mrEggCup2021"] = {
    name: "The Mr Egg Memorial Egg Cup 2021",
    details: [
        "The predictor cup runs in tandem with the predictor league.",
        "The 9 players are divided in to 3 groups.  We can do a draw in whatsapp.",
        "One specific match is chosen (by Mike) to be the designated cup match for that week.",
        "To win your cup match, you must beat your rival's prediction score for that match.",
        "Bankers are irrelevant for cup match results.",
        "Win = 3 points, Draw = 1 point.",
        "Incorrect Result = 0 goals, Correct Result = 1 goal, Correct GD = 2 goals, Correct Score = 3 goals.",
        "Groups are sorted by points, goal difference then goals scored.",
        "Away cup goals are NOT considered more valuable than home cup goals during group rankings or multi-legged playoffs.",
        "All players play the other two in their group once.  This will take 3 match weeks with a rotating 6 of 9 players competing in the cup.",
        "The winners of the 3 groups and the best 2nd place player will enter the semi final draw.",
        "An extra playoff match week may be required to determine the best 2nd placed player.",
        "The semi final draw happens on Whatsapp.",
        "Semi finals and the final can have infinite replays in the case of a draw.",
        "The fact that a match is a designated cup match against a rival player should be made clear to both players in good time on the predictions screen, or agreed on whatsapp.",
        "With no playoffs and no replays this cup will last 5 weeks.",
    ],
    semis: null,
    /*
    semis: {
        left: {
            home: {
                name: "Jez",
                progress: "through",
                cupGoals: 3,
            },
            away: {
                name: "Phil",
                progress: "out",
                cupGoals: 2,
            },
            text: "",
        },
        right: {
            home: {
                name: "Ian",
                progress: "out",
                cupGoals: 0,
            },
            away: {
                name: "Rob",
                progress: "through",
                cupGoals: 3,
            },
            text: "",
        },
        final: {
            home: {
                name: "Jez",
                progress: "out",
                cupGoals: 2,
            },
            away: {
                name: "Rob",
                progress: "winner",
                cupGoals: 3,
            },
            text: "",
        },
        winner: "Rob",
    },
    */
    koPhaseWeeks: koPhase,
    groups: groups,
    groupPhaseWeeks: leaguePhase,
};

// Now we fill in the nulls by adding the match scores, predictions, and work out the points and match status
const scores = getCachedMatchScores();
const results = getCachedResults();
const schedule = getCachedMatchSchedule();

const getMatchScore = (weekId: string, homeTeam: string, awayTeam: string): FinalScore | null => {

    // Make sure this match is found in the schedule and that week ids match up.
    // This prevents us from accidently putting the wrong match in the wrong cup week.
    if (homeTeam in schedule.matches) {
        if (awayTeam in schedule.matches[homeTeam].against) {
            const match = schedule.matches[homeTeam].against[awayTeam];
            if (match.weekId === weekId) {
                // OK found and correct week
            } else {
                throw new Error("The match " + homeTeam + " vs " + awayTeam + " is scheduled for week " + match.weekId + " and NOT week " + weekId);
            }
        } else {
            throw new Error("Not found scheduled match: " + homeTeam + " vs " + awayTeam);
        }
    } else {
        throw new Error("Not found scheduled match: " + homeTeam + " vs " + awayTeam);
    }

    if (homeTeam in scores) {
        const home = scores[homeTeam];
        if (awayTeam in home.against) {
            const found = home.against[awayTeam];
            if (found.type === "finalScore") {
                return found;
            }
        }
    }
    return null;
}

const getPlayerPredictionPoints = (homeTeam: string, awayTeam: string, playerName: string) : [Prediction | null, MatchPointsRow | null]=> {
    // Loop through every week and find this match and prediction
    const now = new Date();
    for (const phase of results.mergedPhases) {
        for (const fg of phase.fixtureGroups) {
            for (const fixture of fg.fixtures) {
                if (homeTeam === fixture.homeTeam && awayTeam === fixture.awayTeam) {
                    // This it the match
                    if (now > new Date(fixture.kickOff)) {
                        // Don't reveal the prediction until the match has kicked off
                        if (playerName in fixture.playerPredictions) {
                            const found = fixture.playerPredictions[playerName];
                            if (found.prediction?.type === "prediction") {
                                return [found.prediction, found.points];
                            }
                        }
                    }
                }
            }
        }
    }
    return [null, null];
}

const getZero = () : HomeAwayPoints => {
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

const getPlayerStatsByName = (groups: Array<CupGroup>, name: string) : HomeAwayPoints => {
    for (const thisGroup of groups) {
        if (thisGroup.table === null) {
            throw new Error("The table is not initialised for group: " + thisGroup.name);
        }
        for (const row of thisGroup.table) {
            if (row.name === name) {
                return row.stats;
            }
        }
    }
    console.error("GROUPS", groups);
    throw new Error("Couldn't find player stats row: " + name);
}

const pointsToCupGoals = (points: MatchPointsRow) : number => {
    if (points.regularPoints === -1) {
        return 0;
    } else if (points.regularPoints === 2) {
        return 1;
    } else if (points.regularPoints === 4) {
        return 2;
    } else if (points.regularPoints === 7) {
        return 3;
    } else {
        throw new Error("Cannot work out the cup goals from the calculated regularPoints value");
    }
}

for (const cupId in cupData) {
    const thisCup = cupData[cupId];
    console.log("Doing cup: " + thisCup.name);

    // Initialise the group tables
    for (const group of thisCup.groups) {
        group.table = [];
        for (const player of group.players) {
            group.table.push({
                name: player,
                rank: null,
                stats: getZero(),
            })
        }
    }

    // Do the phase weeks
    for (const phaseWeek of thisCup.groupPhaseWeeks) {
        // Find out what the real score was between these two teams
        console.log("Processing match: " + phaseWeek.homeTeam + " vs " + phaseWeek.awayTeam);

        phaseWeek.score = getMatchScore(phaseWeek.week, phaseWeek.homeTeam, phaseWeek.awayTeam);
        if (phaseWeek.score !== null) {
            console.log("The score was: " + phaseWeek.score.homeTeam + " - " + phaseWeek.score.awayTeam);
            for (const match of phaseWeek.matches) {
                const [homePrediction, homePoints] = getPlayerPredictionPoints(phaseWeek.homeTeam, phaseWeek.awayTeam, match.home.name);
                if (homePrediction !== null) {
                    match.home.prediction = homePrediction.homeTeam + " - " + homePrediction.awayTeam;
                    if (homePoints !== null) {
                        match.home.cupGoals = pointsToCupGoals(homePoints);
                    }
                }

                const [awayPrediction, awayPoints] = getPlayerPredictionPoints(phaseWeek.homeTeam, phaseWeek.awayTeam, match.away.name);
                if (awayPrediction) {
                    match.away.prediction = awayPrediction.homeTeam + " - " + awayPrediction.awayTeam;
                    if (awayPoints !== null) {
                        match.away.cupGoals = pointsToCupGoals(awayPoints);
                    }
                }
                
                if (match.home.cupGoals !== null && match.away.cupGoals !== null) {

                    const homeStats = getPlayerStatsByName(thisCup.groups, match.home.name);
                    const awayStats = getPlayerStatsByName(thisCup.groups, match.away.name);

                    homeStats.played++;
                    awayStats.played++;
                    homeStats.goalsFor += match.home.cupGoals;
                    homeStats.goalsAgainst += match.away.cupGoals;
                    awayStats.goalsFor += match.away.cupGoals;
                    awayStats.goalsAgainst += match.home.cupGoals;
                    
                    if (match.home.cupGoals > match.away.cupGoals) {
                        match.status = "homeWin";
                        homeStats.wins++;
                        homeStats.points += 3;
                        awayStats.losses++;
                    } else if (match.home.cupGoals < match.away.cupGoals) {
                        match.status = "awayWin";
                        awayStats.wins++;
                        awayStats.points += 3;
                        homeStats.losses++;
                    } else {
                        match.status = "draw";
                        homeStats.points += 1;
                        homeStats.draws++;
                        awayStats.points += 1;
                        awayStats.draws++;
                    }
                    console.log("Finished match: " + match.home.name + " (" + match.home.prediction + ") vs " + match.away.name + " (" + match.away.prediction + ") the result was " + match.home.cupGoals + " - " + match.away.cupGoals + " so a " + match.status);
                } else {
                    console.log("Couldn't get prediction or points for match: " + match.home.name + " vs " + match.away.name);
                }
            }
        } else {
            console.log("The score is unknown, it must be upcoming");
        }
    }

    // Work out the group tables now
    for (const group of thisCup.groups) {
        if (group.table === null) {
            throw new Error("Why is this league table null?");
        }
        rankLeagueTable(group.table);
        // console.log("TABLE", group.name, JSON.stringify(group.table, null, 4));
    }

    // Repeat for KO phase weeks, except don't bother with tables logic
    for (const phaseWeek of thisCup.koPhaseWeeks) {
        // Find out what the real score was between these two teams
        console.log("Processing match: " + phaseWeek.homeTeam + " vs " + phaseWeek.awayTeam);

        phaseWeek.score = getMatchScore(phaseWeek.week, phaseWeek.homeTeam, phaseWeek.awayTeam);
        if (phaseWeek.score !== null) {
            console.log("The score was: " + phaseWeek.score.homeTeam + " - " + phaseWeek.score.awayTeam);
            for (const match of phaseWeek.matches) {
                const [homePrediction, homePoints] = getPlayerPredictionPoints(phaseWeek.homeTeam, phaseWeek.awayTeam, match.home.name);
                if (homePrediction !== null) {
                    match.home.prediction = homePrediction.homeTeam + " - " + homePrediction.awayTeam;
                    if (homePoints !== null) {
                        match.home.cupGoals = pointsToCupGoals(homePoints);
                    }
                }

                const [awayPrediction, awayPoints] = getPlayerPredictionPoints(phaseWeek.homeTeam, phaseWeek.awayTeam, match.away.name);
                if (awayPrediction) {
                    match.away.prediction = awayPrediction.homeTeam + " - " + awayPrediction.awayTeam;
                    if (awayPoints !== null) {
                        match.away.cupGoals = pointsToCupGoals(awayPoints);
                    }
                }
                
                if (match.home.cupGoals !== null && match.away.cupGoals !== null) {
                    if (match.home.cupGoals > match.away.cupGoals) {
                        match.status = "homeWin";
                    } else if (match.home.cupGoals < match.away.cupGoals) {
                        match.status = "awayWin";
                    } else {
                        match.status = "draw";
                    }
                    console.log("Finished match: " + match.home.name + " (" + match.home.prediction + ") vs " + match.away.name + " (" + match.away.prediction + ") the result was " + match.home.cupGoals + " - " + match.away.cupGoals + " so a " + match.status);
                } else {
                    console.log("Couldn't get prediction or points for match: " + match.home.name + " vs " + match.away.name);
                }
            }
        } else {
            console.log("The score is unknown, it must be upcoming");
        }
    }
}

// Write this to cups.json and use it in the specific cup page rendering
fs.writeFileSync(__dirname + "/../compiled/cups.json", JSON.stringify(cupData, null, 4));

