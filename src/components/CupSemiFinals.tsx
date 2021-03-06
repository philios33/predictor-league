import React from 'react';
import { drawPlayerImage } from '../lib/faces';
import { CupSemis } from '../lib/types';

import './CupSemiFinals.scss';

type Props = {
    data: CupSemis
}

function CupSemiFinals(props: Props) {
    return <div>
        {props.data.winner && (
            <div className="winner">
                <h2>Winner: {props.data.winner}</h2>
                {drawPlayerImage(props.data.winner)}
            </div>
        )}
        

        <div className="semiFinals" data-aspect-ratio="yes">
            <div className={"face1 " + props.data.left.home.progress}>{drawPlayerImage(props.data.left.home.name)}</div>
            <div className={"face2 " + props.data.left.away.progress}>{drawPlayerImage(props.data.left.away.name)}</div>
            
            <div className={"face4 " + props.data.right.home.progress}>{drawPlayerImage(props.data.right.home.name)}</div>
            <div className={"face5 " + props.data.right.away.progress}>{drawPlayerImage(props.data.right.away.name)}</div>
            {props.data.final && (
                <>
                    <div className={"face3 " + props.data.final.home.progress}>{drawPlayerImage(props.data.final.home.name)}</div>
                    <div className={"face6 " + props.data.final.away.progress}>{drawPlayerImage(props.data.final.away.name)}</div>
                </>
            )}
            
            <div className="lineBox1"></div>
            <div className="lineBox2"></div>
            <div className="lineBox3"></div>
            <div className="lineBox4"></div>
            <div className="lineBox5"></div>
            <div className="lineBox6"></div>

            {props.data.left.home.cupGoals !== null && (
                <>
                    <div className="score1">{props.data.left.home.cupGoals} - {props.data.left.away.cupGoals}<p className="subText">{props.data.left.text}</p></div>
                    <div className="score2">{props.data.right.home.cupGoals} - {props.data.right.away.cupGoals}<p className="subText">{props.data.right.text}</p></div>
                    {props.data.final && (
                        <div className="score3">{props.data.final.home.cupGoals} - {props.data.final.away.cupGoals}<p className="subText">{props.data.final.text}</p></div>
                    )}
                </>
            )}
        </div>
    </div>
}

export default CupSemiFinals;

