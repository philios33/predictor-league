
import moment from 'moment-mini';
import { v4 as uuid } from 'uuid';
import fs from 'fs';

export class Logger {

    uuid: string;
    logFile: string;
    dumpToConsole: boolean;

    constructor(dumpToConsole: boolean) {
        this.dumpToConsole = dumpToConsole;
        this.uuid = uuid().substring(0,5);
        const dateStr = moment().format("YYYY-MM-DD-HH-mm");
        this.logFile = __dirname + "/../logs/" + dateStr + "-" + this.uuid + ".log";

        this.writeEvent("STARTUP", {});
    }

    writeEvent(type: string, meta: any) {
        const now = moment().toISOString();

        const all = {
            ts: now,
            type,
            ...meta
        }

        if (this.dumpToConsole) {
            console.log(now, "Event", type, "Meta", meta);
        }

        fs.appendFileSync(this.logFile, JSON.stringify(all) + "\n");
    }

}