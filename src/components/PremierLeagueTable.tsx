import moment from 'moment-mini';
import React, { useEffect, useState } from 'react';
import { getLogo24 } from '../lib/logo';
import { LeagueTable, LeagueTables } from "../lib/types";
import './PremierLeagueTable.scss';

type Props = {
    data: LeagueTables
    name: string
    snapshotAt: string
    maxRank: number
    showTableTypeDropdown: boolean
}

const renderDateTime = (dateString: string) => {
    return moment(dateString).format("Do MMM H:mm");
}

function PremierLeagueTable(props: Props) {    

    type TableType = "homeOnly" | "awayOnly" | "all";
    const [tableType, setTableType] = useState("all" as TableType);

    const handleType = (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>, type: TableType) => {
        e.preventDefault();
        setTableType(type);
    }

    const rankings = props.data[tableType];

    return (
        <div className="premierLeagueTable">
            <p className="tableName">{props.name}</p>
            
            {props.showTableTypeDropdown && (
                <ul>
                    <li className={tableType === "all" ? "selected" : ""}><a className="btn" onClick={(e) => handleType(e, "all")} href="#">Both</a></li>
                    <li className={tableType === "homeOnly" ? "selected" : ""}><a className="btn" onClick={(e) => handleType(e, "homeOnly")} href="#">Home Only</a></li>
                    <li className={tableType === "awayOnly" ? "selected" : ""}><a className="btn" onClick={(e) => handleType(e, "awayOnly")} href="#">Away Only</a></li>
                </ul>
            )}
            
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
                    {rankings.filter(team => team.rank !== null && team.rank <= props.maxRank).map(team =>
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
                        </tr>
                    )}
                </tbody>
            </table>
            <p>Standings at: {renderDateTime(props.snapshotAt)}</p>
        </div>
    );
}

export default PremierLeagueTable;