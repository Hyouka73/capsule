import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import UserCapsules from '../capsules/UserCapsules';
import UserCoupons from '../coupons/UserCoupons';
import UserBingo from '../bingo/UserBingo';
import styles from './UserDashboard.module.css';

const TABS = [
    { id: 'home', label: 'Inicio', icon: '✨' },
    { id: 'capsules', label: 'Cápsulas', icon: '⏳' },
    { id: 'coupons', label: 'Cupones', icon: '🎁' },
    { id: 'bingo', label: 'Bingo', icon: '🎯' },
];

export default function UserDashboard() {
    const [activeTab, setActiveTab] = useState('home');

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
                                <span className={styles.navIcon}>{tab.icon}</span>
                                {isActive && (
                                    <motion.span
                                        layoutId="navPill"
                                        className={styles.navLabel}
                                        initial={{ opacity: 0, width: 0 }}
                                        animate={{ opacity: 1, width: 'auto' }}
                                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                    >
                                        {tab.label}
                                    </motion.span>
                                )}
                            </button>
                        );
                    })}
                </nav>
            </div>
        </div>
    );
}
