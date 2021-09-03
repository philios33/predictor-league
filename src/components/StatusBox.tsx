import axios from 'axios';
import React, { MouseEvent, useEffect, useState } from 'react';
import { config } from '../config';
import { WeekFixtures } from '../lib/types';
import { getLogin } from '../lib/util';
import './StatusBox.scss';

type Props = {
    playerName?: string
    weekId: string
    onPredictions?: Function
}

function StatusBox(props: Props) {   

    const [error, setError] = useState(null as null | string);
    const [isLoading, setIsLoading] = useState(false);
    const [predictions, setPredictions] = useState(null as null | WeekFixtures);

    const loadPredictions = async () => {

        try {
            setError(null);
            setIsLoading(true);
            const login = getLogin();
            if (login === null) {
                throw new Error("Not logged in");
            }
            const result = await axios({
                headers: {
                    authorization: login.token,
                },
                url: config.serviceEndpoint + 'service/getThisWeek/' + encodeURIComponent(props.weekId),
                params: {
                    playerName: props.playerName
                },
                timeout: 5000,
                validateStatus: (s => [200,401].indexOf(s) !== -1),
            });
            if (result.status === 200) {
                setIsLoading(false);
                setPredictions(result.data);
                if (props.onPredictions) {
                    props.onPredictions(props.playerName, result.data);
                }
            } else if(result.status === 401) {
                throw new Error("Not logged in");
            } else {
                throw new Error("Response " + result.status);
            }
        } catch(e) {
            setIsLoading(false);
            setError(e.message);
        }
    }

    useEffect(() => {
        loadPredictions();
    }, []);

    const refreshPressed = (e: MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        loadPredictions();
    }

    let predictionsClass: null|string = null;
    let predictionsMessage: null|string = null;

    const now = new Date();
    let bankersUsed = 0;
    let totalMatches = 0;
    let totalPredicted = 0;
    if (predictions && predictions.loggedInAs) {
        for (const fixture of predictions.fixtures) {
            if (new Date(fixture.kickOff) > now) {
                totalMatches++;
                const pred = fixture.playerPredictions[predictions.loggedInAs];
                if (pred) {
                    const prediction = pred.prediction;
                    if (prediction && prediction.type === "prediction") {
                        if (prediction.homeTeam !== -1 && prediction.awayTeam !== -1) {
                            totalPredicted++;   
                        }
                        if (prediction.isBanker) {
                            bankersUsed++;
                        }
                    }
                }
            }
        }
    }

    if (bankersUsed === 0) {
        predictionsClass = "problem";
        predictionsMessage = "Player hasn't used their banker yet, " + totalPredicted + " of " + totalMatches + " predicted";
    } else if (bankersUsed > 1) {
        predictionsClass = "problem";
        predictionsMessage = "Player has used more than 1 banker (somehow)";
    } else {
        // Banker used 1 time
        predictionsMessage = "Player has made " + totalPredicted + " of " + totalMatches + " predictions and used their banker once.";

        if (totalMatches === totalPredicted) {
            predictionsClass = "done";    
        } else {
            predictionsClass = "problem";
        }
    }

    return <div className="statusBox">
        
        { error !== null && (
            <div>Error: {error}</div>
        )}
        { !isLoading && error === null && predictionsClass !== null && predictionsMessage !== null && (
            <div className={predictionsClass}>{predictionsMessage}</div>
        )}

        { isLoading ? (
            <p>Loading...</p>
        ) : (
            <a href="#" onClick={refreshPressed}>Refresh</a>
        )}
    </div>
}


export default StatusBox;