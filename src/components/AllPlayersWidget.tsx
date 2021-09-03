import React, { useEffect, useState } from 'react';
import { getPlayerNames } from '../lib/players';
import { WeekFixtures } from '../lib/types';
import { getLogin } from '../lib/util';
import StatusBox from './StatusBox';

type Props = {
    weekId: string
}

function AllPlayersWidget(props: Props) {  

    const [showButton, setShowButton] = useState(false);
    const [showPlayers, setShowPlayers] = useState(false);

    const loadComponent = () => {
        try {
            const login = getLogin();
            if (login === null) {
                throw new Error("Not logged in");
            }
            if (login.username === "Phil" || login.username === "Mike") {
                setShowButton(true);
            } else {
                throw new Error("Not allowed to view other players predictions: " + login.username);
            }
        } catch(e) {
            console.warn(e);
        }
    }

    useEffect(() => {
        loadComponent();
    }, []);


    if (!showButton) {
        return null;
    }

    const players = getPlayerNames();

    const loadWidget = (e: React.MouseEvent) => {
        e.preventDefault();
        setShowPlayers(true);
    }

    if (!showPlayers) {
        return <button onClick={(e) => loadWidget(e)}>See other player predictions</button>
    }

    const showPredictions = (e: React.MouseEvent, player: string) => {
        e.preventDefault();
        console.log("Found data", playerPredictions[player]);
        // TODO Load some modal for mike to copy from
    }

    const [playerPredictions, setPlayerPredictions] = useState({} as {[key: string]: WeekFixtures});
    const onPredictions = (player: string, predictions: WeekFixtures) => {
        setPlayerPredictions(oldPredictions => {
            const preds: {[key: string]: WeekFixtures} = {};
            preds[player] = predictions;
            return {...oldPredictions, ...preds};
        })
    }

    return <div className="allPlayersWidget">
        <table>
            <thead>
                <tr>
                    <th>Player</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                { players.map(player => (
                    <tr key={player}>
                        <td>{player}</td>
                        <td>
                            <StatusBox playerName={player} weekId={props.weekId} onPredictions={onPredictions} />
                        </td>
                        <td>
                            <button onClick={(e) => showPredictions(e, player)}>Show</button>
                        </td>
                    </tr>
                )) }
            </tbody>
        </table>
        
    </div>
}

export default AllPlayersWidget;
