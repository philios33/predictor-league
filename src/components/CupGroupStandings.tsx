import React from 'react';
import { drawPlayerImage } from '../lib/faces';
import { CupGroup, LeagueTableRow } from '../lib/types';

import './CupGroupStandings.scss';

type Props = {
    data: Array<CupGroup>
}

const getStandingsClassName = (group: CupGroup, row: LeagueTableRow): string => {
    
    if (group.playersKnockedOut.includes(row.name)) {
        return "knockedOut";
    } else if (group.playersProgressed.includes(row.name)) {
        return "progressed";
    } else {
        return "";
    }
}

function CupGroupStandings(props: Props) {
    return <>
       {props.data.map((group, i) => (
           <div className="groupStanding" key={i}>
               <h2>{group.name}</h2>
               {group.table !== null && (
                    <table>
                        <thead>
                            <tr>
                                <th>Pos</th>
                                <th>Player</th>
                                <th>P</th>
                                <th>W</th>
                                <th>D</th>
                                <th>L</th>
                                <th>F</th>
                                <th>A</th>
                                <th>Pts</th>
                            </tr>
                        </thead>
                        <tbody>
                            {group.table.map((row, i) => (
                                <tr key={i} className={getStandingsClassName(group, row)}>
                                    <td>{row.rank}</td>
                                    <td>{drawPlayerImage(row.name)}</td>
                                    <td>{row.stats.played}</td>
                                    <td>{row.stats.wins}</td>
                                    <td>{row.stats.draws}</td>
                                    <td>{row.stats.losses}</td>
                                    <td>{row.stats.goalsFor}</td>
                                    <td>{row.stats.goalsAgainst}</td>
                                    <td>{row.stats.points}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
               )}
               
           </div>
       ))}
    </>
}

export default CupGroupStandings;

