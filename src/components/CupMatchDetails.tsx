import React from 'react';
import { CupMatchFixture } from '../lib/types';

import './CupMatchDetails.scss';

type Props = {
    fixture: CupMatchFixture
}

function CupMatchDetails(props: Props) {
    return <>
        <tr className="cupMatchDetails">
            <td>
                {props.fixture.cupName}
            </td>
            <td colSpan={6}>
                {props.fixture.fixture.status === "upcoming" ? (
                    <div>Upcoming {props.fixture.weekDescription}, {props.fixture.fixture.home.name} vs {props.fixture.fixture.away.name}</div>
                ) : (
                    <div>{props.fixture.weekDescription} result, {props.fixture.fixture.home.name} {props.fixture.fixture.home.cupGoals} - {props.fixture.fixture.away.cupGoals} {props.fixture.fixture.away.name}</div>
                )}
            </td>
        </tr>
        <tr className="cupMatchDetails padding">
            <td colSpan={7}>&nbsp;</td>
        </tr>
    </>
}

export default CupMatchDetails;

