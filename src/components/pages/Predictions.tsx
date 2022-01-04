

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CompiledSchedule, CompiledScores } from '../../lib/types';

import compiledSchedule from '../../compiled/schedule.json';
import compiledScores from '../../compiled/scores.json';
import StatusBox from '../StatusBox';
import { getLogin } from '../../lib/util';
// import RecordAudio from '../RecordAudio';

type Props = {
    // weekOffset: number
}

function Predictions(props: Props) {

    // Work out the weeks with upcoming matches
    const schedule = compiledSchedule as CompiledSchedule;
    const scores = compiledScores as CompiledScores;

    const weekFreq: {[key: string]:{
        id: string, 
        upcoming: number // Matches upcoming
        kickedOff: number // Matches kicked off
        results: number // Matches with results
        future: number // Matches in the far future
        postponed: number // Matches that are postponed and are not yet rescheduled
        total: number // Total in this week
    }} = {};

    const initWeek = (weekId: string) => {
        if (!(weekId in weekFreq)) {
            weekFreq[weekId] = {
                id: weekId,
                upcoming: 0,
                kickedOff: 0,
                results: 0,
                future: 0,
                postponed: 0,
                total: 0,
            }
        }
    }
    
    const now = new Date();
    for (const homeTeam in schedule.matches) {
        for (const awayTeam in schedule.matches[homeTeam].against) {
            const match = schedule.matches[homeTeam].against[awayTeam];

            initWeek(match.weekId);

            let hasFinalScore = false;
            if (homeTeam in scores) {
                if (awayTeam in scores[homeTeam].against) {
                    const score = scores[homeTeam].against[awayTeam];
                    if (score.type === "finalScore") {
                        hasFinalScore = true;
                    }
                }
            }

            weekFreq[match.weekId].total++;
            if (hasFinalScore) {
                // RESULT
                weekFreq[match.weekId].results++;
            } else {
                if (match.kickOff === "2022-05-05T14:55:00.000Z") {
                    weekFreq[match.weekId].postponed++;
                } else {
                    const kickOff = new Date(match.kickOff);
                    const daysUntilKickOff = Math.floor((kickOff.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                    if (daysUntilKickOff < 7) {
                        if (kickOff > now) {
                            // UPCOMING (within 7 days)
                            weekFreq[match.weekId].upcoming++;
                        } else {
                            // KICKED OFF BUT NO RESULT
                            weekFreq[match.weekId].kickedOff++;
                        }
                    } else {
                        // IN THE FAR FUTURE
                        weekFreq[match.weekId].future++;
                    }
                }
            }
        }
    }

    // Order the weekFreq values by the weekId order that appears in schedule.weeksOrder
    const sortedWeeks = Object.values(weekFreq).sort((a,b) => {
        const aOrder = schedule.weeksOrder.indexOf(a.id);
        const bOrder = schedule.weeksOrder.indexOf(b.id);
        return aOrder - bOrder;
    });

    const upcomingWeeks = sortedWeeks.filter(w => w.upcoming > 0);

    const finishedWeeks = sortedWeeks.filter(w => (w.kickedOff + w.results) === 10);

    const unfinishedWeeks = sortedWeeks.filter(w => w.upcoming === 0 && (w.kickedOff + w.results) < 10 && (w.kickedOff + w.results) > 0);

    // const login = getLogin();
    
    
    return (
        <div className="predictions">
            <h2>Predictions</h2>

            <h3>Game Weeks with upcoming matches</h3>
            {upcomingWeeks.length > 0 ? (
                <ul className="upcomingPredictionWeeks">
                    {upcomingWeeks.map((week) => 
                        <li key={week.id}>
                            <Link to={"/predictions/" + encodeURIComponent(week.id)} className="btn">Game Week {week.id}</Link>
                            &nbsp;
                            <small>({weekFreq[week.id].upcoming + weekFreq[week.id].future} scheduled, {weekFreq[week.id].postponed} postponed)</small>
                            <br />
                            <StatusBox weekId={week.id} />
                        </li>
                    ).reverse()}
                </ul>
            ) : (
                <p>None</p>
            )}

            <h3>Incomplete</h3>
            {unfinishedWeeks.length > 0 ? (
                <ul>
                    {unfinishedWeeks.map((week) => 
                        <li key={week.id}><Link to={"/predictions/" + encodeURIComponent(week.id)} className="btn">Game Week {week.id}</Link>
                        &nbsp;
                        <small>({weekFreq[week.id].results + weekFreq[week.id].kickedOff} played, {weekFreq[week.id].upcoming + weekFreq[week.id].future} scheduled, {weekFreq[week.id].postponed} postponed)</small>
                        </li>
                    ).reverse()}
                </ul>
            ) : (
                <p>None</p>
            )}


            <h3>Completed</h3>
            {finishedWeeks.length > 0 ? (
                <ul>
                    {finishedWeeks.map((week) => 
                        <li key={week.id}><Link to={"/predictions/" + encodeURIComponent(week.id)} className="btn">Game Week {week.id}</Link></li>
                    ).reverse()}
                </ul>
            ) : (
                <p>None</p>
            )}

            { /*<RecordAudio />*/ }

        </div>
    );
}

export default Predictions;
