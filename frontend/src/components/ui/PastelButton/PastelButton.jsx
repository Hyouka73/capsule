import React from 'react';
import { motion } from 'framer-motion';
import styles from './PastelButton.module.css';

/**
 * PastelButton — StitchMCP / Chunky Clay Primitive
 * Supports variants: primary (rose), secondary (mint), ghost.
 */
const PastelButton = ({ 
    children, 
    onClick, 
    type = 'button', 
    variant = 'primary', 
    fullWidth = false,
    disabled = false,
    isLoading = false,
    className = '',
    ...props 
}) => {
    const variantClass = styles[variant] || styles.primary;
    const widthClass = fullWidth ? styles.fullWidth : '';

    return (
        <motion.button
            type={type}
            onClick={onClick}
            disabled={disabled || isLoading}
            whileHover={!disabled && !isLoading ? { y: -2 } : {}}
            whileTap={!disabled && !isLoading ? { y: 2, scale: 0.98 } : {}}
            className={`${styles.button} ${variantClass} ${widthClass} ${className}`}
            {...props}
        >
            {isLoading ? "Un momento... ✨" : children}
        </motion.button>
    );
};

export default PastelButton;
