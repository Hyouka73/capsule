import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
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
import CitaOverlay from '../../components/Cita/CitaOverlay';
import styles from './UserDashboard.module.css';

import { TABS } from '../../data/dashboardData';
import { usePendingCitas } from '../../hooks/usePendingCitas';

export default function UserDashboard() {
    const { isPartner, isAdmin } = useAuth();
    const { pendingCount, pendingCitas, removePendingCita, addPendingCita, updatePendingCitaStatus, updatePendingCita } = usePendingCitas();

    // Filter TABS based on role
    const filteredTabs = TABS.filter(tab => {
        if (isAdmin) {
            // Admin only sees Map and Gallery in the user view
            return ['lugares', 'galeria'].includes(tab.id);
        }
        return true; // Partner sees everything
    });

    const [activeTab, setActiveTab] = useState('lugares');
    const [prevTab, setPrevTab] = useState('lugares');
    const [isPlaceSelected, setIsPlaceSelected] = useState(false);
    const [bingoContextToMap, setBingoContextToMap] = useState(null);
    const [isBingoModalOpen, setIsBingoModalOpen] = useState(false);
    const [isCouponsModalOpen, setIsCouponsModalOpen] = useState(false);
    const [openPendingSignal, setOpenPendingSignal] = useState(false);
    const [isSnapshotOpen, setIsSnapshotOpen] = useState(false);
    const [activeSnapshot, setActiveSnapshot] = useState(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [citaContext, setCitaContext] = useState(null);

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
                setOpenPendingSignal(true);
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
            default: return (
                <div className={styles.homeWelcome}>
                    <div className={styles.homeHeart}>💖</div>
                    <h1>Hola, hermosa</h1>
                    <p>Cada recuerdo es un regalo.</p>
                </div>
            );
        }
    };

    return (
        <div className={styles.appContainer}>

            {/* ── MAPA: va directo al appContainer, sin padding ni wrappers ── */}
            {activeTab === 'lugares' && (
                <div className={styles.mapWrapper}>
                    <MapView
                        onPlaceSelected={setIsPlaceSelected}
                        bingoContextToMap={bingoContextToMap}
                        clearBingoContext={() => setBingoContextToMap(null)}
                        openPendingSignal={openPendingSignal}
                        onPendingSignalHandled={() => setOpenPendingSignal(false)}
                        onOpenSnapshot={(snapshot) => {
                            setActiveSnapshot(snapshot);
                            setIsSnapshotOpen(true);
                        }}
                        onOpenCamera={() => setIsCameraOpen(true)}
                        citaContext={citaContext}
                        onCitaContextChange={setCitaContext}
                        pendingDates={pendingCitas}
                        removePendingDate={removePendingCita}
                        updatePendingDateStatus={updatePendingCitaStatus}
                        updatePendingDate={updatePendingCita}
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

                    <main className={styles.mainContent}>
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

                    {/* ── FAB cámara persistente en tabs no-mapa (Fix 10: SnapshotButton siempre visible) ── */}
                    {(isPartner || isAdmin) && !isSnapshotOpen && !isCameraOpen && (
                        <motion.button
                            className={styles.cameraFab}
                            onClick={() => setIsCameraOpen(true)}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            whileTap={{ scale: 0.9 }}
                            aria-label="Enviar instantánea"
                        >
                            📷
                        </motion.button>
                    )}
                </>
            )}

            {/* ── NAVBAR: siempre flotando encima de todo, hidden if place is selected or modal open ──
                Fix 11: Removed inline style={{ position: 'fixed', bottom: 0 }} from motion.div wrapper
                so BottomNav.module.css .bottomNavContainer { bottom: 16px } controls positioning. ── */}
            <AnimatePresence>
                {!isPlaceSelected && !isBingoModalOpen && !isCouponsModalOpen && !isSnapshotOpen && !isCameraOpen && !citaContext && (
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                    >
                        <BottomNav
                            activeTab={activeTab}
                            setActiveTab={handleTabChange}
                            tabs={filteredTabs}
                            pendingCount={pendingCount}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isSnapshotOpen && activeSnapshot && (
                    <SnapshotOverlay
                        key="snapshot-overlay"
                        snapshot={activeSnapshot}
                        onClose={() => {
                            setIsSnapshotOpen(false);
                            setActiveSnapshot(null);
                        }}
                    />
                )}
            </AnimatePresence>

            {isCameraOpen && (
                <SnapshotCreator onClose={() => setIsCameraOpen(false)} />
            )}

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
        </div>
    );
}
