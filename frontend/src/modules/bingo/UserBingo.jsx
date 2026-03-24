import { useState, useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import BingoStartModal from '../../components/Bingo/BingoStartModal';
import PhotoViewer from '../../components/ui/PhotoViewer/PhotoViewer';
import { subscribeToGlobalSettings } from '../../services/settingsService';
import { useBingo } from '../../hooks/useBingo';
import { usePendingBingo } from '../../hooks/usePendingBingo';
import styles from './UserBingo.module.css';

// Sub-components
import BingoProgress from './components/BingoProgress';
import BingoBoardGrid from './components/BingoBoardGrid';
import BingoMemoryPolaroid from './components/BingoMemoryPolaroid';

export default function UserBingo({ setActiveTab, setBingoContextToMap, setIsModalOpen }) {
    const [selectedSquare, setSelectedSquare] = useState(null);
    const [selectedStartSquare, setSelectedStartSquare] = useState(null);
    const [viewerPhotos, setViewerPhotos] = useState(null);
    const [globalSettings, setGlobalSettings] = useState(null);

    useEffect(() => {
        const unsub = subscribeToGlobalSettings(data => {
            if (data) setGlobalSettings(data);
        });
        return unsub;
    }, []);

    const { categories, completedCount, progressPercent, isLoading, completeBingoSquare } = useBingo();
    const { pendingSuggestions, resolvePendingSuggestion } = usePendingBingo();
    const lastCountRef = useRef(completedCount);

    const handleSquareClick = (square) => {
        if (square.completedMemoryId) {
            setSelectedSquare(square);
            if (setIsModalOpen) setIsModalOpen(true);
        } else {
            setSelectedStartSquare(square);
            if (setIsModalOpen) setIsModalOpen(true);
        }
    };

    const handleClosePolaroid = () => {
        setSelectedSquare(null);
        if (setIsModalOpen) setIsModalOpen(false);
    };

    return (
        <div className={styles.root}>
            <div className={styles.header}>
                <h1 className={styles.title}>Bingo</h1>
                <p className={styles.subtitle}>Aventuras juntos por desbloquear.</p>
            </div>

            <BingoProgress 
                progressPercent={progressPercent} 
                completedCount={completedCount} 
                totalCount={categories.length || 20} 
            />

            <BingoBoardGrid 
                categories={categories} 
                isLoading={isLoading} 
                onSquareClick={handleSquareClick}
                pendingSuggestions={pendingSuggestions}
                resolvePendingSuggestion={resolvePendingSuggestion}
                completeBingoSquare={completeBingoSquare}
            />

            <p className={styles.footerHint}>
                Toca una casilla para comenzar una aventura 💫
            </p>

            <BingoMemoryPolaroid 
                selectedSquare={selectedSquare}
                onClose={handleClosePolaroid}
                onShowGallery={setViewerPhotos}
            />

            <AnimatePresence>
                {selectedStartSquare && (
                    <BingoStartModal
                        bingoItem={selectedStartSquare}
                        defaultMinPhotos={globalSettings?.citaConfig?.minPhotosBingoDefault || 3}
                        onClose={() => {
                            setSelectedStartSquare(null);
                            if (setIsModalOpen) setIsModalOpen(false);
                        }}
                        onStartCita={(bingoData) => {
                            setSelectedStartSquare(null);
                            if (setIsModalOpen) setIsModalOpen(false);
                            if (setBingoContextToMap && setActiveTab) {
                                setBingoContextToMap(bingoData);
                                setActiveTab('lugares');
                            }
                        }}
                    />
                )}
            </AnimatePresence>

            <PhotoViewer
                photos={viewerPhotos}
                onClose={() => setViewerPhotos(null)}
            />
        </div>
    );
}
