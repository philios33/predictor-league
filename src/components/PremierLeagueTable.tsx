import moment from 'moment-mini';
import React, { useEffect, useState } from 'react';
import { LeagueTables } from "../lib/types";

type Props = {
    data: LeagueTables
    minRank: number
    maxRank: number
    name: string
    snapshotAt: string
}

type TableType = "all" | "homeOnly" | "awayOnly";

const renderDateTime = (dateString: string) => {
    return moment(dateString).format("Do MMM H:mm");
}

function PremierLeagueTable(props: Props) {    

    // const [tableType, setTableType] = useState('all' as TableType);
    
    /*
    const handleTableTypeChange = (type: TableType) => {
        setTableType(type)
    }
    */

    const tableType = "all";
    const rankings = props.data[tableType].filter((t) => t.rank !== null && t.rank >= props.minRank && t.rank <= props.maxRank);
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
                    </tr>
                </thead>
                <tbody>
                    {rankings.map(team =>
                        <tr key={team.name}>
                            <td>{team.rank}</td>
                            <td>{team.name}</td>
                            <td>{team.stats.played}</td>
                            <td>{team.stats.wins}</td>
                            <td>{team.stats.draws}</td>
                            <td>{team.stats.losses}</td>
                            <td>{team.stats.goalsFor}</td>
                            <td>{team.stats.goalsAgainst}</td>
                            <td>{team.stats.points}</td>
                        </tr>
                    )}
                </tbody>
            </table>
            <p>Standings at: {renderDateTime(props.snapshotAt)}</p>
        </div>
    );
}

export default PremierLeagueTable;