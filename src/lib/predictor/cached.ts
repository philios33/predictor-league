
import compiledSchedule from '../../compiled/schedule.json';
import compiledScores from '../../compiled/scores.json';

import { CompiledSchedule, CompiledScores } from '../types';

export const getCachedMatchSchedule = () : CompiledSchedule => {
    return compiledSchedule as CompiledSchedule;
}

export const getCachedMatchScores = () : CompiledScores => {
    return compiledScores as CompiledScores;
}


