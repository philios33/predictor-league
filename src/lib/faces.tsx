import React from 'react';
import { getCachedAvatarHistory } from './predictor/cachedAvatars';



const defaultFaces: any = {
    'Phil': require('../assets/faces/defaults/phil.jpeg'),
    'Rob': require('../assets/faces/defaults/rob.jpeg'),
    'Rod': require('../assets/faces/defaults/rod.jpeg'),
    'Jez': require('../assets/faces/defaults/jez.png'),
    'Mike': require('../assets/faces/defaults/mike.jpeg'),
    'Lawro': require('../assets/faces/defaults/lawro.jpeg'),
    'Damo': require('../assets/faces/defaults/damo.png'),
    'Dave': require('../assets/faces/defaults/dave.jpeg'),
    'Ian': require('../assets/faces/defaults/ian.jpeg'),
    'Ed': require('../assets/faces/defaults/ed.jpeg'),
    'Antoine': require('../assets/faces/defaults/antoine.png'),
    'Matt': require('../assets/faces/defaults/matt.jpeg'),
    'Miki': require('../assets/faces/defaults/miki.jpeg'),
    'Ellman': require('../assets/faces/defaults/ellman.jpeg'),
    'Chris': require('../assets/faces/defaults/chris.jpeg'),
    'Anne-Marie': require('../assets/faces/defaults/amd.jpeg'),
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
