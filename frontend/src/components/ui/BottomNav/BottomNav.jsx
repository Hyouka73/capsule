import { motion } from 'framer-motion';
import styles from './BottomNav.module.css';

/**
 * Reusable Bottom Navigation Component
 * @param {object} props
 * @param {string} props.activeTab - Current active tab ID
 * @param {function} props.setActiveTab - Function to update active tab
 * @param {Array<{id: string, label: string, icon: string}>} props.tabs - Array of tab definitions
 */
export default function BottomNav({ activeTab, setActiveTab, tabs = [] }) {
    if (!tabs || tabs.length === 0) return null;

    return (
        <div className={styles.bottomNavContainer}>
            <nav className={styles.bottomNav}>
                {tabs.map(tab => {
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="bottomNavIndicator"
                                    className={styles.activeIndicator}
                                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                />
                            )}
                            <motion.div
                                className={styles.itemContent}
                                animate={{ y: isActive ? -28 : 0 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                            >
                                <span className={`material-symbols-outlined ${styles.navIcon}`}>
                                    {tab.icon}
                                </span>
                                <span className={styles.navLabel}>
                                    {tab.label}
                                </span>
                            </motion.div>
                        </button>
                    );
                })}
            </nav>
        </div>
    );
}
