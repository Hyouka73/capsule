import styles from './Button.module.css';

/**
 * Reusable Button component with different variants.
 * @param {object} props
 * @param {'primary' | 'secondary' | 'ghost' | 'danger'} props.variant
 * @param {'sm' | 'md' | 'lg'} props.size
 * @param {boolean} props.isLoading
 */
export default function Button({
    children,
    variant = 'primary',
    size = 'md',
    isLoading = false,
    className = '',
    ...props
}) {
    return (
        <button
            className={`${styles.button} ${styles[variant]} ${styles[size]} ${className}`}
            disabled={isLoading || props.disabled}
            {...props}
        >
            {isLoading ? (
                <span className={styles.loader}>✦</span>
            ) : children}
        </button>
    );
}
