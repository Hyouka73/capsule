import { motion } from 'framer-motion';
import styles from './BottomNav.module.css';

/**
 * Reusable Bottom Navigation Component
 * @param {object} props
 * @param {string} props.activeTab - Current active tab ID
 * @param {function} props.setActiveTab - Function to update active tab
 * @param {Array<{id: string, label: string, icon: string}>} props.tabs - Array of tab definitions
 */
export default function BottomNav({ activeTab, setActiveTab, tabs = [], pendingCount = 0 }) {
    if (!tabs || tabs.length === 0) return null;

    return (
        <div className={styles.bottomNavContainer}>
            <nav className={styles.bottomNav}>
                {tabs.map(tab => {
                    const isActive = activeTab === tab.id;
                    const hasBadge = tab.id === 'lugares' && pendingCount > 0;

                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
                        >
                            <motion.div
                                className={styles.itemContent}
                                initial={false}
                                animate={{ scale: isActive ? 1.1 : 1 }}
                            >
                                <div className={styles.iconWrapper}>
                                    <span
                                        className={`material-symbols-outlined ${styles.navIcon}`}
                                        style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
                                    >
                                        {tab.icon}
                                    </span>
                                    {hasBadge && (
                                        <motion.div
                                            className={styles.badge}
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                        >
                                            {pendingCount}
                                        </motion.div>
                                    )}
                                </div>
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
