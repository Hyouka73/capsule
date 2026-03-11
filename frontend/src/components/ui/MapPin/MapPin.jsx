import React from 'react';
import styles from './MapPin.module.css';

export default function MapPin({ size = 'medium', selected = false, hideIcon = false, hidePulse = false, onClick }) {
    if (size === 'micro') {
        return (
            <div className={`${styles.pinWrapper} ${selected ? styles.selected : ''}`} onClick={onClick}>
                <div className={styles.microDot} />
            </div>
        );
    }

    return (
        <div className={`${styles.pinWrapper} ${selected ? styles.selected : ''}`} onClick={onClick}>
            {size === 'large' && !hidePulse && <div className={styles.pulseRing} />}
            <div className={`${styles.pin} ${styles[`size-${size}`]}`}>
                {!hideIcon && (
                    <div className={styles.iconContainer}>
                        {size === 'large' && (
                            <span className="material-symbols-outlined material-icons-filled" style={{ fontSize: '18px', color: 'white' }}>
                                favorite
                            </span>
                        )}
                        {size === 'medium' && (
                            <span className="material-symbols-outlined material-icons-filled" style={{ fontSize: '14px', color: 'white' }}>
                                favorite
                            </span>
                        )}
                        {size === 'small' && (
                            <div className={styles.smallDot} />
                        )}
                    </div>
                )}
            </div>
            <div className={styles.shadow} />
        </div>
    );
}
