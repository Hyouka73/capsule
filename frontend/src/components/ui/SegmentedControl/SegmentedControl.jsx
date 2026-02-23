import { motion } from 'framer-motion';
import styles from './SegmentedControl.module.css';

export default function SegmentedControl({ tabs, activeTab, onChange }) {
    return (
        <div className={styles.tabsMenu}>
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    className={`${styles.tabBtn} ${activeTab === tab.id ? styles.activeText : ''}`}
                    onClick={() => onChange(tab.id)}
                >
                    {activeTab === tab.id && (
                        <motion.div
                            layoutId="activeTabIndicator"
                            className={styles.activeTabIndicator}
                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        />
                    )}
                    <span className={styles.tabLabel}>{tab.label}</span>
                </button>
            ))}
        </div>
    );
}
