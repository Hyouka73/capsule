import { useState, useEffect } from 'react';
import { useBingo } from '../../hooks/useBingo';
import styles from './BingoManager.module.css';

// Sub-components
import BingoEditPanel from './components/BingoEditPanel';

export default function BingoManager() {
    const { 
        categories: squares, 
        isLoading, 
        updateBingoBoard 
    } = useBingo();

    const [editingSquare, setEditingSquare] = useState(null);
    const [formData, setFormData] = useState({ title: '', emoji: '', description: '', minPhotos: 3 });

    const handleEdit = (square) => {
        setEditingSquare(square);
        setFormData({
            title: square.title || square.label || '', // Support both naming variants if they exist
            emoji: square.emoji || '🎯',
            description: square.description || '',
            minPhotos: square.minPhotos || 3
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
        }
    };

    const handleMockComplete = async (id) => {
        // Now it's a real forceful completion from Admin
        const newSquares = squares.map(sq => 
            sq.id === id ? { ...sq, isCompleted: true, completedMemoryId: 'admin-manual', completedAt: new Date().toISOString() } : sq
        );
        await updateBingoBoard(newSquares);
    };

    if (isLoading) {
        return <div className={styles.loading}>Cargando tablero real...</div>;
    }

    return (
        <div className={styles.root}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Bingo del Amor</h1>
                    <p className={styles.subtitle}>Tablero 4x5 — Administra los retos y visualiza el progreso en tiempo real.</p>
                </div>
            </div>

            <BingoEditPanel 
                editingSquare={editingSquare}
                formData={formData}
                setFormData={setFormData}
                onSave={handleSave}
                onClose={() => setEditingSquare(null)}
            />

            <div className={styles.boardContainer}>
                <div className={styles.bingoBoard}>
                    {squares.map(sq => (
                        <div key={sq.id} className={`${styles.square} ${sq.completedMemoryId ? styles.completed : ''}`}>
                            <div className={styles.squareContent}>
                                <div className={styles.emoji}>{sq.emoji}</div>
                                <div className={styles.squareTitle}>{sq.title || sq.label}</div>
                            </div>

                            {/* Hover Overlay */}
                            <div className={styles.overlay}>
                                {!sq.completedMemoryId ? (
                                    <>
                                        <button className={styles.actionBtn} onClick={() => handleEdit(sq)} title="Editar Reto">✏️</button>
                                        <button className={styles.actionBtn} onClick={() => handleMockComplete(sq.id)} title="Forzar Cumplido">✅</button>
                                    </>
                                ) : (
                                    <>
                                        <span className={styles.completedBadge}>🏆 Cumplido</span>
                                        <button className={styles.actionBtn} onClick={() => handleEdit(sq)} title="Editar Reto">✏️</button>
                                        <button className={styles.actionBtn} onClick={() => handleUncheck(sq.id)} title="Resetear">↻</button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
