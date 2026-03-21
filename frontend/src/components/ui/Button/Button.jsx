import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import styles from './Button.module.css';

/**
 * Reusable Button component with different variants.
 * Uses motion.button for animations.
 * 
 * NOTE: We manually destructure motion props to ensure they are 
 * correctly handled by motion.button and not passed to the DOM in React 19.
 */
const Button = forwardRef(({
    type = 'button',
    children,
    variant = 'primary',
    size = 'md',
    isLoading = false,
    className = '',
    // Motion props
    whileHover,
    whileTap,
    initial,
    animate,
    exit,
    variants,
    transition,
    ...props
}, ref) => {
    return (
        <motion.button
            ref={ref}
            type={type}
            className={`${styles.button} ${styles[variant]} ${styles[size]} ${className}`}
            disabled={isLoading || props.disabled}
            // Explicitly pass motion props
            whileHover={whileHover}
            whileTap={whileTap}
            initial={initial}
            animate={animate}
            exit={exit}
            variants={variants}
            transition={transition}
            // Pass the rest of the standard DOM props
            {...props}
        >
            {isLoading ? (
                <span className={styles.loader}>✦</span>
            ) : children}
        </motion.button>
    );
});

Button.displayName = 'Button';

export default Button;
