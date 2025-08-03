
import webpush from 'web-push';
import GoogleAuth from "./googleAuth";
import { sheets } from '@googleapis/sheets';
const SheetsApi = sheets('v4');

// const spreadsheetId2021 = "1LH94Sk4LcDQe4DfiFNcmfZ-dNG9Wzuqh-4dWp69UEW8";
// const spreadsheetId2022 = "1Tilu5utIZBXXBL2t_cikdO_NsrfbMAQ1zBx5zws9JQA";
// const spreadsheetId2023 = "13z-8qvEYNwKUMC8nMVXN4wanSzcZT-e5oKQ3FjB8PSA";
// const spreadsheetId2024 = "1qInfh-sCxBbSMjBAxVdUZqkQ_Iz3DnsNe0IEo4Nhq74";
const spreadsheetId = "1SsDfa6YwlFK0xm7vbO94AIoHGvDCzQSlAjUP6Y75DLI";

export async function updateUserNotificationSubscription(gauth: GoogleAuth, user: string, subscription: any) {
    let subText = "";
    if (subscription !== null) {
        subText = JSON.stringify(subscription);    
    }
    
    const range = "PLY:" + user + "!B31:C31"; // Cell B31 on every users sheet is the current subscription JSON

    const result = await SheetsApi.spreadsheets.values.update({
        auth: gauth.jwtClient,
        spreadsheetId,
        range: range,
        valueInputOption: 'RAW',
        requestBody: {
            values: [[subText, new Date()]]
        }
    });
    if (result.status === 200) {
        return;
    } else {
        console.error(result);
        throw new Error("Non 200 response: " + result.status);
    }
}

export async function fetchUserNotificationSubscription(gauth: GoogleAuth, user: string) : Promise<null | webpush.PushSubscription> {
    const range = "PLY:" + user + "!B31";
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
                console.log("User " + user + " has no notifications subscription");
                return null;
            } else {
                return JSON.parse(subStr); // Parse out the JSON in the cell value
            }
        } else {
            // No values returned
            return null;
        }
        
    } else {
        console.error(result);
        throw new Error("Non 200 response: " + result.status);
    }
}

export async function pushNotification(publicKey: string, privateKey: string, sub: webpush.PushSubscription, notification: any, ttl: number) {

    webpush.setVapidDetails(
        'mailto:phil@code67.com',
        publicKey,
        privateKey
    );

    await webpush.sendNotification(sub, JSON.stringify(notification), {
        TTL: ttl
    });
}

export async function pushPredictionNotification(publicKey: string, privateKey: string, sub: webpush.PushSubscription, title: string, message: string, ttl: number) {

    const notification = {
        title: title,
        body: message,
        icon: "https://predictor.30yardsniper.co.uk/assets/partridge_192.jpg",
        // image: "",
        url: "https://predictor.30yardsniper.co.uk/predictions",
        actions: [{action: "open_url", title: "Enter predictions"}]
    };

    return pushNotification(publicKey, privateKey, sub, notification, ttl);
}

