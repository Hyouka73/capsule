import React from 'react';
import styles from './PastelInput.module.css';

/**
 * PastelInput — StitchMCP / Chunky Clay Primitive
 * Pill-shaped input with soft inner depth.
 */
const PastelInput = ({ 
    label, 
    error, 
    type = 'text', 
    placeholder, 
    value, 
    onChange, 
    icon: Icon,
    className = '',
    containerClassName = '',
    ...props 
}) => {
    // Map string icons to emojis for a Chunky/Cute aesthetic
    const iconMap = {
        'lock': '🔒',
        'key': '🔑',
        'user': '👤',
        'search': '🔍'
    };

    const renderIcon = () => {
        if (!Icon) return null;
        if (typeof Icon === 'string') {
            return <span>{iconMap[Icon] || Icon}</span>;
        }
        return <Icon />;
    };

    return (
        <div className={`${styles.container} ${containerClassName}`}>
            {label && <label className={styles.label}>{label}</label>}
            <div className={`${styles.inputWrapper} ${error ? styles.errorWrapper : ''}`}>
                {Icon && <span className={styles.icon}>{renderIcon()}</span>}
                <input
                    type={type}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    className={`${styles.input} ${Icon ? styles.withIcon : ''} ${className}`}
                    {...props}
                />
            </div>
            {error && <span className={styles.errorText}>{error}</span>}
        </div>
    );
};

export default PastelInput;
