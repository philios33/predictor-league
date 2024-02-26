

import { v4 as uuidv4 } from 'uuid';
import GoogleAuth from './googleAuth';
import { sheets } from '@googleapis/sheets';
import nodemailer from 'nodemailer';
import { runNotificationsLogic } from './notificationsLogic';
import { config } from "../../server/config";
import SMTPConnection from 'nodemailer/lib/smtp-connection';
// import HeartbeatLockFile from './heartbeatLockFile';
import { pushPredictionNotification } from './subscription';
import { enqueueNotificationWithoutUniquenessCheck } from './notificationEnqueue';
import { Logger } from './logger';

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

    isRunning: boolean;

    lastNotificationsLoad: Date;
    lastNotificationsCheck: Date;
    lastNotificationsSend: Date;

    notifications: Array<Notification>;

    transporter: null | nodemailer.Transporter;

    logger: Logger;

    constructor(logger: Logger, gauth: GoogleAuth, spreadsheetId: string) {
        this.gauth = gauth;
        this.spreadsheetId = spreadsheetId;
        this.uuid = uuidv4();

        this.notifications = [];

        this.isRunning = false;
        this.lastNotificationsLoad = new Date();
        this.lastNotificationsCheck = new Date();
        this.lastNotificationsSend = new Date();

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

        this.logger = logger;
    }

    async startup() {
        try {
            // This is now within the main process, so we always run this whatever
            // It is entirely plausable that a dev process and a prod process run notification checks at the same time
            // The problem is that with a single DB we may run in to duplicate sends, or dev sends overriding the prod send
            // This is a problem that we will just need to be aware of and live with
            /*
            console.log("Getting lock...");
            const lock = new HeartbeatLockFile(__dirname + "/../signals/notifications.lock.json");
            try {
                await lock.obtainLock();
            } catch(e) {
                console.log("Failed to get lock: " + e.message);
                process.exit(1);
            }
            */
            
            // console.log("Obtained lock!");

            // Maximum execution time of 2 hours
            // Why? There is no reason to kill the process after 2 hours
            /*
            setTimeout(() => {
                console.log(new Date() + " - Death after 2 hours");
                process.exit(0);
            }, 2 * 60 * 60 * 1000);
            */

            try {
                await this.loadCurrentNotifications();
                await this.checkForNewNotifications();
                await this.sendAllNotifications();
            } catch(e) {
                // First run failed
                console.error(e);
            }

            // Either we are:
            // 1. checking and adding new notifications
            // 2. reloading the notifications in to memory
            // 3. sending a notification

            // Doing any of these things at the same time will just cause havock, so we need some kind of timer system on a single loop
            setInterval(async () => {
                if (this.isRunning) {
                    return;
                }
                this.isRunning = true;
                try {
                    
                    const now = new Date();

                    // Should we check for new notifications that we might need to add?
                    if (now.getTime() - this.lastNotificationsCheck.getTime() > 10 * 60 * 1000) {
                        this.lastNotificationsCheck = now;
                        await this.checkForNewNotifications();
                        this.isRunning = false;
                        return;
                    }

                    // Should we reload the current notifications from the spreadsheet?
                    if (now.getTime() - this.lastNotificationsLoad.getTime() > 5 * 60 * 1000) {
                        this.lastNotificationsLoad = now;
                        await this.loadCurrentNotifications();
                        this.isRunning = false;
                        return;
                    }

                    // Should we sendout all of the notifications?
                    if (now.getTime() - this.lastNotificationsSend.getTime() > 10 * 1000) {
                        this.lastNotificationsSend = now;
                        await this.sendAllNotifications();
                        this.isRunning = false;
                        return;
                    }

                } catch(e) {
                    console.error(e);
                }

                this.isRunning = false;

            }, 2000);

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
        // This can never happen now with the new execution model
        /*
        if (this.sendingNotifications) {
            // Skip this is we are sending
            console.warn("Warning: Not refreshing notifications model due to notifications being sent");
            return;
        }
        */

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
        // console.log(new Date() + " - Checking for new notifications...");
        this.logger.writeEvent("CHECKING_FOR_NOTIFICATIONS", {});

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

        this.logger.writeEvent("NEW_NOTIFICATION", {
            key: uniqueKey,
        });

        const { uuid, occurredAt } = await enqueueNotificationWithoutUniquenessCheck(this.gauth, this.spreadsheetId, uniqueKey, notificationMeta);

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
        
    }

    async sendAllNotifications() {
        try {
            const toAttempt = this.notifications.filter(n => n.deliveredAt === null && n.errorText === "");
            // console.log("There are " + toAttempt.length + " notifications to send...");
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

    }

    async attemptToSendNotification(notification: Notification) {
        // console.log("Sending notification", notification);
        await this.waitSeconds(1);

        try {
            if (config.vapid && typeof notification.meta.notificationSub === "object" && notification.meta.notificationSub !== null) {
                // Great, we can push the notification using the appropriate players subscription
                await pushPredictionNotification(config.vapid.public, config.vapid.private, notification.meta.notificationSub, notification.meta.title, notification.meta.message, notification.meta.ttl);
            }
            
            // Update the delivered timestamp
            const now = new Date();
            this.setNotificationDelivered(notification, now);

        } catch(e) {
            // Update the error text
            this.setNotificationFailed(notification, e.message);
        }

        // Note: Due to the fact that some people setup notifications in chrome on their iPad/macbook, but then use iPhones as their every day phone, they don't get the notifications properly.
        // Because of this problem, and until iPhones properly support Web Push Notifications, I should always get an email for any notification!
        // Always email Phil
        await this.sendEmailNotificationToPhil(notification);
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

            let subject = "PREDICTOR-" + notification.meta.type + (notification.meta.player ? (" for " + notification.meta.player) : "");
            if (notification.meta.type === "WEBSITE-ERROR" && "title" in notification.meta) {
                subject = notification.meta.title;
            }

            const result = await this.transporter.sendMail({
                from: sendFrom,
                to: sendTo,
                subject: subject,
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

