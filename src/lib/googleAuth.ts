import fs from 'fs';
import { JWT } from 'google-auth-library';

export default class GoogleAuth {

    credentialsFile: string;
    jwtClient: null | any;

    constructor(credentialsFile: string) {
        this.credentialsFile = credentialsFile;
        this.jwtClient = null;
    }

    async start() {
        this.jwtClient = await this.getJWTClient();
    }

    async getJWTClient() {
        const credentials = await this.readCredentials();
        return new JWT({
            email: credentials.client_email,
            key: credentials.private_key,
            scopes: ['https://www.googleapis.com/auth/spreadsheets']
        });
    }

    async readCredentials() : Promise<any> {
        const content = fs.readFileSync(this.credentialsFile);
        if (content) {
            return JSON.parse(content.toString());
        } else {
            throw new Error("Could not read file: " + this.credentialsFile);
        }
    }
}
