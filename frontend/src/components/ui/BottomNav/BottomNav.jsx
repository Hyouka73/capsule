import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppConfig } from '../../../hooks/useAppConfig';
import { toast } from '../PastelToast/PastelToast';
import styles from './BottomNav.module.css';

/**
 * Reusable Bottom Navigation Component with "More" menu support.
 */
export default function BottomNav({ activeTab, setActiveTab, tabs = [], moreTabs = [], pendingCount = 0, pendingBingoCount = 0, onPlusClick, isPartner }) {
    const [isMoreOpen, setIsMoreOpen] = useState(false);
    const { config } = useAppConfig();
    const moreMenuRef = useRef(null);

    // Map tab.id to config.modules keys
    const getModuleStatus = (tabId) => {
        const mapping = {
            'sorpresas': 'capsules',
            'caprichos': 'coupons',
            'bingo': 'bingo',
            'movies': 'movies'
        };
        const featureKey = mapping[tabId];
        
        // Static coming soon for not-yet-implemented features
        if (tabId === 'juegos' || tabId === 'ejercicio') return false;
        
        // If it's a known module, check config
        if (featureKey && config?.modules) {
            return config.modules[featureKey]?.isEnabled ?? false;
        }
        
        return true; // Default to on for core tabs (map, gallery)
    };

    const handleTabSelect = (tabId) => {
        const isActive = getModuleStatus(tabId);
        
        if (!isActive && moreTabs.some(t => t.id === tabId)) {
            toast.info('¡Próximamente! ✨', 'Estamos preparando algo especial para ustedes.');
            return;
        }

        setActiveTab(tabId);
        setIsMoreOpen(false);
    };

    const renderNavItem = (tab) => {
        const isActive = activeTab === tab.id;
        const hasLugaresBadge = tab.id === 'lugares' && pendingCount > 0;

        return (
            <button
                key={tab.id}
                onClick={() => handleTabSelect(tab.id)}
                className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
            >
                <motion.div
                    className={styles.itemContent}
                    initial={false}
                    animate={{ scale: isActive ? 1.1 : 1 }}
                >
                    <div className={styles.iconWrapper}>
                        <span
                            className={`material-symbols-rounded ${styles.navIcon}`}
                            style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
                        >
                            {tab.icon}
                        </span>
                        {hasLugaresBadge && (
                            <motion.div
                                className={styles.badge}
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                            >
                                {pendingCount}
                            </motion.div>
                        )}
                    </div>
                    <span className={styles.navLabel}>{tab.label}</span>
                </motion.div>
            </button>
        );
    };

    // Close menu when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) {
                setIsMoreOpen(false);
            }
        }
        if (isMoreOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isMoreOpen]);

    if (!tabs || tabs.length === 0) return null;

    // Check if the currently active tab is one of the "more" tabs
    const isMoreActive = moreTabs.some(t => t.id === activeTab);

    return (
        <div className={styles.bottomNavContainer} ref={moreMenuRef}>
            {/* --- "More" Sheet --- */}
            <AnimatePresence>
                {isMoreOpen && (
                    <motion.div
                        className={styles.moreSheet}
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                    >
                        <div className={styles.moreGrid}>
                            {moreTabs.map(tab => {
                                const isEnabled = getModuleStatus(tab.id);
                                return (
                                    <button
                                        key={tab.id}
                                        className={`${styles.moreItem} ${activeTab === tab.id ? styles.moreItemActive : ''} ${!isEnabled ? styles.moreItemDisabled : ''}`}
                                        onClick={() => handleTabSelect(tab.id)}
                                    >
                                        <div className={styles.iconWrapper}>
                                            <span className={`material-symbols-rounded ${styles.moreIcon}`}>
                                                {tab.icon}
                                            </span>
                                            {tab.id === 'bingo' && pendingBingoCount > 0 && isEnabled && (
                                                <motion.div
                                                    className={styles.badgeLeft}
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                >
                                                    {pendingBingoCount}
                                                </motion.div>
                                            )}
                                        </div>
                                        <span className={styles.moreLabel}>{tab.label}</span>
                                        {!isEnabled && <span className={styles.soonBubble}>Pronto</span>}
                                    </button>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* --- Primary Nav Bar --- */}
            <nav className={styles.bottomNav}>
                {/* Primeros dos items (Mapa, Galería) */}
                {tabs.slice(0, 2).map(tab => renderNavItem(tab))}

                {/* --- BOTÓN CENTRAL PLUS --- */}
                {isPartner && (
                    <button 
                        className={styles.plusButton} 
                        onClick={onPlusClick}
                        aria-label="Nueva Cita"
                    >
                        <div className={styles.plusIconWrapper}>
                            <span className="material-symbols-rounded">add</span>
                        </div>
                    </button>
                )}

                {/* Resto de items (Bingo) y el botón "Más" */}
                {tabs.slice(2).map(tab => renderNavItem(tab))}

                {moreTabs.length > 0 && (
                    <button
                        onClick={() => setIsMoreOpen(!isMoreOpen)}
                        className={`${styles.navItem} ${isMoreActive ? styles.navItemActive : ''} ${isMoreOpen ? styles.navItemMoreOpen : ''} ${pendingBingoCount > 0 ? styles.navItemGlow : ''}`}
                    >
                        <motion.div
                            className={styles.itemContent}
                            animate={{ scale: isMoreOpen ? 1.1 : 1 }}
                        >
                            <div className={styles.iconWrapper}>
                                <span className={`material-symbols-rounded ${styles.navIcon}`}>
                                    {isMoreOpen ? 'close' : 'more_horiz'}
                                </span>
                            </div>
                            <span className={styles.navLabel}>Más</span>
                        </motion.div>
                    </button>
                )}
            </nav>
        </div>
    );
}
