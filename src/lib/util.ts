import { FinalScore, HiddenPrediction, LeagueTables, MatchResultType, PointsRow, Prediction, Top4LeagueTables } from "./types";



export const getLogin = () : {token: string, username: string} | null => {
    const login = localStorage.getItem("login");
    if (login !== null) {
        const decoded = JSON.parse(login);
        return {
            token: decoded.token,
            username: decoded.username,
        }
    } else {
        return null;
    }
}

const calculateFinalScoreType = (finalScore: FinalScore) : "homeWin" | "draw" | "awayWin" => {
    if (finalScore.homeTeam > finalScore.awayTeam) {
        return "homeWin";

    } else if (finalScore.homeTeam < finalScore.awayTeam) {
        return "awayWin";

    } else {
        return "draw";
    }
}

export const calculateResultType = (prediction: null | Prediction | HiddenPrediction, finalScore: FinalScore) : MatchResultType => {
    if (prediction === null) {
        return "noPrediction";
    }
    if (prediction.type === "hidden") {
        return "hidden";
    }
    if (prediction.type === "prediction") {
        if (prediction.homeTeam === finalScore.homeTeam && prediction.awayTeam === finalScore.awayTeam) {
            return "correctScore";
        } else if (prediction.homeTeam - prediction.awayTeam === finalScore.homeTeam - finalScore.awayTeam) {
            return "correctGoalDifference";
        } else if (
            (prediction.homeTeam > prediction.awayTeam && finalScore.homeTeam > finalScore.awayTeam)
            ||
            (prediction.homeTeam < prediction.awayTeam && finalScore.homeTeam < finalScore.awayTeam)
        ) {
            return "correctResult";
        } else {
            return "incorrect";
        }
    }
    throw new Error("Impossible situation");
}

export const calculatePoints = (prediction: null | Prediction | HiddenPrediction, finalScore: FinalScore, bankerMultiplier: number) : PointsRow => {

    if (typeof bankerMultiplier !== "number") {
        throw new Error("Banker multiplier MUST be a number but was of type: " + typeof bankerMultiplier);
    }

    const points = {
        predicted: 0,
        missed: 0,

        correctHomeWins: 0,
        correctDraws: 0,
        correctAwayWins: 0,
        correctTotal: 0,
        
        correctScoresNonBankered: 0,
        correctScoresTotal: 0,
        correctScoresBankered: 0,
        correctGDNonBankered: 0,
        correctGDTotal: 0,
        correctGDBankered: 0,
        correctOutcomeNonBankered: 0,
        correctOutcomeTotal: 0,
        correctOutcomeBankered: 0,
        incorrectNonBankered: 0,
        incorrectTotal: 0,
        incorrectBankered: 0,
        regularPoints: 0,
        bankerPoints: 0,
        totalPoints: 0,
    }

    const resultType = calculateResultType(prediction, finalScore);
    const scoreType = calculateFinalScoreType(finalScore);

    if (resultType === "noPrediction") {
        // Didn't even both to predict
        points.missed ++;
        return points;

    } else if (resultType === "hidden") {
        return points;

    }
    
    points.predicted = 1;

    if (resultType === "correctScore" || resultType === "correctGoalDifference"  || resultType === "correctResult") {
        if (scoreType === "homeWin") {
            points.correctHomeWins = 1;
            points.correctTotal = 1;
        } else if (scoreType === "awayWin") {
            points.correctAwayWins = 1;
            points.correctTotal = 1;
        } else {
            points.correctDraws = 1;
            points.correctTotal = 1;
        }
    }

    if (resultType === "correctScore") {
        // Exact score correct
        points.correctScoresTotal = 1;
        points.regularPoints = 7; // 7 points for correct score
        if ((prediction as Prediction).isBanker) {    
            points.correctScoresBankered = 1;
        } else {
            points.correctScoresNonBankered = 1;
        }

    } else if (resultType === "correctGoalDifference") {
        // Correct GD
        points.correctGDTotal = 1;
        points.regularPoints = 4; // 4 points for correct GD
        if ((prediction as Prediction).isBanker) { 
            points.correctGDBankered = 1;
        } else {
            points.correctGDNonBankered = 1;
        }

    } else if (resultType === "correctResult") {
        // Correct Outcome (You cant get a correct draw outcome as it would come under correct GD of 0)
        points.correctOutcomeTotal = 1;
        points.regularPoints = 2; // 2 points for correct outcome
        if ((prediction as Prediction).isBanker) { 
            points.correctOutcomeBankered = 1;
        } else {
            points.correctOutcomeNonBankered = 1;
        }

    } else if (resultType === "incorrect") {
        // Incorrect
        points.incorrectTotal = 1;
        points.regularPoints = -1; // -1 points for incorrect outcome
        if ((prediction as Prediction).isBanker) { 
            points.incorrectBankered = 1;
        } else {
            points.incorrectNonBankered = 1;
        }

    }

    if ((prediction as Prediction).isBanker) {
        points.bankerPoints = Math.round((bankerMultiplier - 1) * points.regularPoints);
    }
    points.totalPoints = points.regularPoints + points.bankerPoints;

    return points;
}

