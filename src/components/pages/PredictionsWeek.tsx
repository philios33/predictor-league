
import { useParams } from 'react-router';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import moment from 'moment-mini';
import { BuiltResults, PredictionFixture, WeekFixtures } from '../../lib/types';
import { getLogin } from './Home';
import PremierLeagueTable from '../PremierLeagueTable';
import results from '../../compiled/results.json';

function PredictionsWeek() {

    const { weekId } = useParams() as {weekId: string};

    const [weekData, setWeekData] = useState(null as null | WeekFixtures);
    const [dataError, setDataError] = useState(null as null | string);
    const loadPredictions = async () => {

        // Important that we clear the saving changes as this can confuse the saver
        setSavingPredictions({});
        
        try {
            setWeekData(null);
            setDataError(null);
            const login = getLogin();
            if (login === null) {
                throw new Error("Not logged in");
            }

            const result = await axios({
                headers: {
                    authorization: login.token,
                },
                url: '/service/getThisWeek/' + encodeURIComponent(weekId),
                timeout: 5000,
                validateStatus: (s => [200,401].indexOf(s) !== -1),
            });
            if (result.status === 200) {
                setWeekData(result.data);
            } else if(result.status === 401) {
                throw new Error("Not logged in");
            } else {
                throw new Error("Response " + result.status);
            }
        } catch(e) {
            setDataError(e.message);
            setWeekData(null);
        }    
            
    }

    const clickedRefresh = (e: any) => {
        e.preventDefault();
        loadPredictions();
    }

    type SavingPrediction = {
        homeTeam: number // Can no longer be null
        awayTeam: number 
        isBanker: boolean

        isSaving: boolean
        errorMessage: null | string
    }

    const [savingPredictions, setSavingPredictions] = useState({} as {[key:string]: SavingPrediction});

    useEffect(() => {
        // When the week data changes, we copy the current predictions in to the savingPredictions state
        // console.log("Week data has changed, storing saving predictions that are not yet set...");

        setSavingPredictions((oldData) => {

            if (weekData && weekData.loggedInAs) {
                const newData = {...oldData}
                
                let changes = false;
                for(const fixture of weekData.fixtures) {
                    const matchKey = fixture.homeTeam + " vs " + fixture.awayTeam;
                    if (!(matchKey in newData)) {
                        console.log("Setting up existing prediction as saving prediction", matchKey);
                        changes = true;
                        let sp: SavingPrediction = {
                            homeTeam: -1,
                            awayTeam: -1,
                            isBanker: false,
        
                            isSaving: false,
                            errorMessage: null,
                        }
        
                        if (fixture.playerPredictions[weekData.loggedInAs]) {
                            const prediction = fixture.playerPredictions[weekData.loggedInAs].prediction;
                            if (prediction) {
                                if (prediction.type === "prediction") {
                                    sp = {
                                        homeTeam: prediction.homeTeam,
                                        awayTeam: prediction.awayTeam,
                                        isBanker: prediction.isBanker,
                                        
                                        isSaving: false,
                                        errorMessage: null,
                                    }
                                }
                            }
                        }
                        newData[matchKey] = sp;
                    }
                }
                if (changes) {
                    return newData;
                } else {
                    return oldData;
                }
            } else {
                return oldData;
            }
        });
        
    }, [weekData, savingPredictions]);

    

    const setPrediction = (type: "homeTeam" | "awayTeam" | "isBanker", value: boolean | string, homeTeam: string, awayTeam: string) => {
        // Update the saving state first

        const matchKey = homeTeam + " vs " + awayTeam;
        setSavingPredictions((oldValue) => {
            if (!(matchKey in oldValue)) {
                return oldValue;
            }

            oldValue = {...oldValue};
            if (type === "isBanker" && typeof value === "boolean") {
                oldValue[matchKey][type] = value;
            } else if ((type === "homeTeam" || type === "awayTeam") && typeof value === "string") {
                oldValue[matchKey][type] = (value === "" ? -1 : parseInt(value));
            }

            if (type === "isBanker" && value === true) {
                // Remove all other bankers
                for (const match in oldValue) {
                    if (match !== matchKey) {
                        if (oldValue[match].isBanker) {
                            console.log("Auto removed banker for", match);
                            oldValue[match] = {...oldValue[match], isBanker: false};
                        }
                    }
                }
            }

            return oldValue;
        });

        
    }


    const updateSavingStatus = (homeTeam: string, awayTeam: string, isSaving: boolean, errorMessage: null | string) => {
        const matchKey = homeTeam + " vs " + awayTeam;
        setSavingPredictions((oldValue) => {
            if (!(matchKey in oldValue)) {
                return oldValue;
            }
            oldValue = {...oldValue};
            oldValue[matchKey].isSaving = isSaving;
            oldValue[matchKey].errorMessage = errorMessage;
            return oldValue;
        })
    }

    const saveThisPrediction = async (homeTeam: string, awayTeam: string, homeGoals: number, awayGoals: number, isBanker: boolean) => {
        if (weekData) {
            updateSavingStatus(homeTeam, awayTeam, true, null);
            
            try {

                const login = getLogin();
                if (login === null) {
                    throw new Error("Not logged in");
                }
                
                const result = await axios({
                    method: 'POST',
                    url: '/service/postPrediction/' + encodeURIComponent(weekId),
                    headers: {
                        authorization: login.token,
                        'content-type': 'application/json',
                    },
                    data: JSON.stringify({
                        homeTeam,
                        homeGoals,
                        awayTeam,
                        awayGoals,
                        isBanker,
                    }),
                    timeout: 5000,
                    validateStatus: (s => [200,401].indexOf(s) !== -1),
                });
                if (result.status === 200) {
                    const data = result.data as Array<PredictionFixture>;
                    
                    // Update all personal predictions by updating the weekData
                    setWeekData((oldData) => {
                        if (oldData === null) {
                            return oldData;
                        } else {
                            return {...oldData, fixtures: data};
                        }
                    });

                    updateSavingStatus(homeTeam, awayTeam, false, null);
                } else if (result.status === 401) {
                    throw new Error("Not logged in");
                } else {
                    throw new Error("Response " + result.status);
                }
            } catch(e) {
                updateSavingStatus(homeTeam, awayTeam, false, e.message);
            }
        }
    }

    const retrySave = (homeTeam: string, awayTeam: string) => {
        // By resetting the error to null this can trigger a resave in the effect handler
        updateSavingStatus(homeTeam, awayTeam, false, null);
    }
    const undoSave = (homeTeam: string, awayTeam: string) => {
        // We MUST copy the prediction from the current state
        const matchKey = homeTeam + " vs " + awayTeam;
        setSavingPredictions((oldValue) => {
            if (!(matchKey in oldValue)) {
                return oldValue;
            }
            const resetValue = {
                homeTeam: -1,
                awayTeam: -1,
                isBanker: false,
                isSaving: false,
                errorMessage: null
            }
            if (weekData && weekData.loggedInAs) {
                for(const fixture of weekData.fixtures) {
                    if (fixture.homeTeam === homeTeam && fixture.awayTeam === awayTeam) {
                        if (fixture.playerPredictions[weekData.loggedInAs]) {
                            const prediction = fixture.playerPredictions[weekData.loggedInAs].prediction;
                            if (prediction) {
                                if (prediction.type === "prediction") {
                                    resetValue.homeTeam = prediction.homeTeam;
                                    resetValue.awayTeam = prediction.awayTeam;
                                    resetValue.isBanker = prediction.isBanker;
                                }
                            }
                        }
                    }
                }
            }
            
            oldValue = {...oldValue};
            oldValue[matchKey] = resetValue;
            return oldValue;
        })
    }

    useEffect(() => {

        // Do nothing if we are already saving
        for(const matchKey in savingPredictions) {
            if (savingPredictions[matchKey].isSaving) {
                return;
            }
        }

        type Candidate = {
            homeTeam: string
            awayTeam: string
            homeGoals: number
            awayGoals: number 
            isBanker: boolean
        }
        const candidates: Array<Candidate> = [];
        // Do we have a complete prediction that is different from the current state?
        if (weekData && weekData.loggedInAs) {
            for (const fixture of weekData.fixtures) {

                let homeGoals: number = -1;
                let awayGoals: number = -1;
                let isBanker: boolean = false;

                const currentPlayer = fixture.playerPredictions[weekData.loggedInAs];
                if (currentPlayer) {
                    const prediction = currentPlayer.prediction;
                    if (prediction !== null && prediction.type === "prediction") {
                        homeGoals = prediction.homeTeam;
                        awayGoals = prediction.awayTeam;
                        isBanker = prediction.isBanker;
                    }
                }

                const matchKey = fixture.homeTeam + " vs " + fixture.awayTeam;
                if (matchKey in savingPredictions) {
                    const newPrediction = savingPredictions[matchKey];
                    // If not already saving and we are NOT displaying an error (User must clear the error message to null with a button for it to retry saving)
                    if (!newPrediction.isSaving && newPrediction.errorMessage === null) {
                        // Is there a difference
                        if (homeGoals !== newPrediction.homeTeam || awayGoals !== newPrediction.awayTeam || isBanker !== newPrediction.isBanker) {
                            // Yes
                            // Is there a complete result
                            if (newPrediction.homeTeam !== -1 && newPrediction.awayTeam !== -1) {
                                // Yes, save this prediction
                                
                                // Add to candidates list first
                                candidates.push({
                                    homeTeam: fixture.homeTeam, 
                                    awayTeam: fixture.awayTeam, 
                                    homeGoals: newPrediction.homeTeam, 
                                    awayGoals: newPrediction.awayTeam, 
                                    isBanker: newPrediction.isBanker,
                                })
                            } else if (newPrediction.homeTeam === -1 && newPrediction.awayTeam === -1) {
                                // Both scores are clear
                                candidates.push({
                                    homeTeam: fixture.homeTeam, 
                                    awayTeam: fixture.awayTeam, 
                                    homeGoals: -1, 
                                    awayGoals: -1, 
                                    isBanker: newPrediction.isBanker,
                                })
                            }
                        }
                    }
                }
            }
        }

        if (candidates.length > 0) {
            // Sort to find the candidate with isBanker set (if there is one) so that we choose that one first so that the backend fixes the bankers for us!
            const sortedCandidates = candidates.sort((a, b) => {
                if (a.isBanker && !b.isBanker) {
                    return -1;
                } else if (!a.isBanker && b.isBanker) {
                    return 1;
                } else {
                    return 0;
                }
            });
            const c = sortedCandidates[0];
            console.log("Saving ", c.homeTeam + " vs " + c.awayTeam);
            saveThisPrediction(c.homeTeam, c.awayTeam, c.homeGoals, c.awayGoals, c.isBanker);
        }

    }, [savingPredictions, weekData]);

    const [hasAlreadyUsedJoker, setHasAlreadyUsedJoker] = useState(false);
    useEffect(() => {

        let alreadyUsedBanker = false;
        if (weekData && weekData.loggedInAs) {
            for (const fixture of weekData.fixtures) {
                if (fixture.finalScore !== null || new Date(fixture.kickOff) < now) {
                    if (fixture.playerPredictions[weekData.loggedInAs]) {
                        const prediction = fixture.playerPredictions[weekData.loggedInAs].prediction;
                        if (prediction !== null) {
                            if (prediction.type === "prediction") {
                                if (prediction.isBanker) {
                                    alreadyUsedBanker = true;
                                }
                            }
                        }
                    }
                }
            }
        }
        setHasAlreadyUsedJoker(alreadyUsedBanker);
    }, [weekData]);

    const now = new Date();
    const renderPredictionInputs = (fixture: PredictionFixture, name: string, isMyPredictions: boolean, savingPredictions: null | {[key:string]: SavingPrediction}) => {

        let homeGoals: number = -1;
        let awayGoals: number = -1;
        let isBanker: boolean = false;
        let isHidden: boolean = false;

        let pointsTxt = "";
        let resultClass = "unknown";
        if (name in fixture.playerPredictions) {
            const prediction = fixture.playerPredictions[name].prediction;
            const points = fixture.playerPredictions[name].points;
            if (prediction !== null) {
                if (prediction.type === "prediction") {
                    homeGoals = prediction.homeTeam;
                    awayGoals = prediction.awayTeam;
                    isBanker = prediction.isBanker;
                    if (points) {
                        resultClass = points.type;
                        if (points.bankerPoints > 0) {
                            resultClass += " withBanker";
                        }
                    }
                } else if (prediction.type === "hidden") {
                    isHidden = true;
                }
            }
            
            if (points) {
                pointsTxt = points.totalPoints.toString() + " points";
            }
        }

        const kickOff = new Date(fixture.kickOff);

        let isSaving = false;
        let isError = false;
        let errorMessage: null | string = null;
        let isSavingJoker = false;
        let isUpdated = false;

        if (isMyPredictions && savingPredictions) {
            // Also load a possible different value from the saving state
            const matchKey = fixture.homeTeam + " vs " + fixture.awayTeam;
            if (matchKey in savingPredictions) {
                // There is something in the savingPredictions
                const sp = savingPredictions[matchKey];
                if (sp.homeTeam !== homeGoals || sp.awayTeam !== awayGoals || sp.isBanker !== isBanker) {
                    // console.log("Difference", matchKey, sp, homeGoals, awayGoals);
                    // There is a difference here
                    // Update the values
                    homeGoals = sp.homeTeam;
                    awayGoals = sp.awayTeam;
                    isBanker = sp.isBanker;
                    isUpdated = true;
                } else {
                    // console.log("No Difference", matchKey, sp, homeGoals, awayGoals);
                }
                isSaving = sp.isSaving;
                if (sp.errorMessage !== null) {
                    errorMessage = sp.errorMessage;
                    isError = true;
                }
            }

            for(const thisMatchKey in savingPredictions) {
                const thisMatch = savingPredictions[thisMatchKey];
                if (thisMatch.isSaving && thisMatch.isBanker) {
                    isSavingJoker = true;
                }
            }
        }

        let isIncomplete = false;
        if (homeGoals === -1 || awayGoals === -1) {
            isIncomplete = true;
        }

        let homeGoalsTxt = "";
        let awayGoalsTxt = "";
        if (homeGoals !== -1) {
            homeGoalsTxt = homeGoals.toString();
        }
        if (awayGoals !== -1) {
            awayGoalsTxt = awayGoals.toString();
        }
        if (isHidden) {
            homeGoalsTxt = "X";
            awayGoalsTxt = "X";
            isBanker = false;
        }

        let editingClass = "";
        if (isIncomplete) {
            editingClass = "incomplete";
        }
        if (isSaving || isUpdated) {
            editingClass = "saving";
        }
        if (isError) {
            editingClass = "error";
        }

        if (isMyPredictions && kickOff > now && fixture.finalScore === null) {
            return <tr className={editingClass}>
                <td className="kickOff">{renderDateTime(fixture.kickOff)}</td>
                <td className="homeTeam">{fixture.homeTeam}</td>
                <td className="myPredictions">
                    <>
                        <input type="number" disabled={isSaving || isError} value={homeGoalsTxt} max={20} min={0} onChange={(e) => {setPrediction("homeTeam", e.target.value, fixture.homeTeam, fixture.awayTeam)}} />
                        &nbsp;-&nbsp;
                        <input type="number" disabled={isSaving || isError} value={awayGoalsTxt} max={20} min={0} onChange={(e) => {setPrediction("awayTeam", e.target.value, fixture.homeTeam, fixture.awayTeam)}} /> 
                    </>
                </td>
                <td className="awayTeam">{fixture.awayTeam}</td>
                <td className="bankerCol">
                    <input type="checkbox" disabled={isSaving || isError || isSavingJoker || hasAlreadyUsedJoker} title="Banker" checked={isBanker} onChange={(e) => {setPrediction("isBanker", e.target.checked, fixture.homeTeam, fixture.awayTeam)}} />
                </td>
                <td className="finalScore">? - ?</td>
                <td className="points">
                    {isSaving && (
                        <div className="loading" />
                    )}

                    { errorMessage && (
                        <div className="statusMessage">
                            <span>{errorMessage}</span>
                            <button onClick={(e) => {retrySave(fixture.homeTeam, fixture.awayTeam)}}>Retry</button>
                            <button onClick={(e) => {undoSave(fixture.homeTeam, fixture.awayTeam)}}>Undo</button>
                        </div>
                    )}
                </td>
            </tr>

        } else {

            return <tr className={resultClass}>
                <td className="kickOff">{renderDateTime(fixture.kickOff)}</td>
                <td className="homeTeam">{fixture.homeTeam}</td>
                <td className="myPredictions">
                    <>
                        <input disabled={true} value={homeGoalsTxt} readOnly={true} />
                        &nbsp;-&nbsp;
                        <input disabled={true} value={awayGoalsTxt} readOnly={true} /> 
                    </>
                </td>
                <td className="awayTeam">{fixture.awayTeam}</td>
                <td className="bankerCol">
                    <input disabled={true} type="checkbox" title="Banker" checked={isBanker} readOnly={true} />
                </td>
                <td className="finalScore">{fixture.finalScore ? (
                    <>{fixture.finalScore.homeTeam} - {fixture.finalScore.awayTeam}</>
                ) : (
                    <>? - ?</>
                )}</td>
                <td className="points">{pointsTxt !== "" && (<span className="points">{pointsTxt}</span>)}</td>
            </tr>
        }
    }

    // When this loads, we need to ajax the predictions for this week
    useEffect(() => {
        // console.log("On load predictions component");

        // No need for this.  It is triggered when the weekOffset changes anyway.
        // loadPredictions();

        return () => {
            // On unload
            // console.log("Unloaded predictions component");
        }
    }, []);

    const renderDateTime = (dateString: string) => {
        return moment(dateString).format("Do MMM H:mm");
    }

    useEffect(() => {
        // Load predictions again since the week has changed
        loadPredictions();
    }, [weekId]);

    let usedBanker = false;
    if (weekData && weekData.loggedInAs) {
        for (const fixture of weekData.fixtures) {
            const prediction = fixture.playerPredictions[weekData.loggedInAs];
            if (prediction) {
                if (prediction.prediction) {
                    if (prediction.prediction.type === "prediction" && prediction.prediction.isBanker) {
                        usedBanker = true;
                    }
                }
            }
        }
    }

    
     
    return (
        <div className="predictions">
            <h2>Predictions {weekData && <small>- {weekData.loggedInAs} {weekData.week.name}</small>}</h2>
            
            {weekId !== "1" && (
                weekId in results.startOfWeekStandings ? (
                    <PremierLeagueTable data={(results as BuiltResults).startOfWeekStandings[weekId].leagueTables.top4} name={"Top 4 at start of week"} snapshotAt={(results as BuiltResults).startOfWeekStandings[weekId].snapshotTime} />
                ) : (
                    <p className="warning">We don't yet know the standings at the start of this week.  Come back later to find out which matches are *2 bankers and which are *3.</p>
                )
            )}

            <Link className="link" to="/predictions" >Back</Link>
            <a className="link" href="#" onClick={clickedRefresh}>Refresh</a>

            { weekData === null && dataError === null && (
                <div>
                    <h3>Loading...<div className="loading"></div></h3>
                </div>
            )}
            { dataError ? (
                <h3>Error: {dataError}</h3>
            ) : (
                weekData && weekData.loggedInAs && (
                    <>
                        
                        <table className="predictions">
                            <thead>
                                <tr>
                                    <th className="kickOff">Kick off</th>
                                    <th className="homeTeam">Home team</th>
                                    <th className="vsCol">vs</th>
                                    <th className="awayTeam">Away team</th>
                                    <th className="bankerCol">Banker</th>
                                    <th className="finalScore">Result</th>
                                    <th className="points"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {weekData.fixtures.map((fixture,i) => (
                                    renderPredictionInputs(fixture, weekData.loggedInAs as string, true, savingPredictions)                                                                              
                                ))}
                                <tr className="totals">
                                    <td>{weekData.fixtures.length} matches</td>
                                    <td></td>
                                    <td></td>
                                    <td>
                                        {weekData.players[weekData.loggedInAs].points && (
                                            <>
                                                {weekData.players[weekData.loggedInAs].points?.correctTotal}/{weekData.players[weekData.loggedInAs].points?.predicted} correct, {weekData.players[weekData.loggedInAs].points?.totalPoints} points
                                            </>
                                        )}
                                        
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                        {
                            !usedBanker && (
                                <div className="warning">You MUST use your banker for exactly one prediction each week.</div>
                            )
                        }
                    </>
                    
                )
           )}
        </div>
    );
}

export default PredictionsWeek;
