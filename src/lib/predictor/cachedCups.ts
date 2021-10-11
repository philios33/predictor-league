import builtCups from '../../compiled/cups.json';
import { BuiltCups } from '../types';
export const getCachedCups = () : BuiltCups => {
    return builtCups as unknown as BuiltCups;
}