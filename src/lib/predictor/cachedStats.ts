import builtStats from '../../compiled/predictionStats.json';
import { BuiltPredictionStats } from '../types';
export const getCachedStats = () : BuiltPredictionStats => {
    return builtStats as unknown as BuiltPredictionStats;
}