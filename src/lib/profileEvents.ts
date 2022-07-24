

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
import { getPlayerNames } from './players';
import { Logger } from './logger';

const SheetsApi = sheets('v4');

export type ProfileEvent = {
    occurredAt: Date
    username: string
    type: string
    meta: any
}

export type PlayerProfile = {
    username: string
    avatarId: string | null
    catchphrase: string | null
}

export default class ProfileEvents {
    gauth: GoogleAuth;
    spreadsheetId: string;
    uuid: string;

    isRunning: boolean;

    lastEventsLoad: Date;
    lastEventsProcessed: Date;
    
    incomingQueue: Array<ProfileEvent>;
    events: Array<ProfileEvent>;

    profiles: Record<string, PlayerProfile>

    logger: Logger | null;

    constructor(logger: Logger | null, gauth: GoogleAuth, spreadsheetId: string) {
        this.gauth = gauth;
        this.spreadsheetId = spreadsheetId;
        this.uuid = uuidv4();

        this.incomingQueue = [];
        this.events = [];

        this.isRunning = false;
        this.lastEventsLoad = new Date();
        this.lastEventsProcessed = new Date();

        this.profiles = {};

        this.logger = logger;
    }

    async startup() {
        try {
            try {
                await this.loadCurrentProfileEvents();
                await this.processIncomingProfileEvents();
            } catch(e) {
                // First run failed
                console.error(e);
                throw e;
            }

            // Either we are:
            // 1. reloading the profile events in to memory
            // 2. processing the new incoming profile events

            // Doing any of these things at the same time will just cause havock, so we need some kind of timer system on a single loop
            setInterval(async () => {
                if (this.isRunning) {
                    return;
                }
                this.isRunning = true;
                try {
                    
                    const now = new Date();

                    // Should we reload the current profile events from the spreadsheet?
                    if (now.getTime() - this.lastEventsLoad.getTime() > 5 * 60 * 1000) {
                        this.lastEventsLoad = now;
                        await this.loadCurrentProfileEvents();
                        this.isRunning = false;
                        return;
                    }

                    // Should we process the new incoming profile events
                    if (now.getTime() - this.lastEventsProcessed.getTime() > 10 * 1000) {
                        this.lastEventsProcessed = now;
                        await this.processIncomingProfileEvents();
                        this.isRunning = false;
                        return;
                    }

                } catch(e) {
                    console.error(e);

                    this.logger?.writeEvent("PROFILE_EVENTS_CYCLE_FAILED", {
                        message: e.message,
                    });
                }

                this.isRunning = false;

            }, 500);

        } catch(e) {
            console.error(e);
            process.exit(1);
        }
    }

    async waitSeconds(seconds: number) : Promise<void> {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve();
            }, seconds * 1000);
        });
    }


    async loadCurrentProfileEvents() : Promise<void> {
        const range = "Profile!A3:D1000";
        const result = await SheetsApi.spreadsheets.values.get({
            auth: this.gauth.jwtClient,
            spreadsheetId: this.spreadsheetId,
            range,
        });
        if (result.status === 200) {
            const values = result.data.values as any[][];
            const events: Array<ProfileEvent> = [];
            if (values) {
                for (const [rowNum, row] of values.entries()) {
                    events.push({
                        occurredAt: new Date(row[0]),
                        username: row[1],
                        type: row[2],
                        meta: JSON.parse(row[3]),
                    });
                }
            }
            this.events = events;
            
            const newCache: Record<string, PlayerProfile> = {};
            const players = getPlayerNames();
            for(const player of players) {
                newCache[player] = {
                    username: player,
                    avatarId: null,
                    catchphrase: null,
                }
            }
            for (const event of this.events) {
                try {
                    this.processNewEventForCache(event, newCache);
                } catch(e) {
                    console.warn(e);
                }
            }
            this.profiles = newCache; // Replace with the newly computed cache
            // console.log("Loaded " + this.events.length + " existing profile events");

            // console.log(this.notifications);
        } else {
            console.error(result);
            throw new Error("Non 200 response: " + result.status);
        }
    }

    async enqueueProfileEvent(event: ProfileEvent) : Promise<void> {
        this.incomingQueue.push(event);
        const d = new Date();
        d.setHours(d.getHours() - 1);
        this.lastEventsProcessed = d; // Specify that the last events processed was ages ago so this runs during the next cycle

        // TODO, await here until the incoming queue has been emptied/processed
        // This is the lazy way
        await this.waitSeconds(2);
    }

    async processIncomingProfileEvents() : Promise<void> {
        // console.log(new Date() + " - Processing " + this.incomingQueue.length + " new events...");

        while (this.incomingQueue.length > 0) {
            const event = this.incomingQueue.shift();
            if (event) {
                this.enqueueProfileEventToSpreadsheet(event.username, event.type, event.meta);
            }
        }
    }

    async enqueueProfileEventToSpreadsheet(username: string, type: string, eventMeta: any) : Promise<void> {
        const { occurredAt } = await this.enqueueProfileEventToSpreadsheetUtil(this.gauth, this.spreadsheetId, username, type, eventMeta);

        const newEvent = {
            occurredAt,
            username,
            type,
            meta: eventMeta,
        }

        this.events.push(newEvent);

        this.processNewEventForCache(newEvent, this.profiles); // Live update the current cache

        return;
    }

    async enqueueProfileEventToSpreadsheetUtil(gauth: GoogleAuth, spreadsheetId: string, username: string, type: string, eventMeta: any) : Promise<{ occurredAt: Date}> {

        // console.log(new Date() + " - Appending profile event " + type + " for: " + username);
    
        const occurredAt = new Date();
        const range = "Profile!A3:D3";
        const result = await SheetsApi.spreadsheets.values.append({
            auth: gauth.jwtClient,
            spreadsheetId: spreadsheetId,
            range: range,
            insertDataOption: "INSERT_ROWS",
            valueInputOption: 'RAW',
            requestBody: {
                values: [[occurredAt.toISOString(), username, type, JSON.stringify(eventMeta)]]
            }
        });
        if (result.status === 200) {
            // OK
            return {occurredAt};
        } else {
            console.error(result);
            throw new Error("Non 200 response: " + result.status);
        }
    }

    processNewEventForCache(event: ProfileEvent, profilesCache: Record<string, PlayerProfile>) {
        // TODO Process the new event by updating the player profile cache that is given
        if (event.type === "NEW-AVATAR") {
            profilesCache[event.username].avatarId = event.meta.avatarId;
        } else {
            console.error(event);
            throw new Error("Could not process profile event: " + event.type);
        }
    }

    getCurrentProfile(user: string) : PlayerProfile {
        return this.profiles[user];
    }
}

