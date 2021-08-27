

import GoogleAuth from '../googleAuth';
import { TeamMatchesAgainstPredictions, UserPredictions } from '../types';
import { getAllMatchDataFor } from './matches';



export const getAllUserPredictions = async (gauth: GoogleAuth, user: string) : Promise<UserPredictions> => {
    const raw = await getAllMatchDataFor(gauth, 'PLY:' + user, true);
    
    const teamNames = [] as Array<string>;
    const teamMatches = {} as {[key: string]: TeamMatchesAgainstPredictions};

    // console.log("RAW", JSON.stringify(raw, null, 4));

    for(const line of raw) {
        if (line.length === 0 && teamNames.length === 20) {
            // Empty row after 20 teams
            break;
        }
        if (line.length === 0) {
            throw new Error("Empty row but only found: " + teamNames.length + " teams");
        }

        const teamName = line.shift();
        teamNames.push(teamName as string);

        teamMatches[teamName] = {
            name: teamName,
            raw: line,
            against: {},
        };
    }

    const scoreRegExp = /^(\d+)\-(\d+)(B?)$/

    // Expand the against rows of each one by looking up the now populated teamNames
    for(const teamName of teamNames) {
        const tm = teamMatches[teamName];
        if (tm.raw) {
            for(const value of tm.raw) {
                const arrayIndex = tm.raw.indexOf(value);
                const awayTeamName = teamNames[arrayIndex];
                if (value === "") {
                    // Skip this empty value
                } else {
                    if (value === "B") {
                        // It's a banker without a score 
                        tm.against[awayTeamName] = {
                            type: "prediction",
                            homeTeam: -1,
                            awayTeam: -1,
                            isBanker: true,
                        }
                    } else {
                        const scoreMatches = scoreRegExp.exec(value);
                        if (scoreMatches) {
                            // It's a score 
                            tm.against[awayTeamName] = {
                                type: "prediction",
                                homeTeam: parseInt(scoreMatches[1]),
                                awayTeam: parseInt(scoreMatches[2]),
                                isBanker: scoreMatches[3] === "B",
                            }
                        } else {
                            console.warn("We don't know what this value means: " + value);
                        }
                    }
                }
            }
        }
        delete tm.raw;
    }

    // Parse the extra meta rows
    const metaFields: {[key: string]: string} = {
        "Email Address": "email",
        "Secret Key": "secret",
    };
    const meta = raw.slice(21);
    const metaResult = {} as {[key: string]: string};
    for (const metaLine of meta) {
        const key: string = metaLine[0];
        const value: string = metaLine[1];
        if (key in metaFields) {
            const keyId: string = metaFields[key];
            metaResult[keyId] = value;
        } else {
            throw new Error("Unknown meta key: " + key);
        }
    }

    return {
        meta: metaResult,
        homeTeams: teamMatches,
    }
    
}


