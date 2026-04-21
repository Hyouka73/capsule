import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { generateUUID } from '../../utils/uuid';
import { savePhotoToCache } from '../../utils/photoCache';
import { useAuth } from '../../hooks/useAuth';
import { useAppConfig } from '../../hooks/useAppConfig';
import { db } from '../../services/firebase';
import { collection, getDocs } from 'firebase/firestore';
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
import { useBingo } from '../../hooks/useBingo';
import { useBingoMatcher, evaluateBingoMatch } from '../../hooks/useBingoMatcher';
import BingoSuggestionSheet from '../memories/components/BingoSuggestionSheet';
import PhotoDetailOverlay from '../gallery/components/PhotoDetailOverlay';
import PendingDatesList from '../../components/PendingDates/PendingDatesList';
import PendingDateForm from '../../components/PendingDates/PendingDateForm';
import { usePlaces } from '../map/hooks/usePlaces';
import { toast } from '../../components/ui/PastelToast/PastelToast';
import CelebrationOverlay from '../../components/Bingo/CelebrationOverlay';
import MemoryViewer from '../../components/ui/MemoryViewer/MemoryViewer';
import LaLaLandIris from '../../components/Bingo/LaLaLandIris';

export default function UserDashboard() {
    const { isPartner, isAdmin, relationshipId } = useAuth();
    const { config, isFeatureOn } = useAppConfig();
    const { pendingCount, pendingCitas, removePendingCita, addPendingCita, updatePendingCitaStatus, updatePendingCita, restorePendingCita, refreshPending } = usePendingCitas();
    const { 
        celebrationEvent, 
        clearCelebrationEvent, 
        irisEvent, 
        resetBingoBoard,
        triggerFullBoardVictory,
        allCategories,
        enqueueBingoSuggestion,
        bingoQueue,
        resolveBingoSuggestion,
        isResolving
    } = useBingo();

    // Activa el observador y autodetector local del Bingo
    useBingoMatcher();

    const [activeTab, setActiveTab] = useState('lugares');
    const [prevTab, setPrevTab] = useState('lugares');
    const [isPlaceSelected, setIsPlaceSelected] = useState(false);
    const [bingoContextToMap, setBingoContextToMap] = useState(null);
    const [isBingoModalOpen, setIsBingoModalOpen] = useState(false);
    const [isCouponsModalOpen, setIsCouponsModalOpen] = useState(false);
    const [isSnapshotOpen, setIsSnapshotOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [activeSnapshots, setActiveSnapshots] = useState([]);

    const [searchParams, setSearchParams] = useSearchParams();
    const urlAction = searchParams.get('action');

    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const { queueMemory, updatePendingMemory } = useOfflineQueue();
    const { places } = usePlaces();
    const [citaContext, setCitaContext] = useState(null);
    const [selectedPendingDate, setSelectedPendingDate] = useState(null);
    const [viewerSelection, setViewerSelection] = useState(null);
    const [selectedMemory, setSelectedMemory] = useState(null);
    const [isPendingListOpen, setIsPendingListOpen] = useState(false);
    const [isGalleryDetailOpen, setIsGalleryDetailOpen] = useState(false);
    const [isCapsuleModalOpen, setIsCapsuleModalOpen] = useState(false);
    const [isActionActive, setIsActionActive] = useState(false);

    // Stable handlers defined BEFORE effects
    const handlePlusClick = useCallback(() => {
        const minPhotos = config?.citaConfig?.minPhotosSpontaneous || 5;
        setCitaContext({ type: 'spontaneous', minPhotos });
    }, [config]);

    useEffect(() => {
        const action = searchParams.get('action');
        const tab = searchParams.get('tab');
    
        if (action === 'capture' && !isCameraOpen) {
            setIsActionActive(true);
            setIsCameraOpen(true);
            setSearchParams({}, { replace: true });
        } else if (action === 'cita' && !citaContext) {
            setIsActionActive(true);
            handlePlusClick();
            setSearchParams({}, { replace: true });
        } else if (tab === 'galeria') {
            setActiveTab('galeria');
            setSearchParams({}, { replace: true });
        }
    }, [searchParams, isCameraOpen, citaContext, handlePlusClick, setSearchParams]);

    // Ocultar modal manualmente y resetear estado local
    // ── Form status synchronization ──
    // Ensures that when the background persistence finishes (isPersisting -> false), 
    // the open form updates its state reactively.
    useEffect(() => {
        if (!selectedPendingDate) return;
        const currentVersion = pendingCitas.find(pc => pc.id === selectedPendingDate.id);
        if (currentVersion && JSON.stringify(currentVersion) !== JSON.stringify(selectedPendingDate)) {
            // Only update if critical state changes (like isPersisting)
            // We use JSON.stringify as a simple deep check to avoid infinite loops
            setSelectedPendingDate(currentVersion);
        }
    }, [pendingCitas, selectedPendingDate]);

    const handleActionClose = useCallback(() => {
        setIsCameraOpen(false);
        setCitaContext(null);
        setIsActionActive(false);
    }, []);

    // ── INTER-CITATION NAVIGATION (MAP VIEW) ──
    const navigateCitation = async (direction) => {
        if (!viewerSelection || !viewerSelection.contextList) return;
        
        const newTopLevelIndex = viewerSelection.topLevelIndex + direction;
        if (newTopLevelIndex < 0 || newTopLevelIndex >= viewerSelection.contextList.length) {
            return;
        }

        const nextMemory = viewerSelection.contextList[newTopLevelIndex];
        
        try {
            // Helper to wait for real browser cache download
            const preloadImage = (url) => new Promise((resolve) => {
                const img = new Image();
                img.onload = () => resolve();
                img.onerror = () => resolve(); // Non-blocking fail
                img.src = url;
            });

            let photosArray = [];
            const photosRef = collection(db, 'relationships', relationshipId, 'memories', nextMemory.id, 'photos');
            const snap = await getDocs(photosRef);

            if (!snap.empty) {
                photosArray = snap.docs.map(d => d.data());
            }

            if (photosArray.length === 0) {
                photosArray = [{ url: nextMemory.mainPhotoUrl }];
            }

            const items = photosArray.map(p => ({
                url: p.url || p.storagePath || nextMemory.mainPhotoUrl,
                title: nextMemory.title,
                description: nextMemory.description,
                createdAt: nextMemory.eventDate,
                placeName: viewerSelection.items[0]?.placeName || 'Ubicación',
                _type: 'memory'
            }));

            const targetIndex = direction < 0 ? items.length - 1 : 0;
            const targetUrl = items[targetIndex]?.url;

            // PRE-LOAD: Wait for the image to be ready BEFORE swapping UI
            if (targetUrl) {
                await preloadImage(targetUrl);
            }

            setViewerSelection({ 
                items, 
                index: targetIndex, 
                topLevelIndex: newTopLevelIndex,
                contextList: viewerSelection.contextList
            });
        } catch (e) {
            console.error('Error auto-navigating memories:', e);
        }
    };

    const hasAnyOverlayOpen = !!citaContext || isBingoModalOpen || isCouponsModalOpen || isSnapshotOpen || isCameraOpen || isHistoryOpen || isPendingListOpen || !!selectedPendingDate || !!viewerSelection || bingoQueue.length > 0 || !!celebrationEvent || isGalleryDetailOpen || isPlaceSelected || isCapsuleModalOpen || !!selectedMemory;
    const shouldHideNav = hasAnyOverlayOpen;
    const shouldShowMap = activeTab === 'lugares' && !isActionActive;

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

    // Refresh pending citations when switching modules to ensure consistency
    useEffect(() => {
        refreshPending?.();
    }, [activeTab, refreshPending]);

    const handleTabChange = useCallback((newTab) => {
        if (newTab === activeTab) {
            return;
        }
        setPrevTab(activeTab);
        setActiveTab(newTab);
        setIsActionActive(false); 
        setIsCouponsModalOpen(false);
    }, [activeTab]);

    useEffect(() => {
        if (celebrationEvent?.isFullBoard && activeTab !== 'bingo') {
            setActiveTab('bingo');
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

    const getDirection = () => {
        if (activeTab === 'lugares' || prevTab === 'lugares') return 0;
        const prevIndex = TABS.findIndex(t => t.id === prevTab);
        const nextIndex = TABS.findIndex(t => t.id === activeTab);
        return nextIndex > prevIndex ? 1 : -1;
    };

    const direction = getDirection();

    const variants = {
        initial: (dir) => ({ x: dir * 40, opacity: 0 }),
        animate: { x: 0, opacity: 1 },
        exit: (dir) => ({ x: dir * -40, opacity: 0 })
    };

    const renderContent = () => {
        const TAB_MAP = {
            galeria: <GalleryView onOverlayStateChange={setIsGalleryDetailOpen} />,
            sorpresas: <UserCapsules onModalStateChange={setIsCapsuleModalOpen} />,
            caprichos: <UserCoupons onModalStateChange={setIsCouponsModalOpen} />,
            bingo: <UserBingo setActiveTab={setActiveTab} setBingoContextToMap={setBingoContextToMap} setIsModalOpen={setIsBingoModalOpen} onOpenMemory={setSelectedMemory} />
        };
        return TAB_MAP[activeTab] || null;
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
                coordinates: data.customLocation,
                isSpecial: data.isSpecial, // Asegurar guardado manual también
                status: 'pending' // Update status when classification begins
            });
        } catch (err) {}
    };

    const handleSavePendingDate = async (data) => {
        try {
            const memory = Memory.fromForm(data);
            const payload = memory.toApiPayload();
            if (updatePendingCita && data.id) {
                await updatePendingCita(data.id, {
                    ...memory,
                    status: 'uploading'
                });
            }
            const files = (data.photos || []).map(p => p.file);
            if (files.length > 0) {
                // Save the first photo to photo_cache immediately for offline visibility
                savePhotoToCache(data.id, files[0]);
                await queueMemory(payload, files, data.id, data.bingoOrigin);
            }

            setSelectedPendingDate(null);
            if (pendingCitas.length > 1) {
                setIsPendingListOpen(true);
            }
            toast.success('¡Cita guardada! 💾', 'Se está subiendo ✨');
        } catch (err) {
            toast.error('Error al guardar');
        }
    };

    return (
        <div className={styles.appContainer}>
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
                        onOpenMemory={(memory) => {
                            setSelectedMemory(memory);
                            setIsPlaceSelected(true);
                        }}
                    />
                </div>
            )}

            {activeTab !== 'lugares' && (
                <>
                    <div id="user-dashboard-bg" className={styles.background}>
                        <div className={styles.gradientOrb1} /><div className={styles.gradientOrb2} /><div className={styles.dotPattern} />
                    </div>
                    <main className={`${styles.mainContent} ${activeTab === 'bingo' ? styles.mainContentBingo : ''}`}>
                        <AnimatePresence mode="wait" custom={direction}>
                            <motion.div
                                key={activeTab} custom={direction} variants={variants}
                                initial="initial" animate="animate" exit="exit"
                                transition={{ type: 'spring', damping: 28, stiffness: 280 }}
                                className={styles.tabContentWrapper}
                            >
                                {renderContent()}
                            </motion.div>
                        </AnimatePresence>
                    </main>
                </>
            )}

            <AnimatePresence>
                {!hasAnyOverlayOpen && (
                    <motion.div
                        className={styles.bottomNavWrapper}
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: shouldHideNav ? 120 : 0, opacity: shouldHideNav ? 0 : 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 260, damping: shouldHideNav ? 28 : 22 }}
                    >
                        <BottomNav
                            activeTab={activeTab} setActiveTab={handleTabChange}
                            tabs={TABS.filter(t => !t.inMore)} moreTabs={TABS.filter(t => t.inMore)}
                            pendingCount={pendingCount} pendingBingoCount={bingoQueue.length}
                            onPlusClick={handlePlusClick} onOpenPending={() => setIsPendingListOpen(true)} isPartner={isPartner}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isSnapshotOpen && activeSnapshots.length > 0 && (
                    <SnapshotOverlay
                        snapshots={activeSnapshots}
                        onClose={(shouldReply, isEarly) => {
                            if (isEarly) {
                                if (shouldReply) setIsCameraOpen(true);
                                return;
                            }
                            setIsSnapshotOpen(false);
                            setActiveSnapshots([]);
                        }}
                    />
                )}
            </AnimatePresence>

            {isCameraOpen && <SnapshotCreator onClose={handleActionClose} onOpenHistory={() => setIsHistoryOpen(true)} />}

            <AnimatePresence>
                {isHistoryOpen && <SnapshotHistory onClose={() => { setIsHistoryOpen(false); setIsCameraOpen(true); }} />}
            </AnimatePresence>

            <AnimatePresence>
                {citaContext && (
                    <CitaOverlay
                        citaContext={citaContext}
                        onClose={handleActionClose}
                        onSave={(files) => { 
                            addPendingCita(files, citaContext); 
                            handleActionClose();
                        }}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isPendingListOpen && (
                    <PendingDatesList
                        pendingDates={pendingCitas} onClose={() => setIsPendingListOpen(false)}
                        onSelectDate={(date) => { setSelectedPendingDate(date); setIsPendingListOpen(false); }}
                        onRemove={removePendingCita} onRestore={restorePendingCita}
                    />
                )}
                {selectedPendingDate && (
                    <PendingDateForm
                        pendingDate={selectedPendingDate} onClose={() => { setSelectedPendingDate(null); setIsPendingListOpen(true); }}
                        onSave={handleSavePendingDate} onAutoSave={handleAutoSavePendingDate} defaultPlaces={places}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {viewerSelection && (
                    <PhotoDetailOverlay
                        photos={viewerSelection.items}
                        initialIndex={viewerSelection.index}
                        onClose={() => setViewerSelection(null)}
                        onNavigateNext={() => navigateCitation(1)}
                        onNavigatePrev={() => navigateCitation(-1)}
                    />
                )}
            </AnimatePresence>

            <BingoSuggestionSheet 
                isOpen={bingoQueue.length > 0} suggestions={bingoQueue[0]?.suggestions || []}
                onConfirm={async (selectedIds) => { 
                    if (bingoQueue.length === 0) return; 
                    const mId = bingoQueue[0].memoryId;
                    await resolveBingoSuggestion(mId, selectedIds); 
                    // Link the chosen bingo categories to the queued memory for backend validation
                    await updatePendingMemory(mId, { claimedBingoCategories: selectedIds });
                }}
                onCancel={async () => { 
                    if (bingoQueue.length === 0) return; 
                    await resolveBingoSuggestion(bingoQueue[0].memoryId); 
                }}
                isSaving={isResolving}
            />

            {celebrationEvent && (
                <CelebrationOverlay 
                    tierLabel={celebrationEvent.tierLabel} reward={celebrationEvent.reward}
                    coins={celebrationEvent.totalCoins} isCombo={celebrationEvent.isCombo}
                    achievements={celebrationEvent.achievements} totalCoins={celebrationEvent.totalCoins}
                    isFullBoard={celebrationEvent.isFullBoard}
                    onComplete={() => {
                        const hasNext = celebrationEvent.hasNextPhase;
                        const isFull = celebrationEvent.isFullBoard;
                        clearCelebrationEvent();
                        if (hasNext) {
                            setActiveTab('bingo');
                            setTimeout(() => { triggerFullBoardVictory(); }, 300);
                        } else if (isFull) { resetBingoBoard(); }
                    }}
                />
            )}

            <AnimatePresence>
                {selectedMemory && (
                    <MemoryViewer 
                        memoryId={selectedMemory.id}
                        initialMemory={selectedMemory}
                        onClose={() => setSelectedMemory(null)}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {irisEvent && <LaLaLandIris key="la-la-land-iris" />}
            </AnimatePresence>
        </div>
    );
}
