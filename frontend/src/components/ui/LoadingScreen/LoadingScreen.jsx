import styles from './LoadingScreen.module.css';

/**
 * LoadingScreen — Minimalist elegant loader
 * @param {object} props
 * @param {string} [props.message] - Optional message to show
 */
export default function LoadingScreen({ message }) {
    return (
        <div className={styles.container}>
            <div className={styles.content}>
                <div className={styles.star}>✦</div>
                {message && <p className={styles.message}>{message}</p>}
            </div>
        </div>
    );
}
