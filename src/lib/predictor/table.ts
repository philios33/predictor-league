import { HomeAwayPoints, LeagueTable } from "../types";

export const rankLeagueTable = (rankings: LeagueTable): void => {
    rankings.sort((a,b) => {
        // Compare two teams stats first by points, then Goal Difference, then Goals Scored
        
        // Probably need to do head to head too, but I'm not doing that here
        // Update Sep 25th: Dave complained, so I will add head to head logic here!
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
                    const aPointsAgainstRival = a.stats.pointsAgainst[b.name] || 0;
                    const bPointsAgainstRival = b.stats.pointsAgainst[a.name] || 0;
                    // console.log("Cannot separate two teams on normal stats " + a.name + " and " + b.name + " after " + a.stats.played + " games played: " + aPointsAgainstRival + " and " + bPointsAgainstRival);
                    // Equal everything, check the head to head points record
                    
                    if (aPointsAgainstRival < bPointsAgainstRival) {
                        return 1;
                    } else if (aPointsAgainstRival > bPointsAgainstRival) {
                        return -1;
                    } else {
                        // Still equal, check the head to head away goals record
                        const aAwayGoalsAgainstRival = a.stats.awayGoalsAgainst[b.name] || 0;
                        const bAwayGoalsAgainstRival = b.stats.awayGoalsAgainst[a.name] || 0;
                        // console.log("Still equal, checking away goals for " + a.name + " and " + b.name + " after " + a.stats.played + " games played: " + aAwayGoalsAgainstRival + " and " + bAwayGoalsAgainstRival);
                        
                        if (aAwayGoalsAgainstRival < bAwayGoalsAgainstRival) {
                            return 1;
                        } else if (aAwayGoalsAgainstRival > bAwayGoalsAgainstRival) {
                            return -1;
                        } else {
                            // Still equal
                            console.log("Cannot separate two teams AT ALL " + a.name + " and " + b.name + " after " + a.stats.played + " games played");
                            return 0;
                        }
                    }
                }
            }
        }
    });

    // Populate rankings here by starting at rank 1 and giving the next rank if the next team is different
    let nextRank = 1;
    let lastRank = 0;
    let lastTeamName = null;
    let lastTeam: HomeAwayPoints = {
        points: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        draws: 0,
        losses: 0,
        played: 0,
        wins: 0,
        pointsAgainst: {},
        awayGoalsAgainst: {},
    };
    for (const team of rankings) {
        if (nextRank === 1) {
            team.rank = 1;
            lastRank = 1;
            lastTeam = team.stats;
            lastTeamName = team.name;
            nextRank++;
        } else {
            if (arePointsDifferent(team.stats, team.name, lastTeam, lastTeamName)) {
                // Use next rank
                team.rank = nextRank;
                lastRank = nextRank;
                lastTeam = team.stats;
                lastTeamName = team.name;
            } else {
                // Use the same rank
                team.rank = lastRank;
            }
            nextRank++;
        }
    }
}

const arePointsDifferent = (a: HomeAwayPoints, aName: string, b: HomeAwayPoints, bName: string | null): boolean => {

    const aPointsAgainstRival = a.pointsAgainst[bName || ""];
    const bPointsAgainstRival = b.pointsAgainst[aName];
    const aAwayGoalsAgainstRival = a.awayGoalsAgainst[bName || ""];
    const bAwayGoalsAgainstRival = b.awayGoalsAgainst[aName];

    return (a.played !== b.played)
        || (a.wins !== b.wins)
        || (a.draws !== b.draws)
        || (a.losses !== b.losses)
        || (a.goalsFor !== b.goalsFor)
        || (a.goalsAgainst !== b.goalsAgainst)
        || (a.points !== b.points)
        || (aPointsAgainstRival !== bPointsAgainstRival)
        || (aAwayGoalsAgainstRival !== bAwayGoalsAgainstRival)
}