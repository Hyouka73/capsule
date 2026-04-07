import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
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
import BingoSuggestionSheet from '../memories/components/BingoSuggestionSheet';
import PhotoDetailOverlay from '../gallery/components/PhotoDetailOverlay';
import PendingDatesList from '../../components/PendingDates/PendingDatesList';
import PendingDateForm from '../../components/PendingDates/PendingDateForm';
import { usePlaces } from '../map/hooks/usePlaces';
import { toast } from '../../components/ui/PastelToast/PastelToast';
import CelebrationOverlay from '../../components/Bingo/CelebrationOverlay';
import LaLaLandIris from '../../components/Bingo/LaLaLandIris';

export default function UserDashboard() {
    const { isPartner, isAdmin, relationshipId } = useAuth();
    const { config, isFeatureOn } = useAppConfig();
    const { pendingCount, pendingCitas, removePendingCita, addPendingCita, updatePendingCitaStatus, updatePendingCita, restorePendingCita } = usePendingCitas();
    const { 
        celebrationEvent, 
        clearCelebrationEvent, 
        irisEvent, 
        resetBingoBoard,
        triggerFullBoardVictory,
        bingoQueue,
        resolveBingoSuggestion,
        isResolving
    } = useBingo();

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

    const [isCameraOpen, setIsCameraOpen] = useState(urlAction === 'capture');
    const [isActionActive, setIsActionActive] = useState(!!urlAction);
    const { queueMemory } = useOfflineQueue();
    const { places } = usePlaces();
    const [citaContext, setCitaContext] = useState(null);
    const [selectedPendingDate, setSelectedPendingDate] = useState(null);
    const [viewerSelection, setViewerSelection] = useState(null);
    const [isPendingListOpen, setIsPendingListOpen] = useState(false);
    const [isGalleryDetailOpen, setIsGalleryDetailOpen] = useState(false);
    const [isCapsuleModalOpen, setIsCapsuleModalOpen] = useState(false);

    // Stable handlers defined BEFORE effects
    const handlePlusClick = useCallback(() => {
        const minPhotos = config?.citaConfig?.minPhotosSpontaneous || 5;
        setCitaContext({ type: 'spontaneous', minPhotos });
    }, [config]);

    useEffect(() => {
        const action = searchParams.get('action');
        const tab = searchParams.get('tab');

        if (action || tab) {
            if (action && action !== 'galeria') {
                setIsActionActive(true);
            }

            if (action === 'capture') {
                setIsCameraOpen(true);
            } else if (action === 'cita' && !citaContext) {
                handlePlusClick();
            } else if (tab === 'galeria') {
                setActiveTab('galeria');
                setIsActionActive(false); 
                setSearchParams({}, { replace: true });
            }
        }
    }, [searchParams, setSearchParams, handlePlusClick, citaContext]);

    // Cleanup action state when overlays close
    const handleActionClose = useCallback(() => {
        setIsActionActive(false);
        setIsCameraOpen(false);
        setCitaContext(null);
        setIsPlaceSelected(false);
        
        // Final cleanup: Remove action params from URL ONLY when closing
        if (searchParams.has('action')) {
            setSearchParams({}, { replace: true });
        }
    }, [setSearchParams, searchParams]);

    // ── INTER-CITATION NAVIGATION (MAP VIEW) ──
    const navigateCitation = async (direction) => {
        if (!viewerSelection || !viewerSelection.contextList) return;
        
        const newTopLevelIndex = viewerSelection.topLevelIndex + direction;
        if (newTopLevelIndex < 0 || newTopLevelIndex >= viewerSelection.contextList.length) {
            return;
        }

        const nextMemory = viewerSelection.contextList[newTopLevelIndex];
        
        try {
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

    const hasAnyOverlayOpen = !!citaContext || isBingoModalOpen || isCouponsModalOpen || isSnapshotOpen || isCameraOpen || isHistoryOpen || isPendingListOpen || !!selectedPendingDate || !!viewerSelection || bingoQueue.length > 0 || !!celebrationEvent || isGalleryDetailOpen || isPlaceSelected || isCapsuleModalOpen;
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
            bingo: <UserBingo setActiveTab={setActiveTab} setBingoContextToMap={setBingoContextToMap} setIsModalOpen={setIsBingoModalOpen} />
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
                coordinates: data.customLocation 
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
                            onPlusClick={handlePlusClick} isPartner={isPartner}
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

            {citaContext && (
                <CitaOverlay
                    citaContext={citaContext}
                    onClose={handleActionClose}
                    onSave={async (files) => { 
                        await addPendingCita(files, citaContext); 
                        handleActionClose();
                    }}
                />
            )}

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
                onConfirm={async (selectedIds) => { if (bingoQueue.length === 0) return; await resolveBingoSuggestion(bingoQueue[0].memoryId, selectedIds); }}
                onCancel={async () => { if (bingoQueue.length === 0) return; await resolveBingoSuggestion(bingoQueue[0].memoryId); }}
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
                {irisEvent && <LaLaLandIris key="la-la-land-iris" />}
            </AnimatePresence>
        </div>
    );
}
