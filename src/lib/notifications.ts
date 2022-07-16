

import { v4 as uuidv4 } from 'uuid';
import GoogleAuth from './googleAuth';
import { sheets } from '@googleapis/sheets';
import nodemailer from 'nodemailer';
import { runNotificationsLogic } from './notificationsLogic';
import { config } from "../../server/config";
import SMTPConnection from 'nodemailer/lib/smtp-connection';
import HeartbeatLockFile from './heartbeatLockFile';
import { pushPredictionNotification } from './subscription';

const SheetsApi = sheets('v4');

export type Notification = {
    rowNumber: number
    uuid: string
    occurredAt: Date
    uniqueKey: string
    meta: any
    deliveredAt: Date | null
    errorText: string
}

export default class Notifications {
    gauth: GoogleAuth;
    spreadsheetId: string;
    uuid: string;

    notifications: Array<Notification>;
    sendingNotifications: boolean;

    transporter: null | nodemailer.Transporter;

    constructor(gauth: GoogleAuth, spreadsheetId: string) {
        this.gauth = gauth;
        this.spreadsheetId = spreadsheetId;
        this.uuid = uuidv4();

        this.notifications = [];
        this.sendingNotifications = false;

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
            console.log("Mail Transporter is set!");
        }
    }

    async startup() {
        try {
            console.log("Logging in...");
            await this.gauth.start();
            console.log("Logged in!");

            console.log("Getting lock...");
            const lock = new HeartbeatLockFile(__dirname + "/../signals/notifications.lock.json");
            try {
                await lock.obtainLock();
            } catch(e) {
                console.log("Failed to get lock: " + e.message);
                process.exit(1);
            }
            
            console.log("Obtained lock!");

            // Maximum execution time of 2 hours
            setTimeout(() => {
                console.log(new Date() + " - Death after 2 hours");
                process.exit(0);
            }, 2 * 60 * 60 * 1000);

            // Reload the notifications every 5 minutes incase something changes manually
            setInterval(() => {
                this.loadCurrentNotifications();
            }, 5 * 60 * 1000);
            await this.loadCurrentNotifications();

            this.startSendingNotifications();

            setInterval(() => {
                this.checkForNewNotifications();
            }, 5 * 60 * 1000);
            this.checkForNewNotifications();

        } catch(e) {
            console.error(e);
            process.exit(1);
        }
    }

    /*
    async obtainNotificationsLock() {
        // Write the instance id to cell A1
        await this.writeInstanceId();

        // Wait 10 seconds
        await this.waitSeconds(10);

        // Check the value is the same
        const readValue = await this.readInstanceId();

        if (readValue === this.uuid) {
            // OK, unlocked
        } else {
            throw new Error("Could not unlock the notifications runner, expecting " + this.uuid + " but found " + readValue);
        }
    }

    async writeInstanceId() : Promise<void> {
        console.log("Writing A1...");
        const range = "Notifications!A1";
        const result = await SheetsApi.spreadsheets.values.update({
            auth: this.gauth.jwtClient,
            spreadsheetId: this.spreadsheetId,
            range: range,
            valueInputOption: 'RAW',
            requestBody: {
                values: [[this.uuid, new Date()]]
            }
        });
        if (result.status === 200) {
            return;
        } else {
            console.error(result);
            throw new Error("Non 200 response: " + result.status);
        }
    }
    */

    async waitSeconds(seconds: number) : Promise<void> {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve();
            }, seconds * 1000);
        });
    }

    /*
    async readInstanceId() : Promise<string> {
        console.log("Reading A1...");
        const range = "Notifications!A1";
        const result = await SheetsApi.spreadsheets.values.get({
            auth: this.gauth.jwtClient,
            spreadsheetId: this.spreadsheetId,
            range,
        });
        if (result.status === 200) {
            const values = result.data.values as any[][];
            return values[0][0] as string;
        } else {
            console.error(result);
            throw new Error("Non 200 response: " + result.status);
        }
    }
    */

    async loadCurrentNotifications() : Promise<void> {

        // We need to be careful here of concurrency issues which could occur when refreshing the model by reading at the same time we are writing
        if (this.sendingNotifications) {
            // Skip this is we are sending
            console.warn("Warning: Not refreshing notifications model due to notifications being sent");
            return;
        }

        const range = "Notifications!A3:F1000";
        const result = await SheetsApi.spreadsheets.values.get({
            auth: this.gauth.jwtClient,
            spreadsheetId: this.spreadsheetId,
            range,
        });
        if (result.status === 200) {
            const values = result.data.values as any[][];
            const notifications: Array<Notification> = [];
            if (values) {
                for (const [rowNum, row] of values.entries()) {
                    notifications.push({
                        rowNumber: 3 + rowNum,
                        uuid: row[0],
                        occurredAt: new Date(row[1]),
                        uniqueKey: row[2],
                        meta: JSON.parse(row[3]),
                        deliveredAt: row[4] ? new Date(row[4]) : null,
                        errorText: row[5] ? row[5] : "",
                    });
                }
            }
            this.notifications = notifications;
            // console.log("Loaded " + this.notifications.length + " existing notifications");
            // console.log(this.notifications);
        } else {
            console.error(result);
            throw new Error("Non 200 response: " + result.status);
        }
    }

    async checkForNewNotifications() : Promise<void> {
        console.log(new Date() + " - Checking for new notifications...");

        // Splitting this logic out so it doesn't contaminate this generic notifications logic
        await runNotificationsLogic(this.gauth, async (uniqueKey: string, meta: any) => {
            await this.enqueueNotification(uniqueKey, meta);
        })
    }

    async enqueueNotification(uniqueKey: string, notificationMeta: any) : Promise<void> {

        // Make sure there is not already a notification with this key
        const existing = this.notifications.find(a => a.uniqueKey === uniqueKey);
        if (existing) {
            // console.log("Already have: " + uniqueKey + ", doing nothing");
            return;
        }
        console.log(new Date() + " - Appending notification: " + uniqueKey);

        const uuid = uuidv4();
        const occurredAt = new Date();
        const range = "Notifications!A3:D3";
        const result = await SheetsApi.spreadsheets.values.append({
            auth: this.gauth.jwtClient,
            spreadsheetId: this.spreadsheetId,
            range: range,
            insertDataOption: "INSERT_ROWS",
            valueInputOption: 'RAW',
            requestBody: {
                values: [[uuid, occurredAt.toISOString(), uniqueKey, JSON.stringify(notificationMeta)]]
            }
        });
        if (result.status === 200) {
            // OK
            this.notifications.push({
                rowNumber: this.notifications.length + 3,
                uuid,
                occurredAt,
                uniqueKey,
                meta: notificationMeta,
                deliveredAt: null,
                errorText: "",
            });

            return;
        } else {
            console.error(result);
            throw new Error("Non 200 response: " + result.status);
        }
    }

    async startSendingNotifications() {
        setInterval(async () => {
            if (this.sendingNotifications) {
                return;
            }

            this.sendingNotifications = true;
            try {
                const toAttempt = this.notifications.filter(n => n.deliveredAt === null && n.errorText === "");
                if (toAttempt.length > 0) {
                    for (const notification of toAttempt) {
                        await this.attemptToSendNotification(notification);
                    }
                }
            } catch(e) {
                console.error(e);
                console.error("Sender locked for 10 minutes, please fix...");
                await this.waitSeconds(600); // Wait 10 minutes before unlocking the sending because something bad happened.
            }

            // Unlock
            this.sendingNotifications = false;
            
        }, 10 * 1000);
        // Check every 10 seconds
    }

    async attemptToSendNotification(notification: Notification) {
        // console.log("Sending notification", notification);
        await this.waitSeconds(1);

        try {
            if (config.vapid && notification.meta.notificationSub !== null) {
                // Great, we can push the notification using the appropriate players subscription
                await pushPredictionNotification(config.vapid.public, config.vapid.private, notification.meta.notificationSub, notification.meta.title, notification.meta.message, notification.meta.ttl);
            } else {
                // Fallback to emailing Phil
                await this.sendEmailNotificationToPhil(notification);
            }

            // Update the delivered timestamp
            const now = new Date();
            this.setNotificationDelivered(notification, now);

        } catch(e) {
            // Update the error text
            this.setNotificationFailed(notification, e.message);
        }
    }

    async setCellValue(range: string, value: string) {
        const result = await SheetsApi.spreadsheets.values.update({
            auth: this.gauth.jwtClient,
            spreadsheetId: this.spreadsheetId,
            range: range,
            valueInputOption: 'RAW',
            requestBody: {
                values: [[value]]
            }
        });
        if (result.status === 200) {
            return;
        } else {
            console.error(result);
            throw new Error("Non 200 response: " + result.status);
        }
    }

    async setNotificationDelivered(notification: Notification, deliveredAt: Date) {
        // Write to memory first
        notification.deliveredAt = deliveredAt;

        // Write to spreadsheet second (if this fails the notification may be sent more than once in multiple sender instances)
        const range = "Notifications!E" + notification.rowNumber;
        await this.setCellValue(range, deliveredAt.toISOString());
    }

    async setNotificationFailed(notification: Notification, errorMessage: string) {
        notification.errorText = errorMessage;

        const range = "Notifications!F" + notification.rowNumber;
        await this.setCellValue(range, errorMessage);
    }

    async sendEmailNotificationToPhil(notification: Notification) {
        const now = new Date();
        const age = Math.round((now.getTime() - new Date(notification.occurredAt).getTime()) / 1000);
        if (age > 10000) {
            throw new Error("Age is higher than 10000 seconds: " + age);
        }
        
        if (this.transporter !== null) {
            // Mail server is configured
            const sendFrom = "phil@mariphil.wedding";
            const sendTo = "phil@code67.com";

            const result = await this.transporter.sendMail({
                from: sendFrom,
                to: sendTo,
                subject: notification.meta.player + " " + notification.meta.type,
                text: "Notification " + notification.uuid + "\n" + JSON.stringify(notification.meta, null, 4),
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

