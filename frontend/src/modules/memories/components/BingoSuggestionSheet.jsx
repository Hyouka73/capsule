import { useState, useEffect } from 'react';
import BottomSheetModal from '../../../components/ui/BottomSheetModal/BottomSheetModal';
import Button from '../../../components/ui/Button/Button';
import styles from './BingoSuggestionSheet.module.css';
import { useBingo } from '../../../hooks/useBingo';

/**
 * BingoSuggestionSheet - Permite al usuario seleccionar cuáles casillas del bingo
 * completar basándose en las sugerencias automáticas.
 * 
 * @param {object} props
 * @param {boolean} props.isOpen
 * @param {Array} props.suggestions - Lista de { categoryId, label, emoji }
 * @param {function} props.onConfirm - Recibe array de categoryIds seleccionados
 * @param {function} props.onCancel
 * @param {boolean} props.isSaving
 */
export default function BingoSuggestionSheet({
    isOpen,
    suggestions = [],
    onConfirm,
    onCancel,
    isSaving = false
}) {
    const { isCategoryAvailable } = useBingo();
    const availableSuggestions = suggestions.filter(s => isCategoryAvailable(s.categoryId));

    // Por defecto, todas las sugerencias empiezan seleccionadas
    const [selectedIds, setSelectedIds] = useState(availableSuggestions.map(s => s.categoryId));

    useEffect(() => {
        setSelectedIds(availableSuggestions.map(s => s.categoryId));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [suggestions]);


    const toggleSelection = (id) => {
        setSelectedIds(prev => 
            prev.includes(id) 
                ? prev.filter(item => item !== id)
                : [...prev, id]
        );
    };

    const handleConfirm = () => {
        if (selectedIds.length === 0) {
            onCancel(); // Si no hay nada seleccionado, es como cancelar
            return;
        }
        onConfirm(selectedIds);
    };

    if (availableSuggestions.length === 0) return null;

    return (
        <BottomSheetModal
            isOpen={isOpen}
            onClose={onCancel}
            closeOnClickOutside={false}
            showOverlay={false}
            title={
                <span style={{ fontFamily: 'var(--font-display, "Plus Jakarta Sans")', fontSize: '1.25rem', letterSpacing: '-0.02em', fontWeight: '800' }}>
                    Sugerencias de Citas ✨
                </span>
            }
            description="Hemos detectado que esta experiencia encaja con los siguientes retos:"
            hideActions={true}
        >
            <div className={styles.suggestionGrid}>
                {availableSuggestions.map((suggestion) => {
                    const isSelected = selectedIds.includes(suggestion.categoryId);
                    return (
                        <button
                            key={suggestion.categoryId}
                            type="button"
                            className={`${styles.pill} ${isSelected ? styles.selected : ''}`}
                            onClick={() => toggleSelection(suggestion.categoryId)}
                        >
                            <span className={styles.emoji}>{suggestion.emoji}</span>
                            <span className={styles.label}>{suggestion.label}</span>
                            {isSelected && <span className={styles.check}>✓</span>}
                        </button>
                    );
                })}
            </div>
            
            <div className={styles.actions}>
                <Button 
                    variant="primary" 
                    onClick={handleConfirm}
                    isLoading={isSaving}
                    className={styles.mainBtn}
                >
                    Marcar seleccionadas ({selectedIds.length})
                </Button>
                <Button 
                    variant="ghost" 
                    onClick={onCancel}
                    disabled={isSaving}
                    className={styles.cancelBtn}
                >
                    No, gracias
                </Button>
            </div>
        </BottomSheetModal>
    );
}
