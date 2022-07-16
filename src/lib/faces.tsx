import React from 'react';

const newspapperFaces: any = {
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
export const getPlayerFaceImage = (playerName: string, type: string): any => {
    // console.log("Image is", newspapperFaces[playerName]);
    // console.log("Object keys", Object.keys(newspapperFaces[playerName]));
    if (playerName in newspapperFaces) {
        return newspapperFaces[playerName].default;
    } else {
        throw new Error("Not found player name: " + playerName);
    }
    
}

export const drawPlayerImage = (playerName: string) => {
    const img = getPlayerFaceImage(playerName, "newspapper");
    return <img className="faceImage" src={img} alt={playerName} title={playerName} />
}