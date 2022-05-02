import React from 'react';
import { getLogo24 } from '../lib/logo';
import { PredictedLeagueTable } from "../lib/types";
import './PremierLeagueTable.scss';

type Props = {
    data: PredictedLeagueTable
    name: string
}

function PredictedTable(props: Props) {

    const rankings = props.data;

    return (
        <div className="premierLeagueTable">
            <p className="tableName">{props.name}</p>
            
            <table>
                <thead>
                    <tr>
                        <th>Pos</th>
                        <th>Team</th>
                        <th>P</th>
                        <th>W</th>
                        <th>D</th>
                        <th>L</th>
                        <th>F</th>
                        <th>A</th>
                        <th>Pts</th>
                        <th>Diff</th>
                    </tr>
                </thead>
                <tbody>
                    {rankings.map(team =>
                        <tr key={team.name}>
                            <td>{team.rank}</td>
                            <td><img className="teamLogo" src={getLogo24(team.name)} alt={team.name} /> {team.name}</td>
                            <td>{team.stats.played}</td>
                            <td>{team.stats.wins}</td>
                            <td>{team.stats.draws}</td>
                            <td>{team.stats.losses}</td>
                            <td>{team.stats.goalsFor}</td>
                            <td>{team.stats.goalsAgainst}</td>
                            <td>{team.stats.points}</td>
                            <td>{team.stats.positionDifference > 0 ? "+" + team.stats.positionDifference : team.stats.positionDifference}</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}

export default PredictedTable;