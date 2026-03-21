import React from 'react';
import styles from './Skeleton.module.css';

/**
 * Reusable Skeleton loader with shimmer effect.
 * 
 * @param {object} props
 * @param {string} props.width - Width of the skeleton
 * @param {string} props.height - Height of the skeleton
 * @param {'rect' | 'circle'} props.variant - Shape variant
 * @param {string} props.className - Additional classes
 */
const Skeleton = ({ 
    width = '100%', 
    height = '20px', 
    variant = 'rect', 
    className = '' 
}) => {
    const style = {
        width,
        height,
    };

    return (
        <div 
            className={`${styles.skeleton} ${styles[variant]} ${className}`} 
            style={style}
        />
    );
};

export default Skeleton;
