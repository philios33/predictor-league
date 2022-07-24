// For any fixture that was in the past we generate personal tables for each player
import fs from "fs";
import getGoogleAuth from "../lib/googleAuthFactory";
import { getPlayerNames } from '../lib/players';
import ProfileEvents from "../lib/profileEvents";


const gauth = getGoogleAuth();
const players = getPlayerNames();

// const spreadsheetId2021 = "1LH94Sk4LcDQe4DfiFNcmfZ-dNG9Wzuqh-4dWp69UEW8";
const spreadsheetId = "1Tilu5utIZBXXBL2t_cikdO_NsrfbMAQ1zBx5zws9JQA";

type ProfileAvatarChange = {
    at: Date,
    avatarId: string
}

(async () => {
    console.log("Logging in... buildAvatars.ts");
    await gauth.start();
    console.log("Logged in!");

    const pe = new ProfileEvents(null, gauth, spreadsheetId);
    await pe.startup();
    console.log("Loaded profile events, caching avatar history");
    
    const avatars: Record<string, Array<ProfileAvatarChange>> = {};
    for (const playerName of players) {
        avatars[playerName] = [];
    }

    for (const event of pe.events) {
        if (event.type === "NEW-AVATAR") {
            const player = event.username;
            const avatarId = event.meta.avatarId;
            const occurredAt = event.occurredAt;
            avatars[player].push({
                at: occurredAt,
                avatarId: avatarId
            });
        }
    }

    // Write to a json file
    fs.writeFileSync(__dirname + "/../compiled/avatars.json", JSON.stringify(avatars, null, 4));

    console.log("Finished building avatar history based on existing profile events");
    process.exit(0);

})();


