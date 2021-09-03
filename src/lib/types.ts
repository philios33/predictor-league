

export type UserMeta = {
    [key: string]: string
}
export type WeekFixtures = {
    loggedInAs?: string // To show who we are logged in as
    week: WeekDates
    fixtures: Array<PredictionFixture>
    players: {
        [key: string]: {
            points: PointsRow | null
            userMeta: UserMeta
        }
    }
}

export type PlayerPrediction = {
    prediction: null | Prediction | HiddenPrediction
    points: null | MatchPointsRow
}

export type PlayerPredictions = {
    [key: string] : PlayerPrediction
}

export type PredictionFixture = {
    homeTeam: string
    awayTeam: string
    bankerMultiplier?: number
    kickOff: string
    weekId: string
    finalScore: null | FinalScore
    playerPredictions: PlayerPredictions

}

export type MatchResultType = 'incorrect' | 'hidden' | 'noPrediction' | 'correctResult' | 'correctGoalDifference' | 'correctScore';

export type MatchPointsRow = {
    type: MatchResultType
    regularPoints: number
    bankerPoints: number
    totalPoints: number
}

export type PointsRow = {
    predicted: number
    missed: number

    correctHomeWins: number
    correctDraws: number
    correctAwayWins: number
    correctTotal: number

    correctScoresNonBankered: number
    correctScoresTotal: number
    correctScoresBankered: number
    correctGDNonBankered: number
    correctGDTotal: number
    correctGDBankered: number
    correctOutcomeNonBankered: number
    correctOutcomeTotal: number
    correctOutcomeBankered: number
    incorrectNonBankered: number
    incorrectTotal: number
    incorrectBankered: number
    regularPoints: number
    bankerPoints: number
    totalPoints: number
}

export type ConcisePointsRow = {
    predicted: number
    missed: number

    correctScoresTotal: number
    correctGDTotal: number
    correctOutcomeTotal: number
    incorrectTotal: number
    regularPoints: number
    bankerPoints: number
    totalPoints: number
}

export type SimplePointsRow = {
    predicted: number
    totalPoints: number
}

export type Scheduled = {
    type: "scheduled"
    kickOff: string
    weekId: string
}
export type TeamMatchesAgainstSchedule = {
    name: string,
    raw?: Array<string>,
    against: {[key: string]: Scheduled}
}

export type Prediction = {
    type: "prediction"
    homeTeam: number
    awayTeam: number
    isBanker: boolean
}

export type HiddenPrediction = {
    type: "hidden"
}

export type TeamMatchesAgainstPredictions = {
    name: string,
    raw?: Array<string>,
    against: {[key: string]: Prediction}
}

export type UserPredictions = {
    meta: {[key: string]: string}
    homeTeams: {[key: string]: TeamMatchesAgainstPredictions}
}


export type FinalScore = {
    type: "finalScore"
    homeTeam: number
    awayTeam: number
}
export type TeamMatchesAgainstScores = {
    name: string,
    raw?: Array<string>,
    against: {[key: string]: FinalScore}
}

export type WeekDates = {
    id: string
    name: string
    firstMatch: Date | string
    lastMatch: Date | string
    numOfMatches: number
}

export type CompiledSchedule = {
    weeksOrder: Array<string>
    weeksMap: {[key: string]: WeekDates}
    matches: {[key: string]: TeamMatchesAgainstSchedule}
}

export type CompiledScores = {
    [key: string]: TeamMatchesAgainstScores
}

export type Phase = {
    weekId: string
    phaseId: number
    kickOff: string
    fixtures: Array<PredictionFixture>
}

export type FixtureGroup = {
    kickOff: string
    fixtures: Array<PredictionFixture>
}

export type MergedPhase = {
    weekId: string
    phaseId: number

    isFirstPhaseOfWeek: boolean // If is first, draw the jokers table
    isLastPhaseOfWeek: boolean // If not last, specify the part X text
    isOngoing: boolean // Use this to change the description at the top to make it clear that the rankings table is not complete, e.g. "Current Standings (Week 3 ongoing)" instead of "After week 3"
    isStarted: boolean // We only show started phases in the results feed

    fixtureGroups: Array<FixtureGroup>
    points: {[key: string]: PointsRow} // Cumulative players points for the fixtures in this merged phase
    phaseRankings: Array<Player> // Rankings/points from this merged phase only
    cumRankings: Array<Player> // Total Rankings/Points so far
}

export type Player = {
    name: string
    points: PointsRow | SimplePointsRow
    rank: number
}

export type WeekResults = {
    playerNames: Array<string>
    weekIds: Array<string>
    weeks: {[key: string]: {
        fixtures: Array<PredictionFixture>
        playersRank: Array<Player>
    }},
}

export type BuiltResults = {
    mergedPhases: Array<MergedPhase>
    startOfWeekStandings: {[key: string]: StartOfWeekStanding}
    nextRedeploy: string | null
}

export type StartOfWeekStanding = {
    snapshotTime: string
    rankings: Array<Player>
    leagueTables: LeagueTables
    // bankerMultipliers: {[key: string]: number}
}

export type LeagueTables = {
    homeOnly: LeagueTable
    awayOnly: LeagueTable
    all: LeagueTable
}

export type Top4LeagueTables = {
    top4: LeagueTable
}

export type LeagueTable = Array<{
    name: string
    rank: null | number
    stats: HomeAwayPoints
}>

export type HomeAwayPoints = {
    played: number
    wins: number
    draws: number
    losses: number
    goalsFor: number
    goalsAgainst: number
    points: number
}

export type TeamPointsRow = {
    name: string
    rank: null | number
    home: HomeAwayPoints
    away: HomeAwayPoints
    penalties: Array<Penalty>
}

export type Penalty = {
    deduction: number
    reason: string
}

export type CumulativeTeamPoints = {[key:string]: TeamPointsRow}