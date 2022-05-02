
import React from 'react';
import { getPlayerNames } from '../../lib/players';
import { getCachedPersonalTables } from '../../lib/predictor/cachedPersonalTables';
import PredictedTable from '../PredictedTable';

const personalTables = getCachedPersonalTables();

const newspapperFaces: any = {
    'Phil': require('../../assets/faces/cartoon/phil.png'),
    'Rob': require('../../assets/faces/cartoon/rob.png'),
    'Rod': require('../../assets/faces/cartoon/rod.png'),
    'Jez': require('../../assets/faces/cartoon/jez.png'),
    'Mike': require('../../assets/faces/cartoon/mike.png'),
    'Lawro': require('../../assets/faces/cartoon/lawro.png'),
    'Damo': require('../../assets/faces/cartoon/damo.png'),
    'Dave': require('../../assets/faces/cartoon/dave.png'),
    'Ian': require('../../assets/faces/cartoon/ian.png'),
}
const getPlayerFaceImage = (playerName: string, type: string): any => {
    // console.log("Image is", newspapperFaces[playerName]);
    // console.log("Object keys", Object.keys(newspapperFaces[playerName]));
    return newspapperFaces[playerName].default;
}

const drawPlayerImage = (playerName: string) => {
    const img = getPlayerFaceImage(playerName, "newspapper");
    return <img className="faceImage" src={img} alt={playerName} title={playerName} />
}


export function Tables() {

    const players = getPlayerNames();

    return <div>
        {players.map(playerName => (
            <div>
                {drawPlayerImage(playerName)}
                <PredictedTable data={personalTables[playerName]} name={playerName + "'s predicted table"} />
                <hr />
            </div>
        ))}
    </div>
}