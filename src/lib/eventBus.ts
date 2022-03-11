import GoogleAuth from "./googleAuth";
import { sheets } from '@googleapis/sheets';
import { v4 as uuidv4 } from 'uuid';
import { config } from "../../server/config";
import nodemailer from 'nodemailer';
import SendmailTransport from "nodemailer/lib/sendmail-transport";
import SMTPConnection from "nodemailer/lib/smtp-connection";

const objectHash = require('object-hash');

const SheetsApi = sheets('v4');
const spreadsheetId = "1LH94Sk4LcDQe4DfiFNcmfZ-dNG9Wzuqh-4dWp69UEW8";

export type PredictionsNeededEventMeta = {
    player: string
    weekId: string
    phaseId: number
    fgId: number
    alertDay: string
    kickOff: Date
    missingPredictions: Array<{homeTeam: string, awayTeam: string}>
}

export default class EventBusProcessor {
    private auth: GoogleAuth;
    private knownLastModified: string;
    private transporter: any;

    constructor(auth: GoogleAuth) {
        this.auth = auth;
        this.knownLastModified = "";

        this.transporter = null;
        if (config.mail.host !== null && config.mail.user !== null && config.mail.password !== null) {
            const sendmailOptions: SMTPConnection.Options = {
                host: config.mail.host,
                auth: {
                    user: config.mail.user,
                    pass: config.mail.password,
                },
                secure: true,
            }
            this.transporter = nodemailer.createTransport(sendmailOptions);
            console.log("Transporter is set!");
        }
    }

    private async getCompleteEventBus() {
        const range = "Event Bus!A3:G1000";
        const result = await SheetsApi.spreadsheets.values.get({
            auth: this.auth.jwtClient,
            spreadsheetId,
            range,
        });
    
        if (result.status === 200) {
            const values = result.data.values as any[][];
            // console.log("Whole event bus", values);
            return values;
        } else {
            console.error(result);
            throw new Error("Non 200 response: " + result.status);
        }
    }

    private async getEventBusLastModified() {
        const range = "Event Bus!A1";
        const result = await SheetsApi.spreadsheets.values.get({
            auth: this.auth.jwtClient,
            spreadsheetId,
            range,
        });
    
        if (result.status === 200) {
            const values = result.data.values as any[][];
            // console.log("Bus last modified", values);
            return values[0][0];
        } else {
            console.error(result);
            throw new Error("Non 200 response: " + result.status);
        }
    }

    start() {

        // On startup we try to send all waiting notifications
        // This allows us to trigger the notifications queue by triggering a redeploy
        this.processNotifications();

        this.processQueue();
        setInterval(() => {
            this.processQueue();
        }, 60 * 1000);
    }

    private async processQueue() {
        const lastModified = await this.getEventBusLastModified();
        if (lastModified !== this.knownLastModified) {
            // Worth continuing, but 1 time
            this.knownLastModified = lastModified;

            const wholeBus = await this.getCompleteEventBus();

            const notificationHashes = await this.getNotificationHashes();
            // console.log("NOTIFICATION HASHES", notificationHashes);

            // Do something with the rows that have not been processed
            let notificationsCreatedTotal = 0;
            for (const [i, row] of wholeBus.entries()) {
                const rowIndex = i+3;
                if (row.length === 5) {
                    console.log("Processing event on row " + rowIndex + " ...");
                    
                    try {
                        const notificationsCreated = await this.processEventRow(notificationHashes, row[0], new Date(row[1]), row[3], JSON.parse(row[4]));
                        notificationsCreatedTotal += notificationsCreated;
                        await this.writeCell("Event Bus!G" + rowIndex, notificationsCreated);
                        await this.writeCell("Event Bus!F" + rowIndex, new Date().toISOString());
                    } catch(e) {
                        await this.writeCell("Event Bus!H" + rowIndex, e.toString());
                        await this.writeCell("Event Bus!F" + rowIndex, new Date().toISOString());
                    }
                } else {
                    console.log("Ignoring event on row " + rowIndex + " as it looks like it has been processed already");
                }
            }

            if (notificationsCreatedTotal > 0) {
                console.log("Some notifications were created, send them now");
                this.processNotifications();
            }
            
        } else {
            // Identical values
            console.log("It looks like the event bus hasn't changed, doing nothing");
        }
    }

    private async getNotificationHashes() : Promise<Array<string>> {
        const range = "Notifications!G2:G1000";
        const result = await SheetsApi.spreadsheets.values.get({
            auth: this.auth.jwtClient,
            spreadsheetId,
            range,
        });
        if (result.status === 200) {
            const values = result.data.values as any[][];
            const hashes: Array<string> = [];
            if (values) {
                for (const row of values) {
                    hashes.push(row[0]);
                }
            }
            return hashes;
        } else {
            console.error(result);
            throw new Error("Non 200 response: " + result.status);
        }
    }

    private async writeCell(range: string, value: any) {
        const result = await SheetsApi.spreadsheets.values.update({
            auth: this.auth.jwtClient,
            spreadsheetId,
            range: range,
            valueInputOption: 'RAW',
            requestBody: {
                values: [[value]]
            }
        });
        return result;
    }

