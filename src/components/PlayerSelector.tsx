
import React, { useEffect, useState } from 'react';
import { drawPlayerImage } from '../lib/faces';
import { getPlayerNames } from '../lib/players';

import './PlayerSelector.scss';

type Props = {
    onChangePlayer: (playerName: string) => void,
}

export function PlayerSelector(props: Props) {

    const players: Array<string> = getPlayerNames();

    const [selectedPlayer, setSelectedPlayer] = useState(null as null | string);

    useEffect(() => {
        if (selectedPlayer !== null) {
            props.onChangePlayer(selectedPlayer);
        }
    }, [selectedPlayer]);

    return <div className="playerSelector">
        {players.map(playerName => (
            <div className={ selectedPlayer === playerName ? "playerSquare selected" : "playerSquare"} onClick={() => setSelectedPlayer(playerName)}>
                {drawPlayerImage(playerName)}
            </div>
        ))}
    </div>
}