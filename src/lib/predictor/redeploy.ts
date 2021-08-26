
import { sheets } from '@googleapis/sheets';
import GoogleAuth from '../googleAuth';

const SheetsApi = sheets('v4');
const spreadsheetId = "1LH94Sk4LcDQe4DfiFNcmfZ-dNG9Wzuqh-4dWp69UEW8";

export const getRedeployValue = async (gauth: GoogleAuth) : Promise<string> =>  {    
    const range = 'Schedule!B25';
    const auth = gauth.jwtClient;
    console.log("Getting redeploy value from " + range);
    const result = await SheetsApi.spreadsheets.values.get({
        auth: auth,
        spreadsheetId,
        range,
    });

    if (result.status === 200) {
        // console.log("DUMP", result.data);
        const values = result.data.values as any[][];
        return values[0][0] as string;
    } else {
        console.error(result);
        throw new Error("Result status was not 200");
    }
}

export const setRedeployValue = async (gauth: GoogleAuth, value: string) : Promise<void> => {
    const range = 'Schedule!B25';
    const auth = gauth.jwtClient;
    console.log("Writing redeploy value at ", range, value);
    const result = await SheetsApi.spreadsheets.values.update({
        auth: auth,
        spreadsheetId,
        range: range,
        valueInputOption: 'RAW',
        requestBody: {
            values: [[value]]
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