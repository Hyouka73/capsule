import { useState } from 'react';
import styles from './GlassInput.module.css';

export default function GlassInput({
    label,
    leftIcon,
    rightIcon,
    type = 'text',
    className = '',
    inputClassName = '',
    ...props
}) {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';
    const inputType = isPassword && showPassword ? 'text' : type;

    return (
        <div className={`${styles.inputGroup} ${className}`}>
            {label && <label className={styles.inputLabel}>{label}</label>}

            {leftIcon && (
                <div className={styles.inputIcon}>
                    <span
                        className="material-symbols-outlined"
                        style={{ fontVariationSettings: "'FILL' 1", fontSize: '24px' }}
                    >
                        {leftIcon}
                    </span>
                </div>
            )}

            <input
                className={`${styles.input} ${inputClassName}`}
                type={inputType}
                style={{
                    paddingLeft: leftIcon ? '2.75rem' : '1rem',
                    paddingRight: (rightIcon || isPassword) ? '3rem' : '1rem'
                }}
                {...props}
            />

            {isPassword ? (
                <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={styles.visibilityBtn}
                >
                    <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>
                        {showPassword ? 'visibility' : 'visibility_off'}
                    </span>
                </button>
            ) : rightIcon ? (
                <div className={styles.inputRightIcon}>
                    <span
                        className="material-symbols-outlined"
                        style={{ fontVariationSettings: "'FILL' 1", fontSize: '18px' }}
                    >
                        {rightIcon}
                    </span>
                </div>
            ) : null}
        </div>
    );
}
