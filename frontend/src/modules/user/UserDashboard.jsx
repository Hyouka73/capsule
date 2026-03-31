import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useAppConfig } from '../../hooks/useAppConfig';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import UserCapsules from '../capsules/UserCapsules';
import UserCoupons from '../coupons/UserCoupons';
import UserBingo from '../bingo/UserBingo';
import MapView from '../map/MapView';
import GalleryView from '../gallery/GalleryView';
import BottomNav from '../../components/ui/BottomNav/BottomNav';
import SnapshotOverlay from '../snapshots/components/SnapshotOverlay';
import SnapshotCreator from '../snapshots/components/SnapshotCreator';
import SnapshotHistory from '../snapshots/components/SnapshotHistory';
import CitaOverlay from '../../components/Cita/CitaOverlay';
import SnapshotButton from '../snapshots/components/SnapshotButton';
import styles from './UserDashboard.module.css';

import { TABS } from '../../data/dashboardData';
import { usePendingCitas } from '../../hooks/usePendingCitas';
import Memory from '../../models/Memory';
import { useOfflineQueue } from '../../hooks/useOfflineQueue';
// import { usePendingBingo } from '../../hooks/usePendingBingo';
import { useBingo } from '../../hooks/useBingo';
import BingoSuggestionSheet from '../memories/components/BingoSuggestionSheet';
import PhotoDetailOverlay from '../gallery/components/PhotoDetailOverlay';
import PendingDatesList from '../../components/PendingDates/PendingDatesList';
import PendingDateForm from '../../components/PendingDates/PendingDateForm';
import { usePlaces } from '../map/hooks/usePlaces';
import { toast } from '../../components/ui/PastelToast/PastelToast';
import CelebrationOverlay from '../../components/Bingo/CelebrationOverlay';
import LaLaLandIris from '../../components/Bingo/LaLaLandIris';

