
/*
export type UserMeta = {
    [key: string]: string
}
*/
export type WeekFixtures = {
    loggedInAs?: string // To show who we are logged in as
    week: WeekDates
    fixtures: Array<PredictionFixture>
    players: {
        [key: string]: {
            points: PointsRow | null
            // userMeta: UserMeta
        }
    }
}

export type PlayerPrediction = {
    prediction: null | Prediction | HiddenPrediction
    points: null | MatchPointsRow
    stats: null | MatchPredictionStats
    /*
    stats: null | {
        homeTeam: PredictionStats
        awayTeam: PredictionStats
    }
    */
}

export type MatchPlayerPrediction = {
    prediction: null | Prediction | HiddenPrediction
    points: null | MatchPointsRow
    stats: null | MatchPredictionStats
}

export type PlayerPredictions = {
    [key: string] : PlayerPrediction
}

export type CupMatchFixture = {
    cupName: string
    weekDescription: string
    fixture: CupMatchGame
}

export type PredictionFixture = {
    homeTeam: string
    awayTeam: string
    bankerMultiplier?: number
    kickOff: string
    weekId: string
    finalScore: null | FinalScore
    playerPredictions: PlayerPredictions
    cupMatches: Array<CupMatchFixture>
}

export type MatchPredictionStats = {
    homeTeam: PredictionStats
    homeTeamSegment: "top6" | "middle8" | "bottom6"
    awayTeam: PredictionStats
    awayTeamSegment: "top6" | "middle8" | "bottom6"
    mostLikelyPrediction: {homeGoals: number, awayGoals: number}
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
    correctTotal: number
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
    // meta: {[key: string]: string}
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
    isIncompletePhase: boolean
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

    isIncomplete: boolean

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
    awaitingScoresFor: Array<string>
}

export type BuiltPersonalTables = Record<string, PredictedLeagueTable>

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

export type LeagueTableRow = {
    name: string
    rank: null | number
    stats: HomeAwayPoints
    penalties: Array<Penalty>
}

export type PredictedLeagueTableRow = {
    name: string
    rank: null | number
    stats: PredictedHomeAwayPoints
}

export type LeagueTable = Array<LeagueTableRow>
export type PredictedLeagueTable = Array<PredictedLeagueTableRow>

export type HomeAwayPoints = {
    played: number
    wins: number
    draws: number
    losses: number
    goalsFor: number
    goalsAgainst: number
    points: number
    pointsAgainst: {[key: string]: number}
    awayGoalsAgainst: {[key: string]: number}
}

export type PredictedHomeAwayPoints = Omit<HomeAwayPoints, "pointsAgainst" | "awayGoalsAgainst"> & {
    positionDifference: number
}

export type TeamPointsRow = {
    name: string
    rank: null | number
    home: HomeAwayPoints
    away: HomeAwayPoints
    penalties: Array<Penalty>
    // pointsAgainst: {[key: string]: number}
    // awayGoalsAgainst: {[key: string]: number}
}

export type Penalty = {
    issued: string
    deduction: number
    reason: string
}

export type CumulativeTeamPoints = {[key:string]: TeamPointsRow}

export type ProgressType = null | "through" | "out" | "winner"

export type CupRanking = {
    rank: number
    name: string
    wins: number
    draws: number
    losses: number
    goalsFor: number
    goalsAgainst: number
    points: number
    progress: ProgressType
}

export type CupGroup = {
    name: string
    players: Array<string>
    table: null | LeagueTable
    playersProgressed: Array<string>
    playersKnockedOut: Array<string>
}

export type CupMatchTeam = {
    name: string
    prediction: null | string
    cupGoals: null | number
    progress: ProgressType
}

export type MatchStatusType = "upcoming" | "homeWin" | "draw" | "awayWin"

export type CupMatchGame = {
    home: CupMatchTeam | null
    away: CupMatchTeam | null
    // score: string
    text: string
    status: MatchStatusType
}

export type CupWeek = {
    week: string
    description: string
    homeTeam: string | null
    awayTeam: string | null
    score: null | FinalScore
    matches: Array<CupMatchGame>
}

export type CupKOTeam = {
    name: string
    progress: ProgressType
    cupGoals: null | number
}

export type CupKOMatch = {
    home: CupKOTeam
    away: CupKOTeam
    text: string
}

export type CupSemis = {
    left: CupKOMatch
    right: CupKOMatch
    final?: CupKOMatch
    winner?: string
}

export type Cup = {
    name: string
    details: Array<string>
    semis: null | CupSemis
    koPhaseWeeks: Array<CupWeek>
    groups: Array<CupGroup>
    groupPhaseWeeks: Array<CupWeek>
}

export type BuiltCups = {
    [key: string]: Cup
}


export type BuiltPredictionStats = Record<string, TeamsPredictionStats>;

export type TeamsPredictionStats = Record<string, PositionalPredictionStats>;

export type PositionalPredictionStats = {
    home: {
        top6: PredictionStats
        middle8: PredictionStats
        bottom6: PredictionStats
    },
    away: {
        top6: PredictionStats
        middle8: PredictionStats
        bottom6: PredictionStats
    },
};

export type PredictionStats = {
    predictions: number
    goalsFor: number
    goalsAgainst: number
    wins: number
    draws: number
    losses: number
}

export type Profile = {
    username: string
    avatarId: string | null
    catchphrase: string | null
}

export type AvatarProfileEvent = {
    at: string
    avatarId: string
}
export type BuiltAvatarHistory = Record<string, Array<AvatarProfileEvent>>
