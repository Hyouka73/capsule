import styles from './EmptyState.module.css';

/**
 * Reusable Empty State component
 * @param {object} props
 * @param {string} props.icon - Emoji or graphic to display
 * @param {string} props.title - Main heading
 * @param {string} props.description - Supporting text
 * @param {React.ReactNode} [props.action] - Optional button or action component
 */
export default function EmptyState({ icon, title, description, action }) {
    return (
        <div className={styles.empty}>
            {icon && <div className={styles.emptyIllustration}>{icon}</div>}
            <h3>{title}</h3>
            {description && <p>{description}</p>}
            {action}
        </div>
    );
}
