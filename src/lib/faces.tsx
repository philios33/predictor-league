import React from 'react';
import { getCachedAvatarHistory } from './predictor/cachedAvatars';



const defaultFaces: any = {
    'Phil': require('../assets/faces/circles/phil.png'),
    'Rob': require('../assets/faces/circles/rob.png'),
    'Rod': require('../assets/faces/circles/rod.png'),
    'Jez': require('../assets/faces/circles/jez.png'),
    'Mike': require('../assets/faces/circles/mike.png'),
    'Lawro': require('../assets/faces/circles/lawro.png'),
    'Damo': require('../assets/faces/circles/damo.png'),
    'Dave': require('../assets/faces/circles/dave.png'),
    'Ian': require('../assets/faces/circles/ian.png'),
    'Ed': require('../assets/faces/circles/ed.png'),
    'Antoine': require('../assets/faces/circles/antoine.png'),
    'Matt': require('../assets/faces/circles/matt.png'),
}
const getDefaultFaceImage = (playerName: string): any => {
    // console.log("Image is", newspapperFaces[playerName]);
    // console.log("Object keys", Object.keys(newspapperFaces[playerName]));
    if (playerName in defaultFaces) {
        return defaultFaces[playerName].default;
    } else {
        throw new Error("Not found player name: " + playerName);
    }
    
}

const avatarHistory = getCachedAvatarHistory();

const getAvatarIdUrl = (username: string, avatarId: string) => {
    return "/service/avatar/" + username + "/" + avatarId;
}

export const drawPlayerImage = (playerName: string, atSnapshotTime?: Date) => {
    let img = getDefaultFaceImage(playerName);

    // At compile time, we download all profile events so we can work out which avatarIds are applicable for each player at which timestamp
    // This will make it very easy to respond with the correct avatar image here
    // BUT this will noticably not update the avatar until the website rebuilds
    const avatarChanges = avatarHistory[playerName];

    if (avatarChanges.length > 0) {
        if (atSnapshotTime) {
            for (const event of avatarChanges) {
                if (new Date(event.at) < atSnapshotTime) {
                    // console.log("Applicable avatar " + event.avatarId + " for " + playerName, atSnapshotTime);
                    img = getAvatarIdUrl(playerName, event.avatarId);
                }
            }
        } else {
            // No specific time, use latest
            
            const last = avatarChanges[avatarChanges.length - 1];
            if (last) {
                // console.log("Using avatar " + last.avatarId + " for " + playerName, atSnapshotTime);
                img = getAvatarIdUrl(playerName, last.avatarId);
            } else {
                // throw new Error("Cannot get here");
            }
        }
    } else {
        // Use default
    }

    return <img className="faceImage" src={img} alt={playerName} title={playerName} />
}
