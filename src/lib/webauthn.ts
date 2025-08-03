
import { AuthenticatorDevice } from "@simplewebauthn/typescript-types";
import GoogleAuth from "./googleAuth";
import { sheets } from '@googleapis/sheets';
import { fromBase64ToIntArray, fromIntArrayToBase64 } from "../../server/b64array";
const SheetsApi = sheets('v4');

// const spreadsheetId2021 = "1LH94Sk4LcDQe4DfiFNcmfZ-dNG9Wzuqh-4dWp69UEW8";
// const spreadsheetId2022 = "1Tilu5utIZBXXBL2t_cikdO_NsrfbMAQ1zBx5zws9JQA";
// const spreadsheetId2023 = "13z-8qvEYNwKUMC8nMVXN4wanSzcZT-e5oKQ3FjB8PSA";
// const spreadsheetId2024 = "1qInfh-sCxBbSMjBAxVdUZqkQ_Iz3DnsNe0IEo4Nhq74";
const spreadsheetId = "1SsDfa6YwlFK0xm7vbO94AIoHGvDCzQSlAjUP6Y75DLI";

export async function updateUserWebAuthNChallenge(gauth: GoogleAuth, user: string, challenge: string) {
    
    const range = "PLY:" + user + "!B32:C32"; // Cell B32 on every users sheet is the current webauthn challenge

    const result = await SheetsApi.spreadsheets.values.update({
        auth: gauth.jwtClient,
        spreadsheetId,
        range: range,
        valueInputOption: 'RAW',
        requestBody: {
            values: [[challenge, new Date()]]
        }
    });
    if (result.status === 200) {
        return;
    } else {
        console.error(result);
        throw new Error("Non 200 response: " + result.status);
    }
}

export async function fetchUserWebAuthNChallenge(gauth: GoogleAuth, user: string) : Promise<null | string> {
    const range = "PLY:" + user + "!B32";
    const result = await SheetsApi.spreadsheets.values.get({
        auth: gauth.jwtClient,
        spreadsheetId,
        range,
    });
    if (result.status === 200) {
        if (result.data.values) {
            const values = result.data.values as any[][];
            const subStr = values[0][0] as string;
            if (subStr === "") {
                console.log("User " + user + " has no webauthn challenge set");
                return null;
            } else {
                return subStr;
            }
        } else {
            console.log("User " + user + " has no webauthn challenge set");
            return null;
        }
        
    } else {
        console.error(result);
        throw new Error("Non 200 response: " + result.status);
    }
}



export async function updateUserWebAuthNDevices(gauth: GoogleAuth, user: string, devices: Array<AuthenticatorDevice>) {
    
    const range = "PLY:" + user + "!B33:C33"; // Cell B33 on every users sheet is the current webauthn devices JSON

    const serializedDevices = devices.map(device => ({
        ...device,
        credentialID: fromIntArrayToBase64(device.credentialID),
        credentialPublicKey: fromIntArrayToBase64(device.credentialPublicKey),
    }));
    
    const result = await SheetsApi.spreadsheets.values.update({
        auth: gauth.jwtClient,
        spreadsheetId,
        range: range,
        valueInputOption: 'RAW',
        requestBody: {
            values: [[JSON.stringify(serializedDevices), new Date()]]
        }
    });
    if (result.status === 200) {
        return;
    } else {
        console.error(result);
        throw new Error("Non 200 response: " + result.status);
    }
}

export async function fetchUserWebAuthNDevices(gauth: GoogleAuth, user: string) : Promise<Array<AuthenticatorDevice>> {
    const range = "PLY:" + user + "!B33";
    const result = await SheetsApi.spreadsheets.values.get({
        auth: gauth.jwtClient,
        spreadsheetId,
        range,
    });
    if (result.status === 200) {
        if (result.data.values) {
            const values = result.data.values as any[][];
            const subStr = values[0][0] as string;
            if (subStr === "") {
                console.log("User " + user + " has no webauthn devices set");
                return [];
            } else {
                const result = JSON.parse(subStr);
                return result.map((device: any) => ({
                    ...device,
                    credentialID: fromBase64ToIntArray(device.credentialID),
                    credentialPublicKey: fromBase64ToIntArray(device.credentialPublicKey),
                }));
            }
        } else {
            console.log("User " + user + " has no webauthn devices set");
            return [];
        }
        
    } else {
        console.error(result);
        throw new Error("Non 200 response: " + result.status);
    }
}
