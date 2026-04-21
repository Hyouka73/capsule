import { useEffect } from 'react';
import { usePendingCitas } from './usePendingCitas';
import { useBingo } from './useBingo';

/**
 * evaluateBingoMatch
 * 
 * Logic to check if a memory (draft or pending) matches any bingo categories.
 * Returns an array of suggestions { categoryId, label, emoji }.
 */
export function evaluateBingoMatch(memory, allCategories) {
    if (!allCategories || allCategories.length === 0 || !memory.tags || memory.tags.length === 0) {
        return [];
    }

    const memoryTagsLower = memory.tags.map(t => {
        if (typeof t === 'string') return t.toLowerCase().trim();
        return t?.id?.toLowerCase() || t?.value?.toLowerCase() || '';
    }).filter(Boolean);

    return allCategories
        .filter(cat => {
            // Skip completed, disabled, or pending sync
            if (cat.completedMemoryId || cat.isEnabled === false || cat.isPendingSync) return false;
            
            // Detection Logic:
            // 1. Direct ID match: category.id matches any of the memory's tags
            const isIdMatch = memoryTagsLower.some(mt => mt === cat.id.toLowerCase());

            // 2. Suggested Tags: Memory must have ALL tags suggested by the category (Strict)
            const suggestedTags = cat.suggestedTags || [];
            let hasEverySuggestedMatch = false;
            
            if (suggestedTags.length > 0) {
                hasEverySuggestedMatch = suggestedTags.every(st => {
                    const stVal = (typeof st === 'string' ? st : (st.id || st.value || '')).toLowerCase().trim();
                    if (!stVal) return false;
                    return memoryTagsLower.includes(stVal);
                });
            }
            
            return isIdMatch || hasEverySuggestedMatch;
        })
        .map(cat => ({
            categoryId: cat.id,
            label: cat.title || cat.label,
            emoji: cat.emoji
        }));
}

/**
 * useBingoMatcher
 * 
 * Proactive/Reactive background observer.
 */
export function useBingoMatcher() {
    const { pendingCitas, updatePendingCita } = usePendingCitas();
    const { allCategories, enqueueBingoSuggestion, bingoQueue } = useBingo();

    useEffect(() => {
        if (!allCategories || allCategories.length === 0 || !pendingCitas || pendingCitas.length === 0) return;

        pendingCitas.forEach(cita => {
            if (!cita.isFromBingo && cita.tags && cita.tags.length > 0 && !cita.bingoMatched) {
                const inQueue = bingoQueue.some(q => q.memoryId === cita.id);
                if (inQueue) return;

                const bingoSuggestions = evaluateBingoMatch(cita, allCategories);

                if (bingoSuggestions.length > 0) {
                    enqueueBingoSuggestion(cita.id, bingoSuggestions);
                    updatePendingCita(cita.id, { bingoMatched: true }).catch(() => {});
                }
            }
        });
    }, [pendingCitas, allCategories, bingoQueue, enqueueBingoSuggestion, updatePendingCita]);
}