    private async processEventRow(notificationHashes: Array<string>, eventUuid: string, created: Date, eventType: string, eventMeta: any) : Promise<number> {

        // If the event is too old, ignore it
        const now = new Date();
        const age = Math.round((now.getTime() - created.getTime()) / 1000);
        if (age > 5000) {
            throw new Error("This event is older than 120 seconds: " + age)
        }

        // TODO Get the real subscriptions list for this player
        // For now just WEBPUSH straight to Phil
        // const subscriptions = this.getSubscriptionsForAllPlayers();
        // Use the subscriptions for this player
        const relevantSubscriptions = [{
            id: "1234",
            eventType: "PREDICTIONS_NEEDED",
            notificationType: "WEBPUSH",
            subscription: {}
        }];

        let createdNotifications = 0;

        for (const sub of relevantSubscriptions) {
            if (["PREDICTIONS_NEEDED_SOFT", "PREDICTIONS_NEEDED_HARD"].includes(eventType) && sub.eventType === "PREDICTIONS_NEEDED") {
                const meta = eventMeta as PredictionsNeededEventMeta
                // Try to make a new notification
                // Note: This is probably unnecessary, since we prevent unnecessary alert events reaching the event bus now.
                // But I will keep this in.
                const hash = objectHash([sub.id, meta.player, meta.weekId, meta.phaseId, meta.fgId]);
                if (notificationHashes.includes(hash)) {
                    // Do NOT make this notification
                    // This isn't an error here since another sub might need a notification
                } else {
                    notificationHashes.push(hash);
                    await this.writeNotification(uuidv4(), eventUuid, now.toISOString(), eventType, meta.player, JSON.stringify(sub), hash, JSON.stringify(meta));
                    createdNotifications++;
                }
            }
        }

        return createdNotifications;
    }

    private async writeNotification(notificationUuid: string, eventUuid: string, occurredAt: string, eventType: string, playerName: string, subMeta: string, hash: string, eventMeta: string) {
        
        const range = "Notifications!A2:H2";
        const result = await SheetsApi.spreadsheets.values.append({
            auth: this.auth.jwtClient,
            spreadsheetId,
            range: range,
            insertDataOption: "INSERT_ROWS",
            valueInputOption: 'RAW',
            requestBody: {
                values: [[notificationUuid, eventUuid, occurredAt, eventType, playerName, subMeta, hash, eventMeta]]
            }
        });
        return result;
    }

    private async getAllNotifications() : Promise<Array<Array<string>>> {
        const range = "Notifications!A2:J1000";
        const result = await SheetsApi.spreadsheets.values.get({
            auth: this.auth.jwtClient,
            spreadsheetId,
            range,
        });
        if (result.status === 200) {
            const values = result.data.values as any[][];
            // console.log("Whole event bus", values);
            return values;
        } else {
            console.error(result);
            throw new Error("Non 200 response: " + result.status);
        }
    }

    private async processNotifications() {
        // Read notifications, and process the ones that haven't been processed yet.
        const notifications = await this.getAllNotifications();
        for (const [i,notification] of notifications.entries()) {
            const rowIndex = i+2;
            if (notification.length === 8) {
                const notificationId = notification[0];
                const eventId = notification[1];
                const occurredAt = new Date(notification[2]);
                const notificationType = notification[3];
                const recipientPlayer = notification[4];
                const subscriptionMeta = JSON.parse(notification[5]);
                const hashSum = notification[6];
                const payloadMeta = JSON.parse(notification[7]);
                try {
                    await this.sendNotification(notificationId, eventId, occurredAt, notificationType, recipientPlayer, subscriptionMeta, payloadMeta);
                    await this.writeCell("Notifications!I" + rowIndex, new Date().toISOString());
                } catch(e) {
                    await this.writeCell("Notifications!J" + rowIndex, e.toString());
                }
            } else {
                console.warn("Already processed notification at row " + rowIndex);
            }
        }
    }

    private async sendNotification(notificationId: string, eventId: string, occurredAt: Date, notificationType: string, recipientPlayer: string, subscriptionMeta: any, payloadMeta: any) {
        const now = new Date();
        const age = Math.round((now.getTime() - occurredAt.getTime()) / 1000);
        if (age > 10000) {
            throw new Error("Age is higher than 10000 seconds: " + age);
        }

        // TODO First try email method to Phil (for testing purposes)
        // TODO Then try web push to PHILs android (for testing purposes)

        if (this.transporter !== null) {
            // Mail server is configured
            const sendFrom = "phil@mariphil.wedding";
            const sendTo = "phil@code67.com";

            const result = await this.transporter.sendMail({
                from: sendFrom,
                to: sendTo,
                subject: recipientPlayer + " " + notificationType,
                text: "Notification " + notificationId + "\n" + JSON.stringify(payloadMeta, null, 4),
            });
            if (result.accepted) {
                // OK
            } else {
                throw new Error("Not accepted: " + result.response);
            }
        } else {
            throw new Error("No mail transport configured");
        }
    }
}