
import { v4 as uuidv4 } from 'uuid';
import GoogleAuth from "./googleAuth";
import { sheets } from '@googleapis/sheets';

const SheetsApi = sheets('v4');

export async function enqueueNotificationWithoutUniquenessCheck(gauth: GoogleAuth, spreadsheetId: string, uniqueKey: string, notificationMeta: any) : Promise<{uuid: string, occurredAt: Date}> {

    console.log(new Date() + " - Appending notification: " + uniqueKey);

    const uuid = uuidv4();
    const occurredAt = new Date();
    const range = "Notifications!A3:D3";
    const result = await SheetsApi.spreadsheets.values.append({
        auth: gauth.jwtClient,
        spreadsheetId: spreadsheetId,
        range: range,
        insertDataOption: "INSERT_ROWS",
        valueInputOption: 'RAW',
        requestBody: {
            values: [[uuid, occurredAt.toISOString(), uniqueKey, JSON.stringify(notificationMeta)]]
        }
    });
    if (result.status === 200) {
        // OK
        return {uuid, occurredAt};
    } else {
        console.error(result);
        throw new Error("Non 200 response: " + result.status);
    }
}