export default function UserDashboard() {
    const { isPartner, isAdmin } = useAuth();
    const { config, isFeatureOn } = useAppConfig();
    const { pendingCount, pendingCitas, removePendingCita, addPendingCita, updatePendingCitaStatus, updatePendingCita, restorePendingCita } = usePendingCitas();
    const { 
        completeBingoSquare, 
        markBatchComplete, 
        celebrationEvent, 
        clearCelebrationEvent, 
        irisEvent, 
        resetBingoBoard,
        triggerFullBoardVictory,
        bingoQueue,
        resolveBingoSuggestion,
        isResolving
    } = useBingo();

    // Map tab IDs to feature flags
    const TAB_FLAGS = {
        lugares: 'memoryMap',
        galeria: 'photoGallery',
        sorpresas: 'timeCapsules',
        caprichos: 'coupons',
        bingo: 'bingoBoard',
        ejercicio: 'exercise',
        movies: 'movieTracking',
        juegos: 'games'
    };

    // Filter TABS based on dynamic feature flags
    const filteredTabs = TABS.filter(tab => {
        const flag = TAB_FLAGS[tab.id];
        // If it has a flag, it must be ON to be shown
        return flag ? isFeatureOn(flag) : true;
    });

    const mainTabs = filteredTabs.filter(t => !t.inMore);
    const moreTabs = filteredTabs.filter(t => t.inMore);

    const [activeTab, setActiveTab] = useState('lugares');
    const [prevTab, setPrevTab] = useState('lugares');
    const [isPlaceSelected, setIsPlaceSelected] = useState(false);
    const [bingoContextToMap, setBingoContextToMap] = useState(null);
    const [isBingoModalOpen, setIsBingoModalOpen] = useState(false);
    const [isCouponsModalOpen, setIsCouponsModalOpen] = useState(false);
    const [openPendingSignal, setOpenPendingSignal] = useState(false);
    const [isSnapshotOpen, setIsSnapshotOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [activeSnapshots, setActiveSnapshots] = useState([]);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const { queueMemory } = useOfflineQueue();
    const { places } = usePlaces();
    const [citaContext, setCitaContext] = useState(null);
    const [selectedPendingDate, setSelectedPendingDate] = useState(null);
    const [viewerSelection, setViewerSelection] = useState(null);
    const [isPendingListOpen, setIsPendingListOpen] = useState(false);
    const [isGalleryDetailOpen, setIsGalleryDetailOpen] = useState(false);

    // ── NAVBAR VISIBILITY & OVERLAYS ──
    const hasAnyOverlayOpen = !!citaContext || isBingoModalOpen || isCouponsModalOpen || isSnapshotOpen || isCameraOpen || isHistoryOpen || isPendingListOpen || !!selectedPendingDate || !!viewerSelection || bingoQueue.length > 0 || !!celebrationEvent || isGalleryDetailOpen || isPlaceSelected;
    const shouldHideNav = hasAnyOverlayOpen;
    const shouldShowMap = activeTab === 'lugares'; // Simplificado: Si es la tab de lugares, se muestra el mapa

    // Partículas solo cuando NO es el mapa
    useEffect(() => {
        if (activeTab === 'lugares') return;

        const createParticle = () => {
            const particle = document.createElement('div');
            particle.className = styles.particle;
            const size = Math.random() * 8 + 4;
            const left = Math.random() * 100;
            const duration = Math.random() * 20 + 20;
            const delay = Math.random() * 5;
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            particle.style.left = `${left}%`;
            particle.style.animationDuration = `${duration}s`;
            particle.style.animationDelay = `-${delay}s`;
            const container = document.getElementById('user-dashboard-bg');
            if (container) container.appendChild(particle);
            setTimeout(() => particle.remove(), duration * 1000);
        };

        const interval = setInterval(createParticle, 800);
        return () => clearInterval(interval);
    }, [activeTab]);

    const handlePlusClick = () => {
        const minPhotos = config?.citaConfig?.minPhotosSpontaneous || 5;
        setCitaContext({ type: 'spontaneous', minPhotos });
    };

    const handleTabChange = (newTab) => {
        if (newTab === activeTab) {
            // Si ya estamos en lugares y hay citas pendientes, mandamos señal para abrir lista
            if (newTab === 'lugares' && pendingCount > 0) {
                setIsPendingListOpen(true);
            }
            return;
        }
        setPrevTab(activeTab);
        setActiveTab(newTab);
        // Reset modals when changing tabs
        setIsCouponsModalOpen(false);
    };



    // Al completar el tablero, forzar cambio a pestaña de Bingo para ver la animación
    useEffect(() => {
        if (celebrationEvent?.isFullBoard && activeTab !== 'bingo') {
            setActiveTab('bingo');
            // Ensure no overlays are blocking the view except the celebration itself
            setIsBingoModalOpen(false);
            setIsCouponsModalOpen(false);
            setIsSnapshotOpen(false);
            setIsCameraOpen(false);
            setIsHistoryOpen(false);
            setIsPendingListOpen(false);
            setSelectedPendingDate(null);
            setCitaContext(null);
        }
    }, [celebrationEvent?.isFullBoard, activeTab]);

    // Calcular dirección para la animación
    const getDirection = () => {
        if (activeTab === 'lugares' || prevTab === 'lugares') return 0;
        const prevIndex = TABS.findIndex(t => t.id === prevTab);
        const nextIndex = TABS.findIndex(t => t.id === activeTab);
        return nextIndex > prevIndex ? 1 : -1;
    };

    const direction = getDirection();

    const variants = {
        initial: (dir) => ({
            x: dir * 40,
            opacity: 0
        }),
        animate: {
            x: 0,
            opacity: 1
        },
        exit: (dir) => ({
            x: dir * -40,
            opacity: 0
        })
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'galeria': return <GalleryView onOverlayStateChange={setIsGalleryDetailOpen} />;
            case 'sorpresas': return <UserCapsules />;
            case 'caprichos': return <UserCoupons onModalStateChange={setIsCouponsModalOpen} />;
            case 'bingo': return (
                <UserBingo
                    setActiveTab={setActiveTab}
                    setBingoContextToMap={setBingoContextToMap}
                    setIsModalOpen={setIsBingoModalOpen}
                />
            );
            case 'ejercicio': return (
                <div className={styles.placeholderModule}>
                    <h1>Ejercicio</h1>
                    <p>¡Tus rachas se están sincronizando! 🔥</p>
                    <button onClick={() => setActiveTab('lugares')}>Volver al inicio</button>
                </div>
            );
            case 'movies': return (
                <div className={styles.placeholderModule}>
                    <h1>Películas</h1>
                    <p>Prepara las palomitas... 🍿</p>
                    <button onClick={() => setActiveTab('lugares')}>Volver al inicio</button>
                </div>
            );
            case 'juegos': return (
                <div className={styles.placeholderModule}>
                    <h1>Secretos y Juegos</h1>
                    <p>Prepara tus habilidades... 🎮</p>
                    <button onClick={() => setActiveTab('lugares')}>Volver al inicio</button>
                </div>
            );
            default: return null;
        }
    };

    const handleAutoSavePendingDate = async (data) => {
        if (!updatePendingCita || !data.id) return;
        try {
            await updatePendingCita(data.id, {
                title: data.title,
                eventDate: data.eventDate,
                tags: data.tags,
                comments: data.comments,
                placeId: data.placeId,
                placeName: data.placeName,
                coordinates: data.customLocation // Save raw coordinates for potential recovery
            });
        } catch (err) {
            // Silent fail for auto-save as it already has retries
        }
    };

    const handleSavePendingDate = async (data) => {
        try {
            const memory = Memory.fromForm(data);
            const payload = memory.toApiPayload();

            if (updatePendingCita && data.id) {
                // Persistent save of ALL form fields in IndexedDB before/during upload
                await updatePendingCita(data.id, {
                    title: memory.title,
                    tags: memory.tags,
                    suggestedTags: memory.tags, // Keep for backward compatibility
                    description: memory.description,
                    comments: memory.description, // Keep for backward compatibility
                    eventDate: memory.eventDate,
                    placeId: memory.placeId,
                    placeName: memory.placeName,
                    coordinates: data.customLocation,
                    status: 'uploading'
                });
            }

            const files = (data.photos || []).map(p => p.file);

            if (files.length > 0) {
                await queueMemory(payload, files, data.id, data.bingoOrigin);
            }
            setSelectedPendingDate(null);
            if (pendingCitas.length > 1) {
                setIsPendingListOpen(true);
            }
            toast.success('¡Cita guardada! 💾', 'Se está subiendo ✨');
        } catch (err) {
            // error logged silently
            toast.error('Error al guardar');
        }
    };

    return (
        <div className={styles.appContainer}>

            {/* ── MAPA ── */}
            {shouldShowMap && (
                <div className={styles.mapWrapper}>
                    <MapView
                        onPlaceSelected={setIsPlaceSelected}
                        bingoContextToMap={bingoContextToMap}
                        clearBingoContext={() => setBingoContextToMap(null)}
                        onOpenSnapshot={(snapshotsArray) => {
                            setActiveSnapshots(snapshotsArray);
                            setIsSnapshotOpen(true);
                        }}
                        onOpenCamera={() => setIsCameraOpen(true)}
                        onOpenHistory={() => setIsHistoryOpen(true)}
                        citaContext={citaContext}
                        onCitaContextChange={setCitaContext}
                        onOpenPending={() => setIsPendingListOpen(true)}
                        onOpenPhotoViewer={setViewerSelection}
                    />
                </div>
            )}

            {/* ── OTROS TABS: con fondo decorativo y padding normal ── */}
            {activeTab !== 'lugares' && (
                <>
                    <div id="user-dashboard-bg" className={styles.background}>
                        <div className={styles.gradientOrb1} />
                        <div className={styles.gradientOrb2} />
                        <div className={styles.dotPattern} />
                    </div>

<main className={`${styles.mainContent} ${activeTab === 'bingo' ? styles.mainContentBingo : ''}`}>
                        <AnimatePresence mode="wait" custom={direction}>
                            <motion.div
                                key={activeTab}
                                custom={direction}
                                variants={variants}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                transition={{ type: 'spring', damping: 28, stiffness: 280 }}
                                className={styles.tabContentWrapper}
                            >
                                {renderContent()}
                            </motion.div>
                        </AnimatePresence>
                    </main>

                </>
            )}

            {/* ── NAVBAR: siempre flotando encima de todo ── */}
            <AnimatePresence>
                {!hasAnyOverlayOpen && (
                    <motion.div
                        className={styles.bottomNavWrapper}
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ 
                            y: shouldHideNav ? 120 : 0, 
                            opacity: shouldHideNav ? 0 : 1 
                        }}
                        exit={{ y: 100, opacity: 0 }}
                        transition={{ 
                            type: 'spring', 
                            stiffness: 260, 
                            damping: shouldHideNav ? 28 : 22 
                        }}
                    >
                        <BottomNav
                            activeTab={activeTab}
                            setActiveTab={handleTabChange}
                            tabs={mainTabs}
                            moreTabs={moreTabs}
                            pendingCount={pendingCount}
                            pendingBingoCount={bingoQueue.length}
                            onPlusClick={handlePlusClick}
                            isPartner={isPartner}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Persist Camera FAB across specific views ── */}
            {/* ── Global Snapshot FAB removido por petición (Solo se ve en Mapa) ── */}

            <AnimatePresence>
                {isSnapshotOpen && activeSnapshots.length > 0 && (
                    <SnapshotOverlay
                        key="snapshot-overlay"
                        snapshots={activeSnapshots}
                        onClose={(shouldReply, isEarly) => {
                            if (isEarly) {
                                // Tulip phase: Pre-mount the camera behind the overlay
                                if (shouldReply) setIsCameraOpen(true);
                                return;
                            }
                            
                            // Close overlay phase: Camera is already there!
                            setIsSnapshotOpen(false);
                            setActiveSnapshots([]);
                            // We don't need to call setIsCameraOpen here anymore because isEarly handled it
                        }}
                    />
                )}
            </AnimatePresence>

            {isCameraOpen && (
                <SnapshotCreator 
                    onClose={() => setIsCameraOpen(false)} 
                    onOpenHistory={() => {
                        setIsHistoryOpen(true);
                        // No cerramos cámara para que el partner regrese a ella
                    }}
                />
            )}

            <AnimatePresence>
                {isHistoryOpen && (
                    <SnapshotHistory 
                        onClose={() => {
                            setIsHistoryOpen(false);
                            setIsCameraOpen(true); // Retorno explícito a la cámara
                        }}
                    />
                )}
            </AnimatePresence>

            {citaContext && (
                <CitaOverlay
                    citaContext={citaContext}
                    onClose={() => {
                        setCitaContext(null);
                        setIsPlaceSelected(false);
                    }}
                    onSave={async (files) => {
                        await addPendingCita(files, citaContext);
                        setCitaContext(null);
                        setIsPlaceSelected(false);
                    }}
                />
            )}

            <AnimatePresence>
                {isPendingListOpen && (
                    <PendingDatesList
                        pendingDates={pendingCitas}
                        onClose={() => setIsPendingListOpen(false)}
                        onSelectDate={(date) => {
                            setSelectedPendingDate(date);
                            setIsPendingListOpen(false);
                        }}
                        onRemove={removePendingCita}
                        onRestore={restorePendingCita}
                    />
                )}
                {selectedPendingDate && (
                    <PendingDateForm
                        pendingDate={selectedPendingDate}
                        onClose={() => {
                            setSelectedPendingDate(null);
                            setIsPendingListOpen(true);
                        }}
                        onSave={handleSavePendingDate}
                        onAutoSave={handleAutoSavePendingDate}
                        defaultPlaces={places}
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
                onConfirm={async (selectedIds) => {
                    if (bingoQueue.length === 0) return;
                    await resolveBingoSuggestion(bingoQueue[0].memoryId, selectedIds);
                }}
                onCancel={async () => {
                    if (bingoQueue.length === 0) return;
                    await resolveBingoSuggestion(bingoQueue[0].memoryId);
                }}
                isSaving={isResolving}
            />

            {celebrationEvent && (
                <CelebrationOverlay 
                    tierLabel={celebrationEvent.tierLabel}
                    reward={celebrationEvent.reward}
                    coins={celebrationEvent.totalCoins} /* Total display */
                    isCombo={celebrationEvent.isCombo}
                    achievements={celebrationEvent.achievements}
                    totalCoins={celebrationEvent.totalCoins}
                    isFullBoard={celebrationEvent.isFullBoard}
                    onComplete={() => {
                        const hasNext = celebrationEvent.hasNextPhase;
                        const isFull = celebrationEvent.isFullBoard;
                        
                        clearCelebrationEvent();

                        if (hasNext) {
                            // Fase 1 terminada: Navegar al Bingo y disparar Fase 2
                            setActiveTab('bingo');
                            // Pequeño delay para dejar que la navegación ocurra
                            setTimeout(() => {
                                triggerFullBoardVictory();
                            }, 600);
                        } else if (isFull) {
                            // Fase 2 (Bingo) terminada: Resetear
                            resetBingoBoard();
                        }
                    }}
                />
            )}

            {/* Global Easter Egg Transition (Top of everything) */}
            <AnimatePresence>
                {irisEvent && <LaLaLandIris key="la-la-land-iris" />}
            </AnimatePresence>
        </div>
    );
}
