import React from 'react';
import { CupWeek } from '../lib/types';
import { getLogo48 } from '../lib/logo';

import './CupPhases.scss';
import { drawPlayerImage } from '../lib/faces';

type Props = {
    data: Array<CupWeek>
}

function CupPhases(props: Props) {
    return <>
        {props.data.map((cupWeek,i) => (
            <div key={i} className="cupPhase">
                <h2>{cupWeek.description}, Week {cupWeek.week}</h2>
                <div>
                    {cupWeek.homeTeam !== null && cupWeek.awayTeam !== null && (
                        <table>
                            <tbody>
                                <tr className="teamNames">
                                    {cupWeek.homeTeam === null ? (
                                        <td>?</td>
                                    ) : (
                                        <td>
                                            <img className="teamLogo" src={getLogo48(cupWeek.homeTeam)} alt={cupWeek.homeTeam} title={cupWeek.homeTeam} />
                                            <br /> {cupWeek.homeTeam}
                                        </td>
                                    )}

                                    <td className="vs">vs</td>

                                    {cupWeek.awayTeam === null ? (
                                        <td>?</td>
                                    ) : (
                                        <td>
                                            <img className="teamLogo" src={getLogo48(cupWeek.awayTeam)} alt={cupWeek.awayTeam} title={cupWeek.awayTeam} />
                                            <br /> {cupWeek.awayTeam}
                                        </td>
                                    )}
                                </tr>
                                <tr className="realScore">
                                    <td>{cupWeek.score?.homeTeam}</td>
                                    <td></td>
                                    <td>{cupWeek.score?.awayTeam}</td>
                                </tr>
                            </tbody>
                        </table>
                    )}
                   
            
                    {cupWeek.matches.map((match,i) => (
                        <table key={i}>
                            <tbody>
                                <tr key={i + "_1"} className="cupMatch">
                                    <td className={match.home?.progress || ""}>{match.home === null ? "TBC" : drawPlayerImage(match.home.name)}</td>
                                    <td>vs</td>
                                    <td className={match.away?.progress || ""}>{match.away === null ? "TBC" : drawPlayerImage(match.away.name)}</td>
                                </tr>
                                {match.home !== null && match.away !== null && (
                                    <>
                                        <tr key={i + "_2"} className="cupGoals">
                                            <td className={match.home.progress === "out" ? "greyOut" : ""}>{match.home.cupGoals}</td>
                                            <td></td>
                                            <td className={match.away.progress === "out" ? "greyOut" : ""}>{match.away.cupGoals}</td>
                                        </tr>
                                        <tr key={i + "_3"} className="prediction">
                                            <td className={"goals-" + match.home.cupGoals}>{match.home.prediction}</td>
                                            <td></td>
                                            <td className={"goals-" + match.away.cupGoals}>{match.away.prediction}</td>
                                        </tr>
                                    </>
                                )}
                                {match.text.length > 0 && (
                                    <tr key={i + "_4"} className="cupGoals">
                                        <td colSpan={3}>{match.text}</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    ))}
                        
               </div>
           </div>
       ))}
    </>
}

export default CupPhases;

