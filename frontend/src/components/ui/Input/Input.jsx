import styles from './Input.module.css';

export default function Input({ label, error, className = '', ...props }) {
    return (
        <div className={`${styles.container} ${className}`}>
            {label && <label className={styles.label}>{label}</label>}
            <input
                className={`${styles.input} ${error ? styles.inputError : ''}`}
                {...props}
            />
            {error && <p className={styles.errorText}>{error}</p>}
        </div>
    );
}
