import { useState } from 'react';
import { useBingo } from '../../hooks/useBingo';
import { useAppConfig } from '../../context/AppConfigContext';
import { useTagResolver } from '../../hooks/useTagResolver';
import styles from './BingoManager.module.css';

// Sub-components
import BingoEditPanel from './components/BingoEditPanel';

export default function BingoManager() {
    // TODO v1.1: Pool system with random selection per user.
    const { 
        allCategories: squares, 
        isLoading, 
        updateBingoBoard 
    } = useBingo();
    const { memoryTags } = useAppConfig();

    const [editingSquare, setEditingSquare] = useState(null);
    const [formData, setFormData] = useState({ 
        title: '', 
        emoji: '', 
        description: '', 
        minPhotos: 1,
        suggestedTags: [],
        suggestedPlace: '',
        isSpecial: false,
        isEnabled: true
    });

    const { resolveTags } = useTagResolver();

    const handleEdit = (square) => {
        setEditingSquare(square);
        
        // Sanitize tags: use the resolver to ensure we have valid labels for the IDs saved in DB
        const rawTags = square.suggestedTags || [];
        const sanitizedTags = resolveTags(rawTags.map(t => typeof t === 'string' ? t : t.value));

        setFormData({
            title: square.title || square.label || '',
            emoji: square.emoji || '🎯',
            description: square.description || '',
            minPhotos: square.minPhotos || 1,
            suggestedTags: sanitizedTags,
            suggestedPlace: square.suggestedPlace || '',
            isSpecial: !!square.isSpecial,
            isEnabled: square.isEnabled !== false
        });
    };

    const handleSave = async (e) => {
        if (e) e.preventDefault();
        
        const newSquares = squares.map(sq => 
            sq.id === editingSquare.id ? { ...sq, ...formData, label: formData.title } : sq
        );

        const result = await updateBingoBoard(newSquares);
        if (result.success) {
            setEditingSquare(null);
        }
    };

    const handleUncheck = async (id) => {
        if (confirm('¿Seguro que quieres desmarcar esta casilla? Se borrará el vínculo al recuerdo.')) {
            const newSquares = squares.map(sq => 
                sq.id === id ? { ...sq, isCompleted: false, completedMemoryId: null, completedAt: null } : sq
            );
            await updateBingoBoard(newSquares);
            setEditingSquare(null);
        }
    };

    const handleForceComplete = async (id) => {
        const newSquares = squares.map(sq => 
            sq.id === id ? { 
                ...sq, 
                isCompleted: true, 
                completedMemoryId: 'admin-manual', 
                completedAt: new Date().toISOString() 
            } : sq
        );
        await updateBingoBoard(newSquares);
        setEditingSquare(null);
    };

    if (isLoading) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.spinner}></div>
                <p>Cargando tablero...</p>
            </div>
        );
    }

    return (
        <div className={styles.root}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>Bingo del Amor 🎯</h1>
                    <p className={styles.subtitle}>
                        Administra los 16 retos del tablero y configura los tags automáticos.
                    </p>
                </div>
            </header>

            <div className={styles.boardContainer}>
                <div className={styles.bingoBoard}>
                    {squares.map(sq => (
                        <button 
                            key={sq.id} 
                            className={`${styles.square} ${sq.completedMemoryId ? styles.completed : ''} ${editingSquare?.id === sq.id ? styles.active : ''}`}
                            onClick={() => handleEdit(sq)}
                            type="button"
                        >
                            {sq.completedMemoryId && (
                                <div className={styles.checkBadge}>
                                    <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>check</span>
                                </div>
                            )}
                            <div className={styles.squareContent}>
                                <span className={styles.emoji}>{sq.emoji || '⭐'}</span>
                                <span className={styles.squareTitle}>{sq.title || sq.label}</span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            <BingoEditPanel 
                editingSquare={editingSquare}
                allSquares={squares}
                formData={formData}
                setFormData={setFormData}
                onSave={handleSave}
                onClose={() => setEditingSquare(null)}
                onUncheck={handleUncheck}
                onForceComplete={handleForceComplete}
            />
        </div>
    );
}
