import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './KawaiiSwitch.module.css';

/**
 * KawaiiSwitch - A premium chunky clay-style switch.
 * @param {boolean} checked - Current state.
 * @param {function} onChange - Triggered on toggle.
 * @param {string} label - Main text.
 * @param {string} description - Small subtitle.
 * @param {string} icon - Emoji or icon.
 * @param {string} variant - 'rose' (default) or 'mint'.
 */
export default function KawaiiSwitch({
    checked,
    onChange,
    label,
    description,
    icon,
    variant = 'rose',
    className = '',
    disabled = false
}) {
    const handleToggle = () => {
        if (disabled) return;
        onChange(!checked);
    };

    return (
        <div 
            className={`
                ${styles.container} 
                ${checked ? styles.containerActive : ''} 
                ${styles[`variant${variant.charAt(0).toUpperCase() + variant.slice(1)}`]}
                ${disabled ? styles.disabled : ''}
                ${className}
            `}
            onClick={handleToggle}
        >
            <div className={styles.info}>
                {icon && <span className={styles.icon}>{icon}</span>}
                <div className={styles.text}>
                    <span className={styles.label}>{label}</span>
                    {description && <span className={styles.description}>{description}</span>}
                </div>
            </div>

            <div className={`${styles.switch} ${checked ? styles.switchActive : ''}`}>
                <motion.div 
                    className={styles.knob}
                    initial={false}
                    animate={{
                        x: checked ? 20 : 0
                    }}
                    transition={{
                        type: 'spring',
                        stiffness: 500,
                        damping: 30
                    }}
                />
            </div>
        </div>
    );
}
