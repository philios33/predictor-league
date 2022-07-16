export {}
/*
import { sheets } from '@googleapis/sheets';
import GoogleAuth from '../googleAuth';
import { WeekDates } from '../types';

import compiledWeeks from '../../compiled/weeks.json';

const SheetsApi = sheets('v4');
// const spreadsheetId2021 = "1LH94Sk4LcDQe4DfiFNcmfZ-dNG9Wzuqh-4dWp69UEW8";
const spreadsheetId = "1Tilu5utIZBXXBL2t_cikdO_NsrfbMAQ1zBx5zws9JQA";

const getAllWeeksRaw = async (gauth: GoogleAuth) : Promise<any[][]> =>  {    
    const range = 'Schedule!A25:C100';
    const auth = gauth.jwtClient;
    console.log("Getting Weeks Data from " + range);
    const result = await SheetsApi.spreadsheets.values.get({
        auth: auth,
        spreadsheetId,
        range,
    });

    if (result.status === 200) {
        const values = result.data.values as any[][];
        if (values.length < 3) {
            throw new Error("Found less than 3 weeks at: " + range);
        }
        return values;
    } else {
        console.error(result);
        throw new Error("Result status was not 200");
    }
}



const dateRegExp = /^(\d+)\/(\d+)\/(\d{4})$/
const parseDateString = (dateString: string, useTimeString: string = "T00:00:00Z") : Date => {
    const matches = dateRegExp.exec(dateString);
    if (matches) {
        const dayOfMonth = parseInt(matches[1]);
        const monthOfYear = parseInt(matches[2]);
        const year = parseInt(matches[3]);

        const dayStr = dayOfMonth < 10 ? "0" + dayOfMonth : dayOfMonth.toString();
        const monthStr = monthOfYear < 10 ? "0" + monthOfYear : monthOfYear.toString();

        return new Date(year + "-" + monthStr + "-" + dayStr + useTimeString);
    } else {
        throw new Error("Not a valid date string: " + dateString);
    }
}


export const getAllWeeks = async (gauth: GoogleAuth, useCache: boolean = true) : Promise<{[key: string]: WeekDates}> => {
    if (useCache) {
        return compiledWeeks as {[key: string]: WeekDates};
    }
    const raw = await getAllWeeksRaw(gauth);

    const weeks = {} as {[key: string]: WeekDates};
    
    let recentEndDate = null as null | Date;

    for(const line of raw) {
        const weekName = line[0];

        const startDate = parseDateString(line[1]);
        const endDate = parseDateString(line[2], "T23:59:59Z");

        if (endDate < startDate) {
            throw new Error("End date cannot be before start date in week: " + weekName);
        }

        if (recentEndDate !== null) {
            if (recentEndDate > startDate) {
                throw new Error("Start date cannot be before the end date of the previous week, in week: " + weekName);
            }
        }

        recentEndDate = endDate;

        weeks[weekName] = {
            name: weekName,
            startDate,
            endDate,
        };
    }

    return weeks;
}
*/
