import { useState, useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { toast } from '../../components/ui/PastelToast/PastelToast';
import BingoStartModal from '../../components/Bingo/BingoStartModal';
import PhotoDetailOverlay from '../gallery/components/PhotoDetailOverlay';
import { useBingo } from '../../hooks/useBingo';
import { useAppConfig } from '../../hooks/useAppConfig';
import styles from './UserBingo.module.css';

// Sub-components
import BingoProgress from './components/BingoProgress';
import BingoBoardGrid from './components/BingoBoardGrid';
import MemoryViewer from '../../components/ui/MemoryViewer/MemoryViewer';
import BingoSuggestionSheet from '../memories/components/BingoSuggestionSheet';

export default function UserBingo({ setActiveTab, setBingoContextToMap, setIsModalOpen, onOpenMemory }) {
    const [selectedSquare, setSelectedSquare] = useState(null);
    const [selectedStartSquare, setSelectedStartSquare] = useState(null);
    const [viewerSelection, setViewerSelection] = useState(null);
    const { isFromCache, config } = useAppConfig();

    const { 
        categories, 
        completedCount, 
        progressPercent, 
        isLoading, 
        completeBingoSquare,
        bingoQueue,
        resolveBingoSuggestion,
        isResolving
    } = useBingo();
    
    const lastCountRef = useRef(completedCount);

    const handleSquareClick = (square) => {
        if (square.isPendingSync) {
            toast.info("Sincronizando... ⏳", "El contenido aparecerá pronto");
            return;
        }

        if (square.completedMemoryId) {
            if (onOpenMemory) {
                onOpenMemory({
                    id: square.completedMemoryId,
                    title: square.title,
                    description: square.description,
                    mainPhotoUrl: square.memoryPhoto
                });
            }
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'center' }}>
                    <h1 className={styles.title}>Bingo</h1>
                    {isFromCache && (
                        <div className={styles.offlineBadge} title="Usando configuración local guardada">
                            📡 Config guardada
                        </div>
                    )}
                </div>
                <p className={styles.subtitle}>
                    {bingoQueue.length > 0 
                      ? `💡 Tienes ${bingoQueue.length} sugerencias pendientes`
                      : 'Aventuras juntos por desbloquear.'}
                </p>
            </div>

            <BingoProgress 
                progressPercent={progressPercent} 
                completedCount={completedCount} 
                totalCount={categories.length || 16} 
            />

            <BingoBoardGrid 
                categories={categories} 
                isLoading={isLoading} 
                onSquareClick={handleSquareClick}
                bingoQueue={bingoQueue}
                resolveBingoSuggestion={resolveBingoSuggestion}
                completeBingoSquare={completeBingoSquare}
            />

            <p className={styles.footerHint}>
                Toca una casilla para comenzar una aventura 💫
            </p>

            {/* Local MemoryViewer removed to use global one in UserDashboard */}

            <AnimatePresence>
                {selectedStartSquare && (
                    <BingoStartModal
                        bingoItem={selectedStartSquare}
                        defaultMinPhotos={config?.citaConfig?.minPhotosBingoDefault || 3}
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

            <AnimatePresence>
                {viewerSelection && (
                    <PhotoDetailOverlay
                        photos={viewerSelection.items}
                        initialIndex={viewerSelection.index}
                        onClose={() => setViewerSelection(null)}
                    />
                )}
            </AnimatePresence>

            <BingoSuggestionSheet
                isOpen={bingoQueue.length > 0}
                suggestions={bingoQueue[0]?.suggestions || []}
                onConfirm={(selectedIds) => resolveBingoSuggestion(bingoQueue[0].memoryId, selectedIds)}
                onCancel={() => resolveBingoSuggestion(bingoQueue[0].memoryId)}
                isSaving={isResolving}
            />
        </div>
    );
}
