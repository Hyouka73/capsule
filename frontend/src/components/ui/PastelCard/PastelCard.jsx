import React from 'react';
import { motion } from 'framer-motion';
import styles from './PastelCard.module.css';

/**
 * PastelCard — StitchMCP / Chunky Clay Primitive
 * Standard container with solid shadows and high border radius.
 */
const PastelCard = ({ 
    children, 
    variant = 'default',
    padding = 'md',
    className = '',
    animate = true,
    ...props 
}) => {
    const variantClass = styles[variant] || styles.default;
    const paddingClass = styles[`padding-${padding}`] || styles['padding-md'];

    const Component = animate ? motion.div : 'div';
    const animationProps = animate ? {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        transition: { type: 'spring', damping: 20, stiffness: 100 }
    } : {};

    return (
        <Component
            className={`${styles.card} ${variantClass} ${paddingClass} ${className}`}
            {...animationProps}
            {...props}
        >
            {children}
        </Component>
    );
};

export default PastelCard;
