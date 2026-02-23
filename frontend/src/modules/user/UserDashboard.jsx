import { useState, useEffect } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import UserCapsules from '../capsules/UserCapsules';
import UserCoupons from '../coupons/UserCoupons';
import UserBingo from '../bingo/UserBingo';
import UserLugares from '../lugares/UserLugares';
import BottomNav from '../../components/ui/BottomNav/BottomNav';
import styles from './UserDashboard.module.css';

const TABS = [
    { id: 'lugares', label: 'Lugares', icon: 'map' },
    { id: 'caprichos', label: 'Caprichitos', icon: 'redeem' },
    { id: 'sorpresas', label: 'Sorpresas', icon: 'card_giftcard' },
    { id: 'bingo', label: 'Bingo', icon: 'grid_view' },
    { id: 'mas', label: 'Más', icon: 'more_horiz' },
];

export default function UserDashboard() {
    const [activeTab, setActiveTab] = useState('lugares');
    const [prevTab, setPrevTab] = useState('lugares');
    const [isPlaceSelected, setIsPlaceSelected] = useState(false);
    const [bingoContextToMap, setBingoContextToMap] = useState(null);
    const [isBingoModalOpen, setIsBingoModalOpen] = useState(false);
    const [isCouponsModalOpen, setIsCouponsModalOpen] = useState(false);

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
        if (newTab === activeTab) return;
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
                    <UserLugares
                        onPlaceSelected={setIsPlaceSelected}
                        bingoContextToMap={bingoContextToMap}
                        clearBingoContext={() => setBingoContextToMap(null)}
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
                </>
            )}

            {/* ── NAVBAR: siempre flotando encima de todo, hidden if place is selected or modal open ── */}
            <AnimatePresence>
                {!isPlaceSelected && !isBingoModalOpen && !isCouponsModalOpen && (
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                        style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50 }}
                    >
                        <BottomNav activeTab={activeTab} setActiveTab={handleTabChange} tabs={TABS} />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}