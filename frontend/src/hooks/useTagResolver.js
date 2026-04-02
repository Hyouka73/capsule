import { useMemo } from 'react';
import { useAppConfig } from '../context/AppConfigContext';

/**
 * useTagResolver
 * 
 * Translates immutable tag IDs (e.g. 'tag_viaje') into human-readable
 * { id, label, emoji } objects using the memoryTags from AppConfig.
 * 
 * The AppConfig is already cached in IndexedDB by AppConfigContext, so
 * this is instant and works fully offline.
 */
export function useTagResolver() {
    const { memoryTags } = useAppConfig();

    /** Map of id → tag object, built once per memoryTags reference */
    const tagMap = useMemo(() => {
        const map = new Map();
        (memoryTags || []).forEach(tag => {
            if (tag?.id) map.set(tag.id, tag);
        });
        return map;
    }, [memoryTags]);

    /**
     * Resolve a single tag ID to { id, label, emoji }.
     * Falls back gracefully for legacy text tags or unknown IDs.
     */
    const resolveTag = (id) => {
        if (!id) return { id: '', label: '', emoji: '🏷️' };

        const found = tagMap.get(id);
        if (found) return found;

        // Legacy IDs like 'cita' → look for tag_cita
        const legacyMatch = tagMap.get(`tag_${id}`);
        if (legacyMatch) return legacyMatch;

        // Unknown ID — display raw with fallback emoji
        return { id, label: id, emoji: '🏷️' };
    };

    /** Resolve an array of tag IDs */
    const resolveTags = (ids) => (ids || []).map(resolveTag);

    return { resolveTag, resolveTags, tagMap };
}
