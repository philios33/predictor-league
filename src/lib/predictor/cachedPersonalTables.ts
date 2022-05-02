import builtPersonalTables from '../../compiled/personalTables.json';
import { BuiltPersonalTables } from '../types';
export const getCachedPersonalTables = () : BuiltPersonalTables => {
    return builtPersonalTables as unknown as BuiltPersonalTables;
}