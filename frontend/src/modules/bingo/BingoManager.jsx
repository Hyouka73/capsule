import { useState } from 'react';
import styles from './BingoManager.module.css';

// Sub-components
import BingoEditPanel from './components/BingoEditPanel';

export default function BingoManager() {
    // 20 Squares (4 cols x 5 rows)
    const initialSquares = Array(20).fill(null).map((_, i) => ({
        id: `square-${i}`,
        title: `Reto ${i + 1}`,
        description: '',
        emoji: '🎯',
        minPhotos: 3,
        isCompleted: false,
        memoryLink: null
    }));

    // Mocking some completed ones
    initialSquares[0] = { ...initialSquares[0], title: 'Cita en la playa', description: 'Visitar nuestra playa favorita.', minPhotos: 4, emoji: '🏖️', isCompleted: true, memoryLink: '123' };
    initialSquares[5] = { ...initialSquares[5], title: 'Cocinar juntos', description: 'Hacer una pizza desde cero.', minPhotos: 5, emoji: '🍝', isCompleted: true, memoryLink: '456' };
    initialSquares[12] = { ...initialSquares[12], title: 'Ver el amanecer', description: 'Despertar a las 5am e ir al mirador.', minPhotos: 2, emoji: '🌅' };
    initialSquares[19] = { ...initialSquares[19], title: 'Viaje sorpresa', description: 'Empacar maletas sin decir a dónde.', minPhotos: 10, emoji: '✈️' };

    const [squares, setSquares] = useState(initialSquares);
    const [editingSquare, setEditingSquare] = useState(null);
    const [formData, setFormData] = useState({ title: '', emoji: '', description: '', minPhotos: 3 });

    const handleEdit = (square) => {
        setEditingSquare(square);
        setFormData({
            title: square.title,
            emoji: square.emoji,
            description: square.description || '',
            minPhotos: square.minPhotos || 3
        });
    };

    const handleSave = (e) => {
        if (e) e.preventDefault();
        setSquares(prev => prev.map(sq => sq.id === editingSquare.id ? { ...sq, ...formData } : sq));
        setEditingSquare(null);
    };

    const handleUncheck = (id) => {
        if (confirm('¿Seguro que quieres desmarcar esta casilla? Se borrará el vínculo al recuerdo.')) {
            setSquares(prev => prev.map(sq => sq.id === id ? { ...sq, isCompleted: false, memoryLink: null } : sq));
        }
    };

    const handleMockComplete = (id) => {
        setSquares(prev => prev.map(sq => sq.id === id ? { ...sq, isCompleted: true, memoryLink: 'new' } : sq));
    };

    return (
        <div className={styles.root}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Bingo del Amor</h1>
                    <p className={styles.subtitle}>Tablero 4x5 — Administra los retos y visualiza el progreso.</p>
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
                        <div key={sq.id} className={`${styles.square} ${sq.isCompleted ? styles.completed : ''}`}>
                            <div className={styles.squareContent}>
                                <div className={styles.emoji}>{sq.emoji}</div>
                                <div className={styles.squareTitle}>{sq.title}</div>
                            </div>

                            {/* Hover Overlay */}
                            <div className={styles.overlay}>
                                {!sq.isCompleted ? (
                                    <>
                                        <button className={styles.actionBtn} onClick={() => handleEdit(sq)} title="Editar Reto">✏️</button>
                                        <button className={styles.actionBtn} onClick={() => handleMockComplete(sq.id)} title="Marcar como cumplido">✅</button>
                                    </>
                                ) : (
                                    <>
                                        <span className={styles.completedBadge}>🏆 Cumplido</span>
                                        <button className={styles.actionBtn} onClick={() => handleUncheck(sq.id)} title="Desmarcar">↻</button>
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
