import styles from './DescriptiveCheckbox.module.css';

export default function DescriptiveCheckbox({
    title,
    description,
    checked,
    onChange,
    name,
    className = '',
    ...props
}) {
    return (
        <label className={`${styles.checkboxLabel} ${className}`}>
            <input
                type="checkbox"
                name={name}
                checked={checked}
                onChange={onChange}
                className={styles.input}
                {...props}
            />
            <div className={styles.checkboxText}>
                <span className={styles.title}>{title}</span>
                {description && <span className={styles.description}>{description}</span>}
            </div>
        </label>
    );
}
