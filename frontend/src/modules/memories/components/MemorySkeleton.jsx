import React from 'react';
import Skeleton from '../../../components/ui/Skeleton/Skeleton';
import PastelCard from '../../../components/ui/PastelCard/PastelCard';
import styles from './MemorySkeleton.module.css';

export default function MemorySkeleton() {
    return (
        <PastelCard className={styles.card} padding="none" animate={false}>
            <div className={styles.imagePlaceholder}>
                <Skeleton height="100%" />
            </div>
            <div className={styles.content}>
                <Skeleton width="80%" height="24px" className={styles.titleLine} />
                <div className={styles.metaLines}>
                    <Skeleton width="40%" height="14px" />
                    <Skeleton width="60%" height="14px" />
                </div>
                <div className={styles.tagLines}>
                    <Skeleton width="50px" height="20px" variant="rect" className={styles.tag} />
                    <Skeleton width="50px" height="20px" variant="rect" className={styles.tag} />
                </div>
            </div>
        </PastelCard>
    );
}
