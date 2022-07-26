
import React, { useState } from 'react';
import { getCachedPersonalTables } from '../../lib/predictor/cachedPersonalTables';
import { PlayerSelector } from '../PlayerSelector';
import PredictedTable from '../PredictedTable';

const personalTables = getCachedPersonalTables();

export function Tables() {

    const [currentPlayer, setCurrentPlayer] = useState(null as string | null);

    return <div>
        <PlayerSelector onChangePlayer={(playerName) => setCurrentPlayer(playerName) } />
        {currentPlayer !== null && (
            <PredictedTable data={personalTables[currentPlayer]} name={currentPlayer + "'s predicted table"} />
        )}
    </div>
}