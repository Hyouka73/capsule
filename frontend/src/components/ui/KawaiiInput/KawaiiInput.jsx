import React, { useState, useRef } from 'react';
import styles from './KawaiiInput.module.css';

export default function KawaiiInput({
    type = 'text', // text, search, select, date, photo, textarea, toggle
    name,
    label,
    value,
    onChange,
    onFocus,
    onBlur,
    onClick,
    placeholder,
    iconLeft,
    iconRight,
    error,
    disabled = false,
    photos = [], // for photo picker
    options = [], // for select
    className = '',
    onClear,
    helpText,
    ...rest
}) {
    const [isFocused, setIsFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const inputRef = useRef(null);

    const handleFocus = (e) => {
        setIsFocused(true);
        if (onFocus) onFocus(e);
    };

    const handleBlur = (e) => {
        setIsFocused(false);
        if (onBlur) onBlur(e);
    };

    const handleWrapperClick = () => {
        if (disabled) return;
        
        // Native triggers for select/date if ref exists and not custom onClick
        if (!onClick && inputRef.current) {
            if (type === 'date' || type === 'datetime-local' || type === 'select') {
                if ('showPicker' in inputRef.current) {
                    try {
                        inputRef.current.showPicker();
                    } catch (e) {
                        inputRef.current.focus();
                    }
                } else {
                    inputRef.current.focus();
                }
            } else if (type === 'text' || type === 'search' || type === 'textarea' || type === 'password') {
                inputRef.current.focus();
            }
        }
        
        if (onClick) onClick();
    };

    const wrapperClasses = [
        styles.inputWrapper,
        isFocused ? styles.inputWrapperFocus : '',
        error ? styles.inputWrapperError : '',
        disabled ? styles.inputWrapperDisabled : '',
        type === 'textarea' ? styles.inputWrapperTextarea : '',
        (type === 'select' || type === 'date' || type === 'datetime-local' || type === 'photo' || type === 'toggle' || onClick) ? styles.clickable : '',
        className
    ].filter(Boolean).join(' ');

    const renderLeftContent = () => {
        if (type === 'photo') {
            if (photos && photos.length > 0) {
                return <img src={photos[0]} alt="Selected" className={styles.photoThumbnail} />;
            }
            return (
                <div className={styles.photoPlaceholder}>
                    <span className="material-symbols-rounded">image</span>
                </div>
            );
        }

        let icon = iconLeft;
        if (!icon) {
            switch (type) {
                case 'search': icon = 'search'; break;
                case 'date': 
                case 'datetime-local': icon = 'calendar_month'; break;
                case 'password': icon = 'lock'; break;
                default: icon = null;
            }
        }

        if (icon) {
            return (
                <span className={`material-symbols-rounded ${styles.leftIcon} ${type === 'textarea' ? styles.leftIconTextarea : ''}`}>
                    {icon}
                </span>
            );
        }
        return null;
    };

    const renderMainContent = () => {
        switch (type) {
            case 'textarea':
                return (
                    <textarea
                        ref={inputRef}
                        className={styles.textareaElement}
                        name={name}
                        value={value || ''}
                        onChange={onChange}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        placeholder={placeholder}
                        disabled={disabled}
                        {...rest}
                    />
                );
            case 'select': {
                // Find selected option label
                const selectedOpt = options.find(opt => (opt.value || opt.id) === value);
                const displayVal = selectedOpt ? (selectedOpt.label || selectedOpt.name || (selectedOpt.emoji ? `${selectedOpt.emoji} ${selectedOpt.name}` : value)) : '';
                return (
                    <div className={`${styles.valueText} ${!value ? styles.valuePlaceholder : ''}`}>
                        {value ? displayVal : placeholder}
                    </div>
                );
            }
            case 'date':
            case 'datetime-local': {
                // Prettify date for display: 
                // YYYY-MM-DD -> DD/MM/YYYY
                // YYYY-MM-DDTHH:mm -> DD/MM/YYYY - HH:mm
                let displayDate = value || placeholder;
                
                if (value) {
                    if (value.includes('T')) {
                        // Datetime-local format: YYYY-MM-DDTHH:mm
                        const [datePart, timePart] = value.split('T');
                        const [y, m, d] = datePart.split('-');
                        if (y && m && d && timePart) {
                            displayDate = `${d}/${m}/${y} - ${timePart}`;
                        }
                    } else if (value.includes('-')) {
                        // Date format: YYYY-MM-DD
                        const [y, m, d] = value.split('-');
                        if (y && m && d) {
                            displayDate = `${d}/${m}/${y}`;
                        }
                    }
                }

                return (
                    <div className={`${styles.valueText} ${!value ? styles.valuePlaceholder : ''}`}>
                        {displayDate}
                    </div>
                );
            }
            case 'photo':
                return (
                    <div className={`${styles.valueText} ${!photos?.length ? styles.valuePlaceholder : ''}`}>
                        {photos?.length > 0 ? `${photos.length} foto${photos.length !== 1 ? 's' : ''} seleccionada${photos.length !== 1 ? 's' : ''}` : (placeholder || 'Agregar fotos')}
                    </div>
                );
            case 'toggle':
                return (
                    <div className={styles.valueText}>
                        {placeholder || ''}
                    </div>
                );
            case 'search':
            case 'text':
            case 'password':
            case 'email':
            case 'number':
            default: {
                const inputType = type === 'password' ? (showPassword ? 'text' : 'password') : (type === 'search' ? 'text' : type);
                return (
                    <input
                        ref={inputRef}
                        type={inputType}
                        className={styles.inputElement}
                        name={name}
                        value={value || ''}
                        onChange={onChange}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        placeholder={placeholder}
                        disabled={disabled}
                        {...rest}
                    />
                );
            }
        }
    };

    const renderRightContent = () => {
        if (type === 'toggle') {
            return (
                <div
                    className={`${styles.toggleWrapper} ${value ? styles.toggleWrapperActive : ''}`}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (!disabled && onChange) {
                            onChange({ target: { checked: !value, value: !value } });
                        }
                    }}
                >
                    <div className={styles.toggleKnob} />
                </div>
            );
        }

        if (type === 'search' && value) {
            return (
                <button
                    type="button"
                    className={styles.rightAction}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (onClear) onClear();
                        if (inputRef.current) inputRef.current.focus();
                    }}
                >
                    <span className="material-symbols-rounded">close</span>
                </button>
            );
        }

        if (type === 'photo') {
            return (
                <div className={styles.rightAction}>
                    <span className="material-symbols-rounded">add_photo_alternate</span>
                </div>
            );
        }

        if (type === 'date' || type === 'datetime-local') {
            return (
                <div className={styles.rightAction}>
                    <span className="material-symbols-rounded">
                        {type === 'datetime-local' ? 'schedule' : 'calendar_today'}
                    </span>
                </div>
            );
        }

        if (type === 'select') {
            return (
                <div className={styles.rightAction}>
                    <span className="material-symbols-rounded">expand_more</span>
                </div>
            );
        }

        if (type === 'password') {
            return (
                <button
                    type="button"
                    className={styles.rightAction}
                    onClick={(e) => {
                        e.stopPropagation();
                        setShowPassword(!showPassword);
                    }}
                >
                    <span className="material-symbols-rounded">
                        {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                </button>
            );
        }

        if (iconRight) {
            return (
                <div className={styles.rightAction}>
                    <span className="material-symbols-rounded">{iconRight}</span>
                </div>
            );
        }

        return null;
    };

    return (
        <div className={styles.container}>
            {label && (
                <label className={styles.label}>{label}</label>
            )}

            <div className={wrapperClasses} onClick={handleWrapperClick}>
                {renderLeftContent()}
                {renderMainContent()}
                {renderRightContent()}

                {/* 
                 * Overlay native inputs for generic select/date.
                 */}
                {type === 'select' && options && options.length > 0 && !onClick && (
                    <select
                        ref={inputRef}
                        className={styles.hiddenNativeInput}
                        name={name}
                        value={value || ''}
                        onChange={onChange}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        disabled={disabled}
                    >
                        <option value="" disabled>{placeholder}</option>
                        {options.map(opt => (
                            <option key={opt.value || opt.id} value={opt.value || opt.id}>
                                {opt.label || opt.name || (opt.emoji ? `${opt.emoji} ${opt.name}` : '')}
                            </option>
                        ))}
                    </select>
                )}

                {(type === 'date' || type === 'datetime-local') && !onClick && (
                    <input
                        ref={inputRef}
                        type={type}
                        className={styles.hiddenNativeInput}
                        name={name}
                        value={value || ''}
                        onChange={onChange}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        disabled={disabled}
                    />
                )}
            </div>

            {error && (
                <div className={styles.errorText}>
                    {typeof error === 'string' ? error : 'Este campo es requerido'}
                </div>
            )}
        </div>
    );
}
