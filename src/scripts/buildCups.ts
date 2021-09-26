import { BuiltCups } from "../lib/types"
import fs from 'fs';

export {}

const cupData: BuiltCups = {
    "week8": {
        name: "The week 8 cup",
        semis: {
            left: {
                home: {
                    name: "Phil",
                    progress: "out",
                    goals: 7,
                },
                away: {
                    name: "Mike",
                    progress: "through",
                    goals: 7,
                },
                text: "Mike wins 8-7 on penalties",
            },
            right: {
                home: {
                    name: "Ian",
                    progress: "out",
                    goals: 7,
                },
                away: {
                    name: "Rob",
                    progress: "through",
                    goals: 7,
                },
                text: "Rob wins 8-7 AET",
            },
            final: {
                home: {
                    name: "Mike",
                    progress: "out",
                    goals: 7,
                },
                away: {
                    name: "Rob",
                    progress: "winner",
                    goals: 12,
                },
                text: "12-7 AET",
            }
        },
        groups: [{
            name: "Group A",
            rankings: [{
                rank: 1,
                name: "Phil",
                wins: 1,
                draws: 1,
                losses: 1,
                goalsFor: 5,
                goalsAgainst: 4,
                points: 4,
                progress: "through",
            },{
                rank: 2,
                name: "Mike",
                wins: 1,
                draws: 1,
                losses: 1,
                goalsFor: 5,
                goalsAgainst: 4,
                points: 4,
                progress: "unknown",
            },{
                rank: 3,
                name: "Ian",
                wins: 1,
                draws: 1,
                losses: 1,
                goalsFor: 5,
                goalsAgainst: 4,
                points: 4,
                progress: "out",
            }]
        },{
            name: "Group B",
            rankings: [{
                rank: 1,
                name: "Rod",
                wins: 1,
                draws: 1,
                losses: 1,
                goalsFor: 5,
                goalsAgainst: 4,
                points: 4,
                progress: "through",
            },{
                rank: 2,
                name: "Rob",
                wins: 1,
                draws: 1,
                losses: 1,
                goalsFor: 5,
                goalsAgainst: 4,
                points: 4,
                progress: "unknown",
            },{
                rank: 3,
                name: "Dave",
                wins: 1,
                draws: 1,
                losses: 1,
                goalsFor: 5,
                goalsAgainst: 4,
                points: 4,
                progress: "out",
            }]
        },{
            name: "Group C",
            rankings: [{
                rank: 1,
                name: "Damo",
                wins: 1,
                draws: 1,
                losses: 1,
                goalsFor: 5,
                goalsAgainst: 4,
                points: 4,
                progress: "through",
            },{
                rank: 2,
                name: "Lawro",
                wins: 1,
                draws: 1,
                losses: 1,
                goalsFor: 5,
                goalsAgainst: 4,
                points: 4,
                progress: "unknown",
            },{
                rank: 3,
                name: "Jez",
                wins: 1,
                draws: 1,
                losses: 1,
                goalsFor: 5,
                goalsAgainst: 4,
                points: 4,
                progress: "out",
            }]
        }],
        weeks: [{
            week: "9",
            description: "Matchday 2/3",
            homeTeam: "Aston Villa",
            awayTeam: "Newcastle United",
            score: null,
            matches: [{
                home: {
                    name: "Phil",
                    prediction: null,
                    cupGoals: null,
                    progress: "unknown"
                },
                away: {
                    name: "Ian",
                    prediction: null,
                    cupGoals: null,
                    progress: "unknown"
                },
                text: "",
                status: "upcoming",
            },{
                home: {
                    name: "Rod",
                    prediction: null,
                    cupGoals: null,
                    progress: "unknown"
                },
                away: {
                    name: "Dave",
                    prediction: null,
                    cupGoals: null,
                    progress: "unknown"
                },
                text: "",
                status: "upcoming",
            },{
                home: {
                    name: "Damo",
                    prediction: null,
                    cupGoals: null,
                    progress: "unknown"
                },
                away: {
                    name: "Jez",
                    prediction: null,
                    cupGoals: null,
                    progress: "unknown"
                },
                text: "",
                status: "upcoming",
            }]
        },{
            week: "8",
            description: "Matchday 1/3",
            homeTeam: "Arsenal",
            awayTeam: "Norwich City",
            score: "1-0",
            matches: [{
                home: {
                    name: "Phil",
                    prediction: "4-0",
                    cupGoals: 1,
                    progress: "unknown",
                }, 
                away: {
                    name: "Mike",
                    prediction: "0-0",
                    cupGoals: 0,
                    progress: "unknown",
                },
                text: "",
                status: "homeWin",
            },{
                home: {
                    name: "Rod",
                    prediction: "2-2",
                    cupGoals: 2,
                    progress: "unknown",
                },
                away: {
                    name: "Rob",
                    prediction: "3-3",
                    cupGoals: 2,
                    progress: "unknown",
                },
                text: "",
                status: "draw",
            },{
                home: {
                    name: "Damo",
                    prediction: "0-2",
                    cupGoals: 0,
                    progress: "unknown",
                },
                away: {
                    name: "Lawro",
                    prediction: "1-0",
                    cupGoals: 3,
                    progress: "unknown",
                },
                text: "",
                status: "awayWin",
            }]
        }]
    }
};

fs.writeFileSync(__dirname + "/../compiled/cups.json", JSON.stringify(cupData, null, 4));
