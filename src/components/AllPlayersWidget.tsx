import React, { useEffect, useState } from 'react';
import { getPlayerNames } from '../lib/players';
import { WeekFixtures } from '../lib/types';
import { getLogin } from '../lib/util';
import StatusBox from './StatusBox';

import './AllPlayersWidget.scss';

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


    

    const players = getPlayerNames();

    const loadWidget = (e: React.MouseEvent) => {
        e.preventDefault();
        setShowPlayers(true);
    }

    

    const [showingUser, setShowingUser] = useState(null as null | string);

    const showPredictions = (e: React.MouseEvent, player: string) => {
        e.preventDefault();
        setShowingUser(player);
    }

    const [playerPredictions, setPlayerPredictions] = useState({} as {[key: string]: WeekFixtures});
    const onPredictions = (player: string, predictions: WeekFixtures) => {
        setPlayerPredictions(oldPredictions => {
            const preds: {[key: string]: WeekFixtures} = {};
            preds[player] = predictions;
            return {...oldPredictions, ...preds};
        })
    }

    let relevantPredictions = null;
    if (showingUser !== null && showingUser in playerPredictions) {
        relevantPredictions = playerPredictions[showingUser];
    }

    if (!showButton) {
        return null;
    }
    if (!showPlayers) {
        return <button onClick={(e) => loadWidget(e)}>See other player predictions</button>
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

        {showingUser !== null && relevantPredictions !== null && (
            <div>
                <p>{showingUser}'s predictions</p>
                <table>
                    <thead>
                        <tr>
                            <th>Home Team</th>
                            <th>Score</th>
                            <th></th>
                            <th>Score</th>
                            <th>Away Team</th>
                            <th>Banker</th>
                        </tr>
                    </thead>
                    <tbody>
                        {relevantPredictions.fixtures.map((fixture,i) => {
                            const prediction = fixture.playerPredictions[showingUser]?.prediction;
                            let homeGoals = "?";
                            let awayGoals = "?";
                            let isBanker = false;
                            if (prediction && prediction.type === "prediction") {
                                homeGoals = prediction.homeTeam.toString();
                                awayGoals = prediction.awayTeam.toString();
                                isBanker = prediction.isBanker;
                            }
                            return (
                                <tr key={fixture.homeTeam + "_vs_" + fixture.awayTeam}>
                                    <td>{fixture.homeTeam}</td>
                                    <td>{homeGoals}</td>
                                    <td>{i === 0 ? showingUser?.toUpperCase() : 'v'}</td>
                                    <td>{awayGoals}</td>
                                    <td>{fixture.awayTeam}</td>
                                    <td>{isBanker && "BANKER"}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        )}
        
    </div>
}

export default AllPlayersWidget;
