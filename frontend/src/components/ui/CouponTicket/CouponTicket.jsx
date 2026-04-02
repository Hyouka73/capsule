import { motion } from 'framer-motion';
import styles from './CouponTicket.module.css';

const COUPON_CATEGORIES = [
    { value: 'wellness', label: 'Bienestar', icon: 'spa' },
    { value: 'dates', label: 'Citas', icon: 'celebration' },
    { value: 'tasks', label: 'Tareas', icon: 'confirmation_number' },
    { value: 'romance', label: 'Romance', icon: 'favorite' },
    { value: 'adventures', label: 'Aventura', icon: 'explore' },
    { value: 'diamond', label: 'Diamante', icon: 'diamond' }
];

const TIER_NAMES = {
    1: 'Mini Capricho',
    2: 'Mimo Especial',
    3: 'Sorpresa VIP',
    4: 'Deseo Infinito'
};

export default function CouponTicket({ coupon, onRedeem }) {
    const isDiamond = coupon.type === 'diamond' || coupon.tier === 4;
    const category = COUPON_CATEGORIES.find(c => c.value === coupon.type) || COUPON_CATEGORIES[0];
    const tierName = isDiamond ? TIER_NAMES[4] : (TIER_NAMES[coupon.tier] || TIER_NAMES[1]);
    
    // Clickeable si no está cobrado, si está aprobado, o si está pospuesto (para acusar recibo)
    const canRedeem = (!coupon.isUsed && (coupon.redemptionsLeft === undefined || coupon.redemptionsLeft > 0)) 
        || coupon.isApproved 
        || coupon.isPostponed;

    // Let's pick a default gradient background based on the specific tokens and category
    let cardBg = 'var(--bg-card)';
    if (isDiamond) {
        cardBg = 'var(--gradient-lavender)';
    } else if (category.value === 'wellness' || category.value === 'adventures') {
        cardBg = 'var(--gradient-mint)';
    } else if (category.value === 'dates') {
        cardBg = 'var(--gradient-amber)';
    } else if (category.value === 'romance') {
        cardBg = 'var(--gradient-rose)';
    } else {
        cardBg = 'var(--gradient-peach)';
    }

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className={`${styles.card} ${coupon.isUsed ? styles.used : ''} ${canRedeem ? styles.clickable : ''}`}
            onClick={() => {
                if (canRedeem && onRedeem) onRedeem(coupon);
            }}
            style={{ '--card-bg': cardBg }}
        >
            <div className={styles.iconWrapper}>
                <span className={`material-symbols-rounded ${styles.icon}`}>
                    {category.icon}
                </span>
            </div>
            
            <div className={styles.content}>
                <div className={styles.top}>
                    <div className={styles.tier}>
                        {isDiamond ? `💎 ${tierName}` : tierName}
                    </div>
                    <h3 className={styles.title}>{coupon.title || coupon.name}</h3>
                </div>
                
                <div className={styles.descWrapper}>
                    <p className={styles.desc}>{coupon.description}</p>
                    {coupon.maxRedemptions > 1 && (
                        <div className={styles.tracker}>
                            <span>{coupon.redemptionsLeft} / {coupon.maxRedemptions} usos disponibles</span>
                            <div className={styles.dots}>
                                {Array.from({ length: coupon.maxRedemptions }).map((_, i) => {
                                    const isPunched = i < (coupon.maxRedemptions - coupon.redemptionsLeft);
                                    return (
                                        <span 
                                            key={i} 
                                            className={`${styles.dot} ${isPunched ? styles.dotUsed : ''}`} 
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            
            {coupon.isUsed && (
                /* No overlay text, just dimmed style as requested */
                null
            )}

            {coupon.isPending && (
                <div className={`${styles.statusOverlay} ${styles.pendingOverlay}`}>
                    <span>SOLICITADO</span>
                    <p>Espere a que su pareja lo apruebe</p>
                </div>
            )}

            {coupon.isApproved && (
                <div className={`${styles.statusOverlay} ${styles.approvedOverlay}`}>
                    <span>¡APROBADO! ✨</span>
                    <p>Toca para canjear definitivamente</p>
                </div>
            )}

            {coupon.isPostponed && (
                <div className={`${styles.statusOverlay} ${styles.postponedOverlay}`}>
                    <span>POSPUESTO 🌙</span>
                    {coupon.adminNote && <p>"{coupon.adminNote}"</p>}
                    <small className={styles.dismissHint}>Toca para marcar como visto</small>
                </div>
            )}
        </motion.div>
    );
}
