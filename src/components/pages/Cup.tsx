import React, { useState } from 'react';
import { useParams } from 'react-router';

import cupImage from '../../assets/cup.jpg';

import { getCachedCups } from '../../lib/predictor/cachedCups';
import CupGroupStandings from '../CupGroupStandings';
import CupPhases from '../CupPhases';
import CupSemiFinals from '../CupSemiFinals';

function Cup() {    
    
    const { cupId } = useParams() as {cupId: string};

    const cups = getCachedCups();
    if (!(cupId in cups)) {
        return (
            <div className="cup">
                <h1>Unknown cup</h1>
            </div>
        )
    }

    const cup = cups[cupId];

    const [viewingRules, setViewingRules] = useState(false);

    const showRules = (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>, show: boolean) => {
        e.preventDefault();
        setViewingRules(show);
    }
    
    return (
        <div className="cup">
            <h1>{cup.name}</h1>

            <img className="cupImage" src={cupImage} />

            {!viewingRules ? (
                <>
                    <br/>
                    <a className="btn" href="#" onClick={(e) => showRules(e, true)}>View rules</a>
                    <br/>
                </>
            ) : (
                <>
                    <h2>Rules &amp; Information</h2>
                    <ul>
                        {cup.details.map((info, i) => (
                            <li key={i}>{info}</li>
                        ))}
                    </ul>
                    <a className="btn" href="#" onClick={(e) => showRules(e, false)}>Hide rules</a>
                    <br/>
                </>
            )}

            {cup.semis !== null && (
                <CupSemiFinals data={cup.semis} />
            )}

            {cup.koPhaseWeeks.length > 0 && (
                <CupPhases data={cup.koPhaseWeeks} />
            )}

            <CupGroupStandings data={cup.groups} />
            
            {cup.groupPhaseWeeks.length > 0 && (
                <CupPhases data={cup.groupPhaseWeeks} />
            )}
            
        </div>
    );
}

export default Cup;
