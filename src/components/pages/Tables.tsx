
import React from 'react';
import { getPlayerFaceImage } from '../../lib/faces';
import { getPlayerNames } from '../../lib/players';
import { getCachedPersonalTables } from '../../lib/predictor/cachedPersonalTables';
import PredictedTable from '../PredictedTable';

const personalTables = getCachedPersonalTables();



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