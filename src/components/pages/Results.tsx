import moment from 'moment-mini';
import React, { useEffect, useState } from 'react';
import compiledResults from '../../compiled/resultsRecent.json' ;
import { drawPlayerImage } from '../../lib/faces';
import { getLogo24 } from '../../lib/logo';
import { getPlayerNames } from '../../lib/players';
import { Player, BuiltResults, PointsRow, PlayerPrediction } from '../../lib/types';
import PremierLeagueTable from '../PremierLeagueTable';
import { getLogin } from '../../lib/util';


const results: BuiltResults = compiledResults as unknown as BuiltResults;

const getStandingsTable = (players: Array<Player>, user: null | string, atTimestamp: Date) => {
    return <table>
        <thead>
            <tr>
                <th>Rank</th>
                <th>Name</th>

                <th title="Predictions made">PRE</th>
                <th title="Predictions missed">MIS</th>

                {/*<th title="Correct Scores Bankered">CSB</th>
                <th title="Correct Scores Non Bankered">CSN</th>*/}
                <th title="Correct scores">CS</th>

                {/*<th title="Correct Goal Difference Bankered">CGB</th>
                <th title="Correct Goal Difference Non Bankered">CGN</th>*/}
                <th title="Correct goal difference">CGD</th>

                {/*<th title="Correct Result Bankered">CRB</th>
                <th title="Correct Result Non Bankered">CRN</th>*/}
                <th title="Correct result, wrong goal difference">WGD</th>

                <th title="Hitrate (Correct results from total predicted)">HIT</th>

                <th title="Regular points">RPT</th>
                <th title="Banker points">BPT</th>
                <th title="Total points">PTS</th>
            </tr>
        </thead>
        <tbody>
            { players.map(player => {

                const points = player.points as PointsRow;

                let percCorrect = 0;
                if ((points.correctTotal + points.incorrectTotal) > 0) {
                    percCorrect = Math.round(points.correctTotal / (points.correctTotal + points.incorrectTotal) * 100);
                }

                return <tr key={player.name} className={player.name === user ? "myUser" : ""}>
                    <td>{player.rank}</td>
                    <td className="faceCell">
                        {drawPlayerImage(player.name, atTimestamp)}
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

                    <td>
                        <img className="pie" src={"/piechart/1/" + percCorrect + "/" + (100 - percCorrect)} />
                        <p className="pieText">{percCorrect}%</p>
                    </td>
                    
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

        const login = getLogin();
        if (login !== null) {
            setUser(login.username);
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
           <h2>Results Feed</h2>

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

                        {getStandingsTable(phase.cumRankings, user, new Date(phase.fixtureGroups[phase.fixtureGroups.length - 1].kickOff))}
                        
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

           <hr />
           <h3>Season preview</h3>
           <table className="competitors">
                <tbody>
                    <tr>
                        <td className="faceCell">
                            {drawPlayerImage(players[0])}
                            {players[0]}
                        </td>
                        <td className="faceCell">
                            {drawPlayerImage(players[1])}
                            {players[1]}
                        </td>
                        <td className="faceCell">
                            {drawPlayerImage(players[2])}
                            {players[2]}
                        </td>
                        <td className="faceCell">
                            {drawPlayerImage(players[3])}
                            {players[3]}
                        </td>
                    </tr>
                    <tr>
                        <td className="faceCell">
                            {drawPlayerImage(players[4])}
                            {players[4]}
                        </td>
                        <td className="faceCell">
                            {drawPlayerImage(players[5])}
                            {players[5]}
                        </td>
                        <td className="faceCell">
                            {drawPlayerImage(players[6])}
                            {players[6]}
                        </td>
                        <td className="faceCell">
                            {drawPlayerImage(players[7])}
                            {players[7]}
                        </td>
                    </tr>
                    <tr>
                        <td className="faceCell">
                            {drawPlayerImage(players[8])}
                            {players[8]}
                        </td>
                        <td className="faceCell">
                            {drawPlayerImage(players[9])}
                            {players[9]}
                        </td>
                        <td className="faceCell">
                            {drawPlayerImage(players[10])}
                            {players[10]}
                        </td>
                        <td className="faceCell">
                            {drawPlayerImage(players[11])}
                            {players[11]}
                        </td>
                    </tr>
                    <tr>
                        <td className="faceCell">
                            {drawPlayerImage(players[12])}
                            {players[12]}
                        </td>
                        <td className="faceCell">
                            {drawPlayerImage(players[13])}
                            {players[13]}
                        </td>
                        <td className="faceCell">
                            {drawPlayerImage(players[14])}
                            {players[14]}
                        </td>
                        <td className="faceCell">
                            {drawPlayerImage(players[15])}
                            {players[15]}
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}

export default Results;
