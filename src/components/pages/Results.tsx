import moment from 'moment-mini';
import React, { useEffect, useState } from 'react';
import compiledResults from '../../compiled/results.json' ;
import { getPlayerNames } from '../../lib/players';
import { Player, BuiltResults, PointsRow, PlayerPrediction } from '../../lib/types';


const results: BuiltResults = compiledResults as BuiltResults;

const getStandingsTable = (players: Array<Player>, user: null | string) => {
    return <table>
        <thead>
            <tr>
                <th>Rank</th>
                <th>Name</th>

                <th title="Predictions Made">PRE</th>
                <th title="Predictions Missed">MIS</th>

                {/*<th title="Correct Scores Bankered">CSB</th>
                <th title="Correct Scores Non Bankered">CSN</th>*/}
                <th title="Correct Scores">CS</th>

                {/*<th title="Correct Goal Difference Bankered">CGB</th>
                <th title="Correct Goal Difference Non Bankered">CGN</th>*/}
                <th title="Correct Goal Difference">CGD</th>

                {/*<th title="Correct Result Bankered">CRB</th>
                <th title="Correct Result Non Bankered">CRN</th>*/}
                <th title="Correct Result">CR</th>

                {/*<th title="Incorrect Results Bankered">INB</th>
                <th title="Incorrect Results Non Bankered">INN</th>*/}
                <th title="Incorrect Results">IR</th>

                <th title="Regular Points">RPT</th>
                <th title="Banker Points">BPT</th>
                <th title="Total Points">PTS</th>
            </tr>
        </thead>
        <tbody>
            { players.map(player => {

                const points = player.points as PointsRow;

                return <tr key={player.name} className={player.name === user ? "myUser" : ""}>
                    <td>{player.rank}</td>
                    <td>{player.name}</td>

                    <td>{points.predicted}</td>
                    <td>{points.missed}</td>

                    {/*<td>{points.correctScoresBankered}</td>
                    <td>{points.correctScoresNonBankered}</td>*/}
                    <td>{points.correctScoresTotal}</td>

                    {/*<td>{points.correctGDBankered}</td>
                    <td>{points.correctGDNonBankered}</td>*/}
                    <td>{points.correctGDTotal}</td>

                    {/*<td>{points.correctOutcomeBankered}</td>
                    <td>{points.correctOutcomeNonBankered}</td>*/}
                    <td>{points.correctOutcomeTotal}</td>

                    {/*<td>{points.incorrectBankered}</td>
                    <td>{points.incorrectNonBankered}</td>*/}
                    <td>{points.incorrectTotal}</td>

                    <td>{points.regularPoints}</td>
                    <td>{points.bankerPoints}</td>
                    <td className="totalPoints">{points.totalPoints}</td>
                </tr>
            })}
        </tbody>
    </table>
}

const renderDateTime = (dateString: string) => {
    return moment(dateString).format("Do MMM H:mm");
}

function Results() {

    const [user, setUser] = useState(null as null | string);
    useEffect(() => {
        const login = localStorage.getItem("login");
        if (login !== null) {
            const decoded = JSON.parse(login);
            setUser(decoded.username);
        } else {
            setUser(null);
        }
    }, [])

    const players = getPlayerNames();

    const renderPlayerPredictionTd = (player?: PlayerPrediction) => {

        if (player) {

            let resultClass = player.points?.type || "";
            if (player.prediction !== null && player.prediction.type === "prediction" && player.prediction.isBanker) {
                resultClass += " withBanker";
            }

            // Do points and colours
            if (player.prediction === null) {
                // No prediction
                return <td className={resultClass}>
                    &lt;None&gt;
                    <br/>
                    <span className="points">{player.points?.totalPoints} points</span>
                </td>

            } else if (player.prediction.type === "prediction") {
                // Real prediction
                return <td className={resultClass}>
                    {player.prediction.homeTeam} - {player.prediction.awayTeam}
                    <br/>
                    <span className="points">{player.points?.totalPoints} points</span>
                </td>

            } else if (player.prediction.type === "hidden") {
                // Hidden prediction
                return <td className={resultClass}>
                    ? - ?
                </td>

            }
        }

        // Unknown
        return <td></td>
    }
    return (
        <div className="results">
           <h2>Results</h2>

           {(results.mergedPhases.map(phase => (

                <div key={phase.weekId + "_" + phase.phaseId}>
                    <hr />
                    {phase.isOngoing ? (
                        <p>Part way through week {phase.weekId}.</p>
                    ) : (
                        phase.isLastPhaseOfWeek ? (
                            <p>Week {phase.weekId} is completed.</p>
                        ) : (
                            <p>Week {phase.weekId} fixtures will continue later in the season.</p>
                        )
                    )}

                    {getStandingsTable(phase.cumRankings, user)}
                    
                    <div className="fullWidthScroller">
                        <table className="predictions">
                            <thead>
                                <tr>
                                    <th>Date / Time</th>
                                    <th>Match</th>
                                    <th>Score</th>
                                    {players.map(player => (
                                        <th>{player}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                    <tr>
                                            <td></td>
                                            <td></td>
                                            <td>Total</td>
                                            {players.map(player => (
                                                <td>
                                                    <strong>{phase.points[player].totalPoints >= 0 && "+"}{phase.points[player].totalPoints}</strong>
                                                </td>
                                            ))}
                                    </tr>
                                {phase.fixtureGroups.map(fg => (
                                    <>
                                        
                                        {fg.fixtures.map(fixture => (
                                            <tr key={fixture.homeTeam + "_" + fixture.awayTeam}>
                                                <td>{renderDateTime(fg.kickOff)}</td>
                                                <td>{fixture.homeTeam + " vs " + fixture.awayTeam}</td>
                                                <td>{fixture.finalScore && (fixture.finalScore.homeTeam + " - " + fixture.finalScore.awayTeam)}</td>
                                                {players.map(player => (
                                                    renderPlayerPredictionTd(fixture.playerPredictions[player])
                                                ))}
                                            </tr>
                                        ))}
                                    </>
                                )).reverse()}
                            </tbody>
                        </table>
                    </div>

                    {(phase.isFirstPhaseOfWeek && phase.isLastPhaseOfWeek) ? (
                        <p>Week {phase.weekId} starting.</p>
                    ) : (
                        <p>Week {phase.weekId} part {phase.phaseId} starting.</p>
                    )}

                    <p>Based on the standings at {renderDateTime(results.startOfWeekStandings[phase.weekId].snapshotTime)} (the start of week {phase.weekId}), the following banker multipliers will apply:</p>
                    
                    <table>
                        <thead>
                            <tr>
                                <th>Player</th>
                                <th>Rank position</th>
                                <th>Banker Power</th>
                            </tr>
                        </thead>
                        <tbody>
                            {results.startOfWeekStandings[phase.weekId].rankings.map(player => (
                                <tr>
                                    <td>{player.name}</td>
                                    <td>{player.rank}</td>
                                    <td>x{results.startOfWeekStandings[phase.weekId].bankerMultipliers[player.name]}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                        
                    
                </div>
                
           )).reverse())}
        </div>
    );
}

export default Results;
