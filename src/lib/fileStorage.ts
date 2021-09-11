
import fs from 'fs';

// Just store an audio file as some special path when the user wants to store an audio file tip for a certain week.
// This is simple use of the file system to avoid the need for a full database
const uploadsDir = __dirname + "/../../uploads";

export const storeAudioTip = (weekId: string, playerName: string, audioData: Buffer) => {
    const path = uploadsDir + "/audioTips/" + weekId + "/" + playerName;
    fs.writeFileSync(path, audioData);
}

export const getAllAudioTipsForWeek = (weekId: string) => {
    const files = fs.readdirSync(uploadsDir + "/audioTips/" + weekId);
    console.log("FILES FOUND", files);
    return files;
}

export const getAudioTip = (weekId: string, playerName: string) => {
    const path = uploadsDir + "/audioTips/" + weekId + "/" + playerName;
    return fs.readFileSync(path);
}

