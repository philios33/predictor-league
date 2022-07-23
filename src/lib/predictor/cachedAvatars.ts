import builtAvatars from '../../compiled/avatars.json';
import { BuiltAvatarHistory } from '../types';
export const getCachedAvatarHistory = () : BuiltAvatarHistory => {
    return builtAvatars as unknown as BuiltAvatarHistory;
}