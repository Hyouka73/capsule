import React from 'react';
import styles from './MapPin.module.css';

export default function MapPin({ 
    size = 'medium', 
    color, 
    scale, 
    selected = false, 
    hideIcon = false, 
    hidePulse = false, 
    onClick 
}) {
    // Helper to darken color for chunky shadow
    const getDarkerColor = (hex) => {
        if (!hex) return 'var(--pastel-mint-dark)';
        // Simple hex darkener (approx 20%)
        let r = parseInt(hex.slice(1, 3), 16);
        let g = parseInt(hex.slice(3, 5), 16);
        let b = parseInt(hex.slice(5, 7), 16);
        r = Math.floor(r * 0.8);
        g = Math.floor(g * 0.8);
        b = Math.floor(b * 0.8);
        return `rgb(${r}, ${g}, ${b})`;
    };

    const darkerColor = getDarkerColor(color);
    const pinStyle = {
        backgroundColor: color || undefined,
        boxShadow: color ? `0 ${size === 'large' ? 6 : size === 'medium' ? 4 : 3}px 0 ${darkerColor}` : undefined,
    };

    const wrapperStyle = scale ? { transform: `scale(${scale})` } : {};

    if (size === 'micro') {
        return (
            <div className={`${styles.pinWrapper} ${selected ? styles.selected : ''}`} onClick={onClick} style={wrapperStyle}>
                <div className={styles.microDot} style={{ backgroundColor: color, boxShadow: color ? `0 2px 0 ${darkerColor}` : undefined }} />
            </div>
        );
    }

    return (
        <div className={`${styles.pinWrapper} ${selected ? styles.selected : ''}`} onClick={onClick} style={wrapperStyle}>
            {size === 'large' && !hidePulse && (
                <div className={styles.pulseRing} style={{ borderColor: darkerColor }} />
            )}
            <div className={`${styles.pin} ${styles[`size-${size}`]}`} style={pinStyle}>
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
