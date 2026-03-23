/**
 * useBingo.js
 * 
 * Wrapper hook for BingoContext.
 * Ensures the entire app shares the same Bingo state.
 */

import { useBingoContext } from '../context/BingoContext';

export function useBingo() {
    return useBingoContext();
}
