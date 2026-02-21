import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import UserCapsules from '../capsules/UserCapsules';
import UserCoupons from '../coupons/UserCoupons';
import UserBingo from '../bingo/UserBingo';
import UserLugares from '../lugares/UserLugares';
import BottomNav from '../../components/ui/BottomNav/BottomNav';
import styles from './UserDashboard.module.css';

const TABS = [
    { id: 'lugares', label: 'Lugares', icon: 'map' },
    { id: 'fotos', label: 'Fotos', icon: 'photo_library' },
    { id: 'sorpresas', label: 'Sorpresas', icon: 'card_giftcard' },
    { id: 'bingo', label: 'Bingo', icon: 'grid_view' },
    { id: 'mas', label: 'Más', icon: 'more_horiz' },
];

export default function UserDashboard() {
    const [activeTab, setActiveTab] = useState('lugares');

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

    const renderContent = () => {
        switch (activeTab) {
            case 'sorpresas': return <UserCapsules />;
            case 'fotos': return <UserCoupons />;
            case 'bingo': return <UserBingo />;
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
                    <UserLugares />
                </div>
            )}

            {/* ── OTROS TABS: con fondo decorativo y padding normal ── */}
            {activeTab !== 'lugares' && (
                <>
                    <div id="user-dashboard-bg" className={styles.background}>
                        <div className={styles.gradientOrb1} />
                        <div className={styles.gradientOrb2} />
                        <div className={styles.dotPattern} />
                        <span className={styles.floatingDeco1}>✨</span>
                        <span className={styles.floatingDeco2}>💌</span>
                        <span className={styles.floatingDeco3}>🌸</span>
                    </div>

                    <main className={styles.mainContent}>
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, scale: 0.98, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.98, y: -10 }}
                                transition={{ duration: 0.25 }}
                                className={styles.tabContentWrapper}
                            >
                                {renderContent()}
                            </motion.div>
                        </AnimatePresence>
                    </main>
                </>
            )}

            {/* ── NAVBAR: siempre flotando encima de todo ── */}
            <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} tabs={TABS} />
        </div>
    );
}