import React from 'react';

const newspapperFaces: any = {
    'Phil': require('../assets/faces/cartoon/phil.png'),
    'Rob': require('../assets/faces/cartoon/rob.png'),
    'Rod': require('../assets/faces/cartoon/rod.png'),
    'Jez': require('../assets/faces/cartoon/jez.png'),
    'Mike': require('../assets/faces/cartoon/mike.png'),
    'Lawro': require('../assets/faces/cartoon/lawro.png'),
    'Damo': require('../assets/faces/cartoon/damo.png'),
    'Dave': require('../assets/faces/cartoon/dave.png'),
    'Ian': require('../assets/faces/cartoon/ian.png'),
}
const getPlayerFaceImage = (playerName: string, type: string): any => {
    // console.log("Image is", newspapperFaces[playerName]);
    // console.log("Object keys", Object.keys(newspapperFaces[playerName]));
    return newspapperFaces[playerName].default;
}

export const drawPlayerImage = (playerName: string) => {
    const img = getPlayerFaceImage(playerName, "newspapper");
    return <img className="faceImage" src={img} alt={playerName} title={playerName} />
}