import React from 'react';
import { getLogo48 } from '../lib/logo';
import { MatchPredictionStats, PredictionStats } from '../lib/types';
import mysticMeg from '../assets/meg_large.jpg';
import './PredictionModal.scss';

type Props = {
    homeTeam: string
    awayTeam: string
    homeRank: string
    awayRank: string
    stats: MatchPredictionStats
    close: Function
    usePrediction: Function
}

function renderPossibleResultsPercentages(teamName: string, stats: PredictionStats, isHome: boolean, againstSegment: "top6" | "middle8" | "bottom6") {
    if (stats.wins === stats.draws && stats.wins === stats.losses) {
        return <p>Your predictions for {teamName} {isHome ? "at home" : "away from home"} against a {againstSegment} team have no pattern. {stats.wins} wins, {stats.draws} draws, {stats.losses} losses.</p>
    } else {
        let normally = "capitulate"; // HAHA
        if (stats.wins > stats.draws && stats.wins > stats.losses) {
            normally = "win";
        } else if (stats.draws > stats.wins && stats.draws > stats.losses) {
            normally = "draw";
        } else if (stats.losses > stats.wins && stats.losses > stats.draws) {
            normally = "lose";
        } else if (stats.wins === stats.draws && stats.wins > stats.losses) {
            normally = "win or draw";
        } else if (stats.wins === stats.losses && stats.wins > stats.draws) {
            normally = "win or lose";
        } else if (stats.draws === stats.losses && stats.draws > stats.wins) {
            normally = "draw or lose";
        }

        return <p>You normally predict {teamName} to {normally} {isHome ? "at home" : "away from home"} against a {againstSegment} team. {Math.round(100 * stats.wins / stats.predictions)}% win, {Math.round(100 * stats.draws / stats.predictions)}% draw, {Math.round(100 * stats.losses / stats.predictions)}% lose.</p>
    }

}

function PredictionModal(props: Props) {


  
    return <div className="predictionModal">
        <div className="shadowScreen">

        </div>

        <div className="modal">
            <div>
                <span className="rankBox">{props.homeRank}</span>
                <img className="teamLogo" src={getLogo48(props.homeTeam)} alt={props.homeTeam} title={props.homeTeam} />
                vs
                <img className="teamLogo" src={getLogo48(props.awayTeam)} alt={props.awayTeam} title={props.awayTeam} />
                <span className="rankBox">{props.awayRank}</span>
            </div>
            <div>
                <img className="meg" src={mysticMeg} alt="Mystic Meg" title="Mystic Meg" />

                {props.stats.homeTeam.predictions > 0 ? (
                    <>
                        <p>Based on {props.stats.homeTeam.predictions} previous predictions, you predicted that {props.homeTeam} would score an average of {Math.round(10 * props.stats.homeTeam.goalsFor / props.stats.homeTeam.predictions) / 10} goals and concede an average of {Math.round(10 * props.stats.homeTeam.goalsAgainst / props.stats.homeTeam.predictions) / 10} goals at home against a {props.stats.awayTeamSegment} team.</p>
                        {renderPossibleResultsPercentages(props.homeTeam, props.stats.homeTeam, true, props.stats.awayTeamSegment)}
                    </>
                ) : (
                    <p>You have not made any predictions for {props.homeTeam} at home against a {props.stats.awayTeamSegment} team yet.</p>
                )}
                {props.stats.awayTeam.predictions > 0 ? (
                    <>
                        <p>Based on {props.stats.awayTeam.predictions} previous predictions, you predicted that {props.awayTeam} would score an average of {Math.round(10 * props.stats.awayTeam.goalsFor / props.stats.awayTeam.predictions) / 10} goals and concede an average of {Math.round(10 * props.stats.awayTeam.goalsAgainst / props.stats.awayTeam.predictions) / 10} goals away from home against a {props.stats.homeTeamSegment} team.</p>
                        {renderPossibleResultsPercentages(props.awayTeam, props.stats.awayTeam, false, props.stats.homeTeamSegment)}
                    </>
                ) : (
                    <p>You have not made any predictions for {props.awayTeam} away from home against a {props.stats.homeTeamSegment} team yet.</p>
                )}
                <p>Due to the above information, you are most likely to predict: <strong>{props.stats.mostLikelyPrediction.homeGoals}-{props.stats.mostLikelyPrediction.awayGoals}</strong></p>
            </div>
            <button className="btn" onClick={(e) => props.usePrediction()}>Use {props.stats.mostLikelyPrediction.homeGoals}-{props.stats.mostLikelyPrediction.awayGoals}</button>
            <button className="btn" onClick={(e) => props.close()}>Close</button>
        </div>
        
    </div>
}

export default PredictionModal;

