import React from 'react';

import cupImage from '../../assets/cup.jpg';

function Cup() {    
    
    return (
        <div className="cup">
            <h1>The predictor cup</h1>

            <img className="cupImage" src={cupImage} />

            <h2>History</h2>
            <p>Add something here</p>

            <h2>Rules</h2>
            <ul>
                <li>The predictor cup runs in tandem with the predictor league.</li>
                <li>9 players are divided up in to 3 groups.  We can do a draw in whatsapp.</li>
                <li>One specific match is chosen (by Mike) to be the designated cup match for that week.</li>
                <li>To win your cup match, you must beat your rivals prediction score for that match.</li>
                <li>Win = 3 points, Draw = 1 point.  Each prediction point is like a goal in your cup match.</li>
                <li>Groups are sorted by points, goal difference then goals scored.</li>
                <li>All players play the other two in their group once.  This will take 3 match weeks with a rotating 6 of 9 players competing in the cup.</li>
                <li>The winners of the 3 groups and the best 2nd place player will enter the semi final draw.</li>
                <li>An extra playoff match week may be required to determine the best 2nd placed player.</li>
                <li>The semi final draw happens on Whatsapp.</li>
                <li>Semi finals and the final can have infinite replays in the case of a draw.</li>
                <li>The fact that a match is a designated cup match against a rival player should be made clear to both players in good time on the predictions screen, or agreed on whatsapp.</li>
                <li>With no playoffs and no replays this cup will last 5 weeks.</li>
            </ul>
            
            
            
        </div>
    );
}

export default Cup;
