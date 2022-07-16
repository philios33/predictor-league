
import { v4 as uuid } from 'uuid';
import fs from 'fs';

export default class HeartbeatLockFile {
    lockFilePath: string;

    heartbeatFrequency: number = 10;
    lockObtainTimeout: number = 25;

    uuid: string;

    heartbeatInterval: null | ReturnType<typeof setInterval>;

    constructor(lockFilePath: string) {
        this.lockFilePath = lockFilePath;
        this.uuid = uuid();
        this.heartbeatInterval = null;
    }

    async obtainLock() {
        // To obtain the lock, we start writing the lock file and make sure there are no other writes within a certain time period
        // A typical heartbeat frequency is every x seconds
        // To obtain the lock, you should need to wait at least 2x seconds to be sure no other heartbeat is running
        this.writeLockFile();
        await this.waitSeconds(this.lockObtainTimeout);
        this.checkLockFileIsCorrect();
        this.startHeartbeats();
    }

    private startHeartbeats() {
        this.heartbeatInterval = setInterval(() => {
            this.writeLockFile();
        }, this.heartbeatFrequency * 1000);
    }

    releaseLock() {
        if (this.heartbeatInterval !== null) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
        this.deleteLockFile();
    }

    private waitSeconds(seconds: number) : Promise<void> {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve();
            }, seconds * 1000);
        });
    }

    private writeLockFile() {
        const data = {
            uuid: this.uuid,
            writeTime: new Date()
        };
        fs.writeFileSync(this.lockFilePath, JSON.stringify(data));
    }

    private deleteLockFile() {
        fs.unlinkSync(this.lockFilePath);
    }

    private checkLockFileIsCorrect() {
        const contents = fs.readFileSync(this.lockFilePath);
        const data = JSON.parse(contents.toString());
        if ('uuid' in data) {
            const fileUUID = data.uuid;
            if (this.uuid !== fileUUID) {
                throw new Error("Lock file uuid is incorrect, something else wrote the file within the grace period");
            }
        } else {
            throw new Error("Missing uuid from data JSON in file: " + this.lockFilePath);
        }
    }

}