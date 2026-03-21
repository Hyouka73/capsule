import { useState, useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import BingoStartModal from '../../components/Bingo/BingoStartModal';
import CelebrationOverlay from '../../components/Bingo/CelebrationOverlay';
import PhotoViewer from '../../components/ui/PhotoViewer/PhotoViewer';
import { subscribeToGlobalSettings } from '../../services/settingsService';
import { useBingo } from '../../hooks/useBingo';
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

    const { categories, completedCount, progressPercent, isLoading } = useBingo();
    const [showCelebration, setShowCelebration] = useState(false);
    const lastCountRef = useRef(completedCount);

    // Watch for new completions to trigger celebration
    useEffect(() => {
        if (completedCount > lastCountRef.current && !isLoading) {
            setShowCelebration(true);
        }
        lastCountRef.current = completedCount;
    }, [completedCount, isLoading]);

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
            />

            <p className={styles.footerHint}>
                <span className={`material-symbols-outlined ${styles.footerIcon}`}>favorite</span>
                Toca las casillas marcadas para recordar ese momento.
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
            {showCelebration && (
                <CelebrationOverlay onComplete={() => setShowCelebration(false)} />
            )}
        </div>
    );
}
