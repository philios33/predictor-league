import builtResults from '../../compiled/results.json';
import { BuiltResults } from '../types';
export const getCachedResults = () : BuiltResults => {
    return builtResults as BuiltResults;
}