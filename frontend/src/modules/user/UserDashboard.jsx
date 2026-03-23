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
import { usePendingBingo } from '../../hooks/usePendingBingo';
import { useBingo } from '../../hooks/useBingo';
import BingoSuggestionSheet from '../memories/components/BingoSuggestionSheet';
import PhotoViewer from '../../components/ui/PhotoViewer/PhotoViewer';
import PendingDatesList from '../../components/PendingDates/PendingDatesList';
import PendingDateForm from '../../components/PendingDates/PendingDateForm';
import { usePlaces } from '../map/hooks/usePlaces';
import { toast } from '../../components/ui/PastelToast/PastelToast';

export default function UserDashboard() {
    const { isPartner, isAdmin } = useAuth();
    const { isFeatureOn } = useAppConfig();
    const { pendingCount, pendingCitas, removePendingCita, addPendingCita, updatePendingCitaStatus, updatePendingCita, restorePendingCita } = usePendingCitas();
    const { pendingSuggestions, resolvePendingSuggestion, dismissSuggestion } = usePendingBingo();
    const { completeBingoSquare, celebrationEvent } = useBingo();
    const firstPendingSuggestion = pendingSuggestions.find(s => !s.dismissed);

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
    const [viewerPhotos, setViewerPhotos] = useState(null);
    const [isPendingListOpen, setIsPendingListOpen] = useState(false);

    // Dynamic check for ANY overlay that should hide the map
    // We EXCLUDE isPlaceSelected because that modal (PlaceDetailDrawer) lives INSIDE MapView
    const hasAnyOverlayOpen = !!citaContext || isBingoModalOpen || isCouponsModalOpen || isSnapshotOpen || isCameraOpen || isHistoryOpen || isPendingListOpen || !!selectedPendingDate || !!viewerPhotos || !!firstPendingSuggestion || !!celebrationEvent;

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
            case 'galeria': return <GalleryView />;
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
            console.warn('[UserDashboard] Auto-save failed:', err);
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
                await queueMemory(payload, files, data.id);
            }
            setSelectedPendingDate(null);
            if (pendingCitas.length > 1) {
                setIsPendingListOpen(true);
            }
            toast.success('¡Cita guardada! 💾', 'Se está subiendo ✨');
        } catch (err) {
            console.error('[UserDashboard] Error saving:', err);
            toast.error('Error al guardar');
        }
    };

    return (
        <div className={styles.appContainer}>

            {/* ── MAPA: va directo al appContainer, sin padding ni wrappers ── */}
            {activeTab === 'lugares' && !hasAnyOverlayOpen && (
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
                        citaContext={citaContext}
                        onCitaContextChange={setCitaContext}
                        onOpenPending={() => setIsPendingListOpen(true)}
                        onOpenPhotoViewer={setViewerPhotos}
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
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                    >
                        <BottomNav
                            activeTab={activeTab}
                            setActiveTab={handleTabChange}
                            tabs={mainTabs}
                            moreTabs={moreTabs}
                            pendingCount={pendingCount}
                            pendingBingoCount={pendingSuggestions.length}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Persist Camera FAB across specific views ── */}
            {/* ── Global Snapshot FAB (Solo en tabs que NO son mapa y sin overlays) ── */}
            {(isPartner || isAdmin) && !hasAnyOverlayOpen && activeTab !== 'lugares' && (
                <motion.div
                    className={styles.cameraFabWrapper}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                >
                    <SnapshotButton
                        onOpenSnapshot={(snapshotsArray) => {
                            setActiveSnapshots(snapshotsArray);
                            setIsSnapshotOpen(true);
                        }}
                        onOpenCamera={() => setIsCameraOpen(true)}
                    />
                </motion.div>
            )}

            <AnimatePresence>
                {isSnapshotOpen && activeSnapshots.length > 0 && (
                    <SnapshotOverlay
                        key="snapshot-overlay"
                        snapshots={activeSnapshots}
                        onClose={() => {
                            setIsSnapshotOpen(false);
                            setActiveSnapshots([]);
                        }}
                    />
                )}
            </AnimatePresence>

            {isCameraOpen && (
                <SnapshotCreator 
                    onClose={() => setIsCameraOpen(false)} 
                    onOpenOwnSnapshots={(ownSnaps) => {
                        setActiveSnapshots(ownSnaps);
                        setIsHistoryOpen(true);
                        setIsCameraOpen(false);
                    }}
                />
            )}

            <AnimatePresence>
                {isHistoryOpen && (
                    <SnapshotHistory 
                        snapshots={activeSnapshots}
                        onClose={() => {
                            setIsHistoryOpen(false);
                            setActiveSnapshots([]);
                            setIsCameraOpen(true); // Return to camera section
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

            {viewerPhotos && (
                <PhotoViewer
                    photos={viewerPhotos}
                    onClose={() => setViewerPhotos(null)}
                />
            )}

            <BingoSuggestionSheet 
                isOpen={!!firstPendingSuggestion}
                suggestions={firstPendingSuggestion?.suggestions || []}
                onConfirm={async (selectedIds) => {
                    if (!firstPendingSuggestion) return;
                    for (const id of selectedIds) {
                        await completeBingoSquare(id, firstPendingSuggestion.memoryId);
                    }
                    await resolvePendingSuggestion(firstPendingSuggestion.memoryId);
                }}
                onCancel={async () => {
                    if (!firstPendingSuggestion) return;
                    
                    // 1. NO resolve immediately. Instead, dismiss to hide sheet but keep badge.
                    // 2. Ensure it's in pending_bingo (IndexedDB) with resolved: false
                    try {
                        const { openDB } = await import('../../config/dbConfig');
                        const db = await openDB();
                        const tx = db.transaction('pending_bingo', 'readwrite');
                        const store = tx.objectStore('pending_bingo');
                        
                        // Use existing memoryId or fallback to UUID if missing
                        const memoryId = firstPendingSuggestion.memoryId || crypto.randomUUID();
                        
                        store.put({
                            ...firstPendingSuggestion,
                            memoryId,
                            resolved: false,
                            dismissed: true, // Specific flag to hide from sheet
                            createdAt: firstPendingSuggestion.createdAt || Date.now()
                        });
                        
                        await new Promise((resolve, reject) => {
                            tx.oncomplete = () => resolve();
                            tx.onerror = () => reject(tx.error);
                        });
                    } catch (err) {
                        console.error('[BingoSuggestion] Error saving to IndexedDB:', err);
                    }

                    // 3. Update local state via hook
                    dismissSuggestion(firstPendingSuggestion.memoryId);
                }}
            />
        </div>
    );
}
