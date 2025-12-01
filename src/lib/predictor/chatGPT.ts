
import GoogleAuth from '../googleAuth';
import { getCachedResults } from "../predictor/cachedResults";
import { MergedPhase, PredictionFixture } from '../types';

function formatFixture(fixture: PredictionFixture) {
    const match_id = fixture.homeTeam + " VS " + fixture.awayTeam;
    const finalScore = fixture.finalScore?.homeTeam + "-" + fixture.finalScore?.awayTeam;
    
    const predictions = []

    for (const player in fixture.playerPredictions) {
        const prediction = fixture.playerPredictions[player];
        if (prediction.prediction && prediction.prediction.type === 'prediction' && prediction.points) {
            predictions.push({
                "user": player,
                "prediction": prediction.prediction.homeTeam + "-" + prediction.prediction.awayTeam,
                "usedBanker": prediction.prediction.isBanker,
                "points": prediction.points.totalPoints,
            })
        }
    }

    return {
        match_id,
        home: fixture.homeTeam,
        away: fixture.awayTeam,
        score: finalScore,
        kickoff: fixture.kickOff,
        predictions,
        bankerMultiplier: fixture.bankerMultiplier,
    }
}

export async function getChatGPTLatestGameWeek() {

    // Need to find the latest completed game week phase
    const results = await getCachedResults();
    const latestPhase = results.mergedPhases.reverse().find(phase => !phase.isIncomplete && phase.isStarted && !phase.isOngoing);
    
    if (!latestPhase) {
        throw new Error('Not found latest phase');
    }
    const fixtures = []
    for (const fg of latestPhase?.fixtureGroups || []) {
        for (const fixture of fg.fixtures) {
            fixtures.push(formatFixture(fixture));
        }
    }

    const standings = []
    for (const ranking of latestPhase.cumRankings) {
        standings.push({
            user: ranking.name,
            points: ranking.points.totalPoints,
            position: ranking.rank,
        })
    }

    // Get the phase 1 lower than this one to get the previous table
    let previousPhase: MergedPhase | null = null;
    let found = false;
    for (const checkPhase of results.mergedPhases) {
        if (found && previousPhase === null) {
            previousPhase = checkPhase;
        }
        if (checkPhase === latestPhase) {
            found = true;
        }
    }
    
    let previousStandings = null;
    if (previousPhase) {
        previousStandings = [];
        for (const ranking of previousPhase.cumRankings) {
            previousStandings.push({
                user: ranking.name,
                points: ranking.points.totalPoints,
                position: ranking.rank,
            })
        }
    }

    return {
        fixtures,
        standings,
        previousStandings,
    }
}