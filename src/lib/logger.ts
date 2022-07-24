
import moment from 'moment-mini';
import fs from 'fs';

export class Logger {

    dumpToConsole: boolean;

    constructor(dumpToConsole: boolean) {
        this.dumpToConsole = dumpToConsole;
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

        const dateStr = moment().format("YYYY-MM-DD");
        const logFile = __dirname + "/../logs/" + dateStr + ".log";
        fs.appendFileSync(logFile, JSON.stringify(all) + "\n");
    }

}