import moment from 'moment-mini';
import React, { useEffect, useState } from 'react';
import compiledResults from '../../compiled/resultsRecent.json' ;
import { getPlayerFaceImage } from '../../lib/faces';
import { getLogo24 } from '../../lib/logo';
import { getPlayerNames } from '../../lib/players';
import { Player, BuiltResults, PointsRow, PlayerPrediction } from '../../lib/types';
import PremierLeagueTable from '../PremierLeagueTable';


const results: BuiltResults = compiledResults as unknown as BuiltResults;


const drawPlayerImage = (playerName: string) => {
    const img = getPlayerFaceImage(playerName, "newspapper");
    return <img className="faceImage" src={img} alt={playerName} title={playerName} />
}

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
                <th title="Correct Result, Wrong Goal Difference">WGD</th>

                <th title="Total Correct Results">TCR</th>

                {/*<th title="Incorrect Results Bankered">INB</th>
                <th title="Incorrect Results Non Bankered">INN</th>*/}
                <th title="Total Incorrect Results">TIR</th>

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
                    <td className="faceCell">
                        {drawPlayerImage(player.name)}
                        {player.name}
                    </td>

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

                    <td>{points.correctTotal}</td>

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

    const renderPlayerPredictionTd = (playerString: string, player?: PlayerPrediction) => {

        if (player) {

            let resultClass = player.points?.type || "";
            if (player.prediction !== null && player.prediction.type === "prediction" && player.prediction.isBanker) {
                resultClass += " withBanker";
            }

            // Do points and colours
            if (player.prediction === null) {
                // No prediction
                return <td key={playerString} className={resultClass}>
                    -
                    <br/>
                    <span className="points">{player.points?.totalPoints} points</span>
                </td>

            } else if (player.prediction.type === "prediction") {
                // Real prediction
                return <td key={playerString} className={resultClass}>
                    {player.prediction.homeTeam} - {player.prediction.awayTeam}
                    {player.points && (
                        <>
                            <br/>
                            <span className="points">{player.points.totalPoints} points</span>
                        </>
                    )}
                </td>

            } else if (player.prediction.type === "hidden") {
                // Hidden prediction
                return <td key={playerString} className={resultClass}>
                    ? - ?
                </td>

            } else {
                return <td key={playerString}>{JSON.stringify(player.prediction, null, 4)}</td>
            }
        }

        // Unknown
        return <td key={playerString}>
            -
        </td>
    }

    return (
        <div className="results">
           <h2>Results</h2>

           {(results.mergedPhases.map(phase => (
                phase.isStarted && (
                    <div key={phase.weekId + "_" + phase.phaseId}>
                        <hr />
                        {phase.isOngoing ? (
                            <p>Part way through week {phase.weekId}.</p>
                        ) : (
                            phase.isLastPhaseOfWeek ? (
                                <p>Game week {phase.weekId} is completed.</p>
                            ) : (
                                <p className="warning">Game week {phase.weekId} fixtures will continue later in the season.</p>
                            )
                        )}

                        {getStandingsTable(phase.cumRankings, user)}
                        
                        <div className="fullWidthScroller">
                            <table className="predictions">
                                <thead>
                                    <tr>
                                        <th>Date / Time</th>
                                        <th colSpan={4}>Match</th>
                                        <th>Score</th>
                                        {players.map(player => (
                                            <th key={player}>{player}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {phase.fixtureGroups.map(fg => (
                                        fg.fixtures.map(fixture => (
                                            <tr key={fixture.homeTeam + "_" + fixture.awayTeam}>
                                                <td>{renderDateTime(fg.kickOff)}</td>
                                                <td className="homeTeamCell"><img className="teamLogo" src={getLogo24(fixture.homeTeam)} alt={fixture.homeTeam} title={fixture.homeTeam} /><br /> {fixture.homeTeam}</td>
                                                <td>vs</td>
                                                <td className="awayTeamCell"><img className="teamLogo" src={getLogo24(fixture.awayTeam)} alt={fixture.awayTeam} title={fixture.awayTeam} /><br /> {fixture.awayTeam}</td>
                                                <td className={fixture.bankerMultiplier ? "bankerMultipler bankerMultipler-" + fixture.bankerMultiplier : "bankerMultipler"}>{fixture.bankerMultiplier && (
                                                    <span>Banker<br/>* {fixture.bankerMultiplier}</span>
                                                )}</td>
                                                <td>{fixture.finalScore && (fixture.finalScore.homeTeam + " - " + fixture.finalScore.awayTeam)}</td>
                                                {players.map(player => (
                                                    renderPlayerPredictionTd(player, fixture.playerPredictions[player])
                                                ))}
                                            </tr>
                                        ))
                                        
                                    ))}
                                    <tr>
                                        <td></td>
                                        <td colSpan={4}></td>
                                        <td>Total</td>
                                        {players.map(player => (
                                            <td key={player}>
                                                <strong>{phase.points[player].totalPoints > 0 && "+"}{phase.points[player].totalPoints}</strong>
                                            </td>
                                        ))}
                                    </tr>
                                </tbody>
                            </table>

                            {(() => { 
                                let totalPoints = 0;
                                players.map(player => {
                                    totalPoints += phase.points[player].totalPoints
                                });
                                let averagePoints = Math.round(totalPoints * 10 / players.length) / 10;
                                return <p className="averagePoints">Average points: {averagePoints}</p>
                            })()}
                            
                        </div>

                        {(phase.isFirstPhaseOfWeek && phase.isLastPhaseOfWeek) ? (
                            <p>Week {phase.weekId} starting.</p>
                        ) : (
                            <p>Week {phase.weekId} part {phase.phaseId} starting.</p>
                        )}
                        
                        {(phase.weekId !== "1") && (
                            <PremierLeagueTable data={results.startOfWeekStandings[phase.weekId].leagueTables} snapshotAt={results.startOfWeekStandings[phase.weekId].snapshotTime} name={"Top 4 at the start of week " + phase.weekId} maxRank={4} showTableTypeDropdown={false} />
                        )}
                        
                    </div>
                )
           )).reverse())}
        </div>
    );
}

export default Results;
