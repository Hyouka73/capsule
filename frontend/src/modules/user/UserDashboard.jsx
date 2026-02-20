import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import UserCapsules from '../capsules/UserCapsules';
import UserCoupons from '../coupons/UserCoupons';
import UserBingo from '../bingo/UserBingo';
import UserLugares from '../lugares/UserLugares';
import styles from './UserDashboard.module.css';

const TABS = [
    { id: 'lugares', label: 'Lugares', icon: 'map' },
    { id: 'fotos', label: 'Fotos', icon: 'photo_library' },
    { id: 'sorpresas', label: 'Sorpresas', icon: 'card_giftcard' },
    { id: 'bingo', label: 'Bingo', icon: 'grid_view' },
    { id: 'mas', label: 'Más', icon: 'more_horiz' },
];

export default function UserDashboard() {
    const [activeTab, setActiveTab] = useState('lugares'); // Make lugares default since it's the home screen

    // Efecto sutil de partículas flotantes en el fondo (similar a AdminLogin)
    useEffect(() => {
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

            setTimeout(() => {
                particle.remove();
            }, duration * 1000);
        };

        const interval = setInterval(createParticle, 800);
        return () => clearInterval(interval);
    }, []);

    const renderContent = () => {
        switch (activeTab) {
            case 'lugares': return <UserLugares />;
            case 'capsules': return <UserCapsules />;
            case 'coupons': return <UserCoupons />;
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
            {/* Fondo decorativo Cute Pastel */}
            <div id="user-dashboard-bg" className={styles.background}>
                <div className={styles.gradientOrb1}></div>
                <div className={styles.gradientOrb2}></div>
                <div className={styles.dotPattern}></div>
                {/* Elementos flotantes fijos */}
                <span className={styles.floatingDeco1}>✨</span>
                <span className={styles.floatingDeco2}>💌</span>
                <span className={styles.floatingDeco3}>🌸</span>
            </div>

            {/* Contenido Dinámico */}
            <main className={styles.mainContent}>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, scale: 0.98, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98, y: -10 }}
                        transition={{ duration: 0.3 }}
                        className={styles.tabContentWrapper}
                    >
                        {renderContent()}
                    </motion.div>
                </AnimatePresence>
            </main>

            {/* Barra de Navegación Inferior (Glassmorphism) */}
            <div className={styles.bottomNavContainer}>
                <nav className={styles.bottomNav}>
                    {TABS.map(tab => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
                            >
                                <span className={`material-symbols-outlined ${styles.navIcon}`}>
                                    {tab.icon}
                                </span>
                                <span className={styles.navLabel}>
                                    {tab.label}
                                </span>
                            </button>
                        );
                    })}
                </nav>
            </div>
        </div>
    );
}
