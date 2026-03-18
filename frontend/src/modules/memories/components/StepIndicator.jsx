import React from 'react';
import styles from '../MemoryForm.module.css';

export default function StepIndicator({ step, isPartner }) {
    if (!isPartner) return null;

    return (
        <div className={styles.steps}>
            <div className={`${styles.step} ${step === 'details' ? styles.stepActive : styles.stepDone}`}>
                1. Detalles
            </div>
            <div className={styles.stepDivider} />
            <div className={`${styles.step} ${step === 'photos' ? styles.stepActive : ''}`}>
                2. Fotos
            </div>
        </div>
    );
}