export function addPoints(currentPoints: null | PointsRow, thisPoints?: PointsRow) : PointsRow {
    
    if (typeof thisPoints === "undefined" || thisPoints === null) {
        // This points is null
        if (typeof currentPoints === "undefined" || currentPoints === null) {
            // Current points is also null
            return getZeroPointsRow();
        } else {
            return currentPoints;
        }
    } else {
        if (typeof currentPoints === "undefined" || currentPoints === null) {
            // Current points is null
            return thisPoints;
        } else {
            // Both set, continue with calculation
        }
    }
    
    return {
        predicted: currentPoints.predicted + thisPoints.predicted,
        missed: currentPoints.missed + thisPoints.missed,

        correctHomeWins: currentPoints.correctHomeWins + thisPoints.correctHomeWins,
        correctAwayWins: currentPoints.correctAwayWins + thisPoints.correctAwayWins,
        correctDraws: currentPoints.correctDraws + thisPoints.correctDraws,
        correctTotal: currentPoints.correctTotal + thisPoints.correctTotal,

        correctScoresNonBankered: currentPoints.correctScoresNonBankered + thisPoints.correctScoresNonBankered,
        correctScoresTotal: currentPoints.correctScoresTotal + thisPoints.correctScoresTotal,
        correctScoresBankered: currentPoints.correctScoresBankered + thisPoints.correctScoresBankered,
        correctGDNonBankered: currentPoints.correctGDNonBankered + thisPoints.correctGDNonBankered,
        correctGDTotal: currentPoints.correctGDTotal + thisPoints.correctGDTotal,
        correctGDBankered: currentPoints.correctGDBankered + thisPoints.correctGDBankered,
        correctOutcomeNonBankered: currentPoints.correctOutcomeNonBankered + thisPoints.correctOutcomeNonBankered,
        correctOutcomeTotal: currentPoints.correctOutcomeTotal + thisPoints.correctOutcomeTotal,
        correctOutcomeBankered: currentPoints.correctOutcomeBankered + thisPoints.correctOutcomeBankered,        
        incorrectNonBankered: currentPoints.incorrectNonBankered + thisPoints.incorrectNonBankered,
        incorrectTotal: currentPoints.incorrectTotal + thisPoints.incorrectTotal,
        incorrectBankered: currentPoints.incorrectBankered + thisPoints.incorrectBankered,
        regularPoints: currentPoints.regularPoints + thisPoints.regularPoints,
        bankerPoints: currentPoints.bankerPoints + thisPoints.bankerPoints,
        totalPoints: currentPoints.totalPoints + thisPoints.totalPoints,
    }
}

export function getZeroPointsRow(): PointsRow {
    return {
        predicted: 0,
        missed: 0,

        correctHomeWins: 0,
        correctAwayWins: 0,
        correctDraws: 0,
        correctTotal: 0,

        correctScoresNonBankered: 0,
        correctScoresTotal: 0,
        correctScoresBankered: 0,
        correctGDNonBankered: 0,
        correctGDTotal: 0,
        correctGDBankered: 0,
        correctOutcomeNonBankered: 0,
        correctOutcomeTotal: 0,
        correctOutcomeBankered: 0,        
        incorrectNonBankered: 0,
        incorrectTotal: 0,
        incorrectBankered: 0,
        regularPoints: 0,
        bankerPoints: 0,
        totalPoints: 0,
    }
}


export const getBankerMultiplier = (weekId: string, homeTeam: string, awayTeam: string, tables: LeagueTables) => {
    if (weekId === "1") {
        // Week 1 was *2 multipliers for all matches
        return 2;
    }

    // If any of the fixtures teams is in the top 4, *2, otherwise *3

    const home = tables.all.find(t => t.name === homeTeam);
    if (typeof home !== "undefined" && home !== null && home.rank && home.rank <= 4) {
        return 2;
    }
    const away = tables.all.find(t => t.name === awayTeam);
    if (typeof away !== "undefined" && away !== null && away.rank && away.rank <= 4) {
        return 2;
    }
    return 3;
}