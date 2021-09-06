
import { sheets } from '@googleapis/sheets';
import GoogleAuth from '../googleAuth';
import moment from 'moment-timezone';
import { CompiledSchedule, CompiledScores, TeamMatchesAgainstSchedule, TeamMatchesAgainstScores, WeekDates } from '../types';

const SheetsApi = sheets('v4');
const spreadsheetId = "1LH94Sk4LcDQe4DfiFNcmfZ-dNG9Wzuqh-4dWp69UEW8";

export const getAllMatchDataFor = async (gauth: GoogleAuth, sheetName: string, collectMeta: boolean = false) : Promise<any[][]> =>  {
    // Note: I have removed the concept of metadata within the spreadsheet
    collectMeta = false;
    const range = sheetName + '!A3:U' + (collectMeta ? '30' : '22');
    const auth = gauth.jwtClient;
    // console.log("Getting Match Data from " + range);
    const result = await SheetsApi.spreadsheets.values.get({
        auth: auth,
        spreadsheetId,
        range,
    });

    if (result.status === 200) {
        const values = result.data.values as any[][];
        if (!collectMeta && values.length !== 20) {
            throw new Error("Didn't find 20 team rows at: " + range + " found " + values.length);
        } else if (collectMeta && values.length < 23) {
            throw new Error("Didn't find at least 23 team + meta rows at: " + range + " found " + values.length);
        }
        return values;
    } else {
        console.error(result);
        throw new Error("Result status was not 200");
    }
}


export const getMatchSchedule = async (gauth: GoogleAuth) : Promise<CompiledSchedule> => {
    const raw = await getAllMatchDataFor(gauth, "Schedule");
    const teamNames = [] as Array<string>;
    const teamMatches = {} as {[key: string]: TeamMatchesAgainstSchedule};
    for(const line of raw) {
        const teamName = line.shift();
        teamNames.push(teamName as string);

        teamMatches[teamName] = {
            name: teamName,
            raw: line,
            against: {},
        };
    }

    const dateRegExp = /^(\d+)\|(\d{1,2})\/(\d{1,2})@(\d{2}(:\d{2})?)$/

    const weeksMap = {} as {[key: string]: WeekDates};

    // Expand the against rows of each one by looking up the now populated teamNames
    for(const teamName of teamNames) {
        const tm = teamMatches[teamName];
        if (tm.raw) {
            // for(const value of tm.raw) {
            //    const arrayIndex = tm.raw.indexOf(value);
            // BUGFIX
            for (let arrayIndex=0; arrayIndex<tm.raw.length; arrayIndex++) {
                const value = tm.raw[arrayIndex];
                const awayTeamName = teamNames[arrayIndex];
                if (value === "") {
                    // Skip this empty value
                } else {
                    const dateMatches = dateRegExp.exec(value);
                    if (dateMatches) {
                        const weekId = dateMatches[1];
                        const dayOfMonth = parseInt(dateMatches[2]);
                        const monthOfYear = parseInt(dateMatches[3]);
                        let time = dateMatches[4];
                        if (time.length === 2) {
                            time += ":00";
                        }

                        const dayStr = dayOfMonth < 10 ? "0" + dayOfMonth : dayOfMonth.toString();
                        const monthStr = monthOfYear < 10 ? "0" + monthOfYear : monthOfYear.toString();
                        const year = monthOfYear > 7 ? 2021 : 2022;

                        const kickOff = moment.tz(year + "-" + monthStr + "-" + dayStr + " " + time, "Europe/London").toDate();

                        if (!(weekId in weeksMap)) {
                            weeksMap[weekId] = {
                                id: weekId.toString(),
                                name: "Week " + weekId,
                                firstMatch: kickOff,
                                lastMatch: kickOff,
                                numOfMatches: 1,
                            }
                        } else {
                            if (weeksMap[weekId].firstMatch > kickOff) {
                                weeksMap[weekId].firstMatch = kickOff;
                            }
                            if (weeksMap[weekId].lastMatch < kickOff) {
                                weeksMap[weekId].lastMatch = kickOff;
                            }
                            weeksMap[weekId].numOfMatches++;
                        }

                        tm.against[awayTeamName] = {
                            type: "scheduled",
                            kickOff: kickOff.toISOString(),
                            weekId,
                        }
                    } else {
                        throw new Error("Invalid date time format [dd/mm@hh:mm] : " + value) + " for " + teamName + " vs " + awayTeamName;
                    }
                }
            }
        }
        delete tm.raw;
    }

    const weeksOrder: Array<string> = Object.values(weeksMap).sort((a,b) => (new Date(a.firstMatch).getTime() - new Date(b.firstMatch).getTime())).map(a => a.id);

    return {
        weeksOrder,
        weeksMap,
        matches: teamMatches,
    }
}

export const getMatchScores = async (gauth: GoogleAuth) : Promise<CompiledScores> => {
    const raw = await getAllMatchDataFor(gauth, "Scores");
    const teamNames = [] as Array<string>;
    const teamMatches = {} as CompiledScores;
    for(const line of raw) {
        const teamName = line.shift();
        teamNames.push(teamName as string);

        teamMatches[teamName] = {
            name: teamName,
            raw: line,
            against: {},
        };
    }

    const scoreRegExp = /^(\d+)\-(\d+)$/

    // Expand the against rows of each one by looking up the now populated teamNames
    for(const teamName of teamNames) {
        const tm = teamMatches[teamName];
        if (tm.raw) {
            for (const [arrayIndex, value] of tm.raw.entries()) {
                const awayTeamName = teamNames[arrayIndex];
                if (value === "") {
                    // Skip this empty value
                } else {
                    const scoreMatches = scoreRegExp.exec(value);
                    if (scoreMatches) {
                        
                        const homeTeam = parseInt(scoreMatches[1]);
                        const awayTeam = parseInt(scoreMatches[2]);
                        
                        tm.against[awayTeamName] = {
                            type: "finalScore",
                            homeTeam,
                            awayTeam,
                        }
                    } else {
                        throw new Error("Invalid score format [XX-XX] : " + value + " for " + teamName + " vs " + awayTeamName);
                    }
                }
            }
        }
        delete tm.raw;
    }

    return teamMatches;
}


export const writePrediction = async (gauth: GoogleAuth, userName: string, cellRef: string, scoreValue: string) : Promise<void> => {
    const range = "PLY:" + userName + '!' + cellRef;
    const auth = gauth.jwtClient;
    // console.log("Writing data at ", cellRef, scoreValue);
    const result = await SheetsApi.spreadsheets.values.update({
        auth: auth,
        spreadsheetId,
        range: range,
        valueInputOption: 'RAW',
        requestBody: {
            values: [[scoreValue]]
        }
    });
    if (result.status === 200) {
        if (result.data.updatedCells !== 1) {
            console.error("Result data dump", result.data);
            throw new Error("Did not update 1 cell: " + result.data.updatedCells);
        }
        // OK
    } else {
        console.error(result);
        throw new Error("Result status was not 200");
    }
}

