import Button from '../Button/Button';
import styles from './PageHeader.module.css';

/**
 * Reusable Page Header for Admin sections
 * @param {object} props
 * @param {string} props.title - Main title of the page
 * @param {string|number} props.subtitle - Subtitle or item count
 * @param {string} props.actionLabel - Text for the primary action button
 * @param {string} props.actionIcon - Emoji or icon for the primary action button
 * @param {function} props.onAction - Callback for the primary action button
 */
export default function PageHeader({ title, subtitle, actionLabel, actionIcon, onAction }) {
    return (
        <div className={styles.header}>
            <div>
                <h1 className={styles.title}>{title}</h1>
                {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
            </div>
            {onAction && actionLabel && (
                <Button onClick={onAction} className={styles.newBtn}>
                    {actionIcon && <span className={styles.btnIcon}>{actionIcon}</span>}
                    {actionLabel}
                </Button>
            )}
        </div>
    );
}